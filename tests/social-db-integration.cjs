const test = require('node:test');
const assert = require('node:assert/strict');
const { Client, connectionString } = require('./helpers/disposable-database.cjs').disposableDatabase();

let client;
let userId;
let workspaceId;
let secondUserId;
let secondWorkspaceId;
let postId;

async function query(text, params = []) {
  return client.query(text, params);
}

test.before(async () => {
  client = new Client({ connectionString });
  await client.connect();

  const table = await client.query("SELECT to_regclass('public.social_posts') AS table_name");
  assert.ok(table.rows[0].table_name, 'social_posts must exist before integration testing');

  const user = await client.query(
    "INSERT INTO users (phone, first_name, role) VALUES ($1, $2, $3) RETURNING id",
    ['+254700000001', 'Integration Tester', 'client'],
  );
  userId = user.rows[0].id;

  const workspace = await client.query(
    "INSERT INTO identity_workspaces (user_id, role, status, profile) VALUES ($1, $2, $3, $4::jsonb) RETURNING id",
    [userId, 'client', 'active', JSON.stringify({ savedPostIds: [] })],
  );
  workspaceId = workspace.rows[0].id;

  const secondUser = await client.query(
    "INSERT INTO users (phone, first_name, role) VALUES ($1, $2, $3) RETURNING id",
    ['+254700000002', 'Second Tester', 'client'],
  );
  secondUserId = secondUser.rows[0].id;

  const secondWorkspace = await client.query(
    "INSERT INTO identity_workspaces (user_id, role, status, profile) VALUES ($1, $2, $3, $4::jsonb) RETURNING id",
    [secondUserId, 'client', 'active', JSON.stringify({ savedPostIds: [] })],
  );
  secondWorkspaceId = secondWorkspace.rows[0].id;
});

test.after(async () => {
  if (!client) return;

  await client.query('DELETE FROM social_posts WHERE author_user_id = ANY($1::uuid[])', [[userId, secondUserId]]);
  await client.query('DELETE FROM identity_workspaces WHERE id = ANY($1::uuid[])', [[workspaceId, secondWorkspaceId]]);
  await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[userId, secondUserId]]);
  await client.end();
});

test('social_posts has the expected canonical columns and defaults', async () => {
  const result = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_posts'
    ORDER BY ordinal_position
  `);

  const columns = result.rows.map((row) => row.column_name);
  assert.ok(columns.includes('id'));
  assert.ok(columns.includes('author_user_id'));
  assert.ok(columns.includes('author_workspace_id'));
  assert.ok(columns.includes('publication_status'));
  assert.ok(columns.includes('deleted_at'));
});

test('a canonical post receives a server-generated UUID and pending publication status', async () => {
  const result = await client.query(
    `INSERT INTO social_posts (author_user_id, author_workspace_id, author_name, author_role, post_type, caption, media_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, publication_status, deleted_at`,
    [userId, workspaceId, 'Integration Tester', 'client', 'inspo', 'Canonical test post', []],
  );

  postId = result.rows[0].id;
  assert.match(postId, /^[0-9a-f-]{36}$/);
  assert.equal(result.rows[0].publication_status, 'pending');
  assert.equal(result.rows[0].deleted_at, null);
});

test('invalid author role is rejected', async () => {
  await assert.rejects(
    client.query(
      `INSERT INTO social_posts (author_user_id, author_workspace_id, author_name, author_role, post_type, caption)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, workspaceId, 'Integration Tester', 'admin', 'inspo', 'Invalid role'],
    ),
    /check constraint/i,
  );
});

test('invalid post type is rejected', async () => {
  await assert.rejects(
    client.query(
      `INSERT INTO social_posts (author_user_id, author_workspace_id, author_name, author_role, post_type, caption)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, workspaceId, 'Integration Tester', 'client', 'not_a_type', 'Invalid type'],
    ),
    /check constraint/i,
  );
});

test('soft deletion hides a post from public retrieval', async () => {
  await client.query('UPDATE social_posts SET deleted_at = now() WHERE id = $1', [postId]);

  const publicResult = await client.query(
    `SELECT id FROM social_posts
     WHERE id = $1 AND deleted_at IS NULL AND publication_status = 'published'`,
    [postId],
  );
  assert.equal(publicResult.rows.length, 0);

  const ownerResult = await client.query('SELECT id, deleted_at FROM social_posts WHERE id = $1', [postId]);
  assert.equal(ownerResult.rows.length, 1);
  assert.ok(ownerResult.rows[0].deleted_at);
});

test('a second user cannot access another workspace save state', async () => {
  const firstProfile = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1', [workspaceId]);
  const secondProfile = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1', [secondWorkspaceId]);

  assert.deepEqual(firstProfile.rows[0].profile.savedPostIds ?? [], []);
  assert.deepEqual(secondProfile.rows[0].profile.savedPostIds ?? [], []);

  await client.query(
    "UPDATE identity_workspaces SET profile = jsonb_set(profile, '{savedPostIds}', $2::jsonb, true) WHERE id = $1",
    [workspaceId, JSON.stringify([postId])],
  );

  const firstAfter = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1', [workspaceId]);
  const secondAfter = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1', [secondWorkspaceId]);

  assert.deepEqual(firstAfter.rows[0].profile.savedPostIds, [postId]);
  assert.deepEqual(secondAfter.rows[0].profile.savedPostIds ?? [], []);
});

test('concurrent save updates do not lose a previously saved reference', async () => {
  const secondPost = await client.query(
    `INSERT INTO social_posts (author_user_id, author_workspace_id, author_name, author_role, post_type, caption, publication_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, workspaceId, 'Integration Tester', 'client', 'inspo', 'Second post', 'published'],
  );
  const secondPostId = secondPost.rows[0].id;

  async function saveInTransaction(client, postToSave) {
    await client.query('BEGIN');
    const read = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1 FOR UPDATE', [workspaceId]);
    const current = read.rows[0].profile.savedPostIds ?? [];
    const next = Array.from(new Set([...current, postToSave]));
    await client.query(
      "UPDATE identity_workspaces SET profile = jsonb_set(profile, '{savedPostIds}', $2::jsonb, true) WHERE id = $1",
      [workspaceId, JSON.stringify(next)],
    );
    await client.query('COMMIT');
    return next;
  }

  const firstClient = new Client({ connectionString });
  const secondClient = new Client({ connectionString });
  await firstClient.connect();
  await secondClient.connect();

  try {
    const [firstResult, secondResult] = await Promise.all([
      saveInTransaction(firstClient, postId),
      saveInTransaction(secondClient, secondPostId),
    ]);

    assert.ok(firstResult.includes(postId));
    assert.ok(secondResult.includes(secondPostId));
  } finally {
    await firstClient.end();
    await secondClient.end();
  }

  const finalProfile = await client.query('SELECT profile FROM identity_workspaces WHERE id = $1', [workspaceId]);
  const savedIds = finalProfile.rows[0].profile.savedPostIds ?? [];
  assert.ok(savedIds.includes(postId), 'first save must remain present');
  assert.ok(savedIds.includes(secondPostId), 'second save must remain present');
});
