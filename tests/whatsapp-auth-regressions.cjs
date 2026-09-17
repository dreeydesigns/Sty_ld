/**
 * WhatsApp authentication flow regression tests.
 *
 * Product-layer suite, kept separate from the P0 security suite in
 * tests/security-regressions.cjs. These exercise the WhatsApp sign-in/sign-up
 * endpoints and the provider adapter boundary.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, cookies: { set() {} } }) } };

class AuthFlowError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

function whatsappRoute({ configured = true, challenge = [], proof = [], user = [], provider = {}, limited = true } = {}) {
  const calls = [];
  const sql = async (strings) => {
    const query = strings.join('?'); calls.push(query);
    if (query.includes('auth_rate_limits')) return { rows: [], rowCount: limited ? 1 : 0 };
    if (query.includes('SET attempts')) return { rows: challenge };
    return { rows: [], rowCount: 1 };
  };
  sql.connect = async () => ({ release() {}, query: async (query) => {
    calls.push(query);
    if (query.startsWith('SELECT phone')) return { rows: proof };
    if (query.startsWith('SELECT id')) return { rows: user };
    if (query.startsWith('INSERT INTO users')) return { rows: [{ id: 'created', role: 'client' }] };
    return { rows: [] };
  } });
  const route = load('app/api/auth/whatsapp/route.ts', {
    'next/server': next, '@vercel/postgres': { sql },
    '@/lib/whatsapp-provider': { AuthFlowError,
      whatsappConfiguration() { if (!configured) throw new AuthFlowError('Unavailable', 503); },
      whatsappRequest: async () => { calls.push('PROVIDER'); return provider; },
    },
  });
  return { calls, post: (body, origin = 'https://styld.test', cookie = 'a'.repeat(64)) => route.POST({
    url: 'https://styld.test/api/auth/whatsapp', headers: { get: key => key === 'origin' ? origin : null },
    cookies: { get: () => cookie ? { value: cookie } : undefined }, json: async () => body,
  }) };
}

test('WhatsApp missing configuration cannot send messages or create sessions', async () => {
  const route = whatsappRoute({ configured: false });
  assert.equal((await route.post({ action: 'start', phone: '+254712345678' })).status, 503);
  assert.deepEqual(route.calls, []);
});
test('WhatsApp cross-origin requests fail before any database access', async () => {
  const route = whatsappRoute();
  assert.equal((await route.post({ action: 'start' }, 'https://attacker.test')).status, 403);
  assert.deepEqual(route.calls, []);
});
test('WhatsApp rate limits prevent provider sends', async () => {
  const route = whatsappRoute({ limited: false });
  assert.equal((await route.post({ action: 'start', phone: '+254712345678' })).status, 429);
  assert.equal(route.calls.includes('PROVIDER'), false);
});
test('WhatsApp requires a browser-bound challenge', async () => {
  const route = whatsappRoute();
  assert.equal((await route.post({ action: 'verify', code: '123456' }, 'https://styld.test', '')).status, 401);
  assert.deepEqual(route.calls, []);
});
test('WhatsApp expired or attempt-limited challenges never reach provider', async () => {
  const route = whatsappRoute();
  assert.equal((await route.post({ action: 'verify', code: '123456' })).status, 401);
  assert.equal(route.calls.includes('PROVIDER'), false);
});
test('WhatsApp approved response for another phone cannot authenticate', async () => {
  const route = whatsappRoute({ challenge: [{ phone: '+254712345678', verification_sid: 'VEexpected' }], provider: { status: 'approved', sid: 'VEexpected', to: '+254711111111', channel: 'whatsapp' } });
  assert.equal((await route.post({ action: 'verify', code: '123456' })).status, 400);
  assert.equal(route.calls.some(q => q.includes('SET verified_at')), false);
});
test('WhatsApp unverified or consumed proof cannot complete signup', async () => {
  const route = whatsappRoute();
  assert.equal((await route.post({ action: 'complete', firstName: 'Client', acceptTerms: true })).status, 401);
  assert.equal(route.calls.some(q => q.startsWith('INSERT INTO sessions')), false);
});
test('WhatsApp public signup cannot grant staff privileges', async () => {
  const route = whatsappRoute({ proof: [{ phone: '+254712345678' }] });
  assert.equal((await route.post({ action: 'complete', firstName: 'Client', role: 'super_admin', acceptTerms: true })).status, 400);
  assert.equal(route.calls.some(q => q.startsWith('INSERT INTO users')), false);
});
test('WhatsApp staff accounts require dedicated staff authentication', async () => {
  const route = whatsappRoute({ proof: [{ phone: '+254712345678' }], user: [{ id: 'staff', role: 'super_admin', deletion_status: 'active' }] });
  assert.equal((await route.post({ action: 'complete' })).status, 403);
  assert.equal(route.calls.some(q => q.startsWith('INSERT INTO sessions')), false);
});
test('WhatsApp signup records consent and consumes proof in the session transaction', async () => {
  const route = whatsappRoute({ proof: [{ phone: '+254712345678' }] });
  assert.equal((await route.post({ action: 'complete', firstName: 'Client', role: 'client', acceptTerms: true })).status, 200);
  assert.ok(route.calls.some(q => q.includes('terms_accepted_at')));
  assert.ok(route.calls.some(q => q.startsWith('INSERT INTO sessions')));
  assert.ok(route.calls.some(q => q.includes('SET consumed_at')));
  assert.equal(route.calls.at(-1), 'COMMIT');
});