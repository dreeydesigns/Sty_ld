/**
 * Phase 8B-A — Critical Containment regression tests.
 *
 * Behavioral coverage for the founder-approved containment:
 *   - client onboarding no longer has a mandatory interests gate
 *   - interests persistence fails closed without touching any storage
 *   - browser-local private messaging and requests fail closed
 *   - the profile message button no longer creates browser-local threads
 *
 * Booking PATCH gating is covered in tests/booking-regressions.cjs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, deps = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, {
    console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch, Date, JSON, Math, ...globals,
  })((name) => (name in deps ? deps[name] : require(name)), module, module.exports);
  return module.exports;
}

function memoryStorage() {
  const map = new Map();
  const touched = new Set();
  return {
    map,
    touched,
    getItem: (k) => { touched.add('get:' + k); return map.has(k) ? map.get(k) : null; },
    setItem: (k, v) => { touched.add('set:' + k); map.set(k, String(v)); },
    removeItem: (k) => { touched.add('remove:' + k); map.delete(k); },
    _keys: () => [...map.keys()],
  };
}

test('social store fails closed: cross-account private threads and requests are never read or written', () => {
  const ls = memoryStorage();
  // Simulate a DIFFERENT account's private data already sitting in shared storage.
  const foreignThread = JSON.stringify([{
    id: 't-foreign', participantIds: ['other-user'], participantNames: ['Other'],
    participantAvatars: [], lastMessageAt: '', messages: [
      { id: 'm1', text: 'private', senderId: 'other-user', senderName: 'Other', createdAt: '', read: false },
    ],
  }]);
  const foreignBooking = JSON.stringify([{ id: 'b-foreign', clientId: 'other-user', status: 'pending' }]);
  ls.map.set('ms_messages', foreignThread);
  ls.map.set('ms_bookings', foreignBooking);

  const store = loadTs('lib/social-store.ts', {}, {
    window: { localStorage: ls, sessionStorage: ls, dispatchEvent() {} },
    localStorage: ls,
    Event: class { constructor(type) { this.type = type; } },
  });

  // Nothing private is surfaced to any caller.
  assert.equal(store.readThreads().length, 0);
  assert.equal(store.readBookings().length, 0);
  assert.equal(store.getClientBookings('other-user').length, 0);
  assert.equal(store.getIncomingBookings('some-slug').length, 0);
  assert.equal(store.getAllProviderBookings('some-slug').length, 0);
  assert.equal(store.getUnreadCount('other-user'), 0);

  // Writes are no-ops and never touch shared storage.
  store.sendMessage('t-foreign', { id: 'x', text: 'hi', senderId: 'me', senderName: 'Me', createdAt: '', read: false });
  store.writeBooking({ id: 'b-new', clientId: 'me', status: 'pending' });
  store.updateBookingStatus('b-foreign', 'accepted');
  store.rescheduleBooking('b-foreign', '2099-01-01', '10:00');
  store.markThreadRead('t-foreign', 'me');

  assert.equal(ls.getItem('ms_messages'), foreignThread, 'existing browser data is preserved, never overwritten');
  assert.ok(!ls.touched.has('set:ms_bookings'), 'booking writes must never touch shared storage');
  assert.ok(!ls.touched.has('set:ms_messages'), 'message writes must never touch shared storage');
});

test('interests endpoint fails closed with a non-cacheable 503 and never touches a database', async () => {
  let sqlUsed = false;
  const AuthError = class extends Error { constructor(message, status) { super(message); this.status = status; } };
  const route = loadTs('app/api/onboarding/client-interests/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {} }) } },
    '@/lib/auth-resolver': { requireAuthenticatedUser: async () => ({ userId: 'u1', role: 'client' }), AuthError },
    '@/lib/api-security': { sameOrigin() {}, authError: (e) => ({ body: { ok: false, error: e.message }, status: e.status || 500 }) },
    '@vercel/postgres': { get sql() { sqlUsed = true; throw new Error('database must not be used'); } },
  });

  const ok = await route.PATCH({ json: async () => ({ interests: ['hair'] }) });
  assert.equal(ok.status, 503);
  assert.equal(ok.body.ok, false);
  assert.equal(ok.body.available, false);
  assert.equal(ok.headers['Cache-Control'], 'no-store');
  assert.equal(sqlUsed, false, 'no database access may occur');

  const invalid = await route.PATCH({ json: async () => ({ interests: ['not-a-real-interest'] }) });
  assert.equal(invalid.status, 400, 'invalid interests are still rejected');

  const nonArray = await route.PATCH({ json: async () => ({ interests: 'hair' }) });
  assert.equal(nonArray.status, 400, 'non-array interests are rejected');
});

test('interests endpoint still requires a client session', async () => {
  const AuthError = class extends Error { constructor(message, status) { super(message); this.status = status; } };
  const route = loadTs('app/api/onboarding/client-interests/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {} }) } },
    '@/lib/auth-resolver': { requireAuthenticatedUser: async () => ({ userId: 'u1', role: 'professional' }), AuthError },
    '@/lib/api-security': { sameOrigin() {}, authError: (e) => ({ body: { ok: false, error: e.message }, status: e.status || 500 }) },
  });
  const out = await route.PATCH({ json: async () => ({ interests: ['hair'] }) });
  assert.equal(out.status, 403);
});

test('client onboarding completes without a mandatory interests gate', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'auth', 'unified-auth-flow.tsx'), 'utf8');
  assert.doesNotMatch(src, /setStage\(['"]interests['"]\)/, 'must not route clients into an interests stage');
  assert.doesNotMatch(src, /\/api\/onboarding\/client-interests/, 'must not require an interests write to sign in');
  assert.doesNotMatch(src, /data\.user\.interests/, 'must not gate completion on interests');
  assert.match(src, /writeVerifiedAppSession\(data\.user\)/, 'still completes the verified session normally');
  assert.match(src, /authClient\.signIn\.emailOtp/, 'email OTP sign-in is preserved');
});

test('profile message button does not create browser-local private threads', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'message-button.tsx'), 'utf8');
  assert.doesNotMatch(src, /sendMessage/, 'must not seed a browser-local thread');
  assert.doesNotMatch(src, /readThreads/, 'must not read browser-local threads');
});

test('messaging and requests surfaces present honest unavailable copy', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'role-profile-workspace.tsx'), 'utf8');
  assert.match(src, /Messaging isn't available yet\./, 'messaging shows an honest unavailable state');
  assert.match(src, /Private conversations will be available when secure messaging is ready\./, 'messaging copy explains the dependency');
  assert.match(src, /Requests aren't available yet\./, 'requests show an honest unavailable state');
  // The provider dashboard must not advertise a live browser-local pending queue.
  assert.doesNotMatch(src, /Booking requests arrive here\./, 'must not claim requests arrive in a browser-local queue');
});
