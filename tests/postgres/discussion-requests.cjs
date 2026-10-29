/**
 * Migration 016 against the PostgreSQL the founder actually runs.
 *
 * tests/discussion-requests.cjs drives the same rules through an embedded engine. This file
 * applies sql/migrations/016_discussion_requests.sql to the owned disposable cluster (17.11,
 * loopback, created and dropped by scripts/run-local-postgres.cjs) and then runs the real
 * statements lib/discussion-requests.ts issues, so the partial unique index, every named check
 * and the conflict target are proven on server PostgreSQL. Nothing here can reach a database
 * outside that cluster: openLocalDatabases refuses any target that is not the runner's own.
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
const MIGRATION = 'sql/migrations/016_discussion_requests.sql';
const NOTE = 'A server PostgreSQL note about a soft glam look.';

let db;
let lib;

function loadModule() {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/discussion-requests.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}})`)(() => {
    throw new Error('Unexpected dependency');
  }, module, module.exports);
  return module.exports;
}

async function pair() {
  const client = randomUUID();
  const providerUser = randomUUID();
  const clientWorkspace = randomUUID();
  const providerWorkspace = randomUUID();
  await db.owner.query(
    `INSERT INTO users (id, first_name, role) VALUES ($1, 'Pg client', 'client'), ($2, 'Pg provider', 'professional')`,
    [client, providerUser],
  );
  await db.owner.query(
    `INSERT INTO identity_workspaces (id, user_id, role, status, profile) VALUES
       ($1, $2, 'client', 'active', '{}'), ($3, $4, 'professional', 'active', $5)`,
    [clientWorkspace, client, providerWorkspace, providerUser, { displayName: 'Pg Studio' }],
  );
  return { client, providerUser, clientWorkspace, providerWorkspace };
}

function actor(userId, workspaceId, role) {
  return { userId, workspaceId, role, workspaces: [{ id: workspaceId, role }] };
}

async function insertRow(patch = {}) {
  const row = {
    client_user_id: patch.client_user_id, client_workspace_id: patch.client_workspace_id,
    provider_workspace_id: patch.provider_workspace_id, note: patch.note ?? NOTE,
    status: patch.status ?? 'requested', responded_at: patch.responded_at ?? null,
    created_at: patch.created_at ?? '2026-10-20T09:00:00Z', expires_at: patch.expires_at ?? '2026-11-03T09:00:00Z',
    look_post_id: patch.look_post_id ?? null, service_id: patch.service_id ?? null,
  };
  const columns = Object.keys(row);
  return db.owner.query(
    `INSERT INTO discussion_requests (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING id`,
    columns.map((column) => row[column]),
  );
}

async function refusal(run) {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}

test.before(async () => {
  db = await openLocalDatabases();
  await db.owner.query(fs.readFileSync(path.join(root, MIGRATION), 'utf8'));
  lib = loadModule();
});

test.after(async () => {
  await db.close();
});

const CHECK = '23514';
const UNIQUE = '23505';

test('the store carries every bound the journey depends on', async () => {
  const names = (await db.owner.query(
    `SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'discussion_requests' AND con.contype IN ('c', 'f', 'p') ORDER BY con.conname`,
  )).rows.map((row) => row.conname);
  for (const name of ['discussion_requests_pkey', 'discussion_requests_client_user_id_fkey',
    'discussion_requests_client_workspace_id_fkey', 'discussion_requests_provider_workspace_id_fkey',
    'discussion_requests_look_post_id_fkey', 'discussion_requests_service_id_fkey',
    'discussion_requests_note_length', 'discussion_requests_own_workspace',
    'discussion_requests_response_recorded', 'discussion_requests_response_order',
    'discussion_requests_expiry_order']) {
    assert.ok(names.includes(name), `${name} is missing from server PostgreSQL`);
  }
  const index = (await db.owner.query("SELECT indexdef FROM pg_indexes WHERE indexname = 'discussion_requests_one_open_per_pair'")).rows[0];
  assert.ok(index && index.indexdef.includes("WHERE (status = 'requested'::text)"), 'the open-request index keeps its predicate');
});

test('one open request per pair is enforced, and a decided row leaves room for a new one', async () => {
  const { client, clientWorkspace, providerWorkspace } = await pair();
  const base = { client_user_id: client, client_workspace_id: clientWorkspace, provider_workspace_id: providerWorkspace };
  const first = await insertRow(base);
  const duplicate = await refusal(() => insertRow(base));
  assert.equal(duplicate.code, UNIQUE, 'a second open request for the same pair must be impossible');
  await db.owner.query(
    "UPDATE discussion_requests SET status = 'declined', responded_at = '2026-10-21T09:00:00Z' WHERE id = $1",
    [first.rows[0].id],
  );
  const second = await insertRow(base);
  assert.ok(second.rows[0].id);
  const count = await db.owner.query('SELECT count(*) AS n FROM discussion_requests WHERE client_user_id = $1', [client]);
  assert.equal(Number(count.rows[0].n), 2, 'history is kept rather than overwritten');
});

test('the note bounds and the decision recordedness are store rules', async () => {
  const { client, clientWorkspace, providerWorkspace } = await pair();
  const base = { client_user_id: client, client_workspace_id: clientWorkspace, provider_workspace_id: providerWorkspace };
  assert.equal((await refusal(() => insertRow({ ...base, note: 'short' }))).code, CHECK);
  assert.equal((await refusal(() => insertRow({ ...base, note: 'x'.repeat(601) }))).code, CHECK);
  assert.equal((await refusal(() => insertRow({ ...base, status: 'declined' }))).code, CHECK, 'a decided row must carry responded_at');
  assert.equal((await refusal(() => insertRow({ ...base, responded_at: '2026-10-20T10:00:00Z' }))).code, CHECK, 'an open row must not carry responded_at');
  assert.equal((await refusal(() => insertRow({ ...base, responded_at: '2026-10-19T09:00:00Z', status: 'declined' }))).code, CHECK, 'a response cannot precede the request');
  assert.equal((await refusal(() => insertRow({ ...base, expires_at: '2026-10-19T09:00:00Z' }))).code, CHECK, 'expiry must follow creation');
  assert.equal((await refusal(() => insertRow({ ...base, client_workspace_id: providerWorkspace }))).code, CHECK, 'a request cannot point at itself');
});

test('the application statements run unchanged on server PostgreSQL', async () => {
  const { client, clientWorkspace, providerWorkspace } = await pair();
  const clientActor = actor(client, clientWorkspace, 'client');
  const providerActor = actor((await db.owner.query('SELECT user_id FROM identity_workspaces WHERE id = $1', [providerWorkspace])).rows[0].user_id, providerWorkspace, 'professional');
  const now = new Date();

  const created = await lib.createDiscussionRequest(db.owner, clientActor, { providerWorkspaceId: providerWorkspace, note: NOTE }, now);
  assert.equal(created.created, true);
  assert.equal(created.request.status, 'requested');
  assert.equal(created.request.providerName, 'Pg Studio');

  const retried = await lib.createDiscussionRequest(db.owner, clientActor, { providerWorkspaceId: providerWorkspace, note: NOTE }, now);
  assert.equal(retried.created, false);
  assert.equal(retried.request.id, created.request.id);

  const listed = await lib.listDiscussionRequests(db.owner, providerActor, now);
  assert.equal(listed.received.length, 1);
  assert.equal(listed.sent.length, 0);

  const accepted = await lib.respondToDiscussionRequest(db.owner, providerActor, created.request.id, 'accept', now);
  assert.equal(accepted.status, 'discussion_accepted');
  assert.equal((await refusal(() => lib.respondToDiscussionRequest(db.owner, providerActor, created.request.id, 'decline', now))).statusCode, 409);
  const bookings = Number((await db.owner.query('SELECT count(*) AS n FROM bookings WHERE client_id = $1', [client])).rows[0].n);
  assert.equal(bookings, 0, 'an accepted discussion is not a booking');
});
