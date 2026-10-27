const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// A client can set x-forwarded-for on its own request, so a deployment that reads it
// for rate limiting lets an attacker pick the bucket it is charged to. STYLD reads only
// the ingress header Vercel writes, and off Vercel it reads a header that no host sets.
const SPOOFABLE = ['x-forwarded-for', 'x-real-ip', 'client-ip', 'cf-connecting-ip'];
const INGRESS = 'x-vercel-forwarded-for';

function authConfig(env) {
  const deps = {
    'better-auth': { betterAuth: (config) => config, APIError: class APIError extends Error {} },
    'better-auth/plugins': { emailOTP: (config) => config },
    'better-auth/api': { createAuthMiddleware: (fn) => fn },
    './auth-database': { authPool: { query: () => { throw new Error('No database access in an IP-source test.'); } } },
    './email-provider': { sendEmail: () => { throw new Error('No email delivery in an IP-source test.'); } },
    './email-reason': {},
    './security-events': { consumeLimit: async () => true },
    './auth-policy': {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/better-auth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { process: { env }, Date })(name => deps[name], module, module.exports);
  return module.exports.auth;
}

function securityEvents(env, queries = []) {
  const deps = {
    crypto: require('crypto'),
    './auth-database': { authPool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [], rowCount: 0 }; } } },
    './email-provider': { sendEmail: async () => ({ ok: true }) },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/security-events.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { process: { env }, Date, console })(name => deps[name], module, module.exports);
  return module.exports;
}

function headers(entries) {
  return { get: name => entries[name.toLowerCase()] ?? null };
}

test('on Vercel the auth rate limiter resolves the client IP from the ingress header only', () => {
  const config = authConfig({ VERCEL: '1', BETTER_AUTH_SECRET: 'test-secret' });
  assert.deepEqual(Array.from(config.advanced.ipAddress.ipAddressHeaders), [INGRESS]);
  assert.equal(config.rateLimit.enabled, true);
  assert.equal(config.rateLimit.storage, 'database');
});

test('off Vercel the limiter reads a header no host sets, so it fails closed instead of trusting a client', () => {
  const config = authConfig({ BETTER_AUTH_SECRET: 'test-secret' });
  const [header] = config.advanced.ipAddress.ipAddressHeaders;
  assert.notEqual(header, INGRESS, 'a non-Vercel host must not claim Vercel ingress semantics');
  assert.ok(!SPOOFABLE.includes(header), `the fallback header ${header} is client-supplied`);
});

test('neither deployment shape ever accepts a client-supplied IP header', () => {
  for (const env of [{ VERCEL: '1' }, {}, { VERCEL: '1', NODE_ENV: 'production' }]) {
    const resolved = authConfig({ ...env, BETTER_AUTH_SECRET: 'test-secret' }).advanced.ipAddress.ipAddressHeaders;
    for (const header of resolved) assert.ok(!SPOOFABLE.includes(header), `${header} would be spoofable`);
  }
});

test('security events hash the ingress IP on Vercel and store nothing when it is absent', async () => {
  const secret = 'test-secret';
  const onHost = [];
  await securityEvents({ VERCEL: '1', BETTER_AUTH_SECRET: secret }, onHost)
    .securityEvent('login_success', 'user-1', headers({ [INGRESS]: '197.232.1.44, 10.0.0.1', 'user-agent': 'Chrome' }));
  const [, , ipHash, userAgent] = onHost[0].values;
  assert.equal(ipHash.length, 64);
  assert.match(ipHash, /^[0-9a-f]{64}$/);
  assert.ok(!ipHash.includes('197.232'), 'the address must never be stored or hashed whole');
  assert.equal(userAgent, 'Chrome');

  const offHost = [];
  await securityEvents({ BETTER_AUTH_SECRET: secret }, offHost)
    .securityEvent('login_success', 'user-1', headers({ [INGRESS]: '197.232.1.44', 'x-forwarded-for': '8.8.8.8' }));
  assert.equal(offHost[0].values[2], null, 'off Vercel there is no trustworthy address, so none is recorded');

  const missing = [];
  await securityEvents({ VERCEL: '1', BETTER_AUTH_SECRET: secret }, missing)
    .securityEvent('login_success', 'user-1', headers({ 'x-forwarded-for': '8.8.8.8' }));
  assert.equal(missing[0].values[2], null, 'a spoofable header alone must not produce an address');
});

test('the same address hashes consistently within one deployment and differently under another secret', async () => {
  const address = '41.90.100.7';
  const first = []; const repeat = []; const second = [];
  for (const [bag, secret] of [[first, 'secret-one'], [repeat, 'secret-one'], [second, 'secret-two']]) {
    await securityEvents({ VERCEL: '1', BETTER_AUTH_SECRET: secret }, bag)
      .securityEvent('otp_sent', null, headers({ [INGRESS]: address }));
  }
  assert.equal(first[0].values[2], repeat[0].values[2], 'one deployment recognizes the same address consistently');
  assert.notEqual(first[0].values[2], second[0].values[2], 'the hash is keyed by the secret, so a leaked table is not a list of addresses');
});

test('identifier hashing refuses to run without a secret instead of falling back to plaintext', async () => {
  const queries = [];
  const { privateIdentifier } = securityEvents({ VERCEL: '1' }, queries);
  assert.throws(() => privateIdentifier('client@example.test'), /not configured/i);
  assert.equal(queries.length, 0);
});

test('rate limit keys are hashed before they reach the database', async () => {
  const queries = [];
  const { consumeLimit } = securityEvents({ VERCEL: '1', BETTER_AUTH_SECRET: 'test-secret' }, queries);
  await consumeLimit('email:cooldown:client@example.test', 1, 30);
  const key = queries[0].values[0];
  assert.equal(key.length, 64);
  assert.ok(!key.includes('client@example.test'), 'an email address must never appear in a limiter key column');
});
