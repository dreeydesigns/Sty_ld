/**
 * P0 security regression tests.
 *
 * Covers the authentication/authorization remediation:
 *   - server-side session verification (expiry + deleted/deactivated accounts)
 *   - password-less accounts can never authenticate (legacy-account bypass fix)
 *   - disabled public sign-in / phone-only session-creation endpoints (410 Gone)
 *   - middleware authorization: the `session` cookie is the ONLY credential and
 *     `user_id` / `assumed_role` cookies can never grant access on their own;
 *     roles are resolved server-side via /api/me
 *
 * Product-layer regressions (WhatsApp auth flow, booking rules) live in
 * tests/whatsapp-auth-regressions.cjs and tests/booking-regressions.cjs.
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

function auth(rows) {
  return load('lib/auth-server.ts', {
    '@vercel/postgres': { sql: async () => ({ rows }) },
    '@/lib/auth': { comparePasswords: async (password, hash) => password === 'correct' && hash === 'stored-hash', hashPassword: async () => 'hashed' },
  });
}

test('session verification returns the user from the first database row', async () => {
  const user = await auth([{ user_id: 'user-123' }]).verifySession('token');
  assert.equal(user.id, 'user-123');
});
test('missing sessions are rejected', async () => {
  await assert.rejects(auth([]).verifySession('token'), /Unauthorized/);
});
test('password sign-in reads the password hash and user from the first row', async () => {
  const user = await auth([{ id: 'user-123', password_hash: 'stored-hash', first_name: 'Client', role: 'client' }]).verifyUserCredentials('+254712345678', 'correct');
  assert.equal(user.id, 'user-123');
});
test('wrong passwords cannot authenticate', async () => {
  assert.equal(await auth([{ password_hash: 'stored-hash' }]).verifyUserCredentials('+254712345678', 'wrong'), null);
});
test('legacy accounts without a password cannot bypass authentication', async () => {
  assert.equal(await auth([{ password_hash: null }]).verifyUserCredentials('+254712345678', 'correct'), null);
});
test('createUser returns the inserted user ID', async () => {
  const user = await auth([{ id: 'new-user', first_name: 'Client', role: 'client' }]).createUser({ phone: '+254712345678', firstName: 'Client', password: 'password' });
  assert.equal(user.id, 'new-user');
});

test('phone alone cannot create a session', async () => {
  let touchedDatabase = false;
  const route = load('app/api/auth/phone-signin/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => { touchedDatabase = true; return { rows: [] }; } },
    '@/lib/auth-server': {}, '@/lib/auth': {},
  });
  const response = await route.POST({ json: async () => ({ phone: '+254712345678' }) });
  // The endpoint was permanently disabled during security remediation (see
  // SECURITY_REMEDIATION_REPORT.md) and must answer 410 Gone for all requests.
  assert.equal(response.status, 410);
  assert.equal(response.body.disabled, true);
  assert.equal(touchedDatabase, false);
});
test('public signup cannot assign an administrator role', async () => {
  let touchedDatabase = false;
  let createdSession = false;
  const route = load('app/api/auth/phone-signin/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => { touchedDatabase = true; return { rows: [] }; } },
    '@/lib/auth-server': { createSession: async () => { createdSession = true; } },
    '@/lib/auth': {},
  });
  const response = await route.POST({ json: async () => ({ phone: '+254712345678', password: 'long-password', firstName: 'Client', signup: true, role: 'super_admin' }) });
  // Disabled endpoint: no role escalation path may remain reachable, and no
  // user record or session may ever be created through this route.
  assert.equal(response.status, 410);
  assert.equal(response.body.disabled, true);
  assert.equal(touchedDatabase, false);
  assert.equal(createdSession, false);
});
test('signup with an existing phone never grants that account a session', async () => {
  let createdSession = false;
  const route = load('app/api/auth/client/signup/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => ({ rows: [{ id: 'existing-user' }] }) },
    '@/lib/auth': {}, '@/lib/personalization': {},
    '@/lib/auth-server': { createSession: async () => { createdSession = true; } },
  });
  const response = await route.POST({ json: async () => ({ firstName: 'Client', phone: '+254712345678', password: 'long-password' }) });
  assert.equal(response.status, 410);
  assert.equal(createdSession, false);
});

// ── Middleware authorization: the session cookie must be the only path in ────
// The desired model: opaque session cookie → server-validated via /api/me →
// role resolved from server state. user_id/assumed_role cookies must never
// independently grant authentication or authorization.

function middlewareHarness({ session, meStatus = 401, meBody = { user: null }, extraCookies = {} } = {}) {
  const fetchCalls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    fetchCalls.push({ url: String(url), cookie: init.headers?.cookie });
    return { ok: meStatus === 200, status: meStatus, json: async () => meBody };
  };
  const mod = load('middleware.ts', {
    'next/server': {
      NextResponse: {
        next: () => ({ kind: 'next' }),
        redirect: (url) => ({ kind: 'redirect', url: String(url) }),
      },
    },
    '@/lib/feature-flags': load('lib/feature-flags.ts', {}),
  });
  global.fetch = realFetch;
  const cookies = { ...extraCookies };
  if (session !== undefined) cookies.session = session;
  const request = (pathname) => ({
    url: 'https://styld.test' + pathname,
    nextUrl: new URL('https://styld.test' + pathname),
    cookies: { get: (name) => (name in cookies ? { value: cookies[name] } : undefined) },
  });
  return { middleware: mod.middleware, request, fetchCalls };
}

test('middleware: no session but forged user_id cookie cannot reach a protected route', async () => {
  const h = middlewareHarness({ extraCookies: { user_id: 'forged-victim-id' } });
  const res = await h.middleware(h.request('/home'));
  assert.equal(res.kind, 'redirect');
  assert.ok(res.url.includes('/auth/sign-in'));
  // No session token means /api/me must never even be consulted.
  assert.equal(h.fetchCalls.length, 0);
});

test('middleware: no session but forged assumed_role=admin cookie cannot reach /admin', async () => {
  const h = middlewareHarness({ extraCookies: { assumed_role: 'admin' } });
  const res = await h.middleware(h.request('/admin'));
  assert.equal(res.kind, 'redirect');
  assert.ok(res.url.includes('/auth/sign-in'));
  assert.equal(h.fetchCalls.length, 0);
});

test('middleware: valid client session with forged assumed_role=admin is denied /admin', async () => {
  const h = middlewareHarness({ session: 'client-token', meStatus: 200, meBody: { user: { role: 'client' } } });
  const res = await h.middleware(h.request('/admin'));
  assert.equal(res.kind, 'redirect');
  assert.ok(res.url.includes('/unauthorized'));
  assert.equal(h.fetchCalls.length, 1);
  assert.ok(h.fetchCalls[0].cookie.includes('session=client-token'));
});

test('middleware: valid professional session may use /pro', async () => {
  const h = middlewareHarness({ session: 'pro-token', meStatus: 200, meBody: { user: { role: 'professional' } } });
  const res = await h.middleware(h.request('/pro/dashboard'));
  assert.equal(res.kind, 'next');
});

test('middleware: valid admin session may use /admin', async () => {
  const h = middlewareHarness({ session: 'admin-token', meStatus: 200, meBody: { user: { role: 'admin' } } });
  const res = await h.middleware(h.request('/admin'));
  assert.equal(res.kind, 'next');
});

test('middleware: expired or revoked session is rejected on protected routes', async () => {
  const h = middlewareHarness({ session: 'expired-token', meStatus: 401, meBody: { ok: false, user: null } });
  const res = await h.middleware(h.request('/settings'));
  assert.equal(res.kind, 'redirect');
  assert.ok(res.url.includes('/auth/sign-in'));
});