/**
 * Moderation workflow regression suite (Moderation slice).
 *
 * Drives the real requireAdmin path in lib/auth-resolver.ts, the real
 * decision contract in lib/moderation.ts and the real admin moderation route
 * against an in-memory store with transaction logging. Proves admin and MFA
 * enforcement, valid and invalid transitions, fail-closed publication under
 * service and race conditions, audit durability with rollback, and that
 * pending content never reaches unauthorized readers.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function loadTs(file, dependencies = {}, sandboxExtras = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }
  ).outputText;

  const moduleObj = { exports: {} };
  const sandbox = {
    console,
    process,
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    ...sandboxExtras,
  };

  vm.runInNewContext(
    `(function(require, module, exports) { ${source}\n})`,
    sandbox
  )(
    (name) => {
      if (Object.prototype.hasOwnProperty.call(dependencies, name)) {
        return dependencies[name];
      }
      return require(name);
    },
    moduleObj,
    moduleObj.exports
  );

  return moduleObj.exports;
}

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUTHOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WS_PRO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const WS_OTHER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const SVC_OK = '11111111-1111-4111-8111-111111111111';
const SVC_INACTIVE = '22222222-2222-4222-8222-222222222222';
const SVC_OTHER = '33333333-3333-4333-8333-333333333333';
const SVC_MISSING = '55555555-5555-4555-8555-555555555555';

const POST_PENDING = '91000000-0000-4000-8000-000000000001';
const POST_ORDINARY = '91000000-0000-4000-8000-000000000002';
const POST_SELF = '91000000-0000-4000-8000-000000000003';
const POST_REJECTED = '91000000-0000-4000-8000-000000000004';
const POST_DELETED = '91000000-0000-4000-8000-000000000005';
const POST_HIDDEN = '91000000-0000-4000-8000-000000000006';
const POST_INACTIVE_SVC = '91000000-0000-4000-8000-000000000007';
const POST_CROSS_SVC = '91000000-0000-4000-8000-000000000008';
const POST_MISSING_SVC = '91000000-0000-4000-8000-000000000009';

function makePost(id, overrides = {}) {
  return {
    id,
    author_user_id: AUTHOR_ID,
    author_workspace_id: WS_PRO,
    author_name: 'Ada',
    author_slug: 'ada-styles',
    author_role: 'professional',
    post_type: 'portfolio',
    caption: 'Fresh protective style',
    tags: [`svc:${SVC_OK}`],
    media_urls: ['https://res.cloudinary.com/styld-demo/image/upload/look.jpg'],
    visibility: 'public',
    publication_status: 'pending',
    moderation_status: 'visible',
    created_at: '2026-10-22T08:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function adminUser(overrides = {}) {
  return {
    id: ADMIN_ID,
    role: 'admin',
    active_role: 'admin',
    workspace_id: null,
    mfa_enabled: true,
    mfa_verified_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    auth_suspended: false,
    suspended: false,
    deletion_status: 'active',
    deletion_requested_at: null,
    email: 'admin@styld.test',
    first_name: 'Admin',
    last_name: null,
    phone: null,
    phone_verified: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeHarness() {
  const state = {
    user: adminUser(),
    authSession: null,
    cookie: null,
    posts: new Map(),
    services: new Map(),
    grants: [],
    auditLog: [],
    conflictSwitch: false,
    failAuditInsert: false,
    txnSnapshot: null,
  };
  const sqlLog = [];
  const consoleErrors = [];

  state.services.set(SVC_OK, { id: SVC_OK, workspace_id: WS_PRO, is_active: true });
  state.services.set(SVC_INACTIVE, { id: SVC_INACTIVE, workspace_id: WS_PRO, is_active: false });
  state.services.set(SVC_OTHER, { id: SVC_OTHER, workspace_id: WS_OTHER, is_active: true });

  const seed = (id, overrides = {}) => {
    const row = makePost(id, overrides);
    state.posts.set(id, row);
    return row;
  };
  seed(POST_PENDING);
  seed(POST_ORDINARY, { tags: ['braids'], author_role: 'client', author_user_id: '99999999-9999-4999-8999-999999999999', author_workspace_id: '99999999-9999-4999-8999-999999999998' });
  seed(POST_SELF, { author_user_id: ADMIN_ID });
  seed(POST_REJECTED, { publication_status: 'rejected' });
  seed(POST_DELETED, { deleted_at: '2026-10-22T09:00:00.000Z' });
  seed(POST_HIDDEN, { moderation_status: 'hidden' });
  seed(POST_INACTIVE_SVC, { tags: [`svc:${SVC_INACTIVE}`] });
  seed(POST_CROSS_SVC, { tags: [`svc:${SVC_OTHER}`] });
  seed(POST_MISSING_SVC, { tags: [`svc:${SVC_MISSING}`] });

  const eligible = (post) =>
    post.deleted_at == null &&
    post.visibility === 'public' &&
    post.publication_status === 'published' &&
    post.moderation_status === 'visible';

  async function dispatch(sql, params) {
    const text = String(sql).replace(/\s+/g, ' ').trim();
    sqlLog.push(text.slice(0, 70));

    if (text.startsWith('SELECT u.*')) {
      const row = state.user && state.user.id === params[0] ? state.user : null;
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }
    if (text.includes('FROM identity_workspaces')) return { rowCount: 0, rows: [] };
    if (text.includes('FROM user_roles')) return { rowCount: state.grants.length, rows: state.grants.map((r) => ({ ...r })) };

    if (text.startsWith('INSERT INTO security_events')) {
      if (state.failAuditInsert) throw new Error('audit storage unavailable');
      state.auditLog.push({ user_id: params[0], event: params[1], details: JSON.parse(params[2]) });
      return { rowCount: 1, rows: [] };
    }

    if (text.startsWith('UPDATE social_posts')) {
      const row = state.posts.get(params[0]);
      if (!row) return { rowCount: 0, rows: [] };
      const stays =
        row.publication_status === 'pending' &&
        row.moderation_status === 'visible' &&
        row.deleted_at == null;
      if (!stays) return { rowCount: 0, rows: [] };
      row.publication_status = params[1];
      row.updated_at = '2026-10-22T12:00:00.000Z';
      return { rowCount: 1, rows: [{ id: row.id, publication_status: row.publication_status }] };
    }

    if (text.includes('FROM social_posts') && text.includes('FOR UPDATE')) {
      const row = state.posts.get(params[0]);
      if (!row) return { rowCount: 0, rows: [] };
      const snapshot = { ...row };
      if (state.conflictSwitch) {
        state.conflictSwitch = false;
        row.publication_status = 'published';
      }
      return { rowCount: 1, rows: [snapshot] };
    }

    if (text.includes('FROM social_posts') && text.includes("publication_status = 'pending'")) {
      const rows = [...state.posts.values()]
        .filter((post) => post.publication_status === 'pending' && post.deleted_at == null)
        .map((post) => ({ ...post }));
      return { rowCount: rows.length, rows };
    }

    if (text.includes('FROM social_posts') && text.includes('ANY')) {
      const rows = params[0].map((id) => state.posts.get(id)).filter((post) => post && eligible(post)).map((post) => ({ ...post }));
      return { rowCount: rows.length, rows };
    }

    if (text.includes('FROM social_posts') && text.includes('LIMIT')) {
      const rows = [...state.posts.values()].filter(eligible).map((post) => ({ ...post }));
      return { rowCount: rows.length, rows };
    }

    if (text.includes('FROM social_posts') && text.includes('WHERE id = $1')) {
      const row = state.posts.get(params[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }

    if (text.includes('FROM services') && text.includes('ANY')) {
      const ids = params[0];
      return { rowCount: ids.length, rows: ids.map((id) => state.services.get(id)).filter(Boolean).map((row) => ({ ...row })) };
    }
    if (text.includes('FROM services') && text.includes('WHERE id = $1')) {
      const row = state.services.get(params[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }

    if (text === 'BEGIN') {
      state.txnSnapshot = JSON.parse(JSON.stringify([...state.posts.entries()]));
      return { rowCount: 0, rows: [] };
    }
    if (text === 'ROLLBACK') {
      if (state.txnSnapshot) state.posts = new Map(state.txnSnapshot);
      state.txnSnapshot = null;
      return { rowCount: 0, rows: [] };
    }
    if (text === 'COMMIT') {
      state.txnSnapshot = null;
      return { rowCount: 0, rows: [] };
    }

    throw new Error(`unexpected SQL in mock: ${text.slice(0, 90)}`);
  }

  const pool = { query: (sql, params) => dispatch(sql, params), connect: async () => ({ query: (sql, params) => dispatch(sql, params), release: () => sqlLog.push('RELEASE') }) };

  const nextServer = {
    NextRequest: class {},
    NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, body, headers: init.headers || {} }) },
  };

  const requestHeaders = {
    get: (name) => {
      if (name === 'cookie') return state.cookie ?? null;
      if (name === 'origin') return 'http://localhost:3000';
      return null;
    },
  };

  const resolver = loadTs('lib/auth-resolver.ts', {
    'next/headers': { headers: async () => requestHeaders },
    './better-auth': { auth: { api: { getSession: async () => state.authSession } } },
    './auth-database': { authPool: pool },
    './auth-policy': loadTs('lib/auth-policy.ts'),
    './workspace-policy': loadTs('lib/workspace-policy.ts'),
  });
  const apiSecurity = loadTs(
    'lib/api-security.ts',
    { 'next/server': nextServer, './auth-resolver': resolver },
    { process: { env: {} }, console: { log: () => {}, info: () => {}, debug: () => {}, warn: (...a) => consoleErrors.push(a.map(String).join(' ')), error: (...a) => consoleErrors.push(a.map(String).join(' ')) } }
  );
  const lookContract = loadTs('lib/look-contract.ts');
  const moderation = loadTs('lib/moderation.ts', { './look-contract': lookContract });

  const deps = {
    'next/server': nextServer,
    '@/lib/auth-resolver': resolver,
    '@/lib/auth-database': { authPool: pool },
    '@/lib/api-security': apiSecurity,
    '@/lib/moderation': moderation,
    '@/lib/look-contract': lookContract,
  };
  const route = loadTs('app/api/admin/moderation/route.ts', deps);
  const postsCollection = loadTs('app/api/social/posts/route.ts', deps);
  const postSingle = loadTs('app/api/social/posts/[id]/route.ts', deps);

  const asAdmin = () => {
    state.cookie = '__Secure-session=tok';
    state.authSession = { user: { id: ADMIN_ID }, session: { id: 'sess-1', createdAt: new Date() } };
    state.user = adminUser();
    state.grants = [];
  };
  const asAdminNoMfa = () => {
    asAdmin();
    state.user = adminUser({ mfa_verified_at: null });
  };
  const asNonAdmin = () => {
    asAdmin();
    state.user = adminUser({ role: 'user', active_role: 'user' });
  };
  const asGuest = () => {
    state.cookie = null;
    state.authSession = null;
    state.user = null;
  };

  const request = (body) => ({
    url: 'http://localhost:3000/api/admin/moderation',
    headers: { get: (name) => (name === 'origin' ? 'http://localhost:3000' : null) },
    json: async () => body,
  });

  const decide = (postId, decision, reason) => route.POST(request({ postId, decision, reason }));

  const snapshotLog = () => sqlLog.length;
  const logSince = (mark) => sqlLog.slice(mark);

  return {
    state, sqlLog, consoleErrors, route, postsCollection, postSingle,
    asAdmin, asAdminNoMfa, asNonAdmin, asGuest, request, decide, snapshotLog, logSince,
  };
}

test('an authorized admin with MFA approves a pending Look and the audit records the decision', async () => {
  const h = makeHarness();
  h.asAdmin();

  const response = await h.decide(POST_PENDING, 'approve', 'Verified portfolio review.');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.resultingStatus, 'published');
  assert.equal(h.state.posts.get(POST_PENDING).publication_status, 'published');

  assert.equal(h.state.auditLog.length, 1);
  const entry = h.state.auditLog[0];
  assert.equal(entry.user_id, ADMIN_ID);
  assert.equal(entry.event, 'moderation_approve');
  assert.equal(entry.details.postId, POST_PENDING);
  assert.equal(entry.details.previousStatus, 'pending');
  assert.equal(entry.details.resultingStatus, 'published');
  assert.equal(entry.details.authorWorkspaceId, WS_PRO);
  assert.equal(entry.details.serviceId, SVC_OK);
  assert.equal(entry.details.reason, 'Verified portfolio review.');

  assert.ok(h.sqlLog.includes('BEGIN'));
  assert.ok(h.sqlLog.includes('COMMIT'));
  assert.equal(h.sqlLog.includes('ROLLBACK'), false);
});

test('missing MFA, non-admin and unauthenticated actors are denied before any write', async () => {
  const h = makeHarness();

  h.asAdminNoMfa();
  let mark = h.snapshotLog();
  let response = await h.decide(POST_PENDING, 'approve');
  assert.equal(response.status, 403);
  assert.equal(h.logSince(mark).includes('BEGIN'), false);

  h.asNonAdmin();
  mark = h.snapshotLog();
  response = await h.decide(POST_PENDING, 'approve');
  assert.equal(response.status, 403);
  assert.equal(h.logSince(mark).includes('BEGIN'), false);

  h.asGuest();
  mark = h.snapshotLog();
  response = await h.decide(POST_PENDING, 'approve');
  assert.equal(response.status, 401);
  assert.equal(h.logSince(mark).includes('BEGIN'), false);

  assert.equal(h.state.auditLog.length, 0);
  assert.equal(h.state.posts.get(POST_PENDING).publication_status, 'pending');
});

test('a pending post can be rejected with a reason and is never published', async () => {
  const h = makeHarness();
  h.asAdmin();

  const response = await h.decide(POST_PENDING, 'reject', 'Not the author own work.');
  assert.equal(response.status, 200);
  assert.equal(response.body.resultingStatus, 'rejected');
  assert.equal(h.state.posts.get(POST_PENDING).publication_status, 'rejected');
  assert.equal(h.state.auditLog[0].event, 'moderation_reject');
  assert.equal(h.state.auditLog[0].details.resultingStatus, 'rejected');

  const feed = await h.postsCollection.GET({ url: 'http://localhost:3000/api/social/posts', headers: { get: () => null } });
  assert.equal(feed.body.posts.length, 0);
});

test('rejected, deleted and hidden posts cannot be decided again', async () => {
  const h = makeHarness();
  h.asAdmin();

  const rejected = await h.decide(POST_REJECTED, 'approve');
  assert.equal(rejected.status, 409);

  const deleted = await h.decide(POST_DELETED, 'approve');
  assert.equal(deleted.status, 409);

  const hidden = await h.decide(POST_HIDDEN, 'approve');
  assert.equal(hidden.status, 409);

  assert.equal(h.state.auditLog.length, 0);
  assert.equal(h.state.posts.get(POST_REJECTED).publication_status, 'rejected');
  assert.equal(h.state.posts.get(POST_DELETED).publication_status, 'pending');
});

test('invalid decisions and weak rejection reasons are refused', async () => {
  const h = makeHarness();
  h.asAdmin();

  assert.equal((await h.decide(POST_PENDING, 'publish')).status, 400);
  assert.equal((await h.decide(POST_PENDING, 'reject')).status, 400);
  assert.equal((await h.decide(POST_PENDING, 'reject', 'bad')).status, 400);
  assert.equal((await h.decide('not-a-uuid', 'approve')).status, 404);

  const approveWithShortNote = await h.decide(POST_PENDING, 'approve', 'ok');
  assert.equal(approveWithShortNote.status, 200);

  assert.equal(h.state.auditLog.length, 1);
  assert.equal(h.state.auditLog[0].details.reason, 'ok');
});

test('a duplicate or conflicting decision fails closed with no audit row', async () => {
  const h = makeHarness();
  h.asAdmin();

  const first = await h.decide(POST_PENDING, 'approve');
  assert.equal(first.status, 200);

  const duplicate = await h.decide(POST_PENDING, 'approve');
  assert.equal(duplicate.status, 409);
  assert.equal(h.state.auditLog.length, 1);

  h.state.conflictSwitch = true;
  const conflicting = await h.decide(POST_INACTIVE_SVC, 'approve');
  assert.equal(conflicting.status, 409);
  assert.ok(h.sqlLog.includes('ROLLBACK'));
  assert.equal(h.state.auditLog.length, 1);
  assert.equal(h.state.posts.get(POST_INACTIVE_SVC).publication_status, 'pending');
});

test('an audit write failure rolls back the publication decision', async () => {
  const h = makeHarness();
  h.asAdmin();
  h.state.failAuditInsert = true;

  const response = await h.decide(POST_PENDING, 'approve');
  assert.equal(response.status, 500);
  assert.ok(h.sqlLog.includes('ROLLBACK'));
  assert.equal(h.sqlLog.includes('COMMIT'), false);
  assert.equal(h.state.posts.get(POST_PENDING).publication_status, 'pending');
  assert.equal(h.state.auditLog.length, 0);
});

test('approval fails closed when the service is inactive, cross-workspace or missing', async () => {
  const h = makeHarness();
  h.asAdmin();

  assert.equal((await h.decide(POST_INACTIVE_SVC, 'approve')).status, 409);
  assert.equal((await h.decide(POST_CROSS_SVC, 'approve')).status, 409);
  assert.equal((await h.decide(POST_MISSING_SVC, 'approve')).status, 409);

  assert.equal(h.state.posts.get(POST_INACTIVE_SVC).publication_status, 'pending');
  assert.equal(h.state.posts.get(POST_CROSS_SVC).publication_status, 'pending');
  assert.equal(h.state.posts.get(POST_MISSING_SVC).publication_status, 'pending');
  assert.equal(h.state.auditLog.length, 0);

  const rejectedStill = await h.decide(POST_INACTIVE_SVC, 'reject', 'Service no longer offered.');
  assert.equal(rejectedStill.status, 200);
  assert.equal(h.state.posts.get(POST_INACTIVE_SVC).publication_status, 'rejected');
});

test('an administrator cannot decide on their own post', async () => {
  const h = makeHarness();
  h.asAdmin();

  const response = await h.decide(POST_SELF, 'approve');
  assert.equal(response.status, 403);
  assert.equal(h.state.posts.get(POST_SELF).publication_status, 'pending');
  assert.equal(h.state.auditLog.length, 0);
});

test('an ordinary social post without a service reference can be approved', async () => {
  const h = makeHarness();
  h.asAdmin();

  const response = await h.decide(POST_ORDINARY, 'approve');
  assert.equal(response.status, 200);
  assert.equal(h.state.posts.get(POST_ORDINARY).publication_status, 'published');
  assert.equal(h.state.auditLog[0].details.serviceId, null);

  const feed = await h.postsCollection.GET({ url: 'http://localhost:3000/api/social/posts', headers: { get: () => null } });
  assert.equal(feed.body.posts.length, 1);
  assert.equal(feed.body.posts[0].id, POST_ORDINARY);
  assert.equal(feed.body.posts[0].look, null);
});

test('approval moves a Look into the public feed with a canonical look attached', async () => {
  const h = makeHarness();
  h.asGuest();
  const before = await h.postsCollection.GET({ url: 'http://localhost:3000/api/social/posts', headers: { get: () => null } });
  assert.equal(before.body.posts.length, 0);

  h.asAdmin();
  await h.decide(POST_PENDING, 'approve');

  h.asGuest();
  const after = await h.postsCollection.GET({ url: 'http://localhost:3000/api/social/posts', headers: { get: () => null } });
  assert.equal(after.body.posts.length, 1);
  assert.equal(after.body.posts[0].id, POST_PENDING);
  assert.ok(after.body.posts[0].look);
  assert.equal(after.body.posts[0].look.serviceId, SVC_OK);
});

test('pending posts are never disclosed to unauthorized readers', async () => {
  const h = makeHarness();

  h.asGuest();
  const publicView = await h.postSingle.GET(
    { url: 'http://localhost:3000/api/social/posts/x', headers: { get: () => null } },
    { params: Promise.resolve({ id: POST_PENDING }) },
  );
  assert.equal(publicView.status, 404);

  h.asNonAdmin();
  const nonAdminList = await h.route.GET({ url: 'http://localhost:3000/api/admin/moderation', headers: { get: () => null } });
  assert.equal(nonAdminList.status, 403);

  h.asGuest();
  const guestList = await h.route.GET({ url: 'http://localhost:3000/api/admin/moderation', headers: { get: () => null } });
  assert.equal(guestList.status, 401);
});

test('the admin review list returns only pending posts with service checks and no-store headers', async () => {
  const h = makeHarness();
  h.asAdmin();

  const response = await h.route.GET({ url: 'http://localhost:3000/api/admin/moderation', headers: { get: () => null } });
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');

  const byId = new Map(response.body.posts.map((post) => [post.id, post]));
  assert.equal(byId.get(POST_PENDING).serviceCheck, 'eligible');
  assert.equal(byId.get(POST_INACTIVE_SVC).serviceCheck, 'ineligible');
  assert.equal(byId.get(POST_CROSS_SVC).serviceCheck, 'ineligible');
  assert.equal(byId.get(POST_ORDINARY).serviceCheck, null);
  assert.equal(byId.has(POST_REJECTED), false);
  assert.equal(byId.has(POST_DELETED), false);
  assert.equal(byId.get(POST_PENDING).publication_status, 'pending');
});

test('the prune script preserves moderation audit rows', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'prune-auth-data.ts'), 'utf8');
  assert.match(script, /event NOT LIKE 'moderation_%'/);
  assert.match(script, /DELETE FROM security_events/);
});
