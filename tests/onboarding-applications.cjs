const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(authenticated = true) {
  const writes = [];
  class AuthError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const deps = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => {
      if (!authenticated) throw new AuthError('Unauthorized', 401);
      return { userId: 'verified-owner', roles: ['client'] };
    } },
    '@/lib/auth-database': { authPool: { query: async (...args) => { writes.push(args); return { rows: [] }; } } },
    '@/lib/api-security': { sameOrigin: () => {}, authError: e => Response.json({ error: e.message }, { status: e.status || 500 }) },
    '@/lib/workspace-policy': { workspaceAvailable: () => true },
    '@/lib/security-events': { securityEvent: async () => {} },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('app/api/workspaces/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`)(name => {
    if (!(name in deps)) throw new Error(`Unexpected dependency ${name}`);
    return deps[name];
  }, module, module.exports);
  return { writes, post: body => module.exports.POST(new Request('https://example.test/api/workspaces', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })) };
}

const application = { role: 'professional', name: 'Test business', description: 'Services and location', contact: 'test@example.test' };
test('guest cannot submit an onboarding application', async () => {
  const f = fixture(false);
  assert.equal((await f.post(application)).status, 401);
  assert.equal(f.writes.length, 0);
});
test('onboarding cannot grant admin, shop or delivery roles', async () => {
  for (const role of ['super_admin', 'admin', 'shop', 'delivery']) {
    const f = fixture();
    assert.equal((await f.post({ ...application, role })).status, 400);
    assert.equal(f.writes.length, 0);
  }
});
test('provider onboarding records an application for the verified owner only', async () => {
  for (const role of ['professional', 'salon']) {
    const f = fixture();
    assert.equal((await f.post({ ...application, role, userId: 'other-user', status: 'approved' })).status, 200);
    assert.equal(f.writes.length, 1);
    const [query, values] = f.writes[0];
    assert.match(query, /INSERT INTO workspace_applications/);
    assert.doesNotMatch(query, /INSERT INTO (user_roles|workspaces)/);
    assert.equal(values[0], 'verified-owner');
    assert.equal(values[1], role);
    assert.ok(!values.includes('approved'));
  }
});
