/**
 * Tests for Trust, Safety, Reports, Blocking and Verified Reviews
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}) {
  // These tests isolate identity/SQL behavior; origin tests use real requests.
  dependencies = { '@/lib/api-security': { sameOrigin() {}, authError() { throw new Error('Unexpected origin failure'); } }, ...dependencies };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const next = {
  NextResponse: {
    json: (body, options = {}) => ({ body, status: options.status || 200 }),
  },
};

test('review submission rejects unauthenticated requests', async () => {
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => null }) },
    '@vercel/postgres': { sql: async () => ({ rows: [] }) },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 401);
});

test('review submission is unavailable while genuine verification is not implemented', async () => {
  // Even an otherwise eligible client (own, completed booking) cannot create a review.
  let sqlCalls = 0;
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': { sql: async () => { sqlCalls += 1; return { rows: [] }; } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 503);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.code, 'reviews_unavailable');
  assert.equal(sqlCalls, 0, 'contained endpoint must not touch the database');
});

test('review submission cannot manufacture eligibility from a modified status or body', async () => {
  let sqlCalls = 0;
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': { sql: async () => { sqlCalls += 1; return { rows: [] }; } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  // A client forging a completed status must not be able to create a review.
  const forged = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5, status: 'completed' }) });
  assert.equal(forged.status, 503);

  // A malformed or hostile body is still answered with the same containment response.
  const malformed = await reviewsRoute.POST({ json: async () => ({ bookingId: '../../etc', rating: 99 }) });
  assert.equal(malformed.status, 503);

  assert.equal(sqlCalls, 0, 'no request body can reach the database');
});

test('report submission validates targetType and reason', async () => {
  const reportsRoute = load('app/api/reports/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@/lib/auth-database': { authPool: { query: async () => ({ rows: [{ id: 'rep-1', status: 'pending' }] }) } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  // Invalid target type
  const badTarget = await reportsRoute.POST({ json: async () => ({ targetType: 'invalid_type', targetId: '123', reason: 'Abuse' }) });
  assert.equal(badTarget.status, 400);

  // Valid target type & reason
  const valid = await reportsRoute.POST({ json: async () => ({ targetType: 'user', targetId: 'u-2', reason: 'Impersonation' }) });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.ok, true);
});

test('user blocking prevents self-blocking', async () => {
  const blocksRoute = load('app/api/blocks/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@/lib/auth-database': { authPool: { query: async () => ({ rows: [] }) } },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await blocksRoute.POST({ json: async () => ({ blockedId: 'user-1' }) });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /own account/i);
});
