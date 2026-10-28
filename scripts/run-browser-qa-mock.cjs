// Runs the interception-based browser suites in tests/browser against one real production server.
//
// These thirteen suites are not the live journeys. They drive the shipped UI with every API
// response and every identity injected in the browser, so they prove what the components do with
// an answer, not what the answer was. They were written against a server on the single origin they
// accept, and nothing in this repository started that server, which is why they had drifted into
// "suites that exist" rather than "suites that run".
//
//   node scripts/run-browser-qa-mock.cjs --bin "<PostgreSQL 17.11 bin>"
//
// One disposable cluster, one `next start`, then each suite in its own child process, in order.
// Nothing here reaches a real account, a real inbox or a hosted deployment.

const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { startLiveCluster } = require('../tests/helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../tests/helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '..');
// The suites compare this string rather than a port, and four of them throw if it differs, so this
// is the harness's contract with them, not a convenience.
const base = 'http://localhost:3107';
const port = 3107;
const receiptPath = path.join(root, 'docs/readiness/beta/mock-browser-suites.json');

const SUITES = [
  { file: 'plan-v2.cjs', kind: 'journey' },
  { file: 'private-saves.cjs', kind: 'journey' },
  { file: 'build1-journey.cjs', kind: 'journey' },
  { file: 'session-states.cjs', kind: 'journey' },
  { file: 'email-delivery.cjs', kind: 'journey' },
  { file: 'compare.cjs', kind: 'journey' },
  { file: 'compare-sync.cjs', kind: 'journey' },
  { file: 'shortlist-saves.cjs', kind: 'journey' },
  { file: 'sprint4-acceptance.cjs', kind: 'journey' },
  { file: 'compare-study.cjs', kind: 'generator' },
  { file: 'compare-layout-proposal.cjs', kind: 'generator' },
  { file: 'compare-measurements.cjs', kind: 'generator' },
  { file: 'readiness-measurements.cjs', kind: 'generator' },
];

function portIsFree() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

function readinessTree() {
  const out = new Map();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(root, full).replace(/\\/g, '/'), Math.round(fs.statSync(full).mtimeMs));
    }
  };
  if (fs.existsSync(path.join(root, 'docs/readiness'))) walk(path.join(root, 'docs/readiness'));
  return out;
}

function trackOf(stdout) {
  const pass = (stdout.match(/^PASS /gm) || []).length;
  const fail = (stdout.match(/^FAIL /gm) || []).length;
  const summary = stdout.split('\n').filter(line => /^(PASS|FAIL|receipt|records|wrote)/i.test(line.trim())).slice(-1)[0] || null;
  return { passLines: pass, failLines: fail, lastSummaryLine: summary ? summary.trim().slice(0, 240) : null };
}

async function runSuite(name, environment) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [path.join(root, 'tests/browser', name), 'playwright', base],
    { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += String(chunk); process.stdout.write(`  ${name}: ${String(chunk)}`); });
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  const exitCode = await new Promise(resolve => child.on('close', code => resolve(code)));
  return { suite: name, ...trackOf(stdout), exitCode, durationMs: Date.now() - startedAt,
    stdoutTail: stdout.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 600),
    stderrTail: stderr.split('\n').filter(Boolean).slice(-6).join(' | ').slice(0, 900) };
}

async function main() {
  const binIndex = process.argv.indexOf('--bin');
  const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
  const results = [];
  const serverLog = [];
  let cluster, mail, server, before, cleanedUp = false;

  async function teardown() {
    if (cleanedUp) return null;
    cleanedUp = true;
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = cluster ? await cluster.close() : null;
    if (mail) await mail.stop().catch(() => null);
    return cleanup;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }

  try {
    if (!await portIsFree()) throw new Error(`port ${port} is already answered by something this runner did not start, so a run here would report someone else's server`);
    cluster = await startLiveCluster({ bin, label: 'mock-browser-suites' });
    mail = await startMailCapture();
    const environment = {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
      POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
      EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'qa-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
      RESEND_API_URL: mail.apiUrl,
    };
    const bootStart = Date.now();
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)],
      { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => serverLog.push(String(chunk)));
    server.stderr.on('data', chunk => serverLog.push(String(chunk)));
    let reachable = false;
    for (let attempt = 0; attempt < 90 && !reachable; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) reachable = true; } catch { }
      if (!reachable) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!reachable) throw new Error(`the built app never answered on ${base}: ${serverLog.join('').slice(-800)}`);
    const bootMs = Date.now() - bootStart;
    const buildId = fs.existsSync(path.join(root, '.next/BUILD_ID')) ? fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim() : null;
    if (!buildId) throw new Error('there is no .next/BUILD_ID, so this run would not know which artifact it served');

    before = readinessTree();
    for (const { file, kind } of SUITES) {
      process.stdout.write(`${kind} ${file}\n`);
      results.push({ kind, ...(await runSuite(file, environment)) });
    }
    const after = readinessTree();
    const written = [...after].filter(([p, mtime]) => !before.has(p) || before.get(p) !== mtime).map(([p]) => p).sort();

    const failedSuites = results.filter(result => result.exitCode !== 0);
    const receipt = {
      commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      branch: require('node:child_process').execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
      measuredAt: new Date().toISOString(),
      buildId,
      server: { command: 'next start (production build)', base, bootMs, thirdPartyRequests: 'the suites abort every route that is not this origin' },
      cluster: { kind: 'styld-disposable-postgres', tables: cluster.tables, runtime: 'PostgreSQL 17.11, loopback, owned by this process' },
      databaseTraffic: 'the suites intercept every /api call in the browser; the server still reads and writes this cluster for anything the page renders from the database',
      suites: results,
      totals: { suites: results.length, passed: results.length - failedSuites.length, failed: failedSuites.length,
        passLines: results.reduce((sum, result) => sum + result.passLines, 0) },
      readinessFilesRewritten: written,
      serverLogTail: serverLog.join('').slice(-1500),
    };
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`\nreceipt ${receipt.totals.passed}/${receipt.totals.suites} suites exited clean, ${receipt.totals.passLines} PASS lines recorded`);
    for (const result of results) console.log(`  ${result.exitCode === 0 ? 'ok  ' : 'FAIL'} ${result.suite} kind=${result.kind} passLines=${result.passLines} exit=${result.exitCode} ${result.durationMs}ms`);
    await teardown();
    process.exit(failedSuites.length ? 1 : 0);
  } catch (error) {
    const message = String(error && error.message || error);
    fs.writeFileSync(receiptPath, JSON.stringify({ commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      measuredAt: new Date().toISOString(), crashed: message, suites: results, serverLogTail: serverLog.join('').slice(-2000) }, null, 2));
    console.error('CRASH', message);
    await teardown();
    process.exit(1);
  }
}

void main();
