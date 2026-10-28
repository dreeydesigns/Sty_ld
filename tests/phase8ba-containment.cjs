/**
 * Phase 8B-A, Critical Containment regression tests.
 *
 * Behavioral coverage for the founder-approved containment:
 *   - client onboarding no longer has a mandatory interests gate
 *   - interests persistence fails closed without touching any storage
 *   - browser-local private messaging and requests fail closed
 *   - the profile message button no longer creates browser-local threads
 *   - saves, follows, likes, bookmarks, reposts and archive fail closed
 *   - public demo feed content (posts, comments, shares, owned deletes) still works
 *   - account-associated keys are never read across browser accounts
 *   - bypass surfaces (marketplace nav/save heart, blocked/muted settings,
 *     streak/reward badges, follow controls) present honest states
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

// ─── Final social containment (Saves / Follows / Reactions / Archive) ────────

test('saves, follows, likes, bookmarks, reposts and archive fail closed and never touch shared storage', () => {
  const ls = memoryStorage();
  // Another account's account-associated state already lives in shared storage.
  ls.map.set('ms_social_saves', JSON.stringify({ professionals: ['foreign-pro'], salons: ['foreign-salon'] }));
  ls.map.set('ms_followed_authors', JSON.stringify(['foreign-user']));
  const foreignPosts = JSON.stringify([{
    id: 'p1', authorId: 'other-user', authorName: 'Other', authorRole: 'client',
    type: 'inspo', images: [], caption: '', tags: [], likes: 0,
    savedBy: ['other-user'], bookmarkedBy: ['other-user'], repostedBy: ['other-user'],
    comments: [], createdAt: '2026-01-01T00:00:00.000Z',
  }]);
  ls.map.set('ms_social_posts', foreignPosts);

  const store = loadTs('lib/social-store.ts', {}, {
    window: { localStorage: ls, sessionStorage: ls, dispatchEvent() {} },
    localStorage: ls,
    Event: class { constructor(type) { this.type = type; } },
  });

  // Saves/collections resolve to nothing for every caller.
  assert.equal(store.readSaves().professionals.length, 0);
  assert.equal(store.readSaves().salons.length, 0);
  assert.equal(store.isSaved('professionals', 'foreign-pro'), false);
  assert.equal(store.toggleSave('professionals', 'foreign-pro'), false);
  assert.equal(store.getSaveCount('professionals', 'foreign-pro'), 0);

  // Follows resolve to nothing and cannot be toggled.
  assert.equal(store.readFollowedAuthors().length, 0);
  assert.equal(store.toggleFollowAuthor('other-user'), false);

  // Reactions and archive are no-ops: the shared post record is untouched.
  store.likePost('p1', 'me');
  store.repostPost('p1', 'me');
  store.bookmarkPost('p1', 'me');
  store.archivePost('p1', 'other-user');
  assert.equal(ls.getItem('ms_social_posts'), foreignPosts, 'engagement must not rewrite the shared post record');

  // The account-associated keys are never even read from shared storage.
  assert.ok(!ls.touched.has('get:ms_social_saves'), 'saves must not be read from shared storage');
  assert.ok(!ls.touched.has('get:ms_followed_authors'), 'follows must not be read from shared storage');
  assert.ok(
    !ls.touched.has('set:ms_social_saves') && !ls.touched.has('set:ms_followed_authors') && !ls.touched.has('set:ms_social_posts'),
    'no account-associated writes may touch shared storage',
  );
});

test('public demo feed content stays browsable: posts, comments, shares and ownership-checked deletes still work', () => {
  const ls = memoryStorage();
  const store = loadTs('lib/social-store.ts', {}, {
    window: { localStorage: ls, sessionStorage: ls, dispatchEvent() {} },
    localStorage: ls,
    Event: class { constructor(type) { this.type = type; } },
  });

  const post = {
    id: 'p1', authorId: 'author-1', authorName: 'Author One', authorRole: 'professional',
    type: 'inspo', images: [], caption: 'demo work', tags: [], likes: 0, savedBy: [],
    comments: [], createdAt: '2026-01-01T00:00:00.000Z',
  };
  store.writePost(post);
  assert.equal(store.readPosts().length, 1, 'published public content stays visible');

  store.addComment('p1', { id: 'c1', authorId: 'viewer-1', authorName: 'Viewer', text: 'nice', createdAt: '2026-01-01T00:00:01.000Z' });
  assert.equal(store.readPosts()[0].comments.length, 1, 'comments remain available as public content');

  store.sharePost('p1');
  assert.equal(store.readPosts()[0].shareCount, 1, 'share counts remain available as public content');

  store.deletePost('p1', 'not-the-owner');
  assert.equal(store.readPosts().length, 1, 'delete must be ownership-checked');

  store.deletePost('p1', 'author-1');
  assert.equal(store.readPosts().length, 0, 'the author\u2019s delete removes the post from the public feed');
  assert.equal(store.readAllPostsWithTombstones().length, 1, 'deletion keeps the regulatory tombstone');
});

test('switching accounts never surfaces another account\u2019s saves or follows (hermetic)', () => {
  const ls = memoryStorage();
  ls.map.set('ms_social_saves', JSON.stringify({ professionals: ['pro-a'], salons: ['salon-a'] }));
  ls.map.set('ms_followed_authors', JSON.stringify(['user-a']));

  const store = loadTs('lib/social-store.ts', {}, {
    window: { localStorage: ls, sessionStorage: ls, dispatchEvent() {} },
    localStorage: ls,
    Event: class { constructor(type) { this.type = type; } },
  });

  // As the second account on this browser, none of the first account's list leaks.
  assert.equal(store.readSaves().professionals.length, 0);
  assert.equal(store.readSaves().salons.length, 0);
  assert.equal(store.readFollowedAuthors().length, 0);

  // A follow attempt from the second account never overwrites the stored list.
  store.toggleFollowAuthor('user-b-target');
  assert.equal(ls.getItem('ms_followed_authors'), JSON.stringify(['user-a']), 'existing browser data is preserved, never overwritten');
});

test('bypass surfaces no longer read account-associated shared keys', () => {
  const marketplace = fs.readFileSync(path.join(__dirname, '..', 'components', 'marketplace-ui.tsx'), 'utf8');
  assert.doesNotMatch(marketplace, /ms_messages/, 'the nav badge must not read shared message storage');
  assert.doesNotMatch(marketplace, /ms_saves_v2/, 'the save heart must not read or write the shared saves key');
  assert.match(marketplace, /data-save-target=/, 'the save control keeps its identity while disabled');

  const blocked = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings', 'blocked-accounts', 'page.tsx'), 'utf8');
  assert.doesNotMatch(blocked, /ms_blocked_accounts/, 'blocked list must not read the shared key');
  assert.match(blocked, /function readBlocked\(\): BlockedEntry\[\] \{\s*return \[\];/, 'blocked list fails closed');

  const muted = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings', 'muted-accounts', 'page.tsx'), 'utf8');
  assert.doesNotMatch(muted, /ms_muted_accounts/, 'muted list must not read the shared key');
  assert.match(muted, /function readMuted\(\): MutedEntry\[\] \{\s*return \[\];/, 'muted list fails closed');

  const wow = fs.readFileSync(path.join(__dirname, '..', 'components', 'wow-ux.tsx'), 'utf8');
  assert.doesNotMatch(wow, /ms-checkin-streak/, 'streak claims must not come from shared device state');
  assert.doesNotMatch(wow, /ms_bookings_/, 'reward badges must not read legacy per-account booking keys');
});

test('follow controls and social surfaces present honest unavailable states', () => {
  const followBtn = fs.readFileSync(path.join(__dirname, '..', 'components', 'follow-button.tsx'), 'utf8');
  assert.doesNotMatch(followBtn, /toggleSave/, 'must not write shared saves');
  assert.match(followBtn, /disabled/, 'follow control is disabled');
  assert.match(followBtn, /Following isn't available yet/, 'follow control is honestly labelled');

  const userPage = fs.readFileSync(path.join(__dirname, '..', 'app', 'u', '[id]', 'page.tsx'), 'utf8');
  assert.doesNotMatch(userPage, /toggleFollowAuthor|readFollowedAuthors/, 'profile follow must not touch the shared follow key');
  assert.match(userPage, /Following isn't available yet/, 'profile follow is honestly labelled');

  const socialHome = fs.readFileSync(path.join(__dirname, '..', 'components', 'social-home.tsx'), 'utf8');
  assert.doesNotMatch(socialHome, /stored privately on this device/, 'hero must not claim private per-device storage');
  assert.match(socialHome, /Likes aren't available yet\./);
  assert.match(socialHome, /Saving posts isn't available yet\./);
  assert.match(socialHome, /Following isn't available yet\./);
  assert.doesNotMatch(socialHome, /likePost|repostPost|bookmarkPost|archivePost/, 'reaction mutations must not be wired');

  const workspace = fs.readFileSync(path.join(__dirname, '..', 'components', 'role-profile-workspace.tsx'), 'utf8');
  assert.match(workspace, /Likes aren't available yet\./);
  assert.match(workspace, /Following isn't available yet\. Visit the marketplace/, 'following tab explains the dependency');
  assert.doesNotMatch(workspace, /No one saved yet/, 'must not present saves as this account\u2019s follows');
});
