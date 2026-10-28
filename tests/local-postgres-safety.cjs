const test = require('node:test');
const assert = require('node:assert/strict');
const { localTarget, verifyIdentity } = require('./helpers/local-postgres.cjs');
const { cleanEnvironment, parseTapCounts } = require('../scripts/run-local-postgres.cjs');
const identity = { kind: 'styld-disposable-postgres', cluster: 'styld-local-11111111-1111-4111-8111-111111111111', port: 55438 };
const target = 'postgres://styld_local_runtime:local@127.0.0.1:55438/styld_disposable_test';

test('PostgreSQL target requires an owned cluster marker and explicit local credentials', () => {
  assert.throws(() => localTarget(target));
  assert.throws(() => localTarget(target, { ...identity, cluster: 'production' }));
  assert.equal(localTarget(target, identity).ssl, false);
});

test('PostgreSQL runner rejects Neon, alternate databases, ports, roles and connection overrides', () => {
  for (const invalid of [target.replace('127.0.0.1', 'qa.neon.tech'), target.replace('127.0.0.1', 'localhost'),
    target.replace('55438', '5432'), target.replace('styld_disposable_test', 'styld_review'),
    target.replace('styld_local_runtime', 'postgres'), target + '?host=remote.invalid', target + '#override',
    target.replace(':local@', '@')]) assert.throws(() => localTarget(invalid, identity));
});

test('server identity is checked independently before application or fixture writes', async () => {
  const observed = { database: 'styld_disposable_test', role: 'styld_local_runtime', address: '127.0.0.1', port: 55438, cluster: identity.cluster };
  const pool = row => ({ query: async () => ({ rows: [row] }) });
  await verifyIdentity(pool(observed), identity, 'styld_local_runtime');
  for (const patch of [{ database: 'styld_review' }, { role: 'postgres' }, { address: '10.0.0.1' }, { port: 5432 }, { cluster: 'other' }]) {
    await assert.rejects(verifyIdentity(pool({ ...observed, ...patch }), identity, 'styld_local_runtime'), /identity mismatch/);
  }
});

test('local test children do not inherit application secrets, service files or Node preload hooks', () => {
  const source = { PATH: 'local-tools', SystemRoot: 'windows', TEMP: 'scratch', POSTGRES_URL: 'unused', RESEND_API_KEY: 'unused',
    PGOPTIONS: 'unused', PGSERVICEFILE: 'unused', NODE_OPTIONS: 'unused', GITHUB_TOKEN: 'unused', NPM_TOKEN: 'unused' };
  assert.deepEqual(cleanEnvironment(source), { PATH: 'local-tools', SystemRoot: 'windows', TEMP: 'scratch' });
  assert.equal(source.POSTGRES_URL, 'unused', 'parent environment is unchanged');
});

test('the receipt counts the run the reporter reported, not a line it did not see', () => {
  // The shape Node writes at the end of a --test run (Windows line endings included).
  const tail = 'ok 23 - migration 015 manifest bounds\r\n# tests 24\r\n# suites 3\r\n# pass 24\r\n# fail 0\r\n# cancelled 0\r\n# duration_ms 51234\r\n';
  assert.deepEqual(parseTapCounts(tail), { tests: 24, pass: 24, fail: 0 });
  // A child file can print its own tally before the reporter closes the run.
  assert.deepEqual(parseTapCounts('# tests 6\n# pass 6\n# fail 0\n# tests 24\n# pass 23\n# fail 1\n'),
    { tests: 24, pass: 23, fail: 1 }, 'an earlier per-file tally must not overwrite the run total');
  // Nothing counted is nothing claimed: a receipt must not carry an invented zero.
  assert.deepEqual(parseTapCounts('ok 1 - something\nno reporter tail here\n'), { tests: null, pass: null, fail: null });
  assert.deepEqual(parseTapCounts(''), { tests: null, pass: null, fail: null });
  assert.deepEqual(parseTapCounts(null), { tests: null, pass: null, fail: null });
});
