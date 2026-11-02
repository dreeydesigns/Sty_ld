// DB-ISO-01 (#74) preparation. scripts/db-inventory.mjs is the instrument the founder will point at
// the hosted beta database, and until now it had only ever been exercised offline against an injected
// fake connection. This harness starts the loopback disposable cluster it owns, builds the schema from
// nothing but the real migration chain, and then runs the tool exactly as the founder will run it: a
// child process reading a live PostgreSQL server. Five questions, each answered by a measurement:
//
//   1. does the tool read a live server, and does a database built only by the chain read back as a
//      match with nothing named extra or missing;
//   2. are the aggregates a real server reports for that database (tables, columns, primary keys,
//      unique constraints, indexes, row security) the same ones the migration files claim, which is
//      the form the founder's read-only inspection of styld_beta reported;
//   3. is that comparison faithful, i.e. when this file seeds exactly three differences by hand does the
//      report name exactly those three and nothing else;
//   4. does it keep the schema it reads byte for byte as it found it;
//   5. does it stay read-only, and keep the credential out of every artifact it writes or prints.
//
// The cluster is created by this file and destroyed by this file. It is not the hosted database, and
// nothing here closes #74: that still needs the founder to run the same tool against styld_beta with a
// read-only role. What this removes is the possibility that the tool fails for the first time there.
// The hosted beta is reported as 42 tables with no schema_migrations table, so that run will disagree
// with the chain; this harness proves it disagrees for the right reason, on a schema this file wrote.
//
// Usage: node tests/browser/live-db-inventory.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');

const root = path.resolve(__dirname, '../..');
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_DB_RECEIPT || 'docs/readiness/beta/live-db-inventory-smoke.json';
const reportsDir = 'docs/readiness/beta/db-inventory-smoke';
const tool = 'scripts/db-inventory.mjs';
const QA_COLUMN = 'qa_drift_column';
const QA_TABLE = 'qa_extra_table';
const DROPPED_TABLE = 'payment_logs';

const receipt = {
  instrument: 'tests/browser/live-db-inventory.cjs',
  subject: tool,
  commit: null,
  cluster: null,
  steps: [],
  failed: 0,
};

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

function invoke(url, args) {
  // The credential travels in the environment, never in argv, so it cannot land in a process list or
  // in a captured command line.
  try {
    const stdout = execFileSync(process.execPath, [tool, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, POSTGRES_URL: url, DATABASE_URL: url },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      code: typeof error.status === 'number' ? error.status : 2,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || '').trim(),
    };
  }
}

function run(url, name) {
  const out = `${reportsDir}/${name}.json`;
  const result = invoke(url, ['--allow-owner', '--out', out]);
  const report = result.code <= 1 ? JSON.parse(fs.readFileSync(path.join(root, out), 'utf8')) : null;
  return { ...result, out, report, summary: safeJson(result.stdout) };
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function liveTables(pool) {
  const rows = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  return rows.rows.map((row) => row.tablename);
}

async function schemaFingerprint(pool) {
  const columns = await pool.query(
    "SELECT md5(string_agg(table_name || '.' || column_name || coalesce(data_type, ''), ',' "
    + "ORDER BY table_name, column_name)) AS hash, count(*) AS n "
    + "FROM information_schema.columns WHERE table_schema = 'public'");
  return { columnsHash: columns.rows[0].hash, columnCount: Number(columns.rows[0].n), tables: (await liveTables(pool)).length };
}

async function main() {
  receipt.commit = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const inventory = await import(pathToFileURL(path.join(root, tool)).href);

  const cluster = await startLiveCluster({ bin, label: 'db-inventory-live' });
  receipt.cluster = { kind: cluster.identity.kind, port: cluster.identity.port, database: 'styld_disposable_test' };
  const ownerUrl = cluster.ownerUrl;
  const secret = new URL(ownerUrl).password;
  let baselineText = '';
  fs.mkdirSync(path.join(root, reportsDir), { recursive: true });

  try {
    await step('the migration chain builds the disposable schema from nothing', async () => {
      const files = fs.readdirSync(path.join(root, 'sql', 'migrations')).filter((f) => f.endsWith('.sql')).sort();
      assert.equal(files.length, 16, `expected 16 migration files, found ${files.length}`);
      // The shared cluster helper lays down the schema the app runs against. This file wants the chain
      // alone, because the claim it needs to prove is that a database built only by these files reads as
      // a match. The cluster is created here and destroyed here, so dropping its schema drops nothing
      // anyone else owns.
      await cluster.owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      for (const file of files) {
        await cluster.owner.query(fs.readFileSync(path.join(root, 'sql', 'migrations', file), 'utf8'));
      }
      receipt.migrationFiles = files.length;
      receipt.tablesAfterChain = (await liveTables(cluster.owner)).length;
      assert.ok(receipt.tablesAfterChain >= 40, `the chain left ${receipt.tablesAfterChain} tables`);
    });

    let baseline = null;

    await step('the tool reads a live server and calls a chain-built database a match', async () => {
      const result = run(ownerUrl, 'baseline');
      assert.equal(result.code, 0, `a database built by the chain alone should exit 0, got ${result.code}: ${result.stderr}`);
      baseline = result.report;
      baselineText = result.stdout + result.stderr;
      assert.equal(result.summary.host, '127.0.0.1', `the run reached ${result.summary.host}`);
      assert.equal(result.summary.database, 'styld_disposable_test');
      assert.equal(result.summary.user, 'styld_local_owner', `the printed summary names the reader as ${result.summary.user}`);
      assert.ok(baseline.live.tables > 0 && baseline.expectedFrom.tables > 0);
      assert.equal(baseline.matches, true, 'the tool did not call a chain-built schema a match');
      assert.deepEqual(baseline.extraTables, [], `the tool named extra tables the chain created: ${JSON.stringify(baseline.extraTables)}`);
      assert.deepEqual(baseline.missingTables, [], `the tool missed tables the chain created: ${JSON.stringify(baseline.missingTables)}`);
      receipt.baseline = {
        liveTables: baseline.live.tables, expectedTables: baseline.expectedFrom.tables,
        drift: baseline.drift.length, missing: baseline.missingTables.length, extra: baseline.extraTables.length,
        matches: baseline.matches, statements: baseline.statementsSent.length,
      };
    });

    // The founder's independent read-only inspection of styld_beta reported six aggregate numbers. A
    // count that agrees is not a schema that agrees, but it is the first filter, so the same numbers are
    // read off a server this file built from the chain alone and set against what the migration files
    // claim. The chain's own primary key and unique counts come out of the constraint-backed index names,
    // because those are the names a live PostgreSQL gives its own constraints.
    await step('the aggregates a live server reports for a chain-built database are the chain\'s own', async () => {
      const read = await cluster.owner.query(
        'SELECT '
        + "(SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables, "
        + "(SELECT count(*) FROM information_schema.columns WHERE table_schema='public') AS columns, "
        + "(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND c.contype = 'p') AS primary_keys, "
        + "(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND c.contype = 'u') AS unique_constraints, "
        + "(SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') AS indexes, "
        + "(SELECT count(*) FROM pg_class rel JOIN pg_namespace n ON n.oid = rel.relnamespace WHERE n.nspname = 'public' AND rel.relkind = 'r' AND rel.relrowsecurity) AS tables_with_rls, "
        + '(SELECT count(*) FROM pg_policies WHERE schemaname = \'public\') AS policies');
      const live = Object.fromEntries(Object.entries(read.rows[0]).map(([key, value]) => [key, Number(value)]));
      const tables = Object.values(inventory.expectedFromMigrations(path.join(root, 'sql', 'migrations')).tables);
      const backed = tables.flatMap((table) => table.constraintIndexes.map((index) => index.name));
      const want = {
        tables: tables.length,
        columns: tables.reduce((sum, table) => sum + Object.keys(table.columns).length, 0),
        primary_keys: backed.filter((name) => /_pkey$/.test(name)).length,
        unique_constraints: backed.filter((name) => !/_pkey$/.test(name)).length,
        indexes: tables.reduce((sum, table) => sum + table.indexes.length + table.constraintIndexes.length, 0),
        tables_with_rls: 0,
        policies: 0,
      };
      receipt.aggregates = { live, expectedFromChain: want, hostedReported: {
        tables: 42, columns: 379, primary_keys: 42, unique_constraints: 18, indexes: 106,
        tables_with_rls: 0, policies: 0, users: 1, schema_migrations_table: false } };
      for (const key of Object.keys(want)) {
        assert.equal(live[key], want[key], `a database built by the chain reports ${live[key]} ${key}, the migration files claim ${want[key]}`);
      }
    });

    await step('every statement the tool sent is a read', () => {
      const pragma = 'set session characteristics as transaction read only';
      const notReads = baseline.statementsSent.filter((text) => !/^(select|with)\b/i.test(text));
      assert.deepEqual(notReads, [pragma], `the tool sent ${JSON.stringify(notReads)}`);
      assert.match(baseline.conditions, /read-only session/);
    });

    await step('the credential appears in nothing the tool writes or prints', () => {
      const text = fs.readFileSync(path.join(root, `${reportsDir}/baseline.json`), 'utf8');
      assert.ok(!text.includes(secret), 'the connection secret appears in the report');
      assert.ok(!/postgres(ql)?:\/\//i.test(text), 'a connection string was recorded in the report');
      assert.ok(!baselineText.includes(secret), 'the printed summary carried the connection secret');
    });

    await step('the tool refuses an owner role until --allow-owner is passed', () => {
      const result = invoke(ownerUrl, ['--out', `${reportsDir}/refused.json`]);
      assert.equal(result.code, 2, `expected refusal, got exit ${result.code}`);
      assert.match(result.stderr, /read-only role/);
      assert.equal(fs.existsSync(path.join(root, `${reportsDir}/refused.json`)), false,
        'a report was written even though the run never connected');
    });

    await step('the tool refuses a report path outside docs', () => {
      const result = invoke(ownerUrl, ['--allow-owner', '--out', 'tmp/inside-app.json']);
      assert.equal(result.code, 2, `expected refusal, got exit ${result.code}`);
      assert.match(result.stderr, /must be written under docs/);
    });

    await step('a column that no migration created is reported as drift', async () => {
      await cluster.owner.query(`ALTER TABLE public.users ADD COLUMN ${QA_COLUMN} text`);
      const result = run(ownerUrl, 'column-drift');
      assert.equal(result.code, 1, `drift should exit 1, got ${result.code}`);
      const hit = result.report.drift.filter((entry) => entry.table === 'users' && entry.name === QA_COLUMN);
      assert.equal(hit.length, 1, 'the added column was not reported');
      assert.match(hit[0].problem, /created by no migration file/);
      assert.equal(result.report.drift.length, baseline.drift.length + 1,
        `drift moved by ${result.report.drift.length - baseline.drift.length}, not by one column`);
      receipt.columnDrift = hit[0];
      fs.unlinkSync(path.join(root, result.out));
    });

    await step('a table that no migration created is reported as extra', async () => {
      await cluster.owner.query(`CREATE TABLE public.${QA_TABLE} (id integer)`);
      const result = run(ownerUrl, 'extra-table');
      assert.equal(result.code, 1, `expected exit 1, got ${result.code}`);
      assert.ok(result.report.extraTables.includes(QA_TABLE), `extra tables: ${JSON.stringify(result.report.extraTables)}`);
      receipt.extraTableFound = QA_TABLE;
      fs.unlinkSync(path.join(root, result.out));
    });

    await step('a table the chain requires and the live database lacks is reported as missing', async () => {
      await cluster.owner.query(`DROP TABLE public.${DROPPED_TABLE}`);
      const result = run(ownerUrl, 'missing-table');
      assert.equal(result.code, 1, `expected exit 1, got ${result.code}`);
      assert.ok(result.report.missingTables.includes(DROPPED_TABLE),
        `missing tables: ${JSON.stringify(result.report.missingTables)}`);
      receipt.missingTableFound = DROPPED_TABLE;
      fs.unlinkSync(path.join(root, result.out));
    });

    await step('the tool leaves the schema it reads exactly as it found it', async () => {
      const before = await schemaFingerprint(cluster.owner);
      const result = run(ownerUrl, 'fingerprint');
      assert.equal(result.code, 1, `the drifted schema should exit 1, got ${result.code}`);
      const after = await schemaFingerprint(cluster.owner);
      receipt.fingerprint = { before, after };
      assert.equal(after.columnsHash, before.columnsHash, 'the column inventory moved while only the reader ran');
      assert.equal(after.tables, before.tables, 'a table appeared or vanished during a read');
      fs.unlinkSync(path.join(root, result.out));
    });

    await step('the row level security picture the hosted run depends on is produced', () => {
      receipt.rls = {
        enforced: baseline.security.tablesWithRls.length,
        notEnforced: baseline.security.tablesWithoutRls.length,
        policies: baseline.security.policyCount,
      };
      assert.ok(receipt.rls.enforced + receipt.rls.notEnforced > 0,
        'no table was reported for row level security, so the tenant wall is invisible');
    });

    await step('the three seeded differences are the whole of what it reports', async () => {
      const result = run(ownerUrl, 'reconcile');
      assert.equal(result.code, 1, `expected exit 1, got ${result.code}`);
      const expected = Object.keys(inventory.expectedFromMigrations(path.join(root, 'sql', 'migrations')).tables);
      assert.equal(expected.includes(QA_TABLE), false, `${QA_TABLE} is created by a migration file, so the test is not testing what it claims`);
      assert.deepEqual(result.report.extraTables, [QA_TABLE],
        `the extra list ${JSON.stringify(result.report.extraTables)} is not exactly the one table no migration created`);
      assert.deepEqual(result.report.missingTables, [DROPPED_TABLE],
        `the missing list ${JSON.stringify(result.report.missingTables)} is not exactly the one table dropped`);
      const byKind = {};
      for (const entry of result.report.drift) (byKind[entry.kind] = byKind[entry.kind] || []).push(`${entry.table}.${entry.name}`);
      receipt.reconcileDriftKinds = Object.fromEntries(Object.entries(byKind).map(([kind, names]) => [kind, names.length]));
      assert.deepEqual(byKind.column || [], [`users.${QA_COLUMN}`],
        `the column list ${JSON.stringify(byKind.column || [])} is not exactly the one column added by hand`);
      assert.equal(byKind.index, undefined, `the report still invents index drift: ${JSON.stringify(byKind.index)}`);
      receipt.reconcile = { extra: result.report.extraTables, missing: result.report.missingTables, drift: byKind };
      fs.unlinkSync(path.join(root, result.out));
    });
  } finally {
    await cluster.close();
  }

  receipt.reading = 'PASS here means the instrument works against a live PostgreSQL server, reads only, keeps the '
    + 'credential out of its report, and detects drift in both directions and a table count that does not match the '
    + 'chain. It does not mean the hosted beta database matches the chain. That run needs the founder, a read-only '
    + 'role and the same command: node --env-file=.env.local scripts/db-inventory.mjs '
    + '--out docs/readiness/beta/db-inventory.json';
  receipt.disclosure = 'the disposable cluster this file owns listens on a loopback port and is destroyed before this '
    + 'receipt is written. Its secret never left the process environment; the report on disk carries host, port, '
    + 'database and role name only, and the per-case reports are removed once their finding is recorded here.';
  fs.writeFileSync(path.join(root, receiptPath), JSON.stringify(receipt, null, 2));
  console.log(`${receipt.failed ? 'FAIL' : 'PASS'} ${receipt.steps.length - receipt.failed}/${receipt.steps.length} steps, receipt ${receiptPath}`);
  if (receipt.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('the live inventory smoke could not run:', String((error && error.message) || error).split('\n')[0]);
  process.exitCode = 2;
});
