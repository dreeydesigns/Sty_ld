/**
 * Database adapter compatibility regressions (P1).
 *
 * The @vercel/postgres tagged template only accepts pooled (-pooler.) hosts
 * and rejects a direct connection string with VercelPostgresError
 * 'invalid_connection_string'. The shared pool in lib/auth-database.ts uses
 * pg, which accepts direct and pooled strings. These tests guard that every
 * reachable route and server library runs through that shared pool, that the
 * dormant modules stay dormant, and that the safety gates that must run
 * before any query still run first.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

const REPAIRED = [
  'app/api/blocks/route.ts',
  'app/api/bookings/route.ts',
  'app/api/contact/route.ts',
  'app/api/reports/route.ts',
  'app/api/services/route.ts',
  'app/api/upload/route.ts',
  'lib/analytics.ts',
  'lib/auth-server.ts',
];

const DORMANT = [
  'lib/db-sessions.ts',
  'lib/db.ts',
  'lib/identity-manager.ts',
  'lib/migrations.ts',
  'lib/passkey.ts',
  'lib/payment-provider.ts',
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function relPosix(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function load(file, dependencies = {}) {
  const source = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, cookies: { set() {} } }) } };

test('no API route imports @vercel/postgres', () => {
  const offenders = walk(path.join(ROOT, 'app'))
    .filter((file) => read(relPosix(file)).includes('@vercel/postgres'))
    .map(relPosix);
  assert.deepEqual(offenders, [], 'every API route must use the shared auth pool');
});

test('every repaired route and library runs through the shared auth pool', () => {
  for (const rel of REPAIRED) {
    const source = read(rel);
    assert.ok(!source.includes('@vercel/postgres'), `${rel} must not import @vercel/postgres`);
    assert.ok(!source.includes('await sql`'), `${rel} must not use the sql tagged template`);
    assert.ok(/\bauthPool\b/.test(source), `${rel} must call authPool`);
    assert.ok(/from ['"].*auth-database['"]/.test(source), `${rel} must import the shared pool module`);
  }
});

test('dormant @vercel/postgres modules are exactly the known allowlist', () => {
  const found = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))]
    .filter((file) => read(relPosix(file)).includes('@vercel/postgres'))
    .map(relPosix)
    .sort();
  assert.deepEqual(found, [...DORMANT].sort(), 'a new @vercel/postgres consumer appeared outside the allowlist');
});

test('the shared pool is pg and does not restrict the connection string', () => {
  const source = read('lib/auth-database.ts');
  assert.ok(/from ['"]pg['"]/.test(source), 'the shared adapter uses pg');
  assert.ok(source.includes('new Pool('), 'the shared adapter builds a pg Pool');
  assert.ok(!source.includes('-pooler.'), 'the shared adapter must accept direct and pooled hosts');
  assert.ok(!source.includes('invalid_connection_string'), 'the shared adapter must not reject a direct host');
});

test('booking commitments are gated before any database access', () => {
  const source = read('app/api/bookings/route.ts');
  for (const handler of ['POST', 'PATCH']) {
    const start = source.indexOf(`export async function ${handler}`);
    const region = source.slice(start);
    const gate = region.indexOf('BOOKING_COMMITMENTS');
    const firstQuery = region.indexOf('authPool.query');
    assert.ok(start !== -1, `${handler} handler is present`);
    assert.ok(gate !== -1 && firstQuery !== -1, `${handler} keeps its commitments gate and query`);
    assert.ok(gate < firstQuery, `${handler} must return 503 before any database access`);
  }
});

test('services error responses do not echo driver details', () => {
  const source = read('app/api/services/route.ts');
  assert.ok(!source.includes('details: String(error)'), 'driver detail must not leak to the client');
  assert.ok(!String(source).includes('@vercel/postgres'), 'services read and write go through the shared pool');
});

test('blocking is rejected before any query when unauthenticated or self-targeted', async () => {
  const calls = [];
  const pool = { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 1 }; } } };
  const route = load('app/api/blocks/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => null }) },
    '@/lib/auth-database': pool,
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const anonymous = await route.POST({ json: async () => ({ blockedId: 'user-2' }) });
  assert.equal(anonymous.status, 401);
  assert.equal(calls.length, 0, 'no query may run without a session');

  const signedIn = load('app/api/blocks/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': pool,
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });
  const selfBlock = await signedIn.POST({ json: async () => ({ blockedId: 'user-1' }) });
  assert.equal(selfBlock.status, 400);
  assert.equal(calls.length, 0, 'validation must run before any query');
});

test('a valid block runs one parameterized insert through the shared pool', async () => {
  const calls = [];
  const route = load('app/api/blocks/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 1 }; } } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await route.POST({ json: async () => ({ blockedId: 'user-2' }) });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sqlText, /INSERT INTO user_blocks/);
  assert.deepEqual(Array.from(calls[0].params), ['user-1', 'user-2']);
});

test('report validation runs before any query and the insert stays parameterized', async () => {
  const calls = [];
  const route = load('app/api/reports/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [{ id: 'rep-1', status: 'pending' }], rowCount: 1 }; } } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const invalid = await route.POST({ json: async () => ({ targetType: 'nope', targetId: 'u-2', reason: 'Abuse' }) });
  assert.equal(invalid.status, 400);
  assert.equal(calls.length, 0);

  const valid = await route.POST({ json: async () => ({ targetType: 'user', targetId: 'u-2', reason: 'Impersonation' }) });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.reportId, 'rep-1');
  assert.equal(calls.length, 1);
  assert.match(calls[0].sqlText, /INSERT INTO user_reports/);
  assert.equal(calls[0].params.length, 6, 'the reporter identity comes from the session, not the body');
  assert.equal(calls[0].params[0], 'user-1');
});

test('the contact rate limiter answers 429 before any message is stored', async () => {
  const calls = [];
  const req = { headers: { get: () => '203.0.113.9' }, json: async () => ({ name: 'QA', message: 'Hello' }) };
  const route = load('app/api/contact/route.ts', {
    'next/server': next,
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 0 }; } } },
    '@/lib/email-provider': { sendContactNotification: async () => ({ ok: true }) },
  });

  const res = await route.POST(req);
  assert.equal(res.status, 429);
  assert.equal(calls.length, 1, 'only the rate limit upsert may run');
  assert.match(calls[0].sqlText, /INSERT INTO auth_rate_limits/);
  assert.match(calls[0].sqlText, /RETURNING count/);
  assert.deepEqual(Array.from(calls[0].params), ['contact:203.0.113.9']);
});

test('contact validation rejects an empty message before the insert', async () => {
  const calls = [];
  const req = { headers: { get: () => '203.0.113.9' }, json: async () => ({ email: 'qa@example.com' }) };
  const route = load('app/api/contact/route.ts', {
    'next/server': next,
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [{ count: 1 }], rowCount: 1 }; } } },
    '@/lib/email-provider': { sendContactNotification: async () => ({ ok: true }) },
  });

  const res = await route.POST(req);
  assert.equal(res.status, 400);
  assert.equal(calls.length, 1, 'validation runs after the rate limit and before the insert');
});

test('a valid contact message is stored through the shared pool', async () => {
  const calls = [];
  const emails = [];
  const req = { headers: { get: () => '203.0.113.9' }, json: async () => ({ name: 'QA', message: 'Hello', email: 'qa@example.com' }) };
  const route = load('app/api/contact/route.ts', {
    'next/server': next,
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [{ count: 1 }], rowCount: 1 }; } } },
    '@/lib/email-provider': { sendContactNotification: async (payload) => { emails.push(payload); return { ok: true }; } },
  });

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[1].sqlText, /INSERT INTO contact_messages/);
  assert.equal(calls[1].params.length, 5);
  assert.equal(emails.length, 1, 'the notification is dispatched with the stored values');
});

test('upload rejects an anonymous request before any rate limit or write', async () => {
  const calls = [];
  const route = load('app/api/upload/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => null }) },
    cloudinary: { v2: { config() {}, uploader: { upload() {} } } },
    '@/lib/auth-resolver': { resolveCurrentStyldUser: async () => null },
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 1 }; } } },
  });

  const res = await route.POST({ headers: { get: () => 'application/json' }, json: async () => ({ dataUrl: 'data:image/png;base64,AA==' }) });
  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test('booking submission stays disabled without touching the database', async () => {
  const calls = [];
  const route = load('app/api/bookings/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 0 }; } } },
    '@/lib/feature-flags': { FEATURES: { BOOKING_COMMITMENTS: false, BOOKINGS: true } },
    '@/lib/auth-resolver': { resolveCurrentStyldUser: async () => ({ userId: 'user-1', sessionId: 'session-1', role: 'client', admin: false, mfaVerified: false, workspaceId: null }) },
    '@/lib/booking-validation': load('lib/booking-validation.ts', {}),
    '@/lib/booking-state': load('lib/booking-state.ts', {}),
  });

  const res = await route.POST({ json: async () => ({}) });
  assert.equal(res.status, 503);
  assert.match(res.body.error, /No booking or payment has been made/);
  assert.equal(calls.length, 0, 'the disabled gate must precede every query');
});

test('the services catalog reads through the shared pool', async () => {
  const calls = [];
  const route = load('app/api/services/route.ts', {
    'next/server': next,
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [{ id: 'svc-1', name: 'Braids', price: 2500 }], rowCount: 1 }; } } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
    '@/lib/auth-resolver': { requireAuthenticatedUser: async () => ({ userId: 'user-1', role: 'professional', admin: false, mfaVerified: false, workspaceId: 'ws-1' }) },
  });

  const res = await route.GET({});
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.services.length, 1);
  assert.match(calls[0].sqlText, /FROM services/);
  assert.match(calls[0].sqlText, /WHERE is_active = true/);
});

test('account deletion status reads through the shared pool', async () => {
  const calls = [];
  const authServer = load('lib/auth-server.ts', {
    './auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [{ status: 'active', deletion_requested_at: null }], rowCount: 1 }; } } },
    './auth-resolver': { requireAuthenticatedUser: async () => ({ userId: 'user-1', sessionId: 'session-1', admin: false, mfaVerified: false }), AuthError: class AuthError extends Error {} },
  });

  const status = await authServer.getAccountDeletionStatus('user-1');
  assert.equal(status.status, 'active');
  assert.equal(status.scheduledFor, null);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sqlText, /FROM users/);
  assert.deepEqual(Array.from(calls[0].params), ['user-1']);
});

test('server analytics writes and never blocks the caller on failure', async () => {
  const calls = [];
  const warnings = [];
  const analytics = load('lib/analytics.ts', {
    './auth-database': { authPool: { query: async (sqlText, params) => { calls.push({ sqlText, params }); return { rows: [], rowCount: 1 }; } } },
    './logger': { logger: { warn: (message) => warnings.push(message), info() {} } },
  });

  await analytics.recordServerEvent('qa_compatible_event', {
    userId: null,
    anonymousId: 'qa-compat-1',
    role: 'client',
    market: 'nairobi',
    properties: { password: 'blocked', zone: 'kilimani' },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sqlText, /INSERT INTO analytics_events/);
  assert.match(calls[0].sqlText, /\$6::jsonb/);
  const properties = JSON.parse(calls[0].params[5]);
  assert.equal(properties.zone, 'kilimani');
  assert.equal(properties.password, undefined, 'credential keys stay stripped');
  assert.equal(warnings.length, 0);

  await load('lib/analytics.ts', {
    './auth-database': { authPool: { query: async () => { throw new Error('pool unavailable'); } } },
    './logger': { logger: { warn: (message) => warnings.push(message), info() {} } },
  }).recordServerEvent('qa_compatible_event', { anonymousId: 'qa-compat-1' });

  assert.equal(warnings.length, 1, 'an analytics failure is logged, not thrown');
});

test('the shared pool absorbs idle connection errors with a sanitized log', () => {
  let handler = null;
  class FakePool {
    constructor(options) { this.options = options; }
    on(event, fn) { if (event === 'error') handler = fn; }
  }

  load('lib/auth-database.ts', { pg: { Pool: FakePool } });
  assert.equal(typeof handler, 'function', "pool.on('error') must be registered so a dropped idle connection cannot crash the process");

  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    handler(Object.assign(new Error('getaddrinfo ENOTFOUND ep-secret-host.example'), { code: 'ENOTFOUND' }));
  } finally {
    console.error = original;
  }

  assert.equal(logged.length, 1, 'the idle connection error is reported once');
  assert.ok(!logged[0].includes('ep-secret-host'), 'the database host must never be logged');
  assert.ok(!logged[0].includes('getaddrinfo'), 'the raw driver message must never be logged');
  assert.ok(logged[0].includes('ENOTFOUND'), 'the error code stays visible for diagnosis');
});

test('GET /api/me logs database failures without the raw error object', async () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  let res;
  try {
    const route = load('app/api/me/route.ts', {
      'next/server': next,
      '@/lib/workspace-policy': { workspaceProfile: () => ({}) },
      '@/lib/auth-resolver': {
        resolveCurrentStyldUser: async () => {
          throw Object.assign(new Error('getaddrinfo ENOTFOUND ep-secret-host.example'), { code: 'ENOTFOUND' });
        },
      },
      '@/lib/auth-database': { authPool: { query: async () => ({ rows: [] }) } },
    });
    res = await route.GET({});
  } finally {
    console.error = original;
  }

  assert.equal(res.status, 500);
  assert.equal(res.body.error, 'Server error', 'the client response stays generic');
  assert.equal(logged.length, 1, 'the failure is logged once');
  assert.ok(!logged[0].includes('ep-secret-host'), 'the database host must never be logged');
  assert.ok(!logged[0].includes('getaddrinfo'), 'the raw driver message must never be logged');
  assert.ok(logged[0].includes('ENOTFOUND'), 'the error code stays visible for diagnosis');
});
