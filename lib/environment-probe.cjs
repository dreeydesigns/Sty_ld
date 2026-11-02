// Read-only environment probe for a hosted deployment (DevOps slice).
//
// The question this answers is the one no local command can: after Vercel has resolved variable
// precedence for the branch, which database is the running process actually talking to, is it
// empty, and what do the media and email gates currently say. Every statement below is a SELECT.
// The returned object carries presence booleans and server-reported identity only, never a
// connection string, a host from the environment, or any credential value.

const { resolveMediaDeliveryConfig, resolvePendingUploadPolicy } = require('./media-delivery-config.cjs');

const IDENTITY_SQL = 'SELECT current_database() AS database, current_user AS role, '
  + 'inet_server_port() AS port, host(inet_server_addr()) AS address';
const POSTMASTER_SQL = 'SELECT pg_postmaster_start_time() AS started_at';
// Which cluster this backend belongs to, so two databases that share a name are not confused for each
// other. Read it as one direction only: a value that differs from the beta project's proves this
// process is somewhere else, while a value that matches is not proof on its own, because a branch made
// from a project copies its parent's control file. A role without the stats privilege can be refused
// it, and a refused extra fact must not blank out the whole readout.
const CLUSTER_SQL = 'SELECT system_identifier FROM pg_control_system()';
const PUBLIC_TABLES_SQL = "SELECT table_name FROM information_schema.tables "
  + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name";
const ACCOUNT_ROWS_SQL = 'SELECT count(*)::int AS accounts FROM users';
const APPLIED_SQL = 'SELECT name FROM schema_migrations ORDER BY name';

function text(value) {
  return typeof value === 'string' ? value.slice(0, 120) : null;
}

function wholeNumber(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function stamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return text(typeof value === 'string' || typeof value === 'number' ? String(value) : null);
}

async function optionalQuery(query, sql) {
  try {
    const answered = await query(sql);
    return answered && answered.rows && answered.rows[0] ? answered.rows[0] : null;
  } catch {
    return null;
  }
}

function senderDomain(value) {
  // Truncate after splitting, never before: a long display name with no domain in the first 120
  // characters would otherwise leave a local-part fragment where only a domain may appear.
  const raw = typeof value === 'string' ? value : '';
  const at = raw.lastIndexOf('@');
  if (at < 0 || at === raw.length - 1) return null;
  const domain = raw.slice(at + 1).replace(/[">']/g, '').trim().toLowerCase();
  return domain === '' ? null : text(domain);
}

// The two provider names the application recognises. Anything else is reported as the fact that it
// is neither, rather than echoed, because this field is published to whoever holds the health token.
const EMAIL_PROVIDERS = ['resend', 'gmail'];
function providerName(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) return 'resend';
  return EMAIL_PROVIDERS.includes(raw) ? raw : 'unrecognised';
}

async function readEnvironmentProbe({ query, env = process.env }) {
  if (typeof query !== 'function') throw new TypeError('A read-only query function is required.');

  const identity = await query(IDENTITY_SQL);
  const row = identity && identity.rows ? identity.rows[0] : null;
  if (!row) throw new Error('The database answered no identity.');
  const postmaster = await optionalQuery(query, POSTMASTER_SQL);
  const cluster = await optionalQuery(query, CLUSTER_SQL);

  const tables = (await query(PUBLIC_TABLES_SQL)).rows.map(entry => text(entry.table_name)).filter(Boolean);
  // An empty beta is the expected shape, so a missing users table is reported as a fact rather than
  // hidden behind a zero. The count only runs when the table is there.
  const accounts = tables.includes('users') ? wholeNumber((await query(ACCOUNT_ROWS_SQL)).rows[0].accounts) : null;
  const applied = tables.includes('schema_migrations')
    ? (await query(APPLIED_SQL)).rows.map(entry => text(entry.name)).filter(Boolean)
    : [];

  const delivery = resolveMediaDeliveryConfig(env);
  const uploads = resolvePendingUploadPolicy(env);
  return Object.freeze({
    database: {
      name: text(row.database),
      role: text(row.role),
      serverAddress: text(row.address),
      serverPort: wholeNumber(row.port),
      serverStartedAt: stamp(postmaster ? postmaster.started_at : null),
      clusterId: cluster ? text(cluster.system_identifier) : null,
      publicTableCount: tables.length,
      schemaTables: Object.freeze(tables),
      accountRows: accounts,
      migrationsApplied: Object.freeze(applied),
      migrationCount: applied.length,
    },
    email: Object.freeze({
      provider: providerName(env.EMAIL_PROVIDER),
      senderDomain: senderDomain(env.RESEND_FROM_EMAIL),
    }),
    media: Object.freeze({
      restrictedDeliveryConfigured: Boolean(delivery),
      deliveryOrigin: delivery ? delivery.allowedOrigins[0] : null,
      accessWindowSeconds: delivery ? delivery.windowSeconds : null,
      uploadsAllowed: uploads.allowUploads,
      uploadBasis: uploads.basis,
      uploadRefusalReason: uploads.reason,
    }),
  });
}

module.exports = { readEnvironmentProbe, IDENTITY_SQL, PUBLIC_TABLES_SQL, ACCOUNT_ROWS_SQL, APPLIED_SQL,
  POSTMASTER_SQL, CLUSTER_SQL };
