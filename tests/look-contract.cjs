/**
 * Canonical Look contract regression suite (Commit 1).
 *
 * Drives the real lib/look-contract.ts logic and the real social post route
 * handlers against an in-memory store. Proves service-reference parsing,
 * author and workspace ownership validation, read-time revalidation,
 * ineligible-post filtering, reserved demo provenance and that ordinary
 * social posts without a service reference keep working unchanged.
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

const WS_PRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_PRO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WS_SALON = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_SALON = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const WS_OTHER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const USER_OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const SVC_PRO = '11111111-1111-4111-8111-111111111111';
const SVC_PRO_INACTIVE = '22222222-2222-4222-8222-222222222222';
const SVC_SALON = '33333333-3333-4333-8333-333333333333';
const SVC_OTHER = '44444444-4444-4444-8444-444444444444';
const SVC_MISSING = '55555555-5555-4555-8555-555555555555';

const lookContract = loadTs('lib/look-contract.ts');
const {
  parseServiceTag,
  serviceIdFromTags,
  checkServiceTagsForCreate,
  serviceEligibleForLook,
  buildCanonicalLook,
  SERVICE_TAG_PREFIX,
  RESERVED_DEMO_TAG,
} = lookContract;

class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const basePost = (overrides = {}) => ({
  id: '99999999-9999-4999-8999-999999999999',
  author_user_id: USER_PRO,
  author_workspace_id: WS_PRO,
  author_name: 'Ada',
  author_slug: 'ada-styles',
  author_role: 'professional',
  post_type: 'portfolio',
  caption: 'Fresh protective style',
  tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`],
  media_urls: ['https://res.cloudinary.com/styld-demo/image/upload/look.jpg'],
  visibility: 'public',
  publication_status: 'published',
  moderation_status: 'visible',
  created_at: '2026-10-22T08:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

const activeProService = { id: SVC_PRO, workspace_id: WS_PRO, is_active: true };

test('svc tag parsing is strict and the uuid is normalized', () => {
  assert.equal(parseServiceTag(`${SERVICE_TAG_PREFIX}${SVC_PRO}`), SVC_PRO);
  assert.equal(parseServiceTag(`${SERVICE_TAG_PREFIX}${SVC_PRO.toUpperCase()}`), SVC_PRO);
  assert.equal(parseServiceTag(`${SERVICE_TAG_PREFIX}not-a-uuid`), null);
  assert.equal(parseServiceTag(`${SERVICE_TAG_PREFIX}`), null);
  assert.equal(parseServiceTag('service:whatever'), null);
  assert.equal(parseServiceTag('svcx:anything'), null);
  assert.equal(parseServiceTag(null), null);
  assert.equal(SERVICE_TAG_PREFIX.length + 36, 40);
});

test('service reference checks accept creators and reject malformed or conflicting tags', () => {
  const plain = checkServiceTagsForCreate(['braids', 'kilimani'], 'client');
  assert.equal(plain.ok, true);
  assert.equal(plain.serviceId, null);

  const none = checkServiceTagsForCreate([], 'professional');
  assert.equal(none.ok, true);
  assert.equal(none.serviceId, null);

  const pro = checkServiceTagsForCreate([`${SERVICE_TAG_PREFIX}${SVC_PRO}`], 'professional');
  assert.equal(pro.ok, true);
  assert.equal(pro.serviceId, SVC_PRO);

  const salon = checkServiceTagsForCreate([`${SERVICE_TAG_PREFIX}${SVC_SALON}`], 'salon');
  assert.equal(salon.ok, true);
  assert.equal(salon.serviceId, SVC_SALON);

  const client = checkServiceTagsForCreate([`${SERVICE_TAG_PREFIX}${SVC_PRO}`], 'client');
  assert.equal(client.ok, false);
  assert.equal(client.status, 403);

  const malformed = checkServiceTagsForCreate([`${SERVICE_TAG_PREFIX}oops`], 'professional');
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 400);

  const duplicate = checkServiceTagsForCreate(
    [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, `${SERVICE_TAG_PREFIX}${SVC_PRO}`],
    'professional',
  );
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, 400);

  const conflicting = checkServiceTagsForCreate(
    [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, `${SERVICE_TAG_PREFIX}${SVC_SALON}`],
    'salon',
  );
  assert.equal(conflicting.ok, false);
  assert.equal(conflicting.status, 400);

  const reserved = checkServiceTagsForCreate([RESERVED_DEMO_TAG], 'professional');
  assert.equal(reserved.ok, false);
  assert.equal(reserved.status, 400);
});

test('canonical look requires eligibility, workspace ownership and an active service', () => {
  const look = buildCanonicalLook(basePost(), activeProService);
  assert.ok(look);
  assert.equal(look.serviceId, SVC_PRO);
  assert.equal(look.authorWorkspaceId, WS_PRO);
  assert.equal(look.demoProvenance.trusted, false);

  const salonLook = buildCanonicalLook(
    basePost({ author_role: 'salon', author_workspace_id: WS_SALON, tags: [`${SERVICE_TAG_PREFIX}${SVC_SALON}`] }),
    { id: SVC_SALON, workspace_id: WS_SALON, is_active: true },
  );
  assert.ok(salonLook);
  assert.equal(salonLook.serviceId, SVC_SALON);

  assert.equal(buildCanonicalLook(basePost({ publication_status: 'pending' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ publication_status: 'rejected' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ moderation_status: 'hidden' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ moderation_status: 'removed' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ deleted_at: '2026-10-22T09:00:00.000Z' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ visibility: 'private' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ author_role: 'client' }), activeProService), null);
  assert.equal(buildCanonicalLook(basePost({ tags: ['braids'] }), activeProService), null);
  assert.equal(
    buildCanonicalLook(basePost(), { id: SVC_PRO, workspace_id: WS_OTHER, is_active: true }),
    null,
  );
  assert.equal(
    buildCanonicalLook(basePost(), { id: SVC_PRO, workspace_id: WS_PRO, is_active: false }),
    null,
  );
  assert.equal(
    buildCanonicalLook(basePost(), { id: SVC_OTHER, workspace_id: WS_PRO, is_active: true }),
    null,
  );
  assert.equal(serviceEligibleForLook(null, WS_PRO), false);
  assert.equal(serviceIdFromTags(['braids', `${SERVICE_TAG_PREFIX}${SVC_PRO}`]), SVC_PRO);
  assert.equal(serviceIdFromTags(['braids']), null);
});

test('demo provenance is trusted only for the reserved fixture tag', () => {
  const trusted = buildCanonicalLook(
    basePost({ tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, RESERVED_DEMO_TAG] }),
    activeProService,
  );
  assert.ok(trusted);
  assert.equal(trusted.demoProvenance.trusted, true);

  const untrusted = buildCanonicalLook(
    basePost({ caption: 'demo look', tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, 'demo'] }),
    activeProService,
  );
  assert.ok(untrusted);
  assert.equal(untrusted.demoProvenance.trusted, false);
});

function makeHarness() {
  const state = {
    session: null,
    guestError: null,
    posts: new Map(),
    services: new Map(),
  };
  const sqlLog = [];
  const consoleErrors = [];
  let nextId = 1;

  state.services.set(SVC_PRO, { id: SVC_PRO, workspace_id: WS_PRO, is_active: true });
  state.services.set(SVC_PRO_INACTIVE, { id: SVC_PRO_INACTIVE, workspace_id: WS_PRO, is_active: false });
  state.services.set(SVC_SALON, { id: SVC_SALON, workspace_id: WS_SALON, is_active: true });
  state.services.set(SVC_OTHER, { id: SVC_OTHER, workspace_id: WS_OTHER, is_active: true });

  const eligible = (post) =>
    post.deleted_at == null &&
    post.visibility === 'public' &&
    post.publication_status === 'published' &&
    post.moderation_status === 'visible';

  async function dispatch(sql, params) {
    const text = String(sql).replace(/\s+/g, ' ').trim();
    sqlLog.push(text.slice(0, 60));

    if (text.startsWith('INSERT INTO social_posts')) {
      const [userId, workspaceId, authorName, authorSlug, role, postType, caption, tags, mediaUrls, visibility] = params;
      const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
      const row = {
        id,
        author_user_id: userId,
        author_workspace_id: workspaceId,
        author_name: authorName,
        author_slug: authorSlug,
        author_role: role,
        post_type: postType,
        caption,
        tags: tags.slice(),
        media_urls: mediaUrls.slice(),
        visibility,
        publication_status: 'pending',
        moderation_status: 'visible',
        created_at: '2026-10-22T10:00:00.000Z',
        deleted_at: null,
      };
      state.posts.set(id, row);
      return { rowCount: 1, rows: [{ ...row }] };
    }

    if (text.includes('FROM services') && text.includes('ANY')) {
      const ids = params[0];
      return { rowCount: ids.length, rows: ids.map((id) => state.services.get(id)).filter(Boolean).map((row) => ({ ...row })) };
    }

    if (text.includes('FROM services') && text.includes('WHERE id = $1')) {
      const row = state.services.get(params[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }

    if (text.includes('FROM social_posts') && text.includes('ANY')) {
      const rows = params[0].map((id) => state.posts.get(id)).filter((post) => post && eligible(post)).map((post) => ({ ...post }));
      return { rowCount: rows.length, rows };
    }

    if (text.includes('FROM social_posts') && text.includes('WHERE id = $1')) {
      const row = state.posts.get(params[0]);
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }

    if (text.includes('FROM social_posts') && text.includes('LIMIT')) {
      const rows = [...state.posts.values()].filter(eligible).map((post) => ({ ...post }));
      return { rowCount: rows.length, rows };
    }

    if (text.includes('UPDATE social_posts')) {
      const row = state.posts.get(params[0]);
      if (!row) return { rowCount: 0, rows: [] };
      if (row.author_user_id !== params[1] || row.author_workspace_id !== params[2]) {
        return { rowCount: 0, rows: [] };
      }
      row.deleted_at = '2026-10-22T11:00:00.000Z';
      return { rowCount: 1, rows: [{ id: row.id }] };
    }

    throw new Error(`unexpected SQL in mock: ${text.slice(0, 90)}`);
  }

  const pool = { query: (sql, params) => dispatch(sql, params) };

  const nextServer = {
    NextRequest: class {},
    NextResponse: {
      json: (body, init = {}) => ({ status: init.status || 200, body }),
    },
  };
  const authResolver = {
    AuthError,
    requireAuthenticatedUser: () => {
      if (state.guestError) throw state.guestError;
      return state.session;
    },
  };
  const apiSecurity = loadTs(
    'lib/api-security.ts',
    { 'next/server': nextServer, './auth-resolver': authResolver },
    {
      process: { env: {} },
      console: {
        log: () => {},
        info: () => {},
        debug: () => {},
        warn: (...args) => consoleErrors.push(args.map(String).join(' ')),
        error: (...args) => consoleErrors.push(args.map(String).join(' ')),
      },
    }
  );
  const deps = {
    'next/server': nextServer,
    '@/lib/auth-resolver': authResolver,
    '@/lib/api-security': apiSecurity,
    '@/lib/auth-database': { authPool: pool },
    '@/lib/look-contract': lookContract,
  };
  const collection = loadTs('app/api/social/posts/route.ts', deps);
  const single = loadTs('app/api/social/posts/[id]/route.ts', deps);

  const session = (userId, workspaceId, role) => ({
    userId,
    workspaceId,
    workspace: { role, profile: {} },
    firstName: 'Member',
  });

  const request = (body) => ({
    url: 'http://localhost:3000/api/social/posts',
    headers: { get: (name) => (name === 'origin' ? 'http://localhost:3000' : null) },
    json: async () => body,
  });

  const seedPublished = (overrides = {}) => {
    const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
    const row = basePost({ id, ...overrides });
    state.posts.set(id, row);
    return id;
  };

  const asPro = () => { state.session = session(USER_PRO, WS_PRO, 'professional'); };
  const asSalon = () => { state.session = session(USER_SALON, WS_SALON, 'salon'); };
  const asClient = () => { state.session = session(USER_OTHER, WS_OTHER, 'client'); };
  const asGuest = () => { state.session = null; state.guestError = new AuthError('Sign in.', 401); };

  return {
    state,
    sqlLog,
    consoleErrors,
    collection,
    single,
    request,
    seedPublished,
    asPro,
    asSalon,
    asClient,
    asGuest,
  };
}

test('a professional and a salon can create a Look post with their own active service', async () => {
  const h = makeHarness();

  h.asPro();
  const proCreate = await h.collection.POST(h.request({
    postType: 'portfolio',
    caption: 'Protective style by Ada',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`],
    mediaUrls: [],
  }));
  assert.equal(proCreate.status, 201);
  assert.equal(proCreate.body.post.publication_status, 'pending');

  h.asSalon();
  const salonCreate = await h.collection.POST(h.request({
    postType: 'portfolio',
    caption: 'Salon finish',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_SALON}`],
    mediaUrls: [],
  }));
  assert.equal(salonCreate.status, 201);
});

test('clients keep ordinary social posts but cannot attach service references', async () => {
  const h = makeHarness();
  h.asClient();

  const ordinary = await h.collection.POST(h.request({
    postType: 'inspo',
    caption: 'Loving this look',
    tags: ['braids', 'kilimani'],
    mediaUrls: [],
  }));
  assert.equal(ordinary.status, 201);
  assert.deepEqual(ordinary.body.post.tags, ['braids', 'kilimani']);

  const spoof = await h.collection.POST(h.request({
    postType: 'portfolio',
    caption: 'Book me',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`],
    mediaUrls: [],
  }));
  assert.equal(spoof.status, 403);
});

test('malformed, duplicate, conflicting, reserved and unknown service tags are rejected', async () => {
  const h = makeHarness();
  h.asPro();

  const malformed = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x', tags: [`${SERVICE_TAG_PREFIX}oops`], mediaUrls: [],
  }));
  assert.equal(malformed.status, 400);

  const duplicate = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, `${SERVICE_TAG_PREFIX}${SVC_PRO}`],
    mediaUrls: [],
  }));
  assert.equal(duplicate.status, 400);

  const conflicting = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, `${SERVICE_TAG_PREFIX}${SVC_SALON}`],
    mediaUrls: [],
  }));
  assert.equal(conflicting.status, 400);

  const reserved = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x', tags: [RESERVED_DEMO_TAG], mediaUrls: [],
  }));
  assert.equal(reserved.status, 400);

  const missing = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x', tags: [`${SERVICE_TAG_PREFIX}${SVC_MISSING}`], mediaUrls: [],
  }));
  assert.equal(missing.status, 400);

  const inactive = await h.collection.POST(h.request({
    postType: 'portfolio', caption: 'x', tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO_INACTIVE}`], mediaUrls: [],
  }));
  assert.equal(inactive.status, 400);
});

test('cross-workspace service spoofing is rejected at create time', async () => {
  const h = makeHarness();
  h.asPro();

  const spoof = await h.collection.POST(h.request({
    postType: 'portfolio',
    caption: 'Not mine',
    tags: [`${SERVICE_TAG_PREFIX}${SVC_OTHER}`],
    mediaUrls: [],
  }));
  assert.equal(spoof.status, 403);
  assert.match(spoof.body.error, /another workspace/i);
});

test('public results hide pending, hidden and deleted posts and only publish eligible Looks', async () => {
  const h = makeHarness();
  const publishedId = h.seedPublished();
  const pendingId = h.seedPublished({ publication_status: 'pending' });
  const hiddenId = h.seedPublished({ moderation_status: 'hidden' });
  const rejectedId = h.seedPublished({ publication_status: 'rejected' });
  const deletedId = h.seedPublished();
  h.state.posts.get(deletedId).deleted_at = '2026-10-22T09:30:00.000Z';

  const feed = await h.collection.GET(h.request(undefined));
  assert.equal(feed.status, 200);
  assert.equal(feed.body.posts.length, 1);
  const feedId = feed.body.posts[0].id;
  assert.equal(feedId, publishedId);

  const look = feed.body.posts[0].look;
  assert.ok(look);
  assert.equal(look.serviceId, SVC_PRO);
  assert.equal(look.authorWorkspaceId, WS_PRO);
  assert.equal(look.demoProvenance.trusted, false);

  const byIds = await h.collection.GET({
    url: `http://localhost:3000/api/social/posts?ids=${[publishedId, pendingId, hiddenId, rejectedId, deletedId].join(',')}`,
    headers: { get: () => null },
    json: async () => null,
  });
  assert.equal(byIds.body.posts.length, 1);
  assert.equal(byIds.body.posts[0].id, publishedId);
});

test('an owner can read a pending post but it never carries a public Look', async () => {
  const h = makeHarness();
  const pendingId = h.seedPublished({ publication_status: 'pending' });

  h.asPro();
  const ownerView = await h.single.GET(h.request(undefined), { params: Promise.resolve({ id: pendingId }) });
  assert.equal(ownerView.status, 200);
  assert.equal(ownerView.body.post.id, pendingId);
  assert.equal(ownerView.body.post.look, null);

  h.asGuest();
  const publicView = await h.single.GET(h.request(undefined), { params: Promise.resolve({ id: pendingId }) });
  assert.equal(publicView.status, 404);
});

test('read-time revalidation drops the Look when the service is inactive or the workspace no longer matches', async () => {
  const h = makeHarness();
  const postId = h.seedPublished();

  h.asGuest();
  const before = await h.single.GET(h.request(undefined), { params: Promise.resolve({ id: postId }) });
  assert.equal(before.body.post.look.serviceId, SVC_PRO);

  h.state.services.get(SVC_PRO).is_active = false;
  const inactive = await h.single.GET(h.request(undefined), { params: Promise.resolve({ id: postId }) });
  assert.equal(inactive.status, 200);
  assert.ok(inactive.body.post);
  assert.equal(inactive.body.post.look, null);

  h.state.services.get(SVC_PRO).is_active = true;
  h.state.services.get(SVC_PRO).workspace_id = WS_OTHER;
  const mismatch = await h.single.GET(h.request(undefined), { params: Promise.resolve({ id: postId }) });
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.body.post.look, null);
});

test('a published post without a service reference stays a normal social post', async () => {
  const h = makeHarness();
  const postId = h.seedPublished({ tags: ['braids'], author_role: 'client', author_user_id: USER_OTHER, author_workspace_id: WS_OTHER });

  const feed = await h.collection.GET(h.request(undefined));
  assert.equal(feed.body.posts.length, 1);
  assert.equal(feed.body.posts[0].id, postId);
  assert.equal(feed.body.posts[0].look, null);
});

test('trusted demo provenance appears only for the reserved fixture tag', async () => {
  const h = makeHarness();
  const trustedId = h.seedPublished({ tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, RESERVED_DEMO_TAG] });
  const untrustedId = h.seedPublished({ caption: 'demo caption', tags: [`${SERVICE_TAG_PREFIX}${SVC_PRO}`, 'demo'] });

  const feed = await h.collection.GET(h.request(undefined));
  const byId = new Map(feed.body.posts.map((post) => [post.id, post]));
  assert.equal(byId.get(trustedId).look.demoProvenance.trusted, true);
  assert.equal(byId.get(untrustedId).look.demoProvenance.trusted, false);
});

test('deleting a Look post is still owner and workspace scoped', async () => {
  const h = makeHarness();
  const postId = h.seedPublished();
  h.asSalon();
  const denied = await h.single.DELETE(h.request({}), { params: Promise.resolve({ id: postId }) });
  assert.equal(denied.status, 404);

  h.asPro();
  const deleted = await h.single.DELETE(h.request({}), { params: Promise.resolve({ id: postId }) });
  assert.equal(deleted.status, 200);
  assert.equal(h.state.posts.get(postId).deleted_at != null, true);
});
