// Runs the interception-based browser suites in tests/browser against one real production server.
//
//   node scripts/run-browser-qa-mock.cjs --bin "<PostgreSQL 17.11 bin>"
//
// One disposable cluster, one `next start`, then each suite in its own child process, in order.
// Nothing here reaches a real account, a real inbox or a hosted deployment.
//
// Eleven of the thirteen drive the shipped UI with every /api answer injected in the browser, either
// by their own route handler or by the fixture plan-v2.cjs exports, so they prove what the components
// do with an answer, not what the answer was. The last two, compare-study.cjs and
// compare-layout-proposal.cjs, never reach an application route at all: they drive static layout
// prototypes. They are recorded as 'prototype' below so a green board cannot read them as app proof.
//
// These suites were written against a server on the single origin they accept, and nothing in this
// repository started that server, which is why they had drifted into "suites that exist" rather than
// "suites that run".

const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { startLiveCluster } = require('../tests/helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../tests/helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '..');
// The suites compare this string rather than a port, and three of them throw if it differs, so this
// is the harness's contract with them, not a convenience.
const base = 'http://localhost:3107';
const port = 3107;
const receiptPath = path.join(root, 'docs/readiness/beta/mock-browser-suites.json');
// Declared here because readinessTree() has to exclude it: the per-suite logs are this run's own
// output, not evidence about what a suite changed.
const logDirectory = path.join(root, 'docs/readiness/beta/mock-suite-logs');

// compare-study.cjs is not an application suite. It drives the synthetic layout prototype at
// docs/readiness/compare-prototype.html, and it navigates to 127.0.0.1:3108 with the address written
// into the file instead of passed in. Nothing in this repository served that page, which is the only
// reason the suite could not run.
const studyFile = path.join(root, 'docs/readiness/compare-prototype.html');
const studyPort = 3108;

// `floor` is the PASS-line count the recorded run printed. A suite that exits 0 having run nothing
// would otherwise join a clean 13/13, so the count is part of the pass condition, not decoration.
// If a suite legitimately changes how many scenarios it states, this fails and the floor is moved
// with it on purpose, in the same commit.
const SUITES = [
  { file: 'plan-v2.cjs', kind: 'journey', floor: 50 },
  { file: 'private-saves.cjs', kind: 'journey', floor: 31 },
  { file: 'build1-journey.cjs', kind: 'journey', floor: 33 },
  { file: 'session-states.cjs', kind: 'journey', floor: 6 },
  { file: 'email-delivery.cjs', kind: 'journey', floor: 10 },
  { file: 'compare.cjs', kind: 'journey', floor: 50 },
  { file: 'compare-sync.cjs', kind: 'journey', floor: 1 },
  { file: 'shortlist-saves.cjs', kind: 'journey', floor: 31 },
  { file: 'sprint4-acceptance.cjs', kind: 'journey', floor: 31 },
  { file: 'compare-study.cjs', kind: 'prototype', floor: 1 },
  { file: 'compare-layout-proposal.cjs', kind: 'prototype', floor: 2 },
  { file: 'compare-measurements.cjs', kind: 'generator', floor: 2 },
  { file: 'readiness-measurements.cjs', kind: 'generator', floor: 1 },
];

function portIsFree(wanted) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(wanted, '127.0.0.1');
  });
}

function startStudyServer() {
  const html = fs.readFileSync(studyFile, 'utf8');
  return new Promise((resolve, reject) => {
    // One fixed file, loopback only, the request path ignored: the suite navigates to the root and
    // nothing here reads the filesystem per request, so there is no path to traverse.
    const server = http.createServer((request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html);
    });
    server.once('error', reject);
    server.listen(studyPort, '127.0.0.1', () => resolve(server));
  });
}

function readinessTree() {
  const crypto = require('node:crypto');
  const out = new Map();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (full !== logDirectory) walk(full); continue; }
      // Content, not mtime: a generator that re-prints the same stale number touches its file and a
      // raw mtime diff would call that a rewrite, while a hash shows whether anything changed. The
      // per-suite logs are this run's own output, so they are not evidence about a suite.
      out.set(path.relative(root, full).replace(/\\/g, '/'), crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 16));
    }
  };
  if (fs.existsSync(path.join(root, 'docs/readiness'))) walk(path.join(root, 'docs/readiness'));
  return out;
}

function diffTrees(before, after) {
  const changed = [];
  for (const [file, hash] of after) if (before.get(file) !== hash) changed.push(file);
  for (const file of before.keys()) if (!after.has(file)) changed.push(`${file} (deleted)`);
  return changed.sort();
}

function trackOf(stdout) {
  const pass = (stdout.match(/^PASS /gm) || []).length;
  const fail = (stdout.match(/^FAIL /gm) || []).length;
  const summary = stdout.split('\n').filter(line => /^(PASS|FAIL|receipt|records|wrote)/i.test(line.trim())).slice(-1)[0] || null;
  return { passLines: pass, failLines: fail, lastSummaryLine: summary ? summary.trim().slice(0, 240) : null };
}

async function runSuite(name, environment, floor, kind) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [path.join(root, 'tests/browser', name), 'playwright', base],
    { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += String(chunk); process.stdout.write(`  ${name}: ${String(chunk)}`); });
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  const exitCode = await new Promise(resolve => child.on('close', code => resolve(code)));
  // The measurement generators print their whole record set on one line, so a truncated tail in the
  // receipt would silently lose the 1440px half of it. Every suite's uncut output goes to a log file
  // and the receipt names that file.
  fs.writeFileSync(path.join(logDirectory, name.replace(/\.cjs$/, '') + '.txt'), `${stdout}${stderr ? `\n--- stderr ---\n${stderr}` : ''}`);
  const track = trackOf(stdout);
  return { suite: name, kind, floor, ...track,
    clean: exitCode === 0 && track.failLines === 0 && track.passLines >= floor,
    exitCode, durationMs: Date.now() - startedAt,
    log: `docs/readiness/beta/mock-suite-logs/${name.replace(/\.cjs$/, '')}.txt`,
    stdoutTail: stdout.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 1200),
    stderrTail: stderr.split('\n').filter(Boolean).slice(-6).join(' | ').slice(0, 900) };
}

async function main() {
  const binIndex = process.argv.indexOf('--bin');
  const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
  // One suite at a time, for debugging. The subset is written to a scratch path so a single-suite
  // run can never overwrite the receipt that claims to cover all thirteen.
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
  const target = only ? path.join(require('node:os').tmpdir(), 'styld-mock-suite-subset.json') : receiptPath;
  const suiteList = only ? SUITES.filter(suite => suite.file === only) : SUITES;
  if (!suiteList.length) throw new Error(`--only names no suite in the list: ${only}`);
  const results = [];
  const serverLog = [];
  let cluster, mail, server, study, before, cleanedUp = false;

  async function teardown() {
    if (cleanedUp) return null;
    cleanedUp = true;
    if (study) study.close();
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
    if (!await portIsFree(port)) throw new Error(`port ${port} is already answered by something this runner did not start, so a run here would report someone else's server`);
    if (!await portIsFree(studyPort)) throw new Error(`port ${studyPort} is already answered, so the layout prototype could not be served by this run`);
    cluster = await startLiveCluster({ bin, label: 'mock-browser-suites' });
    mail = await startMailCapture();
    study = await startStudyServer();
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

    fs.mkdirSync(logDirectory, { recursive: true });
    before = readinessTree();
    for (const { file, kind, floor } of suiteList) {
      process.stdout.write(`${kind} ${file}\n`);
      const suiteBefore = readinessTree();
      const result = await runSuite(file, environment, floor, kind);
      result.filesWritten = diffTrees(suiteBefore, readinessTree());
      results.push(result);
    }
    const after = readinessTree();
    const written = diffTrees(before, after);

    const failedSuites = results.filter(result => !result.clean);
    const receipt = {
      commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      branch: require('node:child_process').execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
      measuredAt: new Date().toISOString(),
      buildId,
      subset: only,
      server: { command: 'next start (production build)', base, bootMs, thirdPartyRequests: 'the suites abort every route that is not this origin' },
      studyPrototype: { servedAt: `http://127.0.0.1:${studyPort}`, file: 'docs/readiness/compare-prototype.html', screenshot: 'the suite writes to the OS temp directory, not into the repository' },
      cluster: { kind: 'styld-disposable-postgres', tables: cluster.tables, runtime: 'PostgreSQL 17.11, loopback, owned by this process' },
      databaseTraffic: 'the suites intercept every /api call in the browser, directly or through the fixture plan-v2.cjs exports; the server still reads and writes this cluster for anything the page renders from the database',
      suiteScope: 'kind journey or generator means an application route on this server with /api injected; kind prototype means a static layout page and no application route at all',
      passRule: 'a suite counts as clean only if it exits 0, prints no FAIL line, and reaches its recorded PASS-line floor, so a suite that runs nothing cannot join a clean total',
      suites: results,
      suiteLogs: 'docs/readiness/beta/mock-suite-logs, one file per suite with its uncut stdout and stderr',
      totals: { suites: results.length, passed: results.length - failedSuites.length, failed: failedSuites.length,
        passLines: results.reduce((sum, result) => sum + result.passLines, 0) },
      readinessFilesRewritten: written,
      readinessFileMethod: 'sha256 of file contents, snapshotted before and after each suite, with this runner\'s own log directory excluded',
      serverLogTail: serverLog.join('').slice(-1500),
    };
    fs.writeFileSync(target, JSON.stringify(receipt, null, 2));
    console.log(`\nreceipt ${receipt.totals.passed}/${receipt.totals.suites} suites clean on exit, no FAIL line and their PASS floor, ${receipt.totals.passLines} PASS lines recorded`);
    for (const result of results) {
      console.log(`  ${result.clean ? 'ok  ' : 'FAIL'} ${result.suite} kind=${result.kind} passLines=${result.passLines}/${result.floor} failLines=${result.failLines} exit=${result.exitCode} ${result.durationMs}ms${result.filesWritten.length ? ` wrote ${result.filesWritten.join(',')}` : ''}`);
    }
    await teardown();
    process.exit(failedSuites.length ? 1 : 0);
  } catch (error) {
    const message = String(error && error.message || error);
    // A crash never replaces the last complete receipt with an object that has no totals: it lands
    // beside it, so the failure is recorded without destroying the evidence that came before it.
    const crashPath = `${target}.crash.json`;
    fs.writeFileSync(crashPath, JSON.stringify({ commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      measuredAt: new Date().toISOString(), crashed: message, completedBeforeCrash: results.length, suites: results,
      serverLogTail: serverLog.join('').slice(-2000) }, null, 2));
    console.error(`CRASH ${crashPath} ${message}`);
    await teardown();
    process.exit(1);
  }
}

void main();
