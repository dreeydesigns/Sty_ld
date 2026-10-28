/**
 * Migration 015 against the PostgreSQL the founder actually runs.
 *
 * tests/media-manifest-migration.cjs drives the same rules through an embedded engine. This
 * file applies sql/migrations/015_media_manifests.sql to the owned disposable cluster (17.11,
 * loopback, created and dropped by scripts/run-local-postgres.cjs) and then issues the real
 * statements lib/media-manifest.ts uses, so the interval arithmetic, the SET LOCAL guards and
 * every named check are proven on server PostgreSQL rather than only inside the application's
 * own process. Nothing here can reach a database outside that cluster: openLocalDatabases
 * refuses any target that is not the runner's own.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const { openLocalDatabases } = require('../helpers/local-postgres.cjs');

const root = path.resolve(__dirname, '..', '..');
const MIGRATION = 'sql/migrations/015_media_manifests.sql';
const ASSET = 'pg_probe_asset';
const USER = randomUUID();
const WORKSPACE = randomUUID();
const OTHER_WORKSPACE = randomUUID();

let db;

function loadManifestModule() {
  const file = path.join(root, 'lib/media-manifest.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + code + '})', {
    Date, Math, Number, Object, Promise, RegExp, Set, String, console,
  })(name => {
    if (name === './auth-database') return { authPool: null };
    throw new Error('Unexpected dependency ' + name);
  }, module, module.exports);
  return module.exports;
}

async function insertRow(patch = {}) {
  const row = { asset_id: ASSET, provider_public_id: `styld/${WORKSPACE}/${ASSET}`, owner_workspace_id: WORKSPACE,
    version: 1, state: 'pending', delivery_type: 'authenticated', provider_restriction_verified: true,
    provider_restriction_verified_at: '2026-10-27T09:00:00Z', revoked: false, public_derivative_verified: false,
    approved_version: null, access_granted_at: null, access_expires_at: null, ...patch };
  const columns = Object.keys(row);
  const values = columns.map((_, index) => `$${index + 1}`);
  await db.owner.query(`INSERT INTO media_manifests (${columns.join(', ')}) VALUES (${values.join(', ')})`,
    columns.map(column => row[column]));
}

async function refusal(run) {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}

const CHECK = '23514';

test.before(async () => {
  db = await openLocalDatabases();
  await db.owner.query(fs.readFileSync(path.join(root, MIGRATION), 'utf8'));
  await db.owner.query('INSERT INTO users (id, first_name, role) VALUES ($1, $2, $3)', [USER, 'Migration probe', 'professional']);
  await db.owner.query('INSERT INTO identity_workspaces (id, user_id, role, status) VALUES ($1, $2, $3, $4)', [WORKSPACE, USER, 'professional', 'active']);
  await db.owner.query('INSERT INTO identity_workspaces (id, user_id, role, status) VALUES ($1, $2, $3, $4)', [OTHER_WORKSPACE, USER, 'salon', 'active']);
});

test.after(async () => {
  if (!db) return;
  await db.owner.query('DROP TABLE IF EXISTS media_manifests');
  await db.owner.query('DELETE FROM identity_workspaces WHERE id = ANY($1)', [[WORKSPACE, OTHER_WORKSPACE]]);
  await db.owner.query('DELETE FROM users WHERE id = $1', [USER]);
  await db.close();
});

test('the run creates the manifest and its rules on server PostgreSQL', async () => {
  const names = (await db.owner.query(
    "SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid WHERE rel.relname = 'media_manifests' ORDER BY con.conname"
  )).rows.map(row => row.conname);
  for (const name of ['media_manifests_asset_id_shape', 'media_manifests_access_window_is_bounded',
    'media_manifests_restriction_needs_a_record', 'media_manifests_publication_needs_derivative',
    'media_manifests_approved_version_tracks_state', 'media_manifests_pkey', 'media_manifests_owner_workspace_id_fkey']) {
    assert.ok(names.includes(name), `${name} is missing from the server engine`);
  }
  const indexes = (await db.owner.query("SELECT indexname FROM pg_indexes WHERE tablename = 'media_manifests'")).rows.map(row => row.indexname);
  assert.ok(indexes.includes('media_manifests_owner_idx'), 'the owner lookup the moderation queue needs is indexed');
  const version = (await db.owner.query('SHOW server_version')).rows[0].server_version;
  assert.match(String(version), /^17\.11/, 'this suite only speaks for the engine it ran on');
});

test('every bound the delivery proxy reads is a rule of the store, not of the application', async () => {
  const cases = [
    ['a claimed restriction with no verification record', { provider_restriction_verified: true, provider_restriction_verified_at: null },
      /restriction_needs_a_record/],
    ['a window wider than five minutes', { access_granted_at: '2026-10-27T09:00:00Z', access_expires_at: '2026-10-27T09:05:01Z' },
      /access_window_is_bounded/],
    ['a window with no grant behind it', { access_expires_at: '2026-10-27T09:02:00Z' }, /access_window_is_bounded/],
    ['a window that runs backwards', { access_granted_at: '2026-10-27T09:00:00Z', access_expires_at: '2026-10-27T08:00:00Z' },
      /access_window_is_bounded/],
    ['a published row with no derivative', { state: 'published' }, /publication_needs_derivative/],
    ['an approval for a different version', { state: 'published', public_derivative_verified: true, approved_version: 2, version: 3 },
      /publication_needs_derivative/],
    ['an approval against an unreviewed asset', { state: 'pending', approved_version: 1 }, /approved_version_tracks_state/],
    ['an asset name the rules do not know', { asset_id: 'has spaces' }, /asset_id_shape/],
    ['a state outside the four the policy reads', { state: 'moderating' }, /state/],
    ['a delivery type that is not one of the two', { delivery_type: 'upload' }, /delivery_type/],
    ['a version below the first', { version: 0 }, /version/],
  ];
  for (const [index, [label, patch, rule]] of cases.entries()) {
    const error = await refusal(() => insertRow({ asset_id: `probe_${index}`, ...patch }));
    assert.notEqual(error, null, `${label} was accepted by server PostgreSQL`);
    assert.equal(error.code, CHECK, label);
    assert.match(String(error.message), rule, `${label} was refused by an unexpected rule`);
  }
  // node-postgres hands a bigint aggregate back as text, so the row count is read as a number
  // before it is compared. The engine refused the writes; this line only proves nothing was left.
  assert.equal(Number((await db.owner.query('SELECT count(*) AS n FROM media_manifests')).rows[0].n), 0, 'a refused write leaves nothing behind');
});

test('ownership and identity are enforced by the engine', async () => {
  await insertRow();
  assert.equal((await refusal(() => insertRow({ provider_public_id: 'styld/two/again' }))).code, '23505',
    'the same asset name cannot quietly overwrite the row someone is waiting on');
  const missing = await refusal(() => insertRow({ asset_id: 'orphan_asset', owner_workspace_id: randomUUID() }));
  assert.equal(missing.code, '23503', 'a manifest must belong to a workspace that exists');
  const malformed = await refusal(() => insertRow({ asset_id: 'typed_owner', owner_workspace_id: 'not-a-uuid' }));
  assert.equal(malformed.code, '22P02', 'the uuid column turns away a value it cannot store');
  await db.owner.query('DELETE FROM media_manifests');
  await insertRow({ owner_workspace_id: OTHER_WORKSPACE });
  await db.owner.query('DELETE FROM identity_workspaces WHERE id = $1', [OTHER_WORKSPACE]);
  assert.equal(Number((await db.owner.query('SELECT count(*) AS n FROM media_manifests')).rows[0].n), 0,
    'a restricted asset cannot outlive the workspace that owns it');
});

test('the statement the route issues lands a bounded window the engine accepts', async () => {
  await insertRow();
  const manifest = loadManifestModule();
  const owner = { userId: USER, sessionId: 'probe-session', active: true, mfaVerified: false, canReviewMedia: false,
    role: 'professional', workspaceId: WORKSPACE };
  assert.equal(await manifest.openPendingAccessWindow(ASSET, owner, 300, db.owner), 'granted');
  const first = (await db.owner.query(
    'SELECT access_granted_at, access_expires_at, provider_restriction_verified FROM media_manifests WHERE asset_id = $1', [ASSET]
  )).rows[0];
  assert.equal(first.provider_restriction_verified, true);
  const span = (first.access_expires_at.getTime() - first.access_granted_at.getTime()) / 1000;
  assert.ok(span > 0 && span <= 300, `the recorded window is ${span}s, which the five minute rule cannot hold`);

  // A caller who asks for an hour still gets the ceiling, because the literal is clamped
  // before it reaches the statement and the store would refuse anything wider.
  assert.equal(await manifest.openPendingAccessWindow(ASSET, owner, 3600, db.owner), 'granted');
  const widened = (await db.owner.query(
    "SELECT extract(epoch from (access_expires_at - access_granted_at)) AS span FROM media_manifests WHERE asset_id = $1", [ASSET]
  )).rows[0];
  assert.ok(Number(widened.span) <= 300, `a ${widened.span}s window escaped the clamp`);

  // Another workspace is refused by the WHERE clause, and the existing window is untouched.
  const beforeForeign = (await db.owner.query('SELECT access_expires_at FROM media_manifests WHERE asset_id = $1', [ASSET])).rows[0];
  const stranger = { ...owner, workspaceId: OTHER_WORKSPACE };
  assert.equal(await manifest.openPendingAccessWindow(ASSET, stranger, 300, db.owner), 'not_available');
  const afterForeign = (await db.owner.query('SELECT access_expires_at FROM media_manifests WHERE asset_id = $1', [ASSET])).rows[0];
  assert.equal(afterForeign.access_expires_at.getTime(), beforeForeign.access_expires_at.getTime(),
    'a refused request rewrites nothing');

  // The store, not only the application, is the backstop.
  const escaped = await refusal(() => db.owner.query(
    "UPDATE media_manifests SET access_granted_at = now(), access_expires_at = now() + interval '301 seconds' WHERE asset_id = $1", [ASSET]
  ));
  assert.equal(escaped.code, CHECK, 'a hand-written window beyond the ceiling is refused by PostgreSQL');
  assert.match(String(escaped.message), /access_window_is_bounded/);
});

test('running the migration again is a no-op that keeps the recorded facts', async () => {
  const window = (await db.owner.query('SELECT asset_id, state, provider_restriction_verified, access_expires_at FROM media_manifests WHERE asset_id = $1', [ASSET])).rows[0];
  assert.ok(window, 'the previous probe is still here to be protected');
  await db.owner.query(fs.readFileSync(path.join(root, MIGRATION), 'utf8'));
  const again = (await db.owner.query('SELECT asset_id, state, provider_restriction_verified, access_expires_at FROM media_manifests WHERE asset_id = $1', [ASSET])).rows[0];
  assert.equal(again.asset_id, window.asset_id);
  assert.equal(again.state, window.state);
  assert.equal(again.provider_restriction_verified, window.provider_restriction_verified);
  assert.equal(again.access_expires_at.getTime(), window.access_expires_at.getTime(), 'a re-run must not widen or clear a live window');
});
