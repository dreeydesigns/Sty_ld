// Bounded reproduction of the intermittent Compare wait, on the real stack:
// production `next start`, owned disposable PostgreSQL 17.11, a real Better Auth
// session, and a Plan written through the real API. Nothing is intercepted.
//
// What it measures per visit: when the document began, when `GET /api/plan` was
// sent and what it answered (status, revision, shortlist size), when the compare
// table first painted, and, if it never painted, what the page actually said.
// Two conditions are run: an unthrottled baseline and a Kenyan-shaped link with
// CPU throttling, because the claim under test is about a slow device on a slow
// connection rather than a fast machine.
//
//   node tests/browser/compare-wait-stress.cjs --bin <pg bin> [--runs 6] [--cpu 4]
//
// The receipt is docs/readiness/beta/compare-wait-stress.json. It refuses to
// call a run clean on a timeout alone: a failed visit must name the API answer
// and the visible sentence that was on screen instead.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const bin = arg('bin', process.env.STYLD_PG_BIN);
const runsPerCondition = Number(arg('runs', '6'));
const cpuSlowdown = Number(arg('cpu', '4'));
const receiptPath = 'docs/readiness/beta/compare-wait-stress.json';
const rowTimeoutMs = 20000;
const receipt = {
  instrument: 'compare-wait-stress',
  conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, real Better Auth email OTP to a loopback Resend stand-in, no route interception',
  runsPerCondition, cpuSlowdown,
  commit: null, buildId: null, startedAt: new Date().toISOString(),
  conditionsRun: [], runs: [], summary: null, failures: [], browserConsole: [], serverLogTail: '',
};

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  if (!bin) throw new Error('Pass --bin <directory holding PostgreSQL 17.11 binaries>.');
  const { execFileSync } = require('node:child_process');
  receipt.commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const cluster = await startLiveCluster({ bin, label: 'compare-stress' });
  const mail = await startMailCapture();
  const appPort = await freePort();
  const base = `http://127.0.0.1:${appPort}`;
  const serverLog = [];
  const env = {
    PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
    TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
    POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
    EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'compare-stress-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
    RESEND_API_URL: mail.apiUrl,
  };
  const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(appPort)],
    { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => serverLog.push(String(chunk)));
  server.stderr.on('data', chunk => serverLog.push(String(chunk)));
  let browser;
  const teardown = async () => {
    if (browser) await browser.close().catch(() => null);
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1200));
    const cleanup = await cluster.close();
    await mail.stop().catch(() => null);
    console.log('cleanup', JSON.stringify({ dropped: cleanup.dropped, stopped: cleanup.stopped }));
  };

  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    receipt.buildId = fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim();

    // Three real provider workspaces with active services, so a two-provider
    // shortlist is comparing live rows rather than placeholders.
    const providers = [];
    for (const [index, displayName] of ['Stress QA Braider', 'Stress QA Nail Artist', 'Stress QA Stylist'].entries()) {
      const userId = randomUUID(), workspaceId = randomUUID(), serviceId = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userId, `stress-provider-${index}@example.test`, displayName]);
      await cluster.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)",
        [workspaceId, userId, 'professional', JSON.stringify({ displayName, location: 'Kilimani, Nairobi', serviceMode: index === 2 ? 'In salon' : 'House calls', specialty: 'Braids' })]);
      await cluster.owner.query('INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,$4,$5,true)',
        [serviceId, workspaceId, userId, 'Box braids', 2000 + index * 500]);
      providers.push({ userId, workspaceId, serviceId });
    }
    const shortlist = providers.slice(0, 2).map(provider => provider.workspaceId);

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', error => receipt.browserConsole.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') receipt.browserConsole.push(`console: ${message.text().slice(0, 200)}`); });
    // A signed-in page that receives a 4xx is a finding, so every one is named with its path
    // rather than left as a console line that says only that something failed.
    page.on('response', response => {
      if (response.status() < 400) return;
      (receipt.httpErrors ??= []).push({ status: response.status(), path: new URL(response.url()).pathname, at: new Date().toISOString(), signedIn: Boolean(receipt.signInCompletedAt) });
      if (receipt.httpErrors.length > 30) receipt.httpErrors.shift();
    });

    // Real sign-in: email code, captured by the loopback provider stand-in.
    await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').fill('stress-client@example.test');
    await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
    await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
    const code = await mail.waitForCode('stress-client@example.test');
    await page.getByLabel('Verification code').fill(code);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (let attempt = 0; attempt < 3; attempt++) {
      // The pathname is what matters, so a query string the product adds on first sign-in
      // cannot make an arrived visitor look like a stuck one.
      if (await page.waitForFunction(() => location.pathname === '/home', null, { timeout: 15000 }).then(() => true).catch(() => false)) break;
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true }).waitFor({ timeout: 4000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill('Stress Client');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        continue;
      }
      throw new Error(`sign-in stopped at ${new URL(page.url()).pathname}`);
    }
    receipt.signInCompletedAt = new Date().toISOString();
    // End the first-run tour the way a visitor does so it cannot colour the paint measurement.
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);

    // The plan is written through the shipped API with its own ETag precondition.
    const saved = await page.evaluate(async ids => {
      const read = await fetch('/api/plan', { cache: 'no-store' });
      const etag = read.headers.get('etag');
      const body = await read.json();
      const plan = body?.plan ?? {};
      const fields = {
        schemaVersion: 2, lookPostId: plan.lookPostId ?? null, creatorWorkspaceId: plan.creatorWorkspaceId ?? null,
        serviceIds: plan.serviceIds ?? [], preferredDate: plan.preferredDate ?? null, timeWindow: plan.timeWindow ?? null,
        serviceMode: plan.serviceMode ?? null, locationArea: plan.locationArea ?? '',
        shortlistProviderWorkspaceIds: ids, leadingChoiceProviderWorkspaceId: null,
      };
      const write = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'if-match': etag },
        body: JSON.stringify({ expectedRevision: plan.revision, plan: fields }),
      });
      const answer = await write.json().catch(() => null);
      return { getStatus: read.status, getEtag: etag, putStatus: write.status, putEtag: write.headers.get('etag'), revision: answer?.plan?.revision ?? null, error: answer?.error ?? null };
    }, shortlist);
    receipt.planWrite = saved;
    if (saved.putStatus !== 200) throw new Error(`the plan was not saved before measuring: ${JSON.stringify(saved)}`);

    const cdp = await context.newCDPSession(page);
    const condition = async (label, { cpu, network }) => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', network
        ? { offline: false, latency: network.latencyMs, downloadThroughput: network.downloadBps, uploadThroughput: network.uploadBps }
        : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const runs = [];
      for (let index = 0; index < runsPerCondition; index++) {
        const run = { condition: label, index, startedAt: new Date().toISOString() };
        let apiRequestAt = null, apiResponseAt = null, apiStatus = null, apiRevision = null, apiShortlist = null;
        const listen = response => {
          if (new URL(response.url()).pathname !== '/api/plan') return;
          apiResponseAt = Date.now();
          apiStatus = response.status();
          response.json().then(body => {
            apiRevision = body?.plan?.revision ?? null;
            apiShortlist = Array.isArray(body?.plan?.shortlistProviderWorkspaceIds) ? body.plan.shortlistProviderWorkspaceIds.length : null;
          }).catch(() => {});
        };
        const listenRequest = request => { if (new URL(request.url()).pathname === '/api/plan') apiRequestAt = Date.now(); };
        page.on('response', listen);
        page.on('request', listenRequest);
        const navigationStarted = Date.now();
        await page.goto(`${base}/compare`, { waitUntil: 'commit' });
        // The document reaching `commit` is its own phase. Measuring it separately is what
        // separates "the page never arrived" from "the page arrived and the plan was slow".
        run.commitMs = Date.now() - navigationStarted;
        const row = page.getByRole('row', { name: /Selected requirements/ }).first();
        const painted = await row.waitFor({ state: 'visible', timeout: rowTimeoutMs }).then(() => true).catch(() => false);
        run.rowsVisibleMs = painted ? Date.now() - navigationStarted : null;
        run.apiRequestMs = apiRequestAt ? apiRequestAt - navigationStarted : null;
        run.apiResponseMs = apiResponseAt ? apiResponseAt - navigationStarted : null;
        run.apiStatus = apiStatus;
        run.apiRevision = apiRevision;
        run.apiShortlist = apiShortlist;
        if (!painted) {
          run.visibleText = (await page.locator('main').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1200);
          run.statusRow = await page.locator('[role="status"], [role="alert"]').allInnerTexts().catch(() => []);
          run.probe = {
            tables: await page.locator('table[aria-label]').count().catch(() => -1),
            rowLabels: await page.locator('table[aria-label] th, table[aria-label] td > span:first-child').allInnerTexts().catch(() => []),
            bodyTextLength: (await page.locator('body').innerText().catch(() => '')).length,
            pathname: new URL(page.url()).pathname,
          };
          receipt.failures.push(run);
        }
        page.off('response', listen);
        page.off('request', listenRequest);
        runs.push(run);
        console.log(`${painted ? 'PASS' : 'FAIL'} ${label} run ${index + 1}: rows ${run.rowsVisibleMs}ms, api ${run.apiStatus} at ${run.apiResponseMs}ms, revision ${apiRevision}`);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const rowTimes = runs.filter(run => run.rowsVisibleMs !== null).map(run => run.rowsVisibleMs);
      const apiTimes = runs.filter(run => run.apiResponseMs !== null).map(run => run.apiResponseMs);
      const commitTimes = runs.map(run => run.commitMs);
      const summary = {
        label, runs: runs.length,
        painted: rowTimes.length,
        rowsMs: { p50: percentile(rowTimes, 50), p95: percentile(rowTimes, 95), max: rowTimes.length ? Math.max(...rowTimes) : null },
        commitMs: { p50: percentile(commitTimes, 50), p95: percentile(commitTimes, 95), max: commitTimes.length ? Math.max(...commitTimes) : null },
        apiMs: { p50: percentile(apiTimes, 50), p95: percentile(apiTimes, 95), max: apiTimes.length ? Math.max(...apiTimes) : null },
        apiStatuses: [...new Set(runs.map(run => run.apiStatus))],
      };
      receipt.conditionsRun.push(summary);
      receipt.runs.push(...runs);
    };

    await condition('baseline', { cpu: 1, network: null });
    await condition('kenya-3g-cpu4', { cpu: cpuSlowdown, network: { latencyMs: 350, downloadBps: Math.round((1.5 * 1024 * 1024) / 8), uploadBps: Math.round((750 * 1024) / 8) } });

    const allRowTimes = receipt.runs.filter(run => run.rowsVisibleMs !== null).map(run => run.rowsVisibleMs);
    receipt.summary = {
      visits: receipt.runs.length,
      painted: allRowTimes.length,
      failed: receipt.failures.length,
      rowsMs: { p50: percentile(allRowTimes, 50), p95: percentile(allRowTimes, 95), max: allRowTimes.length ? Math.max(...allRowTimes) : null },
      measuredThresholdMs: percentile(allRowTimes, 95) === null ? null : Math.ceil(percentile(allRowTimes, 95) * 1.5),
      rule: 'a visit is a failure only if the compare row never painted inside the bound, and then the API answer and the visible sentence are recorded instead of the timeout alone',
    };
    receipt.passedAll = receipt.failures.length === 0;
    receipt.finishedAt = new Date().toISOString();
  } finally {
    receipt.serverLogTail = serverLog.join('').slice(-2000);
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    await teardown();
  }
  console.log('summary', JSON.stringify(receipt.summary));
  if (!receipt.passedAll) process.exitCode = 1;
}

main().catch(async error => {
  receipt.error = String(error.message || error).slice(0, 800);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log('FAILED', receipt.error);
  process.exitCode = 1;
});
