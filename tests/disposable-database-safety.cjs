const test = require('node:test');
const assert = require('node:assert/strict');
const { databaseTarget } = require('./helpers/disposable-database.cjs');

test('database-writing suites ignore application connection variables', () => {
  assert.deepEqual(databaseTarget({ POSTGRES_URL: 'postgres://app:secret@remote.invalid/live', DATABASE_URL: 'postgres://localhost/live' }), { mode: 'memory' });
});

test('external database integration requires explicit opt-in and a named loopback disposable database', () => {
  const safe = 'postgres://tester:secret@127.0.0.1/styld_disposable_test';
  assert.throws(() => databaseTarget({ STYLD_TEST_DATABASE_URL: safe }), /explicit/i);
  assert.equal(databaseTarget({ STYLD_TEST_DATABASE_URL: safe, STYLD_ALLOW_LOCAL_DB_TESTS: 'yes' }).mode, 'local');
  for (const url of ['postgres://tester:secret@qa.neon.tech/styld_disposable_test', 'postgres://localhost/styld_review', 'postgres://localhost/styld_disposable_test?host=remote.invalid', 'postgres://localhost/styld_disposable_test?service=production', 'invalid']) {
    assert.throws(() => databaseTarget({ STYLD_TEST_DATABASE_URL: url, STYLD_ALLOW_LOCAL_DB_TESTS: 'yes' }));
  }
});
