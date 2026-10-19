/**
 * Post-login account loading regression suite.
 *
 * Enforces GET /api/me against the accepted Better Auth QA schema:
 * 1. An authenticated user resolves to HTTP 200 with a valid profile.
 * 2. Workspace-scoped profiles keep their role and workspace fields.
 * 3. Unauthenticated requests resolve to HTTP 401 without querying the database.
 * 4. Unexpected failures return a generic 500 without leaking internal details.
 * 5. The handler never selects the removed users.clerk_user_id column and only
 *    selects user columns present in the current schema.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const ROUTE = 'app/api/me/route.ts';

const CURRENT_SCHEMA_COLUMNS = new Set([
  'id',
  'first_name',
  'last_name',
  'phone',
  'email',
  'role',
  'profile_image_url',
  'cover_image_url',
  'bio',
  'display_name',
  'salon_name',
  'location',
  'theme',
  'tribe_badge',
  'created_at',
]);

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

function loadRoute({ session = null, rows = [], sqlError = null } = {}) {
  const queries = [];
  const errorLogs = [];

  const route = loadTs(
    ROUTE,
    {
      'next/server': {
        NextRequest: class {},
        NextResponse: {
          json: (body, init = {}) => ({
            status: init.status || 200,
            body,
          }),
        },
      },
      '@vercel/postgres': {
        sql: (strings, ...values) => {
          queries.push(strings.join('?'));
          void values;
          if (sqlError) throw sqlError;
          return Promise.resolve({ rows });
        },
      },
      '@/lib/auth-resolver': {
        resolveCurrentStyldUser: async () => session,
      },
      '@/lib/workspace-policy': loadTs('lib/workspace-policy.ts'),
    },
    {
      console: {
        log: () => {},
        warn: () => {},
        error: (...args) => errorLogs.push(args),
      },
    }
  );

  return { GET: route.GET, queries, errorLogs };
}

function userRow(overrides = {}) {
  return {
    id: 'user-1',
    first_name: 'Amina',
    last_name: 'Njeri',
    phone: '+254700000001',
    email: 'amina@example.test',
    role: 'client',
    profile_image_url: null,
    cover_image_url: null,
    bio: null,
    display_name: null,
    salon_name: null,
    location: 'Nairobi',
    theme: 'sage',
    tribe_badge: null,
    created_at: '2026-10-19T08:00:00.000Z',
    ...overrides,
  };
}

function authSession(overrides = {}) {
  return {
    userId: 'user-1',
    sessionId: 'session-1',
    role: 'client',
    authSource: 'better-auth',
    roles: ['client'],
    admin: false,
    mfaVerified: false,
    mfaEnabled: false,
    workspace: null,
    ...overrides,
  };
}

test('GET /api/me returns 200 with a profile for an authenticated user on the current schema', async () => {
  const { GET, queries } = loadRoute({
    session: authSession(),
    rows: [userRow()],
  });

  const response = await GET({});

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.user.id, 'user-1');
  assert.equal(response.body.user.role, 'client');
  assert.equal(response.body.user.firstName, 'Amina');
  assert.equal(response.body.user.lastName, 'Njeri');
  assert.equal(response.body.user.phone, '+254700000001');
  assert.equal(response.body.authSource, 'better-auth');
  assert.equal(response.body.mfaVerified, false);
  assert.equal(response.body.mfaEnabled, false);

  const query = queries.join('\n').replace(/\s+/g, ' ');
  assert.match(query, /FROM users u/);
  assert.doesNotMatch(query, /clerk_user_id/);
});

test('GET /api/me preserves workspace role and workspace profile fields', async () => {
  const workspace = {
    id: 'workspace-1',
    role: 'professional',
    status: 'active',
    profile: {
      firstName: 'Amina',
      displayName: 'Amina Studio',
      phone: '+254700000001',
      theme: 'sage',
    },
  };

  const { GET, queries } = loadRoute({
    session: authSession({
      role: 'professional',
      roles: ['client', 'professional'],
      workspace,
    }),
    rows: [userRow()],
  });

  const response = await GET({});

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.user.id, 'user-1');
  assert.equal(response.body.user.workspaceId, 'workspace-1');
  assert.equal(response.body.user.role, 'professional');
  assert.equal(response.body.user.displayName, 'Amina Studio');
  assert.equal(response.body.user.firstName, 'Amina');

  const query = queries.join('\n');
  assert.doesNotMatch(query, /clerk_user_id/);
});

test('GET /api/me returns 401 without querying the database when unauthenticated', async () => {
  const { GET, queries } = loadRoute({ session: null });

  const response = await GET({});

  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.user, null);
  assert.equal(queries.length, 0, 'Unauthenticated requests must not query users');
});

test('GET /api/me returns a generic 500 and never leaks internal failure details', async () => {
  const internalDetail =
    'password=hunter2 connection to styld_qa failed: relation "users" does not exist';

  const { GET, errorLogs } = loadRoute({
    session: authSession(),
    sqlError: new Error(internalDetail),
  });

  const response = await GET({});

  assert.equal(response.status, 500);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error, 'Server error');

  const serialized = JSON.stringify(response.body);
  assert.doesNotMatch(serialized, /hunter2/);
  assert.doesNotMatch(serialized, /relation/i);
  assert.doesNotMatch(serialized, /stack/i);
  assert.equal(errorLogs.length, 1, 'The failure should still be logged server-side');
});

test('GET /api/me selects only current-schema user columns and never references clerk_user_id', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', ROUTE), 'utf8');

  assert.doesNotMatch(source, /clerk_user_id/i);

  const select = source.match(/SELECT([\s\S]*?)FROM users/);
  assert.ok(select, 'The users query must remain present');

  const columns = [...select[1].matchAll(/u\.([a-z_]+)/g)].map((match) => match[1]);
  assert.ok(columns.length > 0, 'The users query must select explicit columns');

  for (const column of columns) {
    assert.ok(
      CURRENT_SCHEMA_COLUMNS.has(column),
      `app/api/me must not select removed or unknown column u.${column}`
    );
  }
});
