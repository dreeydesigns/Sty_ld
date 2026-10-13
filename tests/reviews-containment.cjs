/**
 * R1 reviews containment suite.
 *
 * Locks the rule that the reviews endpoint cannot create a review, cannot
 * present an unverified record as a genuine completed-service review, and
 * cannot expose reviewer identity while genuine verification is not
 * implemented.
 *
 *   1. review submission is unavailable while verification is not implemented
 *   2. no review insert and no hardcoded verified flag may exist
 *   3. the public GET discloses no reviewer identity and no unverified records
 *   4. invalid or forged requests cannot bypass the restriction
 *   5. containment does not depend on booking or payment feature flags
 *
 * The route behavior is exercised directly through the shared VM harness.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function load(file, dependencies = {}) {
  const code = ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {
    console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch,
  })((name) => (name in dependencies ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

const next = {
  NextResponse: {
    json: (body, options = {}) => ({ body, status: options.status || 200 }),
  },
};

function reviewsRoute({ token = 'token', sessionResult = { id: 'user-1' }, sessionThrows = false, onSql } = {}) {
  return load('app/api/reviews/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => (token ? { value: token } : null) }) },
    '@vercel/postgres': { sql: async () => { if (onSql) onSql(); return { rows: [] }; } },
    '@/lib/auth-server': {
      verifySession: async () => {
        if (sessionThrows) throw new Error('invalid session');
        return sessionResult;
      },
    },
  });
}

test('review submission is unavailable while genuine verification is not implemented', async () => {
  let sqlCalls = 0;
  const route = reviewsRoute({ onSql: () => { sqlCalls += 1; } });

  const res = await route.POST({ json: async () => ({ bookingId: 'b-1', rating: 5 }) });
  assert.equal(res.status, 503, 'an authenticated submit is contained with HTTP 503');
  assert.equal(res.body.ok, false);
  assert.equal(res.body.code, 'reviews_unavailable');
  assert.match(res.body.error, /unavailable/i);
  assert.equal(sqlCalls, 0, 'no database write may occur while contained');
});

test('no review insert and no hardcoded verified flag exist in the endpoint', () => {
  const api = stripped('app/api/reviews/route.ts');
  assert.doesNotMatch(api, /INSERT\s+INTO\s+reviews/i, 'endpoint must never insert a review');
  assert.doesNotMatch(api, /is_verified/i, 'no verified flag may be written or read');
  assert.doesNotMatch(api, /verified:\s*true/i, 'no hardcoded verified true may exist');
  assert.doesNotMatch(api, /RETURNING/i, 'no insert with returning may exist');
  assert.doesNotMatch(api, /@vercel\/postgres/i, 'endpoint must not reach the database at all');
});

test('the public GET discloses no reviewer identity and no unverified records', async () => {
  let sqlCalls = 0;
  const route = reviewsRoute({ onSql: () => { sqlCalls += 1; } });

  const res = await route.GET(new URL('https://styld.test/api/reviews?providerSlug=glow'));
  assert.equal(res.status, 503, 'public reads are contained with HTTP 503');
  assert.equal(res.body.ok, false);
  assert.equal(res.body.code, 'reviews_unavailable');

  const serialized = JSON.stringify(res.body);
  assert.equal('reviews' in res.body, false, 'no records are returned');
  assert.doesNotMatch(serialized, /first_name|client_first_name|reviewer/i, 'no reviewer identity leaks');
  assert.equal(sqlCalls, 0, 'public read must not query the database');

  const api = stripped('app/api/reviews/route.ts');
  assert.doesNotMatch(api, /client_first_name/, 'no name column may be selected');
  assert.doesNotMatch(api, /SELECT/i, 'no read query may remain');
});

test('invalid or forged requests cannot bypass the review restriction', async () => {
  let sqlCalls = 0;
  const onSql = () => { sqlCalls += 1; };

  const noSession = reviewsRoute({ token: null, onSql });
  const unauth = await noSession.POST({ json: async () => ({}) });
  assert.equal(unauth.status, 401, 'a missing session is still rejected');

  const badSession = reviewsRoute({ sessionThrows: true, onSql });
  const invalid = await badSession.POST({ json: async () => ({}) });
  assert.equal(invalid.status, 401, 'an invalid session is still rejected');

  const forged = reviewsRoute({ onSql });
  const forgedStatus = await forged.POST({ json: async () => ({ bookingId: 'b-1', rating: 5, status: 'completed', is_verified: true }) });
  assert.equal(forgedStatus.status, 503, 'a forged completed status cannot create a review');
  const noBody = await forged.POST({ json: async () => { throw new Error('body must not be parsed'); } });
  assert.equal(noBody.status, 503, 'request body is never parsed, so it cannot bypass containment');

  assert.equal(sqlCalls, 0, 'no bypass path may reach the database');
});

test('containment does not depend on booking or payment feature flags', () => {
  const flags = load('lib/feature-flags.ts');
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false, 'booking commitments stay disabled');
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false, 'payments stay disabled');
  assert.equal(flags.FEATURES.BOOKINGS, true, 'the booking surface itself is unchanged');

  const api = stripped('app/api/reviews/route.ts');
  assert.doesNotMatch(api, /BOOKING_COMMITMENTS/, 'containment must not rely on the booking flag');
  assert.doesNotMatch(api, /FEATURES/, 'containment must not read feature flags');
});
