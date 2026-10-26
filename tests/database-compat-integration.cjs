/**
 * Database compatibility integration (P1).
 *
 * Runs the exact SQL of the repaired routes against an in-memory restored
 * PostgreSQL schema by default. An explicitly opted-in disposable loopback
 * database uses pg. Application connection variables are never used.
 * Every row this suite writes is tagged and removed again.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client, connectionString } = require('./helpers/disposable-database.cjs').disposableDatabase();

const ROOT = path.join(__dirname, '..');
const stamp = Date.now().toString(36);
const marker = `qa-compat-${stamp}`;
const rateLimitKey = `contact:${marker}`;
const uploadLimitKey = `upload:${marker}`;
const contactName = `compat tester ${marker}`;

const NORMALIZE = (text) => text.replace(/\s+/g, ' ').trim();

function routeSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assertMatchesRoute(rel, sql) {
  const source = NORMALIZE(routeSource(rel));
  assert.ok(source.includes(NORMALIZE(sql)), `the tested query must stay identical to the one in ${rel}`);
}

// The contact limiter now runs through consumeLimit in lib/security-events.ts, so the
// query pinned here is the one that shared helper executes.
const CONTACT_RATE_LIMIT = `INSERT INTO auth_rate_limits (key,count,window_start,last_attempt)
    VALUES ($1,1,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN auth_rate_limits.window_start < NOW() - $3 * interval '1 second' THEN 1 ELSE auth_rate_limits.count + 1 END,
    window_start = CASE WHEN auth_rate_limits.window_start < NOW() - $3 * interval '1 second' THEN NOW() ELSE auth_rate_limits.window_start END,
    last_attempt = NOW()
    WHERE auth_rate_limits.window_start < NOW() - $3 * interval '1 second' OR auth_rate_limits.count < $2 RETURNING key`;

const UPLOAD_RATE_LIMIT = `INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN 1 ELSE auth_rate_limits.count + 1 END,
          window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' THEN NOW() ELSE auth_rate_limits.window_start END,
          last_attempt = NOW()
        WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '10 minutes' OR auth_rate_limits.count < 20)
        RETURNING count`;

const CONTACT_INSERT = `INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)`;

const BLOCK_INSERT = `INSERT INTO user_blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING`;

const BLOCK_LIST = `SELECT blocked_id, created_at FROM user_blocks WHERE blocker_id = $1`;

const REPORT_INSERT = `INSERT INTO user_reports (
        reporter_id, target_type, target_id, reason, notes, severity, status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, 'pending'
      )
      RETURNING id, status, created_at`;

const SERVICE_INSERT = `INSERT INTO services (provider_id, workspace_id, name, description, price, duration_minutes, image_url, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;

const SERVICE_CATALOG = `SELECT id, name, description, price, duration_minutes, image_url, category
      FROM services
      WHERE is_active = true
      ORDER BY category, name`;

const BOOKINGS_FOR_CLIENT = `SELECT
          id, local_id, client_id, provider_id, service_names, provider_slug, provider_name,
          target_type, booking_date, booking_time, total_kes, notes,
          status, payment_status, created_at, updated_at
        FROM bookings
        WHERE client_id = $1
        ORDER BY created_at DESC`;

const BOOKINGS_FOR_PROVIDER = `SELECT
          id, local_id, client_id, provider_id, service_names, provider_slug, provider_name,
          target_type, booking_date, booking_time, total_kes, notes,
          status, payment_status, created_at, updated_at
        FROM bookings
        WHERE provider_id = $1 AND provider_workspace_id = $2
        ORDER BY created_at DESC`;

const ANALYTICS_INSERT = `INSERT INTO analytics_events (
        event_name, user_id, anonymous_id, role, market, properties
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb
      )`;

const DELETION_REQUEST = `UPDATE users
      SET deletion_status = 'pending', deletion_requested_at = NOW()
      WHERE id = $1`;

const DELETION_CANCEL = `UPDATE users
      SET deletion_status = 'active', deletion_requested_at = NULL
      WHERE id = $1`;

const DELETION_STATUS = `SELECT COALESCE(deletion_status, 'active') AS status, deletion_requested_at
      FROM users
      WHERE id = $1`;

let client;
let userId;
let workspaceId;
let providerId;
let providerWorkspaceId;

async function query(text, params = []) {
  return client.query(text, params);
}

async function createUser(phone, firstName, role) {
  const result = await query('INSERT INTO users (phone, first_name, role) VALUES ($1, $2, $3) RETURNING id', [phone, firstName, role]);
  return result.rows[0].id;
}

async function createWorkspace(user, role) {
  const result = await query(
    'INSERT INTO identity_workspaces (user_id, role, status, profile) VALUES ($1, $2, $3, $4::jsonb) RETURNING id',
    [user, role, 'active', JSON.stringify({ qaMarker: marker })],
  );
  return result.rows[0].id;
}

test.before(async () => {
  client = new Client({ connectionString });
  await client.connect();

  for (const table of ['auth_rate_limits', 'contact_messages', 'user_blocks', 'user_reports', 'services', 'bookings', 'analytics_events', 'users', 'identity_workspaces']) {
    const result = await query('SELECT to_regclass($1) AS table_name', [`public.${table}`]);
    assert.ok(result.rows[0].table_name, `${table} must exist before compatibility testing`);
  }

  userId = await createUser('+254700000091', 'Compat Client', 'client');
  workspaceId = await createWorkspace(userId, 'client');
  providerId = await createUser('+254700000092', 'Compat Provider', 'professional');
  providerWorkspaceId = await createWorkspace(providerId, 'professional');
});

test.after(async () => {
  if (!client) return;

  await query('DELETE FROM services WHERE provider_id = $1', [providerId]);
  await query('DELETE FROM user_reports WHERE reporter_id = ANY($1::uuid[])', [[userId, providerId]]);
  await query('DELETE FROM user_blocks WHERE blocker_id = ANY($1::uuid[]) OR blocked_id = ANY($1::uuid[])', [[userId, providerId]]);
  await query('DELETE FROM contact_messages WHERE name = $1', [contactName]);
  await query('DELETE FROM auth_rate_limits WHERE key = ANY($1::text[])', [[rateLimitKey, uploadLimitKey]]);
  await query('DELETE FROM analytics_events WHERE anonymous_id = $1', [marker]);
  await query('DELETE FROM identity_workspaces WHERE id = ANY($1::uuid[])', [[workspaceId, providerWorkspaceId]]);
  await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[userId, providerId]]);
  await client.end();
});

test('the contact rate limiter counts inside the window, caps at five and rolls over', async () => {
  assertMatchesRoute('lib/security-events.ts', CONTACT_RATE_LIMIT);
  const consume = () => query(CONTACT_RATE_LIMIT, [rateLimitKey, 5, 900]);
  const readCount = async () => (await query('SELECT count FROM auth_rate_limits WHERE key = $1', [rateLimitKey])).rows[0]?.count;
  try {
    const first = await consume();
    assert.equal(first.rowCount, 1);
    assert.equal(await readCount(), 1);

    await consume();
    assert.equal(await readCount(), 2);

    await query('UPDATE auth_rate_limits SET count = 5, window_start = NOW() WHERE key = $1', [rateLimitKey]);
    const capped = await consume();
    assert.equal(capped.rowCount, 0, 'the sixth message in a window must be refused');

    await query("UPDATE auth_rate_limits SET count = 5, window_start = NOW() - INTERVAL '16 minutes' WHERE key = $1", [rateLimitKey]);
    const rolled = await consume();
    assert.equal(rolled.rowCount, 1, 'an expired window must start a new count');
    assert.equal(await readCount(), 1);
  } finally {
    await query('DELETE FROM auth_rate_limits WHERE key = $1', [rateLimitKey]);
  }
});

test('the upload rate limiter counts inside its window and caps at twenty', async () => {
  assertMatchesRoute('app/api/upload/route.ts', UPLOAD_RATE_LIMIT);
  try {
    const first = await query(UPLOAD_RATE_LIMIT, [uploadLimitKey]);
    assert.equal(first.rows[0].count, 1);

    await query('UPDATE auth_rate_limits SET count = 20, window_start = NOW() WHERE key = $1', [uploadLimitKey]);
    const capped = await query(UPLOAD_RATE_LIMIT, [uploadLimitKey]);
    assert.equal(capped.rowCount, 0, 'the twenty-first upload in a window must be refused');
  } finally {
    await query('DELETE FROM auth_rate_limits WHERE key = $1', [uploadLimitKey]);
  }
});

test('a contact message is stored with the values the route binds', async () => {
  assertMatchesRoute('app/api/contact/route.ts', CONTACT_INSERT);
  try {
    const inserted = await query(CONTACT_INSERT, [contactName, 'qa@example.com', '+254700000091', 'QA compatibility', 'Body from the compatibility suite']);
    assert.equal(inserted.rowCount, 1);

    const read = await query('SELECT name, email, message FROM contact_messages WHERE name = $1', [contactName]);
    assert.equal(read.rows.length, 1);
    assert.equal(read.rows[0].email, 'qa@example.com');
    assert.equal(read.rows[0].message, 'Body from the compatibility suite');
  } finally {
    await query('DELETE FROM contact_messages WHERE name = $1', [contactName]);
  }
});

test('a block is written once, listed for the blocker and removed', async () => {
  assertMatchesRoute('app/api/blocks/route.ts', BLOCK_INSERT);
  assertMatchesRoute('app/api/blocks/route.ts', BLOCK_LIST);
  try {
    const first = await query(BLOCK_INSERT, [userId, providerId]);
    assert.equal(first.rowCount, 1);

    const repeated = await query(BLOCK_INSERT, [userId, providerId]);
    assert.equal(repeated.rowCount, 0, 'a duplicate block must change nothing');

    const listed = await query(BLOCK_LIST, [userId]);
    assert.deepEqual(listed.rows.map((row) => row.blocked_id), [providerId]);
    assert.ok(listed.rows[0].created_at, 'the block records when it was created');

    await query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId, providerId]);
    const after = await query(BLOCK_LIST, [userId]);
    assert.equal(after.rows.length, 0);
  } finally {
    await query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId, providerId]);
  }
});

test('a report is stored as pending for the signed-in reporter', async () => {
  assertMatchesRoute('app/api/reports/route.ts', REPORT_INSERT);
  try {
    const inserted = await query(REPORT_INSERT, [userId, 'user', providerId, 'Impersonation', 'QA compatibility note', 'normal']);
    assert.equal(inserted.rowCount, 1);
    assert.match(inserted.rows[0].id, /^[0-9a-f-]{36}$/);
    assert.equal(inserted.rows[0].status, 'pending');
    assert.ok(inserted.rows[0].created_at);

    const read = await query('SELECT reason, severity, status FROM user_reports WHERE id = $1', [inserted.rows[0].id]);
    assert.equal(read.rows[0].reason, 'Impersonation');
    assert.equal(read.rows[0].severity, 'normal');

    await query('DELETE FROM user_reports WHERE reporter_id = $1', [userId]);
    const after = await query('SELECT id FROM user_reports WHERE reporter_id = $1', [userId]);
    assert.equal(after.rows.length, 0);
  } finally {
    await query('DELETE FROM user_reports WHERE reporter_id = $1', [userId]);
  }
});

test('a service is created for a provider workspace and listed in the catalog', async () => {
  assertMatchesRoute('app/api/services/route.ts', SERVICE_INSERT);
  assertMatchesRoute('app/api/services/route.ts', SERVICE_CATALOG);
  let serviceId = null;
  try {
    const inserted = await query(SERVICE_INSERT, [providerId, providerWorkspaceId, `QA Braids ${marker}`, 'Compatibility service', 2500, 60, null, 'hair']);
    assert.equal(inserted.rowCount, 1);
    serviceId = inserted.rows[0].id;
    assert.match(serviceId, /^[0-9a-f-]{36}$/);

    const catalog = await query(SERVICE_CATALOG);
    const listed = catalog.rows.find((row) => row.id === serviceId);
    assert.ok(listed, 'the new service appears in the active catalog');
    assert.equal(listed.price, '2500.00', 'the price reads back as the stored decimal');

    await query('DELETE FROM services WHERE id = $1', [serviceId]);
    serviceId = null;
  } finally {
    if (serviceId) await query('DELETE FROM services WHERE id = $1', [serviceId]);
  }
});

test('server analytics events persist sanitized properties', async () => {
  assertMatchesRoute('lib/analytics.ts', ANALYTICS_INSERT);
  try {
    const inserted = await query(ANALYTICS_INSERT, ['qa_compatible_event', null, marker, 'client', 'nairobi', JSON.stringify({ zone: 'kilimani', password: 'stripped' })]);
    assert.equal(inserted.rowCount, 1);

    const read = await query('SELECT properties, market FROM analytics_events WHERE anonymous_id = $1', [marker]);
    assert.equal(read.rows.length, 1);
    assert.equal(read.rows[0].market, 'nairobi');
    assert.equal(read.rows[0].properties.zone, 'kilimani');

    await query('DELETE FROM analytics_events WHERE anonymous_id = $1', [marker]);
    const after = await query('SELECT id FROM analytics_events WHERE anonymous_id = $1', [marker]);
    assert.equal(after.rows.length, 0);
  } finally {
    await query('DELETE FROM analytics_events WHERE anonymous_id = $1', [marker]);
  }
});

test('booking reads are scoped to the client and to the provider workspace', async () => {
  assertMatchesRoute('app/api/bookings/route.ts', BOOKINGS_FOR_CLIENT);
  assertMatchesRoute('app/api/bookings/route.ts', BOOKINGS_FOR_PROVIDER);

  const forClient = await query(BOOKINGS_FOR_CLIENT, [userId]);
  assert.ok(Array.isArray(forClient.rows));
  assert.equal(forClient.rows.length, 0, 'the synthetic client owns no bookings');

  const forProvider = await query(BOOKINGS_FOR_PROVIDER, [providerId, providerWorkspaceId]);
  assert.ok(Array.isArray(forProvider.rows));
  assert.equal(forProvider.rows.length, 0, 'the synthetic provider owns no bookings');

  const ownWorkspaceOnly = await query(BOOKINGS_FOR_PROVIDER, [providerId, workspaceId]);
  assert.equal(ownWorkspaceOnly.rows.length, 0, 'a mismatched workspace returns nothing');
});

test('the account deletion lifecycle updates and reads back on a real user', async () => {
  assertMatchesRoute('lib/auth-server.ts', DELETION_REQUEST);
  assertMatchesRoute('lib/auth-server.ts', DELETION_CANCEL);
  assertMatchesRoute('lib/auth-server.ts', DELETION_STATUS);
  try {
    const requested = await query(DELETION_REQUEST, [userId]);
    assert.equal(requested.rowCount, 1);

    const pending = await query(DELETION_STATUS, [userId]);
    assert.equal(pending.rows[0].status, 'pending');
    assert.ok(pending.rows[0].deletion_requested_at, 'the timer records when it started');

    const cancelled = await query(DELETION_CANCEL, [userId]);
    assert.equal(cancelled.rowCount, 1);

    const active = await query(DELETION_STATUS, [userId]);
    assert.equal(active.rows[0].status, 'active');
    assert.equal(active.rows[0].deletion_requested_at, null);
  } finally {
    await query(DELETION_CANCEL, [userId]);
  }
});

test('the suite leaves no tagged rows behind', async () => {
  const leftovers = [];
  const contacts = await query('SELECT id FROM contact_messages WHERE name = $1', [contactName]);
  if (contacts.rows.length) leftovers.push('contact_messages');
  const limits = await query('SELECT key FROM auth_rate_limits WHERE key = ANY($1::text[])', [[rateLimitKey, uploadLimitKey]]);
  if (limits.rows.length) leftovers.push('auth_rate_limits');
  const blocks = await query('SELECT blocker_id FROM user_blocks WHERE blocker_id = $1 OR blocked_id = $1', [userId]);
  if (blocks.rows.length) leftovers.push('user_blocks');
  const reports = await query('SELECT id FROM user_reports WHERE reporter_id = $1', [userId]);
  if (reports.rows.length) leftovers.push('user_reports');
  const services = await query('SELECT id FROM services WHERE provider_id = $1', [providerId]);
  if (services.rows.length) leftovers.push('services');
  const events = await query('SELECT id FROM analytics_events WHERE anonymous_id = $1', [marker]);
  if (events.rows.length) leftovers.push('analytics_events');
  const deletion = await query('SELECT deletion_status FROM users WHERE id = $1', [userId]);
  assert.equal(deletion.rows[0].deletion_status ?? 'active', 'active', 'the user is left with no deletion timer');
  assert.deepEqual(leftovers, [], 'every tagged row must be removed inside its own test');
});
