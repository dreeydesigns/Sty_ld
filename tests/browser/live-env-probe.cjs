// CFG-01 (#75), the local half. app/api/health/environment/route.ts is the instrument the founder will
// point at the deployed beta, because it is the only thing that can say which database the running
// process actually resolved to after Vercel applies branch precedence. Until now it had only been
// exercised against an injected fake pool, so this harness starts the loopback disposable cluster it
// owns, builds the schema from the real migration chain, and runs the shipped probe module against a
// live PostgreSQL 17.11. Seven questions, each answered by a measurement:
//
//   1. does the probe read a live server and report the identity that server gives it (database, role,
//      port, address, table count, account rows), rather than repeating what the environment claims;
//   2. does it report which cluster answered and which running postmaster, the fact that separates a
//      beta endpoint from a production endpoint that happen to share a database name, and do the
//      runtime role and the owner role agree about it;
//   3. is that identifier a fact about the cluster and not about the database, which is what the
//      isolation claim turns on, shown by a second empty database inside the same cluster;
//   4. does a role that is refused the cluster statistic still get every other fact;
//   5. does every statement the probe sends reach the server as a read, and does it skip the query for
//      a table that is not there;
//   6. is the mail sender reported as a domain only, and is the media gate the shipped policy;
//   7. does the answer keep the credential, and the configured host, out of everything it writes.
//
// The cluster is created by this file and destroyed by this file. Nothing here closes #75: that needs
// the deployed read, which needs the founder's health token and a session that gets past Vercel
// Deployment Protection. What this does close is the worry that the answer is a formality, because the
// fields it names are now known to be filled in by a real server.
//
// Usage: node tests/browser/live-env-probe.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { readEnvironmentProbe, IDENTITY_SQL, POSTMASTER_SQL, CLUSTER_SQL, PUBLIC_TABLES_SQL,
  ACCOUNT_ROWS_SQL, APPLIED_SQL } = require('../../lib/environment-probe.cjs');

const root = path.resolve(__dirname, '../..');
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_ENV_PROBE_RECEIPT || 'docs/readiness/beta/live-env-probe.json';
const TWIN_DATABASE = 'qa_probe_twin';

const receipt = { suite: 'live-env-probe', date: '2026-11-02', steps: [], failed: 0 };

function step(name, run) {
  return Promise.resolve().then(run).then(() => {
    receipt.steps.push({ name, result: 'PASS' });
    console.log(`PASS ${name}`);
  }, (error) => {
    receipt.failed += 1;
    receipt.steps.push({ name, result: 'FAIL', error: String((error && error.message) || error).split('\n')[0] });
    console.log(`FAIL ${name}: ${String((error && error.message) || error).split('\n')[0]}`);
  });
}

// The chain is applied file by file rather than through scripts/apply-migrations.mjs, so
// schema_migrations does not exist here. That is the state the founder measured on styld_beta, which
// makes the probe's migration fields a live demonstration of what an untracked schema reads as.
async function buildChain(pool) {
  const files = fs.readdirSync(path.join(root, 'sql', 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  assert.equal(files.length, 16, `expected 16 migration files, found ${files.length}`);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  for (const file of files) await pool.query(fs.readFileSync(path.join(root, 'sql', 'migrations', file), 'utf8'));
  // Re-grant after the drop. Default privileges recorded by the cluster helper are keyed to the schema
  // object that was just destroyed, so without this the app-shaped runtime role would see an empty
  // information_schema and this file would be probing a schema no deployed process ever reads.
  await pool.query('GRANT USAGE ON SCHEMA public TO styld_local_runtime');
  await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO styld_local_runtime');
  await pool.query('GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO styld_local_runtime');
  return files;
}

function recordingQuery(pool, issued) {
  return async (sql) => {
    issued.push(sql);
    return pool.query(sql);
  };
}

async function main() {
  receipt.commit = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  if (!bin) throw new Error('pass the PostgreSQL 17.11 bin directory with --bin "<path>"');
  const cluster = await startLiveCluster({ bin, label: 'env-probe-live' });
  const twinUrls = [];
  let twin = null;
  try {
    const files = await buildChain(cluster.owner);
    receipt.chain = { migrationFiles: files.length, database: 'styld_disposable_test', port: cluster.identity.port };

    const probeEnv = {
      RESEND_FROM_EMAIL: 'STYLD Beta <beta@wearestyld.com>',
      STYLD_RESTRICTED_MEDIA_ENABLED: 'true',
    };

    const issued = [];
    let probe = null;
    await step('the shipped probe reads a live server and answers with what the server says', async () => {
      probe = await readEnvironmentProbe({ query: recordingQuery(cluster.runtime, issued), env: probeEnv });
      assert.equal(probe.database.name, 'styld_disposable_test', `the server answered ${probe.database.name}`);
      assert.equal(probe.database.role, 'styld_local_runtime', `the read ran as ${probe.database.role}`);
      assert.equal(probe.database.serverPort, cluster.identity.port,
        `the port the server reported is ${probe.database.serverPort}, not ${cluster.identity.port}`);
      assert.equal(probe.database.publicTableCount, 42, `${probe.database.publicTableCount} public tables after the chain`);
      assert.equal(probe.database.accountRows, 0, 'a database the chain built holds no accounts');
      assert.equal(probe.database.migrationCount, 0,
        'schema_migrations is absent here, which is the state styld_beta was reported in');
      assert.ok(['127.0.0.1', '::1', null].includes(probe.database.serverAddress),
        `the server reported its own address as ${probe.database.serverAddress}`);
      receipt.identity = { ...probe.database, schemaTables: `${probe.database.schemaTables.length} names` };
    });

    await step('the running postmaster is identified and the cluster statistic is read the way a host will read it', async () => {
      assert.match(String(probe.database.serverStartedAt), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        `the start time reads ${probe.database.serverStartedAt}`);
      assert.match(String(probe.database.clusterId), /^\d+$/,
        `the non-superuser role the app uses answered cluster ${probe.database.clusterId}; on a hosted `
        + 'endpoint that is the field the isolation proof turns on');
      const asOwner = await cluster.owner.query(CLUSTER_SQL);
      assert.equal(String(asOwner.rows[0].system_identifier), probe.database.clusterId,
        'the owner role and the runtime role named different clusters in one server');
      receipt.clusterIdentity = {
        runtimeRoleAnswer: probe.database.clusterId, ownerAnswer: String(asOwner.rows[0].system_identifier),
        serverStartedAt: probe.database.serverStartedAt,
      };
    });

    await step('a second database in the same cluster keeps the identifier and changes the name', async () => {
      // This is the load-bearing step for the isolation claim. system_identifier is a fact about the
      // cluster, so two databases sharing a name across two clusters differ here while two databases in
      // one cluster do not. The twin is created here and dropped here.
      await cluster.owner.query(`CREATE DATABASE ${TWIN_DATABASE}`);
      const url = new URL(cluster.runtimeUrl);
      url.pathname = `/${TWIN_DATABASE}`;
      twinUrls.push(url.toString());
      twin = new Pool({ connectionString: url.toString() });
      const twinProbe = await readEnvironmentProbe({ query: (sql) => twin.query(sql), env: probeEnv });
      receipt.twin = { database: twinProbe.database.name, clusterId: twinProbe.database.clusterId };
      assert.equal(twinProbe.database.name, TWIN_DATABASE, 'the twin database did not answer its own name');
      assert.equal(twinProbe.database.clusterId, probe.database.clusterId,
        'one cluster gave two databases two identifiers, so the field is not the cluster fact it claims to be');
      assert.equal(twinProbe.database.publicTableCount, 0,
        `the empty twin reported ${twinProbe.database.publicTableCount} tables, so the name is doing the work`);
    });

    await step('a role that cannot read the cluster statistic still gets every other fact', async () => {
      // The runtime role is not a superuser, and on a hosted endpoint the app connects as exactly this
      // kind of role. Whether it is refused or allowed, the readout must not collapse.
      const refused = await readEnvironmentProbe({
        query: async (sql) => {
          if (sql === CLUSTER_SQL) throw Object.assign(new Error('permission denied for function pg_control_system'), { code: '42889' });
          return cluster.runtime.query(sql);
        },
        env: probeEnv,
      });
      receipt.clusterStatPermission = { runtimeRoleAnswered: probe.database.clusterId !== null, refusedStillAnswers: refused.database.name };
      assert.equal(refused.database.clusterId, null, 'a refused optional fact should read as null');
      assert.equal(refused.database.name, 'styld_disposable_test', 'and the rest of the identity should survive');
      assert.equal(refused.database.publicTableCount, 42);
    });

    await step('every statement the probe sends is a read, and it sends no query for a table that is not there', () => {
      // schema_migrations is absent in this database, so the probe must ask for the five facts that exist
      // and not reach for the sixth.
      const expected = [IDENTITY_SQL, POSTMASTER_SQL, CLUSTER_SQL, PUBLIC_TABLES_SQL, ACCOUNT_ROWS_SQL];
      assert.deepEqual(issued.slice().sort(), expected.slice().sort(),
        `the server saw ${issued.length} statements: ${JSON.stringify(issued)}`);
      assert.equal(issued.includes(APPLIED_SQL), false,
        'the probe queried schema_migrations in a database that has no such table');
      assert.deepEqual(issued.filter((sql) => !/^(SELECT|WITH)\b/.test(sql)), [], 'a non-read reached the server');
      receipt.statements = { sent: issued.length, allReads: true, appliedSkipped: true };
    });

    await step('the sender is a domain and nothing more, and the media gate is the shipped one', () => {
      assert.deepEqual(probe.email, { provider: 'resend', senderDomain: 'wearestyld.com' });
      assert.equal(probe.media.uploadsAllowed, false,
        `the chain-built environment should refuse uploads, it answered ${probe.media.uploadBasis}`);
      assert.equal(probe.media.uploadRefusalReason, 'restricted-delivery-not-attested');
    });

    await step('the credential and the configured target appear nowhere in the answer', () => {
      assert.ok(probe, 'there is no probe answer to scan, so this step would be scanning nothing');
      const secret = new URL(cluster.runtimeUrl).password;
      const body = JSON.stringify({ configured: { database: { POSTGRES_URL: true } }, probe });
      assert.ok(secret && secret.length > 8, 'the disposable cluster was started without a usable secret to test against');
      assert.ok(!body.includes(secret), 'the connection password appears in the answer');
      assert.ok(!body.includes('styld_local_runtime@'), 'the role is reported as a name, never as a URL fragment');
      assert.ok(!/@/.test(body), 'no address@target form appears anywhere in the answer');
      assert.ok(!body.includes('sslmode'), 'the answer carries no connection parameters');
      receipt.secretScan = { charactersScanned: secret.length, matches: 0 };
    });
  } finally {
    if (twin) await twin.end().catch(() => {});
    for (const url of twinUrls) {
      await new Pool({ connectionString: url }).query(`DROP DATABASE IF EXISTS ${TWIN_DATABASE}`).catch(() => {});
    }
    await cluster.owner.query(`DROP DATABASE IF EXISTS ${TWIN_DATABASE}`).catch(() => {});
    await cluster.close();
  }

  receipt.reading = 'PASS here means the shipped probe module reads a live PostgreSQL 17.11 and returns the '
    + 'identity that server gives it, that the cluster identifier it returns is a fact about the cluster '
    + 'rather than the database, that a refused cluster statistic degrades one field instead of the readout, '
    + 'that the statements it sends are all reads and that it asks for no table that is not there, and that no '
    + 'credential or configured target appears in the answer. It does not mean the deployed beta points at '
    + 'styld_beta. That read needs the founder, a health token and the deployed origin: curl -H '
    + '"x-health-check-token: <token>" https://<preview-host>/api/health/environment, taken in a session that '
    + 'gets past Deployment Protection, then compared field by field with this receipt.';
  receipt.disclosure = 'the disposable cluster this file owns listens on a loopback port, is destroyed before '
    + 'this receipt is written, and the twin database used to separate cluster identity from database name is '
    + 'dropped with it. The receipt carries a database name, a role name, a port, a postmaster start time and a '
    + 'cluster identifier for a server that no longer exists; it carries no password, no connection string and '
    + 'no hosted address.';
  fs.writeFileSync(path.join(root, receiptPath), JSON.stringify(receipt, null, 2));
  console.log(`${receipt.failed ? 'FAIL' : 'PASS'} ${receipt.steps.length - receipt.failed}/${receipt.steps.length} steps, receipt ${receiptPath}`);
  if (receipt.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('the live environment probe smoke could not run:', String((error && error.message) || error).split('\n')[0]);
  process.exitCode = 2;
});
