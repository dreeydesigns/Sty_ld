const fs = require('node:fs');
const path = require('node:path');

function databaseTarget(env = process.env) {
  // Application credentials are never a test destination.
  if (!env.STYLD_TEST_DATABASE_URL) return { mode: 'memory' };
  if (env.STYLD_ALLOW_LOCAL_DB_TESTS !== 'yes') throw new Error('Local database writes require explicit opt-in.');
  let url;
  try { url = new URL(env.STYLD_TEST_DATABASE_URL); } catch { throw new Error('Invalid disposable test database target.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.pathname !== '/styld_disposable_test' || url.search || url.hash) {
    throw new Error('Database tests accept only a loopback styld_disposable_test database without connection overrides.');
  }
  return { mode: 'local', connectionString: env.STYLD_TEST_DATABASE_URL };
}

function disposableDatabase() {
  const target = databaseTarget();
  if (target.mode === 'local') return { Client: require('pg').Client, connectionString: target.connectionString, mode: 'local' };
  const { PGlite } = require('@electric-sql/pglite');
  let db, ready, turn = Promise.resolve();
  let clients = 0;
  // PGlite has one connection. Serialize whole transactions, not individual
  // statements. This tests transaction SQL but does not prove network locking.
  class Client {
    async connect() {
      if (!db) {
        db = new PGlite();
        ready = db.exec(fs.readFileSync(path.join(__dirname, '../fixtures/review-schema.sql'), 'utf8'));
      }
      await ready;
      clients++;
    }
    async lock() {
      const previous = turn;
      turn = new Promise((resolve) => { this.release = resolve; });
      await previous;
    }
    async query(sql, values = []) {
      const command = sql.trim().split(/\s+/)[0].toUpperCase();
      const begin = command === 'BEGIN';
      const finish = command === 'COMMIT' || command === 'ROLLBACK';
      const standalone = !this.transaction && !begin;
      if (begin || standalone) await this.lock();
      try {
        if (begin) this.transaction = true;
        const result = await db.query(sql, values);
        return { ...result, rowCount: command === 'SELECT' ? result.rows.length : result.affectedRows };
      } finally {
        if (finish) this.transaction = false;
        if (standalone || finish) { this.release(); this.release = null; }
      }
    }
    async end() {
      if (this.transaction) await this.query('ROLLBACK');
      if (--clients === 0) await db.close();
    }
  }
  return { Client, mode: 'memory', connectionString: undefined };
}

module.exports = { databaseTarget, disposableDatabase };
