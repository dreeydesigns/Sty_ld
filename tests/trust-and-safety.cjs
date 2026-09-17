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

test('review submission requires an existing completed booking', async () => {
  // Booking status is 'pending', not 'completed'
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': {
      sql: async (strings) => {
        const query = strings.join(' ');
        if (query.includes('FROM bookings')) {
          return { rows: [{ id: 'b-1', client_id: 'user-1', status: 'pending' }] };
        }
        return { rows: [] };
      },
    },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /completed/i);
});

test('review submission prevents non-client from reviewing', async () => {
  // Booking client is 'user-2', but current user is 'user-1'
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': {
      sql: async (strings) => {
        const query = strings.join(' ');
        if (query.includes('FROM bookings')) {
          return { rows: [{ id: 'b-1', client_id: 'user-2', status: 'completed' }] };
        }
        return { rows: [] };
      },
    },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 403);
});

test('review submission prevents duplicate reviews for same booking', async () => {
  const reviewsRoute = load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': {
      sql: async (strings) => {
        const query = strings.join(' ');
        if (query.includes('FROM bookings')) {
          return { rows: [{ id: 'b-1', client_id: 'user-1', status: 'completed' }] };
        }
        if (query.includes('FROM reviews WHERE booking_id')) {
          return { rows: [{ id: 'rev-already-exists' }] };
        }
        return { rows: [] };
      },
    },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await reviewsRoute.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 409);
});

test('report submission validates targetType and reason', async () => {
  const reportsRoute = load('app/api/reports/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'token' }) }) },
    '@vercel/postgres': { sql: async () => ({ rows: [{ id: 'rep-1', status: 'pending' }] }) },
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
    '@vercel/postgres': { sql: async () => ({ rows: [] }) },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-1' }) },
  });

  const res = await blocksRoute.POST({ json: async () => ({ blockedId: 'user-1' }) });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /own account/i);
});
