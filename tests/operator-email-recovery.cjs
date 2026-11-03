const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(extra = [], currentEmail = 'old@example.test', duplicate = false) {
  const queries = [];
  const client = { release() {}, async query(sql, values) {
    queries.push({ sql, values });
    if (sql.startsWith('SELECT id,email,role')) return { rowCount: 1, rows: [{ id: 'reviewed-user', email: currentEmail, role: 'client' }] };
    if (sql.startsWith('SELECT id FROM users')) return { rowCount: duplicate ? 1 : 0, rows: [] };
    return { rowCount: 1, rows: [] };
  } };
  const pool = { connect: async () => client, end: async () => {} };
  const code = ts.transpileModule(fs.readFileSync('scripts/recover-account-email.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/main\(\)\.catch\([\s\S]*$/, 'module.exports.run = main;');
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}})`, {
    process: { cwd: () => '/disposable-test', argv: ['node', 'operator-test', '--user-id', 'reviewed-user', '--email', 'replacement@example.test', '--reason', 'verified-support-reference', ...extra] },
    console: { log() {}, error() {} },
  })(name => name === '@next/env' ? { loadEnvConfig() {} } : { authPool: pool }, module, module.exports);
  return { run: module.exports.run, queries };
}
test('existing email cannot be replaced without explicit reviewed-address guards', async () => {
  const h = harness(['--apply', '--ownership-verified']); await assert.rejects(h.run(), /--expected-email/);
  assert.ok(!h.queries.some(q => q.sql.startsWith('UPDATE') || q.sql.startsWith('DELETE')));
});
test('apply refuses an unverified ownership claim even with a matching expected address', async () => {
  const h = harness(['--apply', '--replace-existing-email', '--expected-email', 'old@example.test']);
  await assert.rejects(h.run(), /ownership review/); assert.equal(h.queries.length, 0);
});
test('a changed expected address or duplicate replacement never alters identity', async () => {
  for (const [expected, duplicate] of [['different@example.test', false], ['old@example.test', true]]) {
    const h = harness(['--apply', '--ownership-verified', '--replace-existing-email', '--expected-email', expected], 'old@example.test', duplicate);
    await assert.rejects(h.run()); assert.ok(!h.queries.some(q => q.sql.startsWith('UPDATE') || q.sql.startsWith('DELETE')));
  }
});
test('preflight is read-only; approved apply changes only the reviewed identity and revokes its sessions', async () => {
  const flags = ['--ownership-verified', '--replace-existing-email', '--expected-email', 'old@example.test'];
  const dry = harness(flags); await dry.run(); assert.ok(!dry.queries.some(q => q.sql.startsWith('UPDATE') || q.sql.startsWith('DELETE')));
  const h = harness([...flags, '--apply']); await h.run();
  const changes = h.queries.filter(q => /^(UPDATE|DELETE)/.test(q.sql));
  assert.equal(changes.length, 3);
  assert.ok(changes.every(q => q.values[0] === 'reviewed-user'));
  assert.match(changes[0].sql, /email_verified=false/);
  assert.ok(!changes.some(q => /SET.*role|identity_workspaces|user_roles/.test(q.sql)));
  assert.ok(h.queries.some(q => q.sql.includes('INSERT INTO security_events')));
});
