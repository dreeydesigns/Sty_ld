// Owns a loopback disposable cluster for live-app testing. It never reads a
// connection string from the caller's environment.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const net = require('node:net');
const { localTarget, verifyIdentity } = require('./local-postgres.cjs');

const REQUIRED_VERSION = /^pg_ctl \(PostgreSQL\) 17\.11\b/;

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function urlFor(role, password, port, database = 'styld_disposable_test') {
  const url = new URL(`postgresql://127.0.0.1:${port}/${database}`);
  url.username = role; url.password = password;
  return url.href;
}

function cleanEnvironment(source = process.env) {
  const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'userprofile', 'localappdata', 'appdata',
    'homedrive', 'homepath', 'lang', 'lc_all', 'tz', 'number_of_processors', 'processor_architecture', 'programfiles', 'programfiles(x86)', 'commonprogramfiles']);
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toLowerCase())));
}

async function startLiveCluster({ bin, label = 'live-app' }) {
  if (process.env.STYLD_LOCAL_RUNTIME_URL || process.env.STYLD_LOCAL_OWNER_URL || process.env.POSTGRES_URL ||
      process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING) {
    throw new Error('External database targets are refused; this harness owns its own cluster.');
  }
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required.');
  const env = cleanEnvironment();
  const tool = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  const version = execFileSync(tool('pg_ctl'), ['--version'], { encoding: 'utf8', windowsHide: true, env }).trim();
  if (!REQUIRED_VERSION.test(version)) throw new Error('This harness requires PostgreSQL 17.11.');

  const port = await unusedPort(), runId = randomUUID();
  const identity = { kind: 'styld-disposable-postgres', cluster: `styld-local-${runId}`, port };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'styld-live-postgres-'));
  const data = path.join(directory, 'data');
  const passwordFile = path.join(directory, 'bootstrap-password');
  const ownerSecret = randomBytes(32).toString('hex'), runtimeSecret = randomBytes(32).toString('hex');
  let started = false, owner = null;

  fs.writeFileSync(passwordFile, ownerSecret, { mode: 0o600, flag: 'wx' });
  execFileSync(tool('initdb'), ['-D', data, '-U', 'styld_local_owner', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${passwordFile}`],
    { windowsHide: true, env, stdio: 'pipe' });
  fs.unlinkSync(passwordFile);
  const settings = `-h 127.0.0.1 -p ${port} -c cluster_name=${identity.cluster} -c shared_buffers=24MB -c max_connections=40 -c work_mem=2MB` +
    ' -c log_statement=none -c log_min_error_statement=panic -c log_parameter_max_length_on_error=0';
  execFileSync(tool('pg_ctl'), ['-D', data, '-l', path.join(directory, 'server.log'), '-o', settings, '-t', '60', '-w', 'start'], { windowsHide: true, env, stdio: 'ignore' });
  started = true;

  try {
    const bootstrap = new Pool({ connectionString: urlFor('styld_local_owner', ownerSecret, port, 'postgres'), ssl: false, options: '', max: 1, connectionTimeoutMillis: 30000 });
    await bootstrap.query('CREATE DATABASE styld_disposable_test');
    await bootstrap.end();

    const ownerUrl = urlFor('styld_local_owner', ownerSecret, port);
    const runtimeUrl = urlFor('styld_local_runtime', runtimeSecret, port);
    owner = new Pool(localTarget(ownerUrl, identity));
    await verifyIdentity(owner, identity, 'styld_local_owner');

    const schema = fs.readFileSync(path.resolve(__dirname, '../fixtures/review-schema.sql'), 'utf8');
    if (/\b(?:COPY|INSERT\s+INTO|CREATE\s+(?:ROLE|USER))\b|\bPASSWORD\s*'/i.test(schema.replace(/^--.*$/gm, ''))) {
      throw new Error('Schema reference contains data or credentials.');
    }
    await owner.query(schema);
    const tables = (await owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    for (const { tablename } of tables) if (!/^[a-z_]+$/.test(tablename)) throw new Error('Unexpected schema identifier.');
    let rows = 0;
    for (const { tablename } of tables) rows += Number((await owner.query(`SELECT count(*) AS n FROM public.${tablename}`)).rows[0].n);
    if (rows !== 0) throw new Error('Fresh schema is not empty.');

    await owner.query(`CREATE ROLE styld_local_runtime LOGIN NOSUPERUSER NOINHERIT PASSWORD '${runtimeSecret}'`);
    await owner.query('GRANT CONNECT ON DATABASE styld_disposable_test TO styld_local_runtime');
    await owner.query('GRANT USAGE ON SCHEMA public TO styld_local_runtime');
    // The live app writes across the whole reviewed schema, so the runtime role gets the
    // full table set. This grant exists only inside the cluster created above.
    await owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO styld_local_runtime');
    await owner.query('GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO styld_local_runtime');
    await owner.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO styld_local_runtime');

    const runtime = new Pool(localTarget(runtimeUrl, identity));
    await verifyIdentity(runtime, identity, 'styld_local_runtime');

    return {
      label, port, identity, directory, ownerUrl, runtimeUrl, tables: tables.length,
      owner, runtime,
      close: async () => {
        let dropped = false, stopped = false;
        try { await runtime.end(); } catch {}
        try { await owner.end(); } catch {}
        owner = null;
        try {
          const cleanup = new Pool({ connectionString: urlFor('styld_local_owner', ownerSecret, port, 'postgres'), ssl: false, options: '', max: 1, connectionTimeoutMillis: 30000 });
          try {
            const observed = (await cleanup.query("SELECT current_setting('cluster_name') AS cluster, host(inet_server_addr()) AS address")).rows[0];
            if (observed.cluster !== identity.cluster || observed.address !== '127.0.0.1') throw new Error('Cleanup server identity mismatch.');
            await cleanup.query('DROP DATABASE IF EXISTS styld_disposable_test WITH (FORCE)');
            dropped = (await cleanup.query("SELECT 1 FROM pg_database WHERE datname='styld_disposable_test'")).rowCount === 0;
          } finally { await cleanup.end(); }
        } catch (error) { console.error('cluster cleanup failed:', error.name); }
        try {
          execFileSync(tool('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { windowsHide: true, env, stdio: 'ignore' });
          stopped = true;
        } catch (error) { console.error('cluster stop failed:', error.name); }
        return { dropped, stopped, directoryRetained: directory, filesystemCleanup: 'no recursive directory removal' };
      }
    };
  } catch (error) {
    try { if (owner) await owner.end(); } catch {}
    if (started) { try { execFileSync(tool('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { windowsHide: true, env, stdio: 'ignore' }); } catch {} }
    throw error;
  }
}

module.exports = { startLiveCluster };
