const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console, process, Buffer, Date, URL, Response, Headers, crypto: require('node:crypto').webcrypto,
    AbortSignal, fetch: (...args) => globalThis.fetch(...args),
  })((name) => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}

const REASON = {
  NOT_CONFIGURED: 'EMAIL_NOT_CONFIGURED',
  NO_SENDER: 'EMAIL_NO_SENDER',
  INVALID_KEY: 'RESEND_INVALID_KEY',
  DOMAIN_NOT_VERIFIED: 'RESEND_DOMAIN_NOT_VERIFIED',
  INVALID_SENDER: 'RESEND_INVALID_SENDER',
  RATE_LIMITED: 'RESEND_RATE_LIMITED',
  UPSTREAM: 'RESEND_UPSTREAM_ERROR',
  NETWORK: 'EMAIL_NETWORK_ERROR',
};

test('failure classifier maps Resend responses to short reason codes', () => {
  const r = load('lib/email-reason.ts');
  assert.equal(r.classifyResendFailure(401, { name: 'invalid_api_key' }), REASON.INVALID_KEY);
  assert.equal(r.classifyResendFailure(403, {}), 'RESEND_DELIVERY_REJECTED');
  assert.equal(r.classifyResendFailure(429, { name: 'rate_limit_exceeded' }), REASON.RATE_LIMITED);
  assert.equal(r.classifyResendFailure(422, { name: 'validation_error', message: 'The sender domain must be verified' }), REASON.DOMAIN_NOT_VERIFIED);
  assert.equal(r.classifyResendFailure(422, { name: 'validation_error', message: 'from is required' }), REASON.INVALID_SENDER);
  assert.equal(r.classifyResendFailure(500, { name: 'internal_server_error' }), REASON.UPSTREAM);
  assert.equal(r.classifyResendFailure(0, {}), REASON.NETWORK);
});

test('provider restrictions are distinct from missing configuration and invalid credentials', () => {
  const r = load('lib/email-reason.ts');
  const restricted = r.classifyResendFailure(403, { name: 'validation_error', message: 'You can only send testing emails to your own email address (owner@example.test).' });
  assert.equal(restricted, 'RESEND_TEST_RECIPIENT_RESTRICTED');
  assert.equal(r.classifyResendFailure(403, { message: 'The example.test domain is not verified' }), REASON.DOMAIN_NOT_VERIFIED);
  assert.equal(r.classifyResendFailure(403, { name: 'restricted_api_key' }), REASON.INVALID_KEY);
  for (const code of [restricted, REASON.DOMAIN_NOT_VERIFIED, REASON.INVALID_SENDER, 'RESEND_DELIVERY_REJECTED']) {
    assert.equal(r.isConfigLevelReason(code), false);
    const message = r.uiMessageForSendError({ code, message: 'private provider detail owner@example.test' });
    assert.match(message, /could not deliver/i);
    assert.doesNotMatch(message, /not configured|owner@|private provider/);
  }
});

test('config-level reasons produce a distinct setup message, others a generic one', () => {
  const r = load('lib/email-reason.ts');
  for (const code of [REASON.NOT_CONFIGURED, REASON.NO_SENDER, REASON.INVALID_KEY]) {
    assert.equal(r.isConfigLevelReason(code), true, code);
    assert.match(r.userMessageForReasonCode(code), /not configured/, code);
  }
  for (const code of [REASON.UPSTREAM, REASON.NETWORK]) {
    assert.equal(r.isConfigLevelReason(code), false, code);
    assert.equal(r.userMessageForReasonCode(code), 'We could not deliver your code. Please try again later.');
  }
});

test('UI send-error mapping shows the setup message only for config-level reasons', () => {
  const r = load('lib/email-reason.ts');
  assert.equal(r.uiMessageForSendError({ code: REASON.DOMAIN_NOT_VERIFIED, message: 'server detail' }), r.userMessageForReasonCode(REASON.DOMAIN_NOT_VERIFIED));
  assert.equal(r.uiMessageForSendError({ code: 'OTHER', message: 'Server says no' }), 'Server says no');
  assert.equal(r.uiMessageForSendError({}), 'Could not send your code.');
});

test('email provider reports fail-closed results with reason codes and never the OTP', async () => {
  const reason = load('lib/email-reason.ts');
  const loggerModule = { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } };
  const provider = load('lib/email-provider.ts', { './email-reason': reason, './logger': loggerModule });
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalUrl = process.env.RESEND_API_URL;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = 'no-reply@styld.test';
    let result = await provider.sendEmail({ to: 'a@b.test', subject: 's', text: 't' });
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, REASON.NOT_CONFIGURED);

    process.env.RESEND_API_KEY = 're_0000000000000000000000000';
    globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ name: 'validation_error', message: 'The sender domain must be verified' }) });
    result = await provider.sendEmail({ to: 'a@b.test', subject: 's', text: 't' });
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, REASON.DOMAIN_NOT_VERIFIED);

    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ name: 'invalid_api_key' }) });
    result = await provider.sendEmail({ to: 'a@b.test', subject: 's', text: 't' });
    assert.equal(result.reasonCode, REASON.INVALID_KEY);

    globalThis.fetch = async () => { throw new Error('ENOTFOUND api.resend.com'); };
    result = await provider.sendEmail({ to: 'a@b.test', subject: 's', text: 't' });
    assert.equal(result.reasonCode, REASON.NETWORK);

    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'mail-1' }) });
    result = await provider.sendEmail({ to: 'a@b.test', subject: 's', text: 't' });
    assert.equal(result.ok, true);
    assert.equal(result.messageId, 'mail-1');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
    if (originalUrl === undefined) delete process.env.RESEND_API_URL; else process.env.RESEND_API_URL = originalUrl;
  }
});

test('environment diagnostics expose booleans only, never values', () => {
  const d = load('lib/email-diagnostics.ts');
  const original = {};
  for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'POSTGRES_URL', 'DATABASE_URL']) {
    original[name] = process.env[name];
  }
  try {
    process.env.RESEND_API_KEY = 're_supersecretvalue';
    process.env.RESEND_FROM_EMAIL = '';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
    process.env.BETTER_AUTH_SECRET = 'shhhnotforlogs';
    delete process.env.POSTGRES_URL;
    process.env.DATABASE_URL = 'postgres://user:pass@host/db';
    const status = d.emailAndAuthEnvStatus();
    assert.equal(status.email.RESEND_API_KEY, true);
    assert.equal(status.email.RESEND_FROM_EMAIL, false);
    assert.equal(status.auth.BETTER_AUTH_URL, true);
    assert.equal(status.auth.BETTER_AUTH_SECRET, true);
    assert.equal(status.database.POSTGRES_URL, true);
    assert.equal(status.emailServiceConfigured, false);
    const serialized = JSON.stringify(status);
    assert.equal(serialized.includes('re_supersecretvalue'), false);
    assert.equal(serialized.includes('shhhnotforlogs'), false);
    assert.match(serialized, /"RESEND_API_KEY":true/);
  } finally {
    for (const name of Object.keys(original)) {
      if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
    }
  }
});

test('rejections, throttling, timeouts and outages fail closed without logging provider payloads', async () => {
  const reason = load('lib/email-reason.ts');
  const logs = [];
  const provider = load('lib/email-provider.ts', { './email-reason': reason, './logger': { logger: { error: (...args) => logs.push(args) } } });
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const savedFrom = process.env.RESEND_FROM_EMAIL;
  try {
    process.env.RESEND_API_KEY = 'synthetic-provider-key';
    process.env.RESEND_FROM_EMAIL = 'sender@example.test';
    for (const [status, name, message, expected] of [
      [403, 'validation_error', 'You can only send testing emails to your own email address', 'RESEND_TEST_RECIPIENT_RESTRICTED'],
      [403, 'restricted_api_key', 'restricted credential', REASON.INVALID_KEY],
      [429, 'rate_limit_exceeded', 'rate exceeded', REASON.RATE_LIMITED],
      [503, 'internal_server_error', 'upstream unavailable', REASON.UPSTREAM],
    ]) {
      globalThis.fetch = async () => ({ ok: false, status, json: async () => ({ name, message: message + ' private-payload-canary' }) });
      const result = await provider.sendEmail({ to: 'recipient@example.test', subject: 'Test', text: 'synthetic-content-canary' });
      assert.equal(result.ok, false);
      assert.equal(result.reasonCode, expected);
      assert.equal(logs.at(-1)[2].httpStatus, status);
    }
    globalThis.fetch = async () => { throw new DOMException('private-payload-canary', 'TimeoutError'); };
    assert.equal((await provider.sendEmail({ to: 'recipient@example.test', subject: 'Test', text: 'synthetic-content-canary' })).reasonCode, REASON.NETWORK);
    assert.doesNotMatch(JSON.stringify(logs), /private-payload-canary|synthetic-content-canary|synthetic-provider-key/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (savedFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = savedFrom;
  }
});

test('auth health check is token-gated, disabled without a token, and reports booleans only', async () => {
  const diagnostics = load('lib/email-diagnostics.ts');
  const endpoint = load('app/api/health/auth/route.ts', { '@/lib/email-diagnostics': diagnostics });
  const originalToken = process.env.HEALTH_CHECK_TOKEN;
  const header = (value) => ({ headers: { get: (name) => (name === 'x-health-check-token' ? value : null) } });
  try {
    delete process.env.HEALTH_CHECK_TOKEN;
    assert.equal((await endpoint.GET(header('anything'))).status, 404, 'disabled when the token is unset');

    process.env.HEALTH_CHECK_TOKEN = 'secret-token-123';
    assert.equal((await endpoint.GET(header(null))).status, 404, 'missing header');
    assert.equal((await endpoint.GET(header('wrong-token'))).status, 404, 'wrong header');

    const ok = await endpoint.GET(header('secret-token-123'));
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.ok, true);
    assert.equal(typeof body.configured.emailServiceConfigured, 'boolean');
    const walk = (node) => {
      if (node && typeof node === 'object') { for (const value of Object.values(node)) walk(value); return; }
      assert.equal(typeof node, 'boolean');
    };
    walk(body.configured);
  } finally {
    if (originalToken === undefined) delete process.env.HEALTH_CHECK_TOKEN; else process.env.HEALTH_CHECK_TOKEN = originalToken;
  }
});
