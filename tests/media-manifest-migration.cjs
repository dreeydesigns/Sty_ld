/**
 * Media manifest migration suite (Backend & Data slice).
 *
 * Applies sql/migrations/015_media_manifests.sql to the reviewed schema-only fixture
 * inside an embedded PostgreSQL and proves the bounds the delivery proxy depends on are
 * database rules, not application habits: a window that outlives five minutes, a claimed
 * provider restriction with no verification record and a published row with no approved
 * derivative are all refused by the store itself.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION = 'sql/migrations/015_media_manifests.sql';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const OTHER_WORKSPACE = '22222222-2222-4222-8222-222222222222';
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

let engine;
async function database() {
  if (!engine) {
    const { PGlite } = require('@electric-sql/pglite');
    engine = new PGlite();
  }
  await engine.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await engine.exec(read('tests/fixtures/review-schema.sql'));
  await engine.exec(`INSERT INTO users (id, first_name, role) VALUES ('${USER}', 'Migration probe', 'professional')`);
  await engine.exec(`INSERT INTO identity_workspaces (id, user_id, role, status)
    VALUES ('${WORKSPACE}', '${USER}', 'professional', 'active'), ('${OTHER_WORKSPACE}', '${USER}', 'salon', 'active')`);
  await engine.exec(read(MIGRATION));
  return engine;
}

async function insert(db, patch = {}) {
  const row = { asset_id: 'pending_asset_01', provider_public_id: 'styld/owner/pending_asset_01', owner_workspace_id: WORKSPACE,
    version: 1, state: 'pending', delivery_type: 'authenticated', provider_restriction_verified: false,
    provider_restriction_verified_at: null, revoked: false, public_derivative_verified: false, approved_version: null,
    access_granted_at: null, access_expires_at: null, ...patch };
  const columns = Object.keys(row).map(key => `"${key}"`).join(', ');
  const values = Object.values(row).map(value => value === null ? 'NULL' : typeof value === 'string' && !/^\d+$/.test(value) ? `'${value}'`
    : typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
  await db.query(`INSERT INTO media_manifests (${columns}) VALUES (${values.join(', ')})`);
}

async function refusal(db, patch) {
  try {
    await insert(db, patch);
    return null;
  } catch (error) {
    return String(error.message ?? error);
  }
}

const constraints = async db => (await db.query(
  "SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid WHERE rel.relname = 'media_manifests' AND con.contype IN ('c', 'f', 'p') ORDER BY con.conname"
)).rows.map(row => row.conname);

test('the run creates the manifest, its owner link and every bound the proxy reads', async () => {
  const db = await database();
  const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='media_manifests'")).rows.map(row => row.column_name);
  for (const column of ['asset_id', 'provider_public_id', 'owner_workspace_id', 'version', 'state', 'delivery_type',
    'provider_restriction_verified', 'provider_restriction_verified_at', 'revoked', 'public_derivative_verified', 'approved_version',
    'access_granted_at', 'access_expires_at']) {
    assert.ok(columns.includes(column), `${column} is missing, so the proxy would be reading a guess`);
  }
  const names = await constraints(db);
  assert.ok(names.includes('media_manifests_owner_workspace_id_fkey'), 'ownership points at a real workspace');
  for (const name of ['media_manifests_asset_id_shape', 'media_manifests_access_window_is_bounded',
    'media_manifests_restriction_needs_a_record', 'media_manifests_publication_needs_derivative', 'media_manifests_approved_version_tracks_state']) {
    assert.ok(names.includes(name), `${name} is the rule the application also checks, and it belongs in the store`);
  }
  await insert(db, { provider_restriction_verified: true, provider_restriction_verified_at: '2026-10-27T09:00:00Z' });
  const stored = (await db.query('SELECT state, delivery_type, version FROM media_manifests')).rows;
  assert.deepEqual(stored, [{ state: 'pending', delivery_type: 'authenticated', version: 1 }]);
});

test('a claimed provider restriction without a verification record is refused', async () => {
  const db = await database();
  const message = await refusal(db, { provider_restriction_verified: true });
  assert.match(String(message), /restriction_needs_a_record|check constraint/, message);
  assert.equal((await db.query('SELECT count(*) AS n FROM media_manifests')).rows[0].n, 0, 'the refused row leaves nothing behind');
});

test('an access window longer than five minutes, or one that runs backwards, is refused at the store', async () => {
  const db = await database();
  const base = { provider_restriction_verified: true, provider_restriction_verified_at: '2026-10-27T09:00:00Z', access_granted_at: '2026-10-27T09:00:00Z' };
  for (const [minutes, expires] of [['6', '2026-10-27T09:06:00Z'], ['30', '2026-10-27T09:30:00Z'], ['1440', '2026-10-28T09:00:00Z']]) {
    const message = await refusal(db, { ...base, access_expires_at: expires });
    assert.match(String(message), /access_window_is_bounded|check constraint/, `a ${minutes} minute window must not be writable`);
  }
  const backwards = await refusal(db, { ...base, access_expires_at: '2026-10-27T08:00:00Z' });
  assert.match(String(backwards), /access_window_is_bounded|check constraint/);
  await insert(db, { ...base, access_expires_at: '2026-10-27T09:04:59Z' });
  assert.equal((await db.query('SELECT count(*) AS n FROM media_manifests')).rows[0].n, 1, 'a window inside the bound is writable');
});

test('a published row needs an approved derivative at its own version', async () => {
  const db = await database();
  assert.match(String(await refusal(db, { state: 'published' })), /publication_needs_derivative|check constraint/);
  assert.match(String(await refusal(db, { state: 'published', public_derivative_verified: true, approved_version: 2, version: 3 })),
    /publication_needs_derivative|check constraint/, 'an approval for an older version is not an approval for this one');
  await insert(db, { state: 'published', delivery_type: 'public', public_derivative_verified: true, approved_version: 3, version: 3 });
  assert.equal((await db.query("SELECT count(*) AS n FROM media_manifests WHERE state='published'")).rows[0].n, 1);
  assert.match(String(await refusal(db, { asset_id: 'pending_asset_02', state: 'pending', approved_version: 1 })),
    /approved_version_tracks_state|check constraint/, 'an approval recorded against an unreviewed asset is a contradiction');
});

test('identities, states and delivery types the rules do not know cannot be stored', async () => {
  const db = await database();
  for (const patch of [{ asset_id: 'has spaces' }, { asset_id: 'a'.repeat(101) }, { state: 'moderating' }, { delivery_type: 'upload' },
    { version: 0 }, { owner_workspace_id: '33333333-3333-4333-8333-333333333333' }, { owner_workspace_id: 'not-a-uuid' }]) {
    const message = await refusal(db, patch);
    assert.notEqual(message, null, `${JSON.stringify(patch)} was accepted`);
    // A malformed owner id is turned away by the column type before any rule runs; both are refusals.
    assert.match(String(message), /check constraint|violates foreign key|violates primary key|invalid input syntax/, message);
  }
  // The owner reference must be a workspace that exists, and a duplicate name cannot
  // quietly overwrite the asset someone else is waiting on.
  const first = { asset_id: 'shared_asset', provider_public_id: 'styld/one/shared_asset' };
  await insert(db, first);
  assert.match(String(await refusal(db, { ...first, provider_public_id: 'styld/two/shared_asset' })), /duplicate key|violates primary key/);
});

test('running the migration again is a no-op that leaves the recorded facts alone', async () => {
  const db = await database();
  await insert(db, { provider_restriction_verified: true, provider_restriction_verified_at: '2026-10-27T09:00:00Z' });
  await engine.exec(read(MIGRATION));
  const stored = (await db.query('SELECT asset_id, state, provider_restriction_verified FROM media_manifests')).rows;
  assert.deepEqual(stored, [{ asset_id: 'pending_asset_01', state: 'pending', provider_restriction_verified: true }]);
  const indexes = (await db.query("SELECT indexname FROM pg_indexes WHERE tablename='media_manifests' ORDER BY indexname")).rows.map(row => row.indexname);
  assert.ok(indexes.includes('media_manifests_owner_idx'), 'the owner lookup the moderation queue needs is indexed');
});

test('deleting the owning workspace takes its manifest rows with it', async () => {
  const db = await database();
  await insert(db, { owner_workspace_id: OTHER_WORKSPACE });
  await db.query('DELETE FROM identity_workspaces WHERE id=$1', [OTHER_WORKSPACE]);
  assert.equal((await db.query('SELECT count(*) AS n FROM media_manifests')).rows[0].n, 0,
    'a restricted asset must not outlive the workspace that owns it');
});
