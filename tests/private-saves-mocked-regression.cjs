/**
 * Private Saves mocked regression suite (internal stabilization).
 *
 * Live QA has 0 social_posts rows, so published-post save UI cannot be
 * exercised end to end without activating public UGC. These tests drive the
 * real route handlers and the real lib/social-saves.ts logic against an
 * in-memory workspace store, proving session rules, validation, persistence
 * semantics, idempotency, rollback and response shape.
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

const WORKSPACE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WORKSPACE_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const POST_PUBLISH = '11111111-1111-4111-8111-111111111111';
const POST_OTHER = '22222222-2222-4222-8222-222222222222';
const POST_THIRD = '33333333-3333-4333-8333-333333333333';
const POST_UNPUBLISHED = '44444444-4444-4444-8444-444444444444';

class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const keyOf = (workspaceId, userId) => `${workspaceId}:${userId}`;

function makeHarness() {
  const state = { session: null, guestError: null };
  const sqlLog = [];
  const consoleErrors = [];
  const store = new Map();
  const saveable = new Set([POST_PUBLISH, POST_OTHER, POST_THIRD]);
  let failNextUpdate = false;

  async function dispatch(sql, params) {
    const text = String(sql).trim();
    if (text.startsWith('SELECT id') && text.includes('social_posts')) {
      sqlLog.push('SELECT social_posts');
      const postId = params[0];
      if (saveable.has(postId)) return { rowCount: 1, rows: [{ id: postId }] };
      return { rowCount: 0, rows: [] };
    }
    if (text.startsWith('SELECT profile')) {
      sqlLog.push('SELECT profile');
      const saved = store.get(keyOf(params[0], params[1]));
      if (!saved) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [{ profile: { savedPostIds: saved.slice() } }] };
    }
    if (text.startsWith('UPDATE identity_workspaces')) {
      sqlLog.push('UPDATE profile');
      if (failNextUpdate) {
        failNextUpdate = false;
        throw Object.assign(new Error('write failed at the storage layer'), { code: 'XX000' });
      }
      store.set(keyOf(params[0], params[2]), JSON.parse(params[1]));
      return { rowCount: 1, rows: [] };
    }
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      sqlLog.push(text);
      return { rowCount: 0, rows: [] };
    }
    throw new Error(`unexpected SQL in mock: ${text.slice(0, 80)}`);
  }

  const pool = {
    query: (sql, params) => dispatch(sql, params),
    connect: async () => ({
      query: (sql, params) => dispatch(sql, params),
      release: () => sqlLog.push('RELEASE'),
    }),
  };

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
  const socialSaves = loadTs('lib/social-saves.ts', {
    '@/lib/auth-database': { authPool: pool },
  });
  const deps = {
    'next/server': nextServer,
    '@/lib/auth-resolver': authResolver,
    '@/lib/api-security': apiSecurity,
    '@/lib/auth-database': { authPool: pool },
    '@/lib/social-saves': socialSaves,
  };
  const collection = loadTs('app/api/social/saves/route.ts', deps);
  const single = loadTs('app/api/social/saves/[postId]/route.ts', deps);

  const clientSession = (overrides = {}) => ({
    userId: USER_A,
    workspaceId: WORKSPACE_A,
    workspace: { role: 'client' },
    ...overrides,
  });

  const request = (body) => ({
    url: 'http://localhost:3000/api/social/saves',
    headers: { get: (name) => (name === 'origin' ? 'http://localhost:3000' : null) },
    json: async () => body,
  });

  const asClient = () => {
    state.guestError = null;
    state.session = clientSession();
  };

  const listFor = (workspaceId, userId) => store.get(keyOf(workspaceId, userId)) || [];

  return {
    state,
    sqlLog,
    consoleErrors,
    store,
    saveable,
    listFor,
    failNextUpdate: () => { failNextUpdate = true; },
    collection,
    single,
    clientSession,
    request,
    asClient,
  };
}

test('a client reads back only their own saved post list with a fixed response shape', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), [POST_PUBLISH]);
  h.store.set(keyOf(WORKSPACE_B, USER_B), [POST_OTHER]);

  h.state.session = h.clientSession({ workspaceId: WORKSPACE_B, userId: USER_B });
  const response = await h.collection.GET(h.request(undefined));

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.deepEqual(Object.keys(response.body).sort(), ['ok', 'savedPostIds']);
  assert.equal(JSON.stringify(response.body.savedPostIds), JSON.stringify([POST_OTHER]));
});

test('the saved list is normalized to unique valid post ids only', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), [
    'not-a-uuid',
    42,
    POST_PUBLISH,
    POST_PUBLISH,
    POST_OTHER,
    null,
  ]);

  h.asClient();
  const response = await h.collection.GET(h.request(undefined));

  assert.equal(response.status, 200);
  assert.equal(
    JSON.stringify(response.body.savedPostIds),
    JSON.stringify([POST_PUBLISH, POST_OTHER])
  );
});

test('private saves answer 401 for guests and 403 outside client workspaces', async () => {
  const h = makeHarness();

  h.state.guestError = new AuthError('Sign in to continue.', 401);
  const guestRead = await h.collection.GET(h.request(undefined));
  assert.equal(guestRead.status, 401);
  assert.equal(guestRead.body.error, 'Sign in to continue.');

  h.state.guestError = null;
  h.state.session = h.clientSession({ workspace: { role: 'professional' } });
  const professionalWrite = await h.collection.POST(h.request({ postId: POST_PUBLISH }));
  assert.equal(professionalWrite.status, 403);
  assert.equal(professionalWrite.body.error, 'Private Saves are available for client workspaces only.');
});

test('a mutation without a same origin header is rejected before any storage access', async () => {
  const h = makeHarness();
  h.asClient();
  const request = {
    url: 'http://localhost:3000/api/social/saves',
    headers: { get: () => null },
    json: async () => ({ postId: POST_PUBLISH }),
  };

  const response = await h.collection.POST(request);
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'Invalid request origin.');
  assert.deepEqual(h.sqlLog, []);
});

test('a malformed post reference answers 400 without touching storage', async () => {
  const h = makeHarness();
  h.asClient();

  const response = await h.collection.POST(h.request({ postId: 'not-a-uuid' }));
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Invalid post reference.');
  assert.deepEqual(h.sqlLog, []);
});

test('an unpublished or missing post cannot be saved', async () => {
  const h = makeHarness();
  h.asClient();

  const response = await h.collection.POST(h.request({ postId: POST_UNPUBLISHED }));
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Post not found.');
  assert.equal(h.listFor(WORKSPACE_A, USER_A).length, 0);
});

test('saving an available post appends it and reports the full new list', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), [POST_OTHER]);
  h.asClient();

  const response = await h.collection.POST(h.request({ postId: POST_PUBLISH }));
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(
    JSON.stringify(response.body.savedPostIds),
    JSON.stringify([POST_OTHER, POST_PUBLISH])
  );
  assert.equal(JSON.stringify(h.listFor(WORKSPACE_A, USER_A)), JSON.stringify([POST_OTHER, POST_PUBLISH]));
});

test('saving the same post twice keeps a single entry', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), []);
  h.asClient();

  const first = await h.collection.POST(h.request({ postId: POST_PUBLISH }));
  const second = await h.collection.POST(h.request({ postId: POST_PUBLISH }));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(JSON.stringify(second.body.savedPostIds), JSON.stringify([POST_PUBLISH]));
  assert.equal(h.listFor(WORKSPACE_A, USER_A).length, 1);
});

test('removing a saved post keeps every other saved id exactly', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), [POST_PUBLISH, POST_OTHER, POST_THIRD]);
  h.asClient();

  const response = await h.single.DELETE(h.request(undefined), {
    params: Promise.resolve({ postId: POST_OTHER }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.deepEqual(Object.keys(response.body).sort(), ['ok', 'savedPostIds']);
  assert.equal(
    JSON.stringify(response.body.savedPostIds),
    JSON.stringify([POST_PUBLISH, POST_THIRD])
  );
  assert.equal(
    JSON.stringify(h.listFor(WORKSPACE_A, USER_A)),
    JSON.stringify([POST_PUBLISH, POST_THIRD])
  );
});

test('removing a post that was never saved changes nothing', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), [POST_PUBLISH]);
  h.asClient();

  const response = await h.single.DELETE(h.request(undefined), {
    params: Promise.resolve({ postId: POST_OTHER }),
  });

  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(response.body.savedPostIds), JSON.stringify([POST_PUBLISH]));
});

test('a malformed removal target answers 404 without touching storage', async () => {
  const h = makeHarness();
  h.asClient();

  const response = await h.single.DELETE(h.request(undefined), {
    params: Promise.resolve({ postId: 'zzz' }),
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Post not found.');
  assert.deepEqual(h.sqlLog, []);
});

test('the 100 post cap fails closed with a generic error and no internal message', async () => {
  const h = makeHarness();
  const many = Array.from({ length: 100 }, (_, index) => {
    const tail = String(index + 1).padStart(12, '0');
    return `99999999-9999-4999-8999-${tail}`;
  });
  h.store.set(keyOf(WORKSPACE_A, USER_A), many);
  h.asClient();

  const response = await h.collection.POST(h.request({ postId: POST_PUBLISH }));

  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'Unable to complete this request.');
  assert.doesNotMatch(JSON.stringify(response.body), /100 posts/);
  assert.equal(h.listFor(WORKSPACE_A, USER_A).length, 100);
  assert.ok(h.sqlLog.includes('ROLLBACK'), 'the transaction must roll back');
  assert.ok(h.sqlLog.includes('RELEASE'), 'the pool client must be released');
});

test('a storage failure rolls back, releases the client and answers generically', async () => {
  const h = makeHarness();
  h.store.set(keyOf(WORKSPACE_A, USER_A), []);
  h.asClient();
  h.failNextUpdate();

  const response = await h.collection.POST(h.request({ postId: POST_PUBLISH }));

  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'Unable to complete this request.');
  assert.doesNotMatch(JSON.stringify(response.body), /storage layer|XX000/);
  assert.ok(h.sqlLog.includes('ROLLBACK'), 'the transaction must roll back');
  assert.ok(h.sqlLog.includes('RELEASE'), 'the pool client must be released');
  assert.equal(h.listFor(WORKSPACE_A, USER_A).length, 0);
  assert.equal(h.consoleErrors.length, 1, 'the failure must be logged once');
  assert.match(h.consoleErrors[0], /Error \(XX000\)/);
  assert.doesNotMatch(h.consoleErrors[0], /storage layer/);
});
