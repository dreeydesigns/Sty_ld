const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('restored schema supports actual new-account hooks without a remote connection', async () => {
  // Force the memory default even if a caller opted into other integration suites.
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    const schema = fs.readFileSync('tests/fixtures/review-schema.sql', 'utf8');
    assert.doesNotMatch(schema, /^\s*(INSERT|COPY|CREATE ROLE|ALTER ROLE|GRANT)\b/im);
    await db.exec(schema);
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    assert.equal(tables.rows.length, 40);
    for (const { tablename } of tables.rows) {
      const count = await db.query(`SELECT count(*)::int AS count FROM "${tablename}"`);
      assert.equal(count.rows[0].count, 0, `${tablename} starts empty`);
    }
    const deps = {
      'better-auth': { betterAuth: (config) => config, APIError: class APIError extends Error {} },
      'better-auth/plugins': { emailOTP: (config) => config },
      'better-auth/api': { createAuthMiddleware: (fn) => fn },
      './auth-database': { authPool: { query: (sql, values) => db.query(sql, values) } },
      './email-provider': { sendEmail: () => { throw new Error('No email delivery in a schema test.'); } },
      './email-reason': {},
      './security-events': { consumeLimit: async () => true },
      './auth-policy': { accountMaySignIn: (status) => status === 'active' },
    };
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync('lib/better-auth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(`(function(require,module,exports){${code}})`, { process: { env: {} }, Date })((name) => deps[name], module, module.exports);
    const config = module.exports.auth;
    const result = await db.query("INSERT INTO users (first_name,email,email_verified) VALUES ('Memory client','schema-client@example.test',true) RETURNING id");
    const user = result.rows[0];
    await config.databaseHooks.user.create.after(user);
    await config.databaseHooks.user.create.after(user);
    const workspaces = await db.query('SELECT role,status,profile FROM identity_workspaces WHERE user_id=$1', [user.id]);
    assert.equal(workspaces.rows.length, 1);
    assert.equal(workspaces.rows[0].role, 'client'); assert.equal(workspaces.rows[0].status, 'active');
    assert.deepEqual(workspaces.rows[0].profile, {});
    const roles = await db.query('SELECT role FROM user_roles WHERE user_id=$1', [user.id]);
    assert.deepEqual(roles.rows, [{ role: 'client' }]);
    const session = { userId: user.id };
    assert.equal((await config.databaseHooks.session.create.before(session)).data, session);
    await db.query('UPDATE users SET auth_suspended=true WHERE id=$1', [user.id]);
    await assert.rejects(config.databaseHooks.session.create.before(session));
    assert.equal(config.session.cookieCache.enabled, false);
    assert.equal(config.plugins[1].storeOTP, 'hashed');
  } finally { await db.close(); }
});
