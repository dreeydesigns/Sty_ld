const { Pool } = require('pg');

function localTarget(connectionString, identity) {
  if (!identity || identity.kind !== 'styld-disposable-postgres' ||
      !/^styld-local-[a-f0-9-]{36}$/.test(identity.cluster) ||
      !Number.isInteger(identity.port) || identity.port < 1024 || identity.port > 65535) {
    throw new Error('An owned disposable cluster identity is required.');
  }
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('Invalid local database target.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' ||
      Number(url.port) !== identity.port || url.pathname !== '/styld_disposable_test' || url.search || url.hash ||
      !['styld_local_owner', 'styld_local_runtime'].includes(decodeURIComponent(url.username)) || !url.password) {
    throw new Error('Only this runner\'s loopback disposable database is accepted.');
  }
  return { connectionString, ssl: false, options: '', max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 };
}

async function verifyIdentity(pool, identity, expectedRole) {
  const result = await pool.query(`SELECT current_database() AS database, current_user AS role,
    host(inet_server_addr()) AS address, inet_server_port() AS port, current_setting('cluster_name') AS cluster`);
  const row = result.rows[0];
  if (row.database !== 'styld_disposable_test' || row.role !== expectedRole || row.address !== '127.0.0.1' ||
      Number(row.port) !== identity.port || row.cluster !== identity.cluster) {
    throw new Error('Database identity mismatch; no fixture writes are permitted.');
  }
  return row;
}

async function openLocalDatabases(env = process.env) {
  let identity;
  try { identity = JSON.parse(env.STYLD_LOCAL_CLUSTER || ''); } catch { throw new Error('Use the disposable PostgreSQL runner.'); }
  const runtime = new Pool(localTarget(env.STYLD_LOCAL_RUNTIME_URL, identity));
  const owner = new Pool(localTarget(env.STYLD_LOCAL_OWNER_URL, identity));
  try {
    await verifyIdentity(runtime, identity, 'styld_local_runtime');
    await verifyIdentity(owner, identity, 'styld_local_owner');
    return { runtime, owner, identity, close: async () => { await runtime.end(); await owner.end(); } };
  } catch (error) { await runtime.end(); await owner.end(); throw error; }
}

module.exports = { localTarget, verifyIdentity, openLocalDatabases };
