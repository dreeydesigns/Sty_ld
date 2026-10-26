// Owns a fresh loopback cluster. Never accepts application connection variables.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const net = require('node:net');
const { localTarget, verifyIdentity } = require('../tests/helpers/local-postgres.cjs');
const root = path.resolve(__dirname, '..');
function safeFailure(error) {
  const message = String(error.message || '');
  const known = ['Connection terminated due to connection timeout', 'Connection terminated unexpectedly',
    'timeout exceeded when trying to connect', 'password authentication failed', 'SASL', 'connect ECONNREFUSED',
    'Database identity mismatch', 'Cleanup server identity mismatch'];
  return { code: error.code || error.name, status: error.status ?? null,
    category: known.find(value => message.includes(value)) || 'unclassified' };
}

function cleanEnvironment(source = process.env) {
  const allowed = new Set(['path','systemroot','windir','comspec','pathext','temp','tmp','userprofile','localappdata','appdata',
    'homedrive','homepath','lang','lc_all','tz','number_of_processors','processor_architecture','programfiles','programfiles(x86)','commonprogramfiles']);
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toLowerCase())));
}
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
async function run() {
  process.chdir(root);
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--bin') throw new Error('Usage: npm run test:db -- --bin <verified PostgreSQL bin directory>');
  if (process.env.STYLD_TEST_DATABASE_URL || process.env.STYLD_LOCAL_RUNTIME_URL || process.env.STYLD_LOCAL_OWNER_URL) throw new Error('External targets are refused; this runner creates its own database.');
  const bin = path.resolve(args[1]);
  const tool = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  const env = cleanEnvironment();
  const version = execFileSync(tool('pg_ctl'), ['--version'], { encoding: 'utf8', windowsHide: true, env }).trim();
  if (!/^pg_ctl \(PostgreSQL\) 17\.11\b/.test(version)) throw new Error('This verified harness requires PostgreSQL 17.11.');
  const port = await unusedPort(), runId = randomUUID();
  const identity = { kind: 'styld-disposable-postgres', cluster: `styld-local-${runId}`, port };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'styld-owned-postgres-'));
  const marker = path.join(directory, 'owner.json'), data = path.join(directory, 'data');
  fs.writeFileSync(marker, JSON.stringify({ runId, directory, identity }), { mode: 0o600 });
  const passwordFile = path.join(directory, 'bootstrap-password');
  const ownerSecret = randomBytes(32).toString('hex'), runtimeSecret = randomBytes(32).toString('hex');
  let started = false, owner, testExit = 1, phase = 'initialize';
  const summary = { runtime: version, sourceBase: 'schema-only tests/fixtures/review-schema.sql', localOnly: true, initialRows: null, testExit: null,
    databaseDropped: false, stopped: false, directoryRetained: directory, filesystemCleanup: 'Founder cleanup, no recursive directory removal' };
  try {
    fs.writeFileSync(passwordFile, ownerSecret, { mode: 0o600, flag: 'wx' });
    execFileSync(tool('initdb'), ['-D', data, '-U', 'styld_local_owner', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${passwordFile}`], { windowsHide: true, env, stdio: 'pipe' });
    fs.unlinkSync(passwordFile);
    phase = 'start';
    const settings = `-h 127.0.0.1 -p ${port} -c cluster_name=${identity.cluster} -c shared_buffers=16MB -c max_connections=24 -c work_mem=1MB -c maintenance_work_mem=16MB -c log_statement=none -c log_min_error_statement=panic -c log_parameter_max_length_on_error=0`;
    // A detached Windows server can inherit pipe handles after pg_ctl exits.
    execFileSync(tool('pg_ctl'), ['-D', data, '-l', path.join(directory, 'server.log'), '-o', settings, '-t', '60', '-w', 'start'], { windowsHide: true, env, stdio: 'ignore' }); started = true;
    phase = 'create-database';
    owner = new Pool({ connectionString: urlFor('styld_local_owner', ownerSecret, port, 'postgres'), ssl: false, options: '', max: 1, connectionTimeoutMillis: 30000 });
    await owner.query('CREATE DATABASE styld_disposable_test'); await owner.end(); owner = null;
    const ownerUrl = urlFor('styld_local_owner', ownerSecret, port), runtimeUrl = urlFor('styld_local_runtime', runtimeSecret, port);
    owner = new Pool(localTarget(ownerUrl, identity));
    await verifyIdentity(owner, identity, 'styld_local_owner');
    const schema = fs.readFileSync('tests/fixtures/review-schema.sql', 'utf8');
    if (/\b(?:COPY|INSERT\s+INTO|CREATE\s+(?:ROLE|USER))\b|\bPASSWORD\s*'/i.test(schema.replace(/^--.*$/gm, ''))) throw new Error('Schema reference contains data or credentials.');
    phase = 'restore-schema';
    await owner.query(schema);
    const tables = (await owner.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    let count = 0;
    for (const { tablename } of tables) { if (!/^[a-z_]+$/.test(tablename)) throw new Error('Unexpected schema identifier.'); count += Number((await owner.query(`SELECT count(*) AS n FROM public.${tablename}`)).rows[0].n); }
    summary.initialTables = tables.length; summary.initialRows = count;
    if (count !== 0) throw new Error('Fresh schema is not empty.');
    await owner.query(`CREATE ROLE styld_local_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${runtimeSecret}'`);
    await owner.query('GRANT CONNECT ON DATABASE styld_disposable_test TO styld_local_runtime; GRANT USAGE ON SCHEMA public TO styld_local_runtime');
    await owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON users,auth_accounts,auth_sessions,auth_verifications,auth_limits,auth_rate_limits,auth_session_context,auth_totp,auth_browsers,auth_recovery_codes,security_events TO styld_local_runtime');
    await owner.query('GRANT SELECT,INSERT,UPDATE ON identity_workspaces TO styld_local_runtime; GRANT SELECT,INSERT ON user_roles TO styld_local_runtime; GRANT SELECT ON services,social_posts TO styld_local_runtime; GRANT USAGE,SELECT ON SEQUENCE security_events_id_seq TO styld_local_runtime');
    const childEnv = { ...env, NODE_ENV: 'test', STYLD_LOCAL_CLUSTER: JSON.stringify(identity), STYLD_LOCAL_RUNTIME_URL: runtimeUrl, STYLD_LOCAL_OWNER_URL: ownerUrl };
    const files = fs.readdirSync('tests/postgres').filter(file => file.endsWith('.cjs')).sort().map(file => `tests/postgres/${file}`);
    if (!files.length) throw new Error('No PostgreSQL integration tests found.');
    testExit = await new Promise((resolve, reject) => { const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: root, env: childEnv, windowsHide: true, stdio: 'inherit' }); child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
    summary.testExit = testExit;
  } catch (error) {
    summary.failure = { phase, ...safeFailure(error) };
    throw error;
  } finally {
    if (owner) await owner.end();
    if (fs.existsSync(passwordFile)) fs.unlinkSync(passwordFile);
    const owned = JSON.parse(fs.readFileSync(marker, 'utf8'));
    const real = fs.realpathSync(directory);
    if (owned.runId !== runId || owned.directory !== directory || real !== directory || path.dirname(real) !== fs.realpathSync(os.tmpdir()) || !path.basename(real).startsWith('styld-owned-postgres-')) throw new Error('Cleanup target is not the owned cluster.');
    try { if (started) {
      const cleanup = new Pool({ connectionString: urlFor('styld_local_owner', ownerSecret, port, 'postgres'), ssl: false, options: '', max: 1, connectionTimeoutMillis: 30000 });
      try {
        const observed = (await cleanup.query("SELECT current_setting('cluster_name') AS cluster, host(inet_server_addr()) AS address")).rows[0];
        if (observed.cluster !== identity.cluster || observed.address !== '127.0.0.1') throw new Error('Cleanup server identity mismatch.');
        await cleanup.query('DROP DATABASE IF EXISTS styld_disposable_test WITH (FORCE)');
        summary.databaseDropped = (await cleanup.query("SELECT 1 FROM pg_database WHERE datname='styld_disposable_test'")).rowCount === 0;
      } finally { await cleanup.end(); }
    } } catch (error) { summary.cleanupFailure = safeFailure(error); }
    finally {
      try {
        if (started || fs.existsSync(path.join(data, 'postmaster.pid'))) { execFileSync(tool('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { windowsHide: true, env, stdio: 'ignore' }); summary.stopped = true; }
      } catch (error) { summary.stopFailure = { code: error.code || error.name, status: error.status ?? null }; }
      fs.writeFileSync('docs/readiness/sprint4/postgres-result.json', JSON.stringify(summary, null, 2));
    }
  }
  if (!summary.databaseDropped || !summary.stopped) throw new Error('Owned database cleanup did not complete.');
  process.exitCode = testExit;
}
if (require.main === module) run().catch(error => { console.error('Disposable PostgreSQL operation failed:', error.code || error.name); process.exitCode = 1; });
module.exports = { cleanEnvironment };
