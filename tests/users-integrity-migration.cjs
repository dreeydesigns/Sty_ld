/**
 * Users integrity migration suite (Backend & Data slice).
 *
 * Applies sql/migrations/014_users_integrity_guards.sql to the reviewed schema-only
 * fixture inside an embedded PostgreSQL and proves the drift Better Auth reports is
 * closed, that the guard refuses to fabricate an email or a timestamp, and that a
 * refused run leaves the schema exactly as it was.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION = 'sql/migrations/014_users_integrity_guards.sql';
const DRIFTED = ['email', 'email_verified', 'created_at', 'updated_at'];
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

// One embedded engine for the whole file: startup dominates the cost, and each test
// resets the schema instead of paying it again.
let engine;
async function database() {
  if (!engine) {
    const { PGlite } = require('@electric-sql/pglite');
    engine = new PGlite();
  }
  await engine.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await engine.exec(read('tests/fixtures/review-schema.sql'));
  return engine;
}

async function nullable(db) {
  const { rows } = await db.query(
    "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name = ANY($1::text[])",
    [DRIFTED]
  );
  return Object.fromEntries(rows.map(row => [row.column_name, row.is_nullable]));
}

async function defaults(db) {
  const { rows } = await db.query(
    "SELECT column_name, column_default FROM information_schema.columns WHERE table_name='users' AND column_name = ANY($1::text[])",
    [DRIFTED]
  );
  return Object.fromEntries(rows.map(row => [row.column_name, row.column_default]));
}

const migrate = db => db.exec(read(MIGRATION));
// A refused guard aborts the transaction exactly as psql would find it, so the test
// ends the session the way ON_ERROR_STOP=1 would and then looks at the schema.
async function migrationError(db) {
  try {
    await migrate(db);
  } catch (error) {
    await db.exec('ROLLBACK');
    return error.message;
  }
  throw new Error('the migration was expected to refuse');
}
const allRequired = Object.fromEntries(DRIFTED.map(column => [column, 'NO']));
const allDrifted = Object.fromEntries(DRIFTED.map(column => [column, 'YES']));

test('the drift is real before the migration: all four columns accept nulls', async () => {
  const db = await database();
  assert.deepEqual(await nullable(db), allDrifted);
});

test('migration 014 closes the drift without touching a single row', async () => {
  const db = await database();
  await migrate(db);
  assert.deepEqual(await nullable(db), allRequired);
  const stamped = await defaults(db);
  assert.match(stamped.created_at, /now\(\)/, 'a future row gets a real insert-time stamp');
  assert.match(stamped.updated_at, /now\(\)/);
  assert.match(stamped.email_verified, /false/, 'an unflagged account is unverified, not unknown');
});

test('an account with an email inserts cleanly, and one without is rejected by the schema', async () => {
  const db = await database();
  await migrate(db);
  const inserted = await db.query(
    "INSERT INTO users (first_name,email,email_verified) VALUES ('Beta client','beta@styld.test',true) RETURNING id, created_at, updated_at"
  );
  assert.ok(inserted.rows[0].id);
  assert.ok(inserted.rows[0].created_at instanceof Date, 'the default stamps the row at insert time');
  await assert.rejects(
    db.query("INSERT INTO users (first_name,email_verified) VALUES ('No email',false)"),
    error => /not-null/i.test(error.message) && /email/i.test(error.message)
  );
});

test('a row without an email stops the migration, names the count and invents nothing', async () => {
  const db = await database();
  await db.query("INSERT INTO users (first_name,email,email_verified,created_at,updated_at) VALUES ('Legacy phone account',NULL,false,now(),now())");
  assert.match(await migrationError(db), /usable email must be resolved first: 1/);
  assert.deepEqual(await nullable(db), allDrifted, 'a refused migration leaves the schema exactly as it was');
  const survivors = await db.query('SELECT email FROM users');
  assert.equal(survivors.rows.length, 1);
  assert.equal(survivors.rows[0].email, null, 'no placeholder email was written into the row');
});

test('a row without a real timestamp stops the migration instead of receiving now()', async () => {
  const db = await database();
  await db.query("INSERT INTO users (first_name,email,email_verified,created_at,updated_at) VALUES ('Imported account','imported@styld.test',true,NULL,NULL)");
  assert.match(await migrationError(db), /real timestamp must be resolved first: 1/);
  const survivors = await db.query('SELECT created_at,updated_at FROM users');
  assert.equal(survivors.rows[0].created_at, null, 'the row keeps its unknown history rather than a fabricated one');
});

test('an empty or whitespace email counts as missing, because nobody can be signed in to it', async () => {
  const db = await database();
  await db.query("INSERT INTO users (first_name,email,email_verified,created_at,updated_at) VALUES ('Blank email','   ',true,now(),now())");
  assert.match(await migrationError(db), /usable email must be resolved first: 1/);
});

test('every account survives a clean run, so the guard is a gate and not a cleanup', async () => {
  const db = await database();
  await db.query("INSERT INTO users (first_name,email,email_verified,created_at,updated_at) VALUES ('Kept client','kept@styld.test',true,now(),now()),('Second client','second@styld.test',false,now(),now())");
  await migrate(db);
  const { rows } = await db.query('SELECT count(*)::int AS total FROM users');
  assert.equal(rows[0].total, 2);
});

test('the migration text itself refuses to fabricate identity or destroy rows', () => {
  const sql = read(MIGRATION);
  assert.doesNotMatch(sql, /SET\s+email\s*=/i, 'an email is never backfilled by default');
  assert.doesNotMatch(sql, /SET\s+created_at\s*=/i, 'a history stamp is never invented');
  assert.doesNotMatch(sql, /SET\s+updated_at\s*=/i);
  assert.doesNotMatch(sql, /DELETE\s+FROM|DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE/i, 'closing drift must not remove data');
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/, 'the whole run is one transaction');
  // The engine surfaces the RAISE message but not the HINT, so the human instruction is checked here.
  assert.match(sql, /STYLD will not invent one\./);
  assert.match(sql, /Do not default it to now\(\)\./);
});
