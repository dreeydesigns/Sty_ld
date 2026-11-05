const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { process, console, Date, Headers, Response, Buffer })(
    name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}

function fixture({ admin = true, priorMfa = false, codeAvailable = true, failContext = false } = {}) {
  const events = [];
  const state = { mfa: priorMfa ? new Date() : null, activeRole: priorMfa ? 'super_admin' : 'client', workspaceId: 'workspace-client', codeAvailable };
  let snapshot;
  const client = {
    release() {},
    async query(sql, parameters = []) {
      if (sql === 'BEGIN') { snapshot = { ...state }; return { rows: [] }; }
      if (sql === 'ROLLBACK') { Object.assign(state, snapshot); return { rows: [] }; }
      if (sql === 'COMMIT' || sql.startsWith('SET LOCAL')) return { rows: [] };
      if (sql.startsWith('SELECT * FROM auth_totp')) return { rows: [{ enabled: true, encrypted_secret: 'test-secret', last_step: 0 }] };
      if (sql.startsWith('DELETE FROM auth_recovery_codes')) {
        const rowCount = state.codeAvailable ? 1 : 0;
        state.codeAvailable = false;
        return { rowCount, rows: [] };
      }
      if (sql.startsWith('UPDATE auth_totp')) return { rowCount: 1, rows: [] };
      if (sql.startsWith('INSERT INTO auth_session_context')) {
        if (failContext) throw new Error('simulated context failure');
        if (sql.includes("'client',NULL,NULL")) {
          state.mfa = null; state.activeRole = 'client'; state.workspaceId = null;
        } else { state.mfa = new Date(); state.activeRole = parameters[2]; }
        return { rowCount: 1, rows: [] };
      }
      throw new Error('Unexpected transaction statement');
    },
  };
  const pool = {
    connect: async () => client,
    async query(sql) {
      if (sql.startsWith('SELECT u.*')) return { rows: [{ id: 'identity', first_name: 'Tester', email: 'tester@example.test', role: admin ? 'super_admin' : 'client', deletion_status: 'active', mfa_enabled: true, mfa_verified_at: state.mfa, active_role: state.activeRole, workspace_id: state.workspaceId }] };
      if (sql.startsWith('SELECT id,role,status,profile')) return { rows: [{ id: 'workspace-client', role: 'client', status: 'active' }] };
      if (sql.startsWith('SELECT role FROM user_roles')) return { rows: admin ? [{ role: 'super_admin' }] : [] };
      throw new Error('Unexpected resolver statement');
    },
  };
  const policy = load('lib/auth-policy.ts', {});
  const resolver = load('lib/auth-resolver.ts', {
    'next/headers': { headers: async () => new Headers({ cookie: 'session=test-session' }) },
    './better-auth': { auth: { api: { getSession: async () => ({ user: { id: 'identity' }, session: { id: 'test-session', createdAt: new Date() } }) } } },
    './auth-database': { authPool: pool }, './auth-policy': policy,
    './workspace-policy': { workspaceAvailable: role => ['client', 'professional', 'salon'].includes(role) },
  });
  const endpoint = load('app/api/auth/mfa/totp/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/auth-resolver': resolver,
    '@/lib/auth-database': { authPool: pool }, '@/lib/auth-policy': policy,
    '@/lib/totp': { decryptTotpSecret: () => 'test-secret', verifyTotpCode: () => true, hashRecoveryCode: value => value },
    '@/lib/security-events': { consumeLimit: async () => true, securityEvent: async event => { events.push(event); } },
    '@/lib/api-security': { sameOrigin: () => {}, authError: error => Response.json({ error: error.message }, { status: error.statusCode || 500 }) },
  });
  return { state, events, resolver, submit: action => endpoint.POST(new Request('https://example.test/api/auth/mfa/totp', { method: 'POST', body: JSON.stringify({ action, code: 'fixture-code' }) })) };
}

for (const priorMfa of [false, true]) {
  test(`admin recovery clears privilege, including prior MFA=${priorMfa}`, async () => {
    const f = fixture({ priorMfa });
    const response = await f.submit('recovery');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).adminStepUpRequired, true);
    assert.deepEqual(f.events, ['mfa_recovery_used']);
    assert.equal(f.state.codeAvailable, false);
    assert.equal(f.state.mfa, null);
    assert.equal(f.state.activeRole, 'client');
    assert.equal(f.state.workspaceId, null);
    await assert.rejects(f.resolver.requireAdmin, /Administrator MFA required/);
    assert.equal((await f.submit('recovery')).status, 400, 'a consumed recovery code cannot be reused');
  });
}

test('real authenticator validation still establishes administrator step-up', async () => {
  const f = fixture();
  assert.equal((await f.submit('validate')).status, 200);
  assert.deepEqual(f.events, ['mfa_verified']);
  assert.equal((await f.resolver.requireAdmin()).role, 'super_admin');
});

test('ordinary-user recovery preserves its second-factor behavior without granting admin', async () => {
  const f = fixture({ admin: false });
  const response = await f.submit('recovery');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.adminStepUpRequired, false);
  assert.equal(body.continueTo, '/settings/security');
  assert.ok(f.state.mfa);
  assert.equal((await f.resolver.requireAuthenticatedUser()).mfaVerified, true);
  await assert.rejects(f.resolver.requireAdmin, /Administrator MFA required/);
});

test('failed context update rolls back recovery-code consumption', async () => {
  const f = fixture({ failContext: true });
  assert.equal((await f.submit('recovery')).status, 500);
  assert.equal(f.state.codeAvailable, true);
  assert.equal(f.state.mfa, null);
  assert.deepEqual(f.events, [], 'failed transactions never publish successful MFA events');
});

test('invalid recovery never establishes administrative access', async () => {
  const f = fixture({ codeAvailable: false });
  assert.equal((await f.submit('recovery')).status, 400);
  await assert.rejects(f.resolver.requireAdmin, /Administrator MFA required/);
});
