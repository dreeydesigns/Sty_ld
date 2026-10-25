const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function serviceRoute(file = 'app/api/services/route.ts') {
  let writes = 0, authCalls = 0;
  const parameters = [];
  class AuthError extends Error { constructor(message, statusCode = 401) { super(message); this.statusCode = statusCode; } }
  const deps = {
    'next/server': { NextResponse: Response },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'mock-session' }) }) },
    '@/lib/auth-server': { verifySession: async () => ({ id: 'provider' }) },
    '@/lib/auth-resolver': { AuthError, requireAuthenticatedUser: async () => { authCalls++; return { userId: 'provider', workspaceId: 'workspace', role: 'professional' }; } },
    '@/lib/api-security': {
      sameOrigin(request) { if (request.headers.get('origin') !== 'https://review.test') throw new AuthError('Invalid request origin.', 403); },
      authError(error) { return Response.json({ error: error instanceof AuthError ? error.message : 'Unable to complete this request.' }, { status: error.statusCode || 500 }); },
    },
    '@/lib/auth-database': { authPool: { query: async (_sql, values) => { parameters.push(values); writes++; return { rows: [{ id: 'service' }] }; } } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { console: { error() {} } })((name) => deps[name], module, module.exports);
  return { route: module.exports, writes: () => writes, authCalls: () => authCalls, parameters };
}

test('service creation rejects missing or foreign Origin before resolving the actor or writing', async () => {
  for (const origin of [null, 'https://attacker.test', 'null']) {
    const f = serviceRoute();
    const request = new Request('https://review.test/api/services', { method: 'POST', headers: origin ? { origin } : {}, body: JSON.stringify({ name: 'Mock service', price: 100 }) });
    const response = await f.route.POST(request);
    assert.equal(response.status, 403);
    assert.equal(f.writes(), 0);
    assert.equal(f.authCalls(), 0);
  }
});

test('block, unblock and report mutations reject missing or foreign Origin without writes', async () => {
  for (const [file, method] of [['app/api/blocks/route.ts', 'POST'], ['app/api/blocks/route.ts', 'DELETE'], ['app/api/reports/route.ts', 'POST']]) {
    for (const origin of [null, 'https://attacker.test', 'null']) {
      const f = serviceRoute(file);
      const response = await f.route[method](new Request('https://review.test/api/mutation', { method, headers: origin ? { origin } : {},
        body: JSON.stringify({ blockedId: 'target', targetType: 'user', targetId: 'target', reason: 'Mock report' }) }));
      assert.equal(response.status, 403, `${method} ${file}`);
      assert.equal(f.writes(), 0);
    }
  }
});

test('same-origin blocking and reporting remain available with server authentication', async () => {
  for (const [file, method] of [['app/api/blocks/route.ts', 'POST'], ['app/api/blocks/route.ts', 'DELETE'], ['app/api/reports/route.ts', 'POST']]) {
    const f = serviceRoute(file);
    const response = await f.route[method](new Request('https://review.test/api/mutation', { method, headers: { origin: 'https://review.test' },
      body: JSON.stringify({ blockedId: 'target', targetType: 'user', targetId: 'target', reason: 'Mock report', userId: 'spoofed' }) }));
    assert.equal(response.status, 200); assert.equal(f.writes(), 1);
    assert.equal(f.parameters[0][0], 'provider');
  }
});

test('same-origin service creation retains server-derived ownership', async () => {
  const f = serviceRoute();
  const response = await f.route.POST(new Request('https://review.test/api/services', { method: 'POST', headers: { origin: 'https://review.test' }, body: JSON.stringify({ name: 'Mock service', price: 100, userId: 'attacker' }) }));
  assert.equal(response.status, 200);
  assert.equal(f.writes(), 1);
  assert.equal(f.parameters[0][0], 'provider');
});
