/**
 * T0 booking-flow regression suite.
 *
 * Locks the behavior that must survive the planned booking refactor:
 *   1. provider and service deep links
 *   2. guest booking drafts
 *   3. draft persistence across a refresh
 *   4. sign-in then return to booking
 *   5. server-side feature gates
 *   6. disabled booking and payment behavior
 *   7. no false booking-success state when the API rejects the request
 *
 * This suite does not change any implementation code. It reads the shipped
 * component transitions and exercises the real store, guest-session and route
 * modules through the same VM harness used by the existing suites.
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

function load(file, dependencies = {}, extraGlobals = {}) {
  const code = ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {
    console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch, Date, ...extraGlobals,
  })((name) => (name in dependencies ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

// booking-experience keeps the deep-link and resume logic inline in effects.
// Strip line comments so ordering assertions match the executed statements.
const bookingExperience = source('components/booking-experience.tsx').replace(/\/\/[^\n]*/g, '');

test('provider and service deep links: reads targetType, targetId and service ids only', () => {
  assert.match(bookingExperience, /searchParams\.get\("targetType"\)/);
  assert.match(bookingExperience, /searchParams\.get\("targetId"\)/);
  assert.match(bookingExperience, /searchParams\.get\("serviceIds"\)\s*\|\|\s*searchParams\.get\("serviceId"\)/);
  assert.match(bookingExperience, /queryTargetType === "salons"\s*\|\|\s*queryTargetType === "professionals"/);
});

test('provider and service deep links: both preselected advances to date, service only stays on services', () => {
  const start = bookingExperience.indexOf('if (rawServiceParam)');
  const end = bookingExperience.indexOf('}, [searchParams, setSelectedServices, setStep, setTarget]);', start);
  assert.ok(start !== -1 && end !== -1, 'service deep-link effect is present');
  const block = bookingExperience.slice(start, end);
  const bothForwards = /ids\.length && queryTargetId[\s\S]{0,80}?setStep\(2\)/.test(block);
  const serviceOnlyStays = /else if \(ids\.length\)\s*\{\s*setStep\(1\)/.test(block);
  assert.equal(bothForwards, true, 'provider plus service deep link advances to step 2');
  assert.equal(serviceOnlyStays, true, 'service only deep link stays on step 1');
});

test('resume deep link restores the guest draft and returns to the date step', () => {
  assert.match(bookingExperience, /searchParams\.get\("resume"\)\s*!==\s*"booking"/);
  const resumeBlock = bookingExperience.match(/const restored = restoreBookingDraft\(\);[\s\S]*?\}, \[restoreBookingDraft/);
  assert.ok(resumeBlock, 'resume effect is present');
  assert.match(resumeBlock[0], /setStep\(3\)/);
});

function bookingStore(storage = memoryStorage()) {
  const window = { sessionStorage: storage };
  const store = load('lib/booking-store.ts', { '@/lib/site-data': { bookingDates: [], bookingTimes: [] } }, { window });
  return { hook: store.useBookingStore, storage };
}

test('guest booking draft saves booking context but never contact or note details', () => {
  const { hook, storage } = bookingStore();
  const state = hook.getState();
  state.setTarget('professionals', 'pro-1');
  state.setSelectedServices(['svc-1', 'svc-2']);
  state.setDate('2099-01-01');
  state.setTime('10:00');
  state.setContact('email', 'guest@example.test');
  state.setContact('phone', '+254700000000');
  state.setContact('note', 'private address detail');
  state.saveBookingDraft();

  const raw = storage.getItem('mobile-salon.booking-draft.v1');
  assert.ok(raw, 'a draft was written');
  assert.doesNotMatch(raw, /guest@example\.test|\+254700000000|private address detail/);
  assert.doesNotMatch(raw, /contact|note|email|phone/i);
});

test('guest booking draft persists across a refresh (fresh store, same storage)', () => {
  const storage = memoryStorage();
  const first = bookingStore(storage).hook.getState();
  first.setTarget('salons', 'salon-9');
  first.setSelectedServices(['svc-a']);
  first.setDate('2099-02-02');
  first.setTime('14:30');
  first.saveBookingDraft();

  // A refresh builds a brand new store over the same sessionStorage.
  const afterRefresh = bookingStore(storage).hook;
  assert.equal(afterRefresh.getState().restoreBookingDraft(), true);
  const restored = afterRefresh.getState();
  assert.equal(restored.targetType, 'salons');
  assert.equal(restored.targetId, 'salon-9');
  assert.deepEqual([...restored.selectedServiceIds], ['svc-a']);
  assert.equal(restored.selectedDate, '2099-02-02');
  assert.equal(restored.selectedTime, '14:30');
  assert.equal(restored.contact.email, '', 'contact details are not restored from the draft');
});

test('expired and malformed booking drafts are rejected and cleared', () => {
  const storage = memoryStorage();
  storage.setItem('mobile-salon.booking-draft.v1', JSON.stringify({
    targetType: 'salons', targetId: null, selectedServiceIds: [],
    selectedDate: '2099-01-01', selectedTime: '10:00', savedAt: '2000-01-01',
  }));
  assert.equal(bookingStore(storage).hook.getState().restoreBookingDraft(), false);

  storage.setItem('mobile-salon.booking-draft.v1', '{broken');
  assert.equal(bookingStore(storage).hook.getState().restoreBookingDraft(), false);
});

test('sign-in return path: booking gate saves the booking URL and returns it after auth', () => {
  const localStorage = memoryStorage();
  const events = [];
  const window = { localStorage, dispatchEvent: (event) => events.push(event) };
  class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options && options.detail; }
  }
  // guest-session reads the bare global localStorage, so provide it alongside window.
  const guest = load('lib/guest-session.ts', { './auth-policy': load('lib/auth-policy.ts') }, { window, localStorage, CustomEvent });

  guest.openGuestGate('booking', '/book?resume=booking');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, guest.GUEST_GATE_EVENT);
  assert.equal(events[0].detail.reason, 'booking');
  assert.equal(guest.getGuestReturn(), '/book?resume=booking');

  guest.clearGuestReturn();
  assert.equal(guest.getGuestReturn(), null);
});

test('sign-in return path only accepts internal, non-auth URLs', () => {
  const policy = load('lib/auth-policy.ts');
  assert.equal(policy.safeReturnTo('https://evil.example/book'), '/home');
  assert.equal(policy.safeReturnTo('//evil.example/book'), '/home');
  assert.equal(policy.safeReturnTo('/auth/sign-in'), '/home');
  assert.equal(policy.safeReturnTo('/api/bookings'), '/home');
  assert.equal(policy.safeReturnTo('/book?resume=booking'), '/book?resume=booking');
});

test('the booking confirm action saves the draft and opens the guest gate before any submit', () => {
  const confirm = bookingExperience.match(/const session = readAppSession\(\);[\s\S]*?setStatus\("processing"\);/);
  assert.ok(confirm, 'guest check in handleConfirm is present');
  assert.match(confirm[0], /saveBookingDraft\(\)/);
  assert.match(confirm[0], /openGuestGate\("booking", "\/book\?resume=booking"\)/);
  assert.ok(
    confirm[0].indexOf('saveBookingDraft()') < confirm[0].indexOf('openGuestGate'),
    'the draft is saved before the gate opens',
  );
});

test('server-side feature gates keep engagement off: booking commitments and payments disabled', () => {
  const flags = load('lib/feature-flags.ts');
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.equal(flags.FEATURES.BOOKINGS, true, 'the booking surface itself is enabled');
  assert.equal(flags.isFeatureEnabled('BOOKING_COMMITMENTS'), false);
});

function bookingRoute(features = { BOOKING_COMMITMENTS: false }) {
  const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
  return load('app/api/bookings/route.ts', {
    'next/server': next,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'session-token' }) }) },
    '@/lib/auth-database': { authPool: { query: async () => ({ rows: [] }) } },
    '@/lib/feature-flags': { FEATURES: features },
    '@/lib/auth-resolver': {
      resolveCurrentStyldUser: async () => ({
        userId: 'user-123', sessionId: 'session-1', role: 'client',
        admin: false, mfaVerified: false, roles: ['client'], workspaceId: null,
      }),
    },
    '@/lib/booking-validation': load('lib/booking-validation.ts'),
    '@/lib/booking-state': load('lib/booking-state.ts'),
  });
}

test('disabled booking behavior: submit is rejected with no booking or payment made', async () => {
  const response = await bookingRoute().POST({ json: async () => ({}) });
  assert.equal(response.status, 503);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /No booking or payment has been made/);
});

test('no false booking-success state: the UI only reaches done after the API accepts', () => {
  const start = bookingExperience.indexOf('const response = await fetch("/api/bookings"');
  const done = bookingExperience.indexOf('setStatus("done")');
  assert.ok(start !== -1 && done !== -1, 'submit and success lines are present');
  assert.ok(start < done, 'the submit response is inspected before success is set');
  const between = bookingExperience.slice(start, done);
  assert.match(between, /!response\.ok \|\| !result\.ok/, 'a rejected response throws before success');
  assert.match(between, /throw new Error/);
});

test('no false booking-success state: a rejected submit resets to idle and never reports done', () => {
  const catchBlock = bookingExperience.match(/catch \(error\) \{\s*setStatus\("idle"\)[\s\S]*?\}/);
  assert.ok(catchBlock, 'the submit catch block is present');
  assert.doesNotMatch(catchBlock[0], /setStatus\("done"\)/);
});
