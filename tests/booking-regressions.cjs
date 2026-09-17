/**
 * Booking lifecycle regression tests.
 *
 * Product-layer suite, kept separate from the P0 security suite in
 * tests/security-regressions.cjs.
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

test('booking validation rejects old demo dates and impossible dates', () => {
  const validation = load('lib/booking-validation.ts', {});
  assert.equal(validation.validBookingDate('18 Apr'), false);
  assert.equal(validation.validBookingDate('2000-04-18'), false);
  assert.equal(validation.validBookingDate('2099-02-30'), false);
  assert.equal(validation.validBookingDate('2099-04-18'), true);
});
test('booking time validation accepts UI and database times only', () => {
  const validation = load('lib/booking-validation.ts', {});
  assert.equal(validation.validBookingTime('9:30 AM'), true);
  assert.equal(validation.validBookingTime('21:30:00'), true);
  assert.equal(validation.validBookingTime('25:00'), false);
  assert.equal(validation.validBookingTime({}), false);
});

function bookingRoute(rows = []) {
  return load('app/api/bookings/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'session-token' }) }) },
    '@vercel/postgres': { sql: async () => ({ rows }) },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'user-123' }) },
    '@/lib/booking-validation': load('lib/booking-validation.ts', {}),
    '@/lib/booking-state': load('lib/booking-state.ts', {}),
  });
}
test('a client cannot mark their own booking completed', async () => {
  const response = await bookingRoute().PATCH({ json: async () => ({ bookingId: 'booking-1', status: 'completed' }) });
  assert.equal(response.status, 400);
});
test('editing a missing or unowned booking cannot report success', async () => {
  const response = await bookingRoute().PATCH({ json: async () => ({ bookingId: 'booking-1', status: 'cancelled' }) });
  assert.equal(response.status, 409);
});
test('a saved cancellation returns success', async () => {
  const response = await bookingRoute([{ id: 'booking-1' }]).PATCH({ json: async () => ({ bookingId: 'booking-1', status: 'cancelled' }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});
