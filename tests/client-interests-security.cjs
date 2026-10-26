const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(role = 'client', owned = true) {
  const queries = [];
  class AuthError extends Error { constructor(message, statusCode) { super(message); this.statusCode = statusCode; } }
  const deps = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => {
      if (!role) throw new AuthError('Unauthorized', 401);
      return { userId: 'owner', workspaceId: 'client-workspace', role };
    } },
    '@/lib/auth-database': { authPool: { query: async (...args) => {
      queries.push(args); return { rowCount: owned ? 1 : 0, rows: owned ? [{ interests: ['hair'] }] : [] };
    } } },
    '@/lib/api-security': { sameOrigin: () => {}, authError: e => Response.json({ error: e.message }, { status: e.statusCode || 500 }) },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`)(name => deps[name], module, module.exports);
  const request = body => new Request('https://example.test/api/onboarding/client-interests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { queries, get: () => module.exports.GET(new Request('https://example.test')), patch: body => module.exports.PATCH(request(body)) };
}

test('client preferences deny guests and other active workspace roles', async () => {
  for (const role of [null, 'professional', 'salon', 'super_admin']) {
    const f = fixture(role);
    assert.equal((await f.get()).status, role ? 403 : 401);
    assert.equal((await f.patch({ interests: ['hair'] })).status, role ? 403 : 401);
    assert.equal(f.queries.length, 0);
  }
});
test('client preferences remain unavailable without writing any account data', async () => {
  const f = fixture();
  assert.equal((await f.patch({ interests: ['hair'], userId: 'victim', workspaceId: 'victim-workspace' })).status, 503);
  assert.equal((await f.get()).status, 503);
  assert.equal(f.queries.length, 0);
});
test('client preferences reject invalid values and cannot bypass containment with empty values', async () => {
  const f = fixture();
  assert.equal((await f.patch({ interests: ['unknown'] })).status, 400);
  assert.equal(f.queries.length, 0);
  assert.equal((await f.patch({ interests: [] })).status, 503);
  assert.equal(f.queries.length, 0);
});
test('optional interests never block the canonical sign-in completion', () => {
  const source = fs.readFileSync('components/auth/unified-auth-flow.tsx', 'utf8');
  assert.doesNotMatch(source, /setStage\(['"]interests['"]\)|client-interests/);
  assert.match(source, /writeVerifiedAppSession\(data.user\)/);
});
