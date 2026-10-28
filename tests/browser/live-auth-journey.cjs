// Real signed-in browser QA: production Next server, owned disposable PostgreSQL,
// real Better Auth OTP through a loopback mail stand-in. No route interception.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID, createHmac } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = 'docs/readiness/beta/live-auth-journey.json';
const results = [];
const stages = [];
function mark(text) { stages.push(`${new Date().toISOString()} ${text}`); console.log(`  [stage] ${text}`); }

// Nothing in this harness may wait forever. A step that outruns its budget is reported
// as a hang, which is a reliability finding about the product, not a test artefact.
const STEP_BUDGET_MS = Number(process.env.STYLD_STEP_BUDGET_MS || 240000);
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} did not finish within ${ms}ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

async function step(name, run) {
  try {
    await withTimeout(run(), STEP_BUDGET_MS, `journey step "${name}"`);
    results.push({ name, status: 'pass' }); console.log(`PASS ${name}`);
  }
  catch (error) {
    const message = String(error.message || error).split('\n')[0].slice(0, 300);
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 700) });
    console.log(`FAIL ${name}: ${message}`);
    // A step that ran out its budget is a product hang, so the database is sampled while the
    // hang is still standing. Without this the finding would be an inference.
    if (message.includes('did not finish within')) await snapshotActivity(`timeout in "${name}"`);
  }
}

// Session evidence from the owned cluster, taken on an interval and again at any step timeout.
// An "idle in transaction" runtime session that a later request is queued behind is the
// difference between a slow test and a real reliability defect in the product.
const activity = [];
async function snapshotActivity(tag) {
  if (!clusterHandle) return;
  try {
    const rows = (await clusterHandle.owner.query(
      `SELECT a.pid, a.usename, a.state, a.wait_event_type, a.wait_event,
              round(extract(epoch FROM now() - a.state_change)::numeric, 1) AS seconds_in_state,
              pg_blocking_pids(a.pid) AS blocked_by,
              left(regexp_replace(coalesce(a.query, ''), '\\s+', ' ', 'g'), 160) AS query
         FROM pg_stat_activity a
        WHERE a.datname = current_database() AND a.pid <> pg_backend_pid()
        ORDER BY a.state_change`)).rows;
    const sample = {
      tag, at: new Date().toISOString(),
      sessions: rows.map(row => ({
        pid: row.pid, role: row.usename, state: row.state, wait: [row.wait_event_type, row.wait_event].filter(Boolean).join(':'),
        secondsInState: Number(row.seconds_in_state), blockedBy: row.blocked_by, query: row.query,
      })),
    };
    activity.push(sample);
    if (activity.length > 80) activity.shift();
    const idle = sample.sessions.filter(row => row.state === 'idle in transaction');
    const blocked = sample.sessions.filter(row => row.blockedBy.length > 0);
    console.log(`  [db] ${tag}: ${sample.sessions.length} sessions, ${idle.length} idle in transaction, ${blocked.length} blocked${idle.length ? ` (pids ${idle.map(row => row.pid).join(', ')})` : ''}`);
  }
  catch (error) { console.log(`  [db] ${tag}: sample failed ${String(error.name || error)}`); }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// A page-side request that never answers is a finding about the product, so every probe is
// bounded inside the page and reports the stall instead of spending the whole step budget.
// The evaluate call itself is bounded too, because Playwright gives page.evaluate no timeout.
async function fetchInPage(page, request, ms = 45000) {
  const evaluate = page.evaluate(async ({ request, ms }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const response = await fetch(request.url, {
        method: request.method || 'GET', headers: request.headers, body: request.body, cache: 'no-store', signal: controller.signal,
      });
      return { status: response.status, body: await response.json().catch(() => null), stalled: false };
    }
    catch { return { status: 0, body: null, stalled: true }; }
    finally { clearTimeout(timer); }
  }, { request, ms });
  try {
    return await withTimeout(evaluate, ms + 15000, `page request ${request.url}`);
  }
  catch {
    // The page never answered the evaluate at all, which is a different fault from a slow
    // response, so it is reported in the same shape and the caller takes the diagnostics.
    return { status: 0, body: null, stalled: true, evaluateHung: true };
  }
}

async function signIn(page, mail, email, name) {
  const authLog = [];
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/auth')) authLog.push(`${new URL(response.url()).pathname} ${response.status()}`); });
  await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(email);
  await resetRateLimits();
  await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
  if (!await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) {
    const alert = await page.getByRole('alert').first().textContent().catch(() => '');
    throw new Error(`no code was offered. Alert: "${(alert || '').trim()}". Auth calls: ${authLog.join(', ')}`);
  }
  const code = await mail.waitForCode(email);
  await page.getByLabel('Verification code').fill(code);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.waitForURL('**/home', { timeout: 15000 }).then(() => true).catch(() => false)) return;
    if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
      .waitFor({ timeout: 4000 }).then(() => true).catch(() => false)) {
      await page.getByLabel('Preferred name').fill(name);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    const alert = await page.getByRole('alert').first().textContent().catch(() => '');
    throw new Error(`sign-in stopped at ${new URL(page.url()).pathname}. Alert: "${(alert || '').trim()}". Auth calls: ${authLog.join(', ') || 'none'}`);
  }
  throw new Error('sign-in needed more than three steps.');
}

// The rate limiters keep state in two tables: Better Auth buckets that cannot resolve a
// client IP fall back to one shared bucket per path, and the sign-in cooldown lives in
// auth_rate_limits. The harness owner clears both between identities to test each journey
// fresh, exactly as the committed PostgreSQL suites reset the limiter.
let clusterHandle = null;
async function resetRateLimits() {
  await clusterHandle.owner.query('DELETE FROM auth_limits');
  await clusterHandle.owner.query('DELETE FROM auth_rate_limits');
}

// The first-run tour paints a full-viewport spotlight overlay, so a visitor has to end it
// before the controls underneath are reachable. The harness does what a visitor does: press
// Escape, and if that leaves the dialog standing use the visible Skip control. What happened
// is recorded instead of the overlay being removed from the DOM by the test.
// The receipt also carries the storage keys the page actually wrote. A tour that repeats is
// only a defect if the identity and scope behind the key are the same, so without the key the
// evidence cannot tell a second workspace from a lost dismissal.
const tourFindings = [];
const tourKeys = page => page.evaluate(() => Object.keys(window.localStorage)
  .filter(key => key.startsWith('styld:onboarding:v2:')).sort());
async function dismissTour(page) {
  const dialog = page.locator('div[role="dialog"][data-tour-status="running"]');
  const spotlight = page.locator('svg rect[mask*="spotlight"]');
  let running = false;
  for (let attempt = 0; attempt < 30 && !running; attempt++) {
    running = await dialog.first().isVisible().catch(() => false);
    if (!running) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!running) return;
  const finding = { path: new URL(page.url()).pathname, keysBefore: await tourKeys(page), dismissedBy: null, overlayRemains: true };
  await page.keyboard.press('Escape');
  if (await dialog.first().waitFor({ state: 'detached', timeout: 5000 }).then(() => true).catch(() => false)) finding.dismissedBy = 'escape';
  else {
    const skip = page.getByRole('button', { name: /^skip$/i }).first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ timeout: 5000 }).catch(() => {});
      finding.dismissedBy = 'skip button';
    } else {
      finding.dismissedBy = 'no user-reachable dismiss control';
      finding.dialogRemains = await dialog.first().isVisible().catch(() => false);
    }
  }
  finding.overlayRemains = await spotlight.first().isVisible().catch(() => false);
  finding.keysAfter = await tourKeys(page);
  finding.storedValues = await page.evaluate(names => Object.fromEntries(
    names.map(key => [key, window.localStorage.getItem(key)])), finding.keysAfter);
  // A visitor judges a tour by whether it comes back, so the dismissal is re-tested the way a
  // visitor would: reload the page that showed it and look for the overlay again.
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  finding.reopenedAfterReload = await dialog.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  finding.keysAfterReload = await tourKeys(page);
  tourFindings.push(finding);
  if (finding.overlayRemains) throw new Error(`the first-run tour overlay is still standing after ${finding.dismissedBy}`);
  if (finding.reopenedAfterReload) throw new Error(`the dismissed first-run tour returned after a reload at ${finding.path} under the same keys ${JSON.stringify(finding.keysAfterReload)}`);
}

// The harness records how long a gated control stays disabled and whether a real pointer
// click lands. If the browser cannot land the click the reason is kept and the control is
// activated in the DOM, so the journey still proves the server behaviour.
const clickFindings = [];
async function activate(page, locator, label) {
  const target = locator.first();
  const started = Date.now();
  let enabledMs = null;
  for (let attempt = 0; attempt < 250; attempt++) {
    if (await target.isEnabled().catch(() => false)) { enabledMs = Date.now() - started; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const finding = { label, enabledMs };
  const box = await target.boundingBox().catch(() => null);
  if (box) {
    finding.centerElement = await page.evaluate(([x, y]) => {
      const element = document.elementFromPoint(x, y);
      if (!element) return null;
      const path = [];
      let node = element;
      while (node && path.length < 3) { path.push(`${node.tagName.toLowerCase()}${node.getAttribute('aria-label') ? `[${node.getAttribute('aria-label')}]` : ''}.${(node.className || '').toString().split(' ')[0]}`); node = node.parentElement; }
      return path.join(' < ');
    }, [box.x + box.width / 2, box.y + box.height / 2]).catch(() => null);
  }
  try {
    await target.click({ timeout: 8000 });
    finding.click = 'direct';
  } catch (error) {
    const strip = line => line.split(String.fromCharCode(27)).join('').replace(/\[\d+m/g, '').trim();
    const detail = String(error.message || error).split('\n').map(strip).filter(Boolean);
    finding.actionability = detail.slice(-6).join(' | ').slice(0, 500);
    // A browser-level tap at the element centre is what a real finger does. It is used
    // instead of a synthetic DOM click so an overlay that steals taps cannot hide itself.
    if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); finding.click = 'center tap'; }
    else { await target.evaluate(element => element.click()); finding.click = 'dom fallback'; }
  }
  clickFindings.push(finding);
}

let base = '';

// The harness holds the real setup key only for the moment it needs it, exactly as a
// reviewer authenticator app would. It generates a live RFC 6238 code for the running
// 30 second window instead of reading one out of the database.
function totpCode(base32Secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32Secret.toUpperCase().replace(/[\s-]/g, '');
  let bits = 0, value = 0;
  const bytes = [];
  for (const character of clean) {
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String(((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)).padStart(6, '0');
}

(async () => {
  const cluster = await startLiveCluster({ bin, label: 'live-auth-journey' });
  clusterHandle = cluster;
  let mail;
  let server;
  let browser;
  const serverLog = [];
  let cleanedUp = false;
  const activityTimer = setInterval(() => { void snapshotActivity('interval'); }, 15000);
  activityTimer.unref();
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(activityTimer);
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    fs.mkdirSync(path.dirname('docs/readiness/beta'), { recursive: true });
    fs.writeFileSync('docs/readiness/beta/live-app-cleanup.json', JSON.stringify({ ...cleanup, serverLogTail: serverLog.slice(-4).join('').slice(-1200) }, null, 2));
    console.log('cleanup', JSON.stringify(cleanup));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }
  try {
    mail = await startMailCapture();
    const appPort = await freePort();
    base = `http://127.0.0.1:${appPort}`;
    const environment = {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
      POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
      EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'live-qa-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
      RESEND_API_URL: mail.apiUrl,
    };
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(appPort)],
      { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => serverLog.push(String(chunk)));
    server.stderr.on('data', chunk => serverLog.push(String(chunk)));
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Synthetic creators and one canonical Look, written by the harness owner role.
    const seed = [];
    for (const [index, displayName] of ['Live QA Braider', 'Live QA Nail Artist', 'Live QA Salon'].entries()) {
      const userId = randomUUID(), workspaceId = randomUUID(), serviceId = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userId, `live-creator-${index}@example.test`, displayName]);
      await cluster.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)",
        [workspaceId, userId, index === 2 ? 'salon' : 'professional', JSON.stringify({ displayName, location: 'Kilimani, Nairobi', serviceMode: index === 2 ? 'In salon' : 'House calls', specialty: 'Braids' })]);
      await cluster.owner.query('INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,$4,$5,true)',
        [serviceId, workspaceId, userId, 'Box braids', 2000 + index * 500]);
      const postId = randomUUID();
      await cluster.owner.query(`INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
        VALUES($1,$2,$3,$4,$5,'portfolio','Disposable live QA look only',ARRAY[$6]::text[],ARRAY[]::text[],'public','published','visible')`,
        [postId, userId, workspaceId, displayName, index === 2 ? 'salon' : 'professional', `svc:${serviceId}`]);
      seed.push({ userId, workspaceId, serviceId, postId });
    }

    // Two Looks genuinely awaiting review, so the administrator journey has real work to do.
    const pendingPosts = [];
    for (const creator of seed.slice(0, 2)) {
      const postId = randomUUID();
      await cluster.owner.query(`INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
        VALUES($1,$2,$3,'Live QA Braider','professional','portfolio','Disposable pending live QA look',$4,ARRAY[]::text[],'public','pending','visible')`,
        [postId, creator.userId, creator.workspaceId, [`svc:${creator.serviceId}`]]);
      pendingPosts.push(postId);
    }

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const errors = [];
    // Only third-party asset hosts are blocked so the run never depends on the public
    // internet. Every application route, API and database write is the real thing.
    const blockedHosts = [];
    const newContext = async options => {
      const context = await browser.newContext(options);
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        blockedHosts.push(host);
        return route.abort();
      });
      return context;
    };

    await step('a guest reaches the feed and private activity returns to sign-in with the original target', async () => {
      const context = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`guest pageerror: ${error.message}`));
      await page.goto(`${base}/discover?tab=looks`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      assert.equal(new URL(page.url()).pathname, '/discover');
      const guestMe = await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then(response => response.status));
      assert.equal(guestMe, 401, 'a guest API read is refused by the server');
      await page.goto(`${base}/activity`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/auth/sign-in**');
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), '/activity');
      await context.close();
    });

    const clientA = { email: 'live-client-a@example.test', name: 'Amina A' };
    const clientB = { email: 'live-client-b@example.test', name: 'Bryan B' };
    let contextA, workspaceA = null;

    await step('a first-time visitor signs in with a real emailed code and gets a server session', async () => {
      contextA = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await contextA.newPage();
      page.on('pageerror', error => errors.push(`client A pageerror: ${error.message}`));
      await resetRateLimits();
      await signIn(page, mail, clientA.email, clientA.name);
      const cookies = await contextA.cookies(base);
      const session = cookies.find(cookie => cookie.name === 'session');
      assert.ok(session, 'the session cookie is stored');
      assert.equal(session.httpOnly, true);
      assert.equal(session.sameSite, 'Lax');
      const stored = await cluster.owner.query('SELECT id FROM users WHERE email=$1', [clientA.email]);
      assert.equal(stored.rowCount, 1, 'the account exists in the database');
      const workspaces = await cluster.owner.query("SELECT id, role FROM identity_workspaces WHERE user_id=$1", [stored.rows[0].id]);
      assert.deepEqual(workspaces.rows.map(row => row.role), ['client'], 'sign-in provisions exactly one client workspace');
      workspaceA = workspaces.rows[0].id;
      const me = await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then(async response => ({ status: response.status, body: await response.json() })));
      assert.equal(me.status, 200);
      assert.equal(me.body.ok, true);
      assert.equal(me.body.user.id, stored.rows[0].id, 'the server returns the signed-in account');
      assert.equal(me.body.user.workspaceId, workspaceA);
      assert.equal(me.body.user.role, 'client');
      assert.ok(!JSON.stringify(me.body).includes(clientA.email), 'the signed-in profile response never repeats the email address');
      await dismissTour(page);
      await page.close();
    });

    await step('a wrong code is refused and the account stays signed out', async () => {
      const context = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await resetRateLimits();
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill('live-typo@example.test');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor();
      await page.getByLabel('Verification code').fill('000000');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('alert').first().waitFor();
      assert.equal(await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then(response => response.status)), 401);
      const sessionRows = await cluster.owner.query('SELECT count(*) AS n FROM auth_sessions');
      assert.equal(Number(sessionRows.rows[0].n), 1, 'only the real session exists');
      await context.close();
    });

    // A missing comparison row can mean an unwritten shortlist, a plan the server holds
    // but the browser never loaded, or simply a slow render. The receipt records which of
    // those it is, straight from the database row and the same API the page reads, so the
    // finding is a fact rather than an inference from a timeout.
    const planFindings = [];
    async function savedPlanState(page, workspaceId, label) {
      const stored = await cluster.owner.query(
        "SELECT profile->'activePlan'->'shortlistProviderWorkspaceIds' AS shortlist, profile->'activePlan'->>'revision' AS revision FROM identity_workspaces WHERE id=$1",
        [workspaceId]);
      const asBrowser = await page.evaluate(async () => {
        const response = await fetch('/api/plan', { cache: 'no-store' });
        const body = await response.json().catch(() => null);
        return { status: response.status, shortlist: body?.plan?.shortlistProviderWorkspaceIds ?? null, error: body?.error ?? null };
      });
      const shown = await page.locator('main').innerText().catch(() => '');
      const finding = { at: label, storedShortlist: stored.rows[0]?.shortlist ?? null, storedRevision: stored.rows[0]?.revision ?? null,
        apiStatus: asBrowser.status, apiShortlist: asBrowser.shortlist, apiError: asBrowser.error, pageShows: shown.replace(/\s+/g, ' ').slice(0, 240) };
      planFindings.push(finding);
      return finding;
    }

    await step('shortlisting two real providers persists in that workspace and renders in Compare', async () => {
      const page = await contextA.newPage();
      for (const creator of seed.slice(0, 2)) {
        await page.goto(`${base}/creators/${creator.workspaceId}`, { waitUntil: 'domcontentloaded' });
        await dismissTour(page);
        const name = creator.workspaceId === seed[0].workspaceId ? 'Live QA Braider' : 'Live QA Nail Artist';
        await activate(page, page.getByRole('button', { name: `Shortlist ${name}`, exact: true }), `creator page shortlist (${name})`);
        await page.getByRole('button', { name: `Remove ${name}`, exact: true }).first().waitFor();
      }
      await page.goto(`${base}/compare`, { waitUntil: 'domcontentloaded' });
      await dismissTour(page);
      await page.getByRole('heading', { name: 'Compare your choices', exact: true }).waitFor();
      try {
        await page.getByRole('row', { name: /Selected requirements/ }).waitFor();
      } catch (error) {
        const state = await savedPlanState(page, workspaceA, 'the comparison rows never appeared');
        throw new Error(`no comparison rows at /compare, saved plan held ${JSON.stringify(state)}`, { cause: error });
      }
      assert.equal(await page.getByRole('cell', { name: /Live QA Braider, Listed price/ }).count(), 1);
      const profile = await cluster.owner.query("SELECT profile->'activePlan' AS plan FROM identity_workspaces WHERE id=$1", [workspaceA]);
      const plan = profile.rows[0].plan;
      assert.deepEqual(plan.shortlistProviderWorkspaceIds.slice().sort(), [seed[0].workspaceId, seed[1].workspaceId].sort());
      assert.equal(Number(plan.revision) > 0, true, 'the server assigned a revision');
      await page.close();
    });

    await step('saving a Look is private and durable in the database', async () => {
      const page = await contextA.newPage();
      await page.goto(`${base}/looks/${seed[0].postId}`, { waitUntil: 'domcontentloaded' });
      await dismissTour(page);
      await activate(page, page.getByRole('button', { name: 'Save look', exact: true }), 'canonical look save');
      await page.getByRole('button', { name: 'Unsave look', exact: true }).waitFor();
      const profile = await cluster.owner.query("SELECT profile->'savedPostIds' AS saved FROM identity_workspaces WHERE id=$1", [workspaceA]);
      assert.deepEqual(profile.rows[0].saved, [seed[0].postId]);
      await page.reload();
      await page.getByRole('button', { name: 'Unsave look', exact: true }).waitFor();
      await page.close();
    });

    let contextB;
    await step('a second signed-in account cannot read the first account plan or saves', async () => {
      contextB = await newContext({ viewport: { width: 1366, height: 900 } });
      const page = await contextB.newPage();
      await resetRateLimits();
      await signIn(page, mail, clientB.email, clientB.name);
      const scoped = await page.evaluate(async otherWorkspace => {
        const plan = await fetch(`/api/plan?workspace=${otherWorkspace}`, { cache: 'no-store' });
        const planBody = await plan.json().catch(() => null);
        const saves = await fetch('/api/social/saves', { cache: 'no-store' });
        const savesBody = await saves.json().catch(() => null);
        return { planStatus: plan.status, planBody, savesStatus: saves.status, savesBody };
      }, workspaceA);
      assert.equal(scoped.planStatus, 200);
      // A creator workspace id is public information, so the leak test targets the private
      // plan itself: B must receive an empty shortlist even when asking for A's workspace.
      const shortlist = scoped.planBody?.plan?.shortlistProviderWorkspaceIds ?? null;
      assert.deepEqual(shortlist, [], 'the server never returns another account shortlist, even when its workspace id is supplied');
      assert.notEqual(scoped.planBody?.scopeKey?.includes(workspaceA), true, 'the response is scoped to the caller own workspace');
      assert.equal(scoped.savesStatus, 200);
      assert.deepEqual(scoped.savesBody.savedPostIds ?? scoped.savesBody.saves ?? [], [], 'a new account has no saves');
      const bUser = (await cluster.owner.query('SELECT id FROM users WHERE email=$1', [clientB.email])).rows[0];
      const bWorkspace = (await cluster.owner.query("SELECT id, profile->'activePlan' AS plan FROM identity_workspaces WHERE user_id=$1 AND role='client'", [bUser.id])).rows[0];
      assert.deepEqual(bWorkspace.plan?.shortlistProviderWorkspaceIds ?? [], [], 'the second account database row holds no borrowed plan');
      await page.close();
    });

    await step('an unauthenticated request with a stolen cookie string cannot forge a session', async () => {
      const context = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${base}/discover`, { waitUntil: 'domcontentloaded' });
      const forged = await page.evaluate(async () => {
        const response = await fetch('/api/me', { cache: 'no-store', headers: { cookie: 'session=not-a-real-token' } });
        return response.status;
      });
      assert.equal(forged, 401);
      const plain = await fetch(`${base}/api/me`, { headers: { cookie: 'session=not-a-real-token' } });
      assert.equal(plain.status, 401);
      await context.close();
    });

    await step('revoking the session row in the database signs the live browser out', async () => {
      const user = (await cluster.owner.query('SELECT id FROM users WHERE email=$1', [clientA.email])).rows[0];
      await cluster.owner.query('DELETE FROM auth_sessions WHERE "userId"=$1', [user.id]);
      const page = await contextA.newPage();
      await page.goto(`${base}/discover`, { waitUntil: 'domcontentloaded' });
      const status = await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then(response => response.status));
      assert.equal(status, 401, 'authorization is decided by the database, not the cookie alone');
      await page.close();
    });

    await step('signing out ends the server session for the other account', async () => {
      const page = await contextB.newPage();
      await page.goto(`${base}/account`, { waitUntil: 'domcontentloaded' });
      await dismissTour(page);
      await activate(page, page.getByRole('button', { name: 'Sign out', exact: true }), 'sign out control');
      const deadline = Date.now() + 20000;
      let status = 200;
      while (Date.now() < deadline) {
        status = await page.evaluate(() => fetch('/api/me', { cache: 'no-store' }).then(response => response.status)).catch(() => 0);
        if (status === 401) break;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      assert.equal(status, 401, 'the signed-in cookie no longer authorises anything');
      const remaining = await cluster.owner.query('SELECT count(*) AS n FROM auth_sessions');
      assert.equal(Number(remaining.rows[0].n), 0, 'no live session row survives sign-out');
      await page.close();
    });

    // The reviewer account is created the way the product creates one (real OTP sign-in),
    // then the owner role grant is written by the harness owner, as the committed
    // PostgreSQL suite does. The MFA factor itself is set up and verified through the real
    // application screens with a live time-based code.
    const reviewer = { email: 'live-reviewer@example.test', name: 'QA Reviewer' };
    let reviewerId = null, contextReviewer = null, adminProbe = null;

    await step('an administrator sets up a real second factor and clears the server review queue', async () => {
      const context = await newContext({ viewport: { width: 1366, height: 900 } });
      contextReviewer = context;
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`admin pageerror: ${error.message}`));
      await resetRateLimits();
      await signIn(page, mail, reviewer.email, reviewer.name);
      reviewerId = (await cluster.owner.query('SELECT id FROM users WHERE email=$1', [reviewer.email])).rows[0].id;
      await cluster.owner.query("INSERT INTO user_roles(user_id,role) VALUES($1,'super_admin')", [reviewerId]);
      await dismissTour(page);

      await page.goto(`${base}/auth/mfa`, { waitUntil: 'domcontentloaded' });
      await activate(page, page.getByRole('button', { name: 'Set up authenticator', exact: true }), 'authenticator setup control');
      const secret = (await page.locator('code').first().innerText()).trim();
      // assert.ok is used deliberately: assert.match would copy the setup key into the receipt.
      assert.ok(/^[A-Z2-7]{16,}$/i.test(secret), 'the application offered a real base32 setup key');
      await page.getByLabel('Authenticator code').fill(totpCode(secret));
      await page.getByRole('button', { name: 'Verify', exact: true }).click();
      // The first successful verification hands out single-use recovery codes, so the
      // reviewer confirms they are saved before continuing into the admin console.
      await page.getByText('Save these recovery codes privately').waitFor({ timeout: 20000 });
      const recoveryCodes = (await page.locator('pre').first().innerText()).trim().split(/\s+/);
      assert.equal(recoveryCodes.length, 8, 'the application issued single-use recovery codes');
      await page.getByRole('link', { name: /I saved my codes/ }).click();
      await page.waitForURL('**/admin/security', { timeout: 20000 });
      const factor = await cluster.owner.query('SELECT enabled, encrypted_secret FROM auth_totp WHERE user_id=$1', [reviewerId]);
      assert.equal(factor.rows[0].enabled, true, 'the second factor is enabled on the account');
      assert.ok(!String(factor.rows[0].encrypted_secret).includes(secret), 'the setup key is stored encrypted, never as plaintext');

      await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' });
      await dismissTour(page);
      await page.getByRole('heading', { name: 'Community review queue', exact: true }).waitFor();
      await page.getByRole('listitem').filter({ hasText: 'Disposable pending live QA look' }).first().waitFor();
      await resetRateLimits();
      const queueLoad = await page.evaluate(() => fetch('/api/admin/moderation', { cache: 'no-store' }).then(async response => ({ status: response.status, body: await response.json() })));
      assert.equal(queueLoad.status, 200);
      assert.equal(queueLoad.body.posts.length, 2, 'the queue is the real pending rows from the database');

      await activate(page, page.getByRole('listitem').filter({ hasText: 'Disposable pending live QA look' }).first()
        .getByRole('button', { name: 'Approve', exact: true }), 'approve decision');
      await page.getByText('Published. The decision is recorded').waitFor();
      await page.getByRole('listitem').filter({ hasText: 'Disposable pending live QA look' }).first().waitFor({ timeout: 5000 }).catch(() => {});

      const rejectRow = page.getByRole('listitem').filter({ hasText: 'Disposable pending live QA look' }).first();
      await rejectRow.getByLabel('Reason for rejecting').fill('Synthetic fixture for live QA');
      await activate(page, rejectRow.getByRole('button', { name: 'Reject', exact: true }), 'reject decision');
      await page.getByText('Rejected. The decision is recorded').waitFor();

      const decided = await cluster.owner.query('SELECT id, publication_status FROM social_posts WHERE id = ANY($1::uuid[]) ORDER BY publication_status', [pendingPosts]);
      assert.equal(decided.rowCount, 2, 'both seeded pending rows were decided');
      assert.deepEqual(decided.rows.map(row => row.publication_status), ['published', 'rejected']);
      const audit = await cluster.owner.query("SELECT event, user_id, details FROM security_events WHERE event IN ('moderation_approve','moderation_reject') ORDER BY event");
      assert.deepEqual(audit.rows.map(row => row.event).sort(), ['moderation_approve', 'moderation_reject']);
      assert.deepEqual([...new Set(audit.rows.map(row => row.user_id))], [reviewerId], 'the audit trail names the reviewer');
      assert.ok(audit.rows.some(row => row.event === 'moderation_reject' && String(row.details.reason || '').includes('Synthetic fixture')), 'the reason is kept in the audit record');
      const after = await page.evaluate(() => fetch('/api/admin/moderation', { cache: 'no-store' }).then(response => response.json()));
      assert.equal(after.posts.length, 0, 'the queue is empty once the real rows are decided');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Nothing is awaiting review on this environment').waitFor();
      await page.close();
    });

    await step('a signed-in client without an administrator grant is refused the admin console by the server', async () => {
      const contextClient = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await contextClient.newPage();
      page.on('pageerror', error => errors.push(`client C pageerror: ${error.message}`));
      await resetRateLimits();
      await signIn(page, mail, 'live-client-c@example.test', 'Chelag C');
      const read = async () => page.evaluate(async () => {
        const me = await fetch('/api/me', { cache: 'no-store' });
        const queue = await fetch('/api/admin/moderation', { cache: 'no-store' });
        return { meStatus: me.status, queueStatus: queue.status, queueBody: await queue.json().catch(() => null) };
      });
      const beforeAdmin = await read();
      await page.goto(`${base}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/unauthorized**', { timeout: 15000 });
      assert.equal(new URL(page.url()).pathname, '/unauthorized', 'the shell never renders for a non-admin');
      await resetRateLimits();
      const limiterBefore = (await cluster.owner.query('SELECT key, count FROM auth_limits ORDER BY key')).rows;
      const cookieList = (await contextClient.cookies(base)).map(cookie => cookie.name);
      const afterAdmin = await read();
      const limiterAfter = (await cluster.owner.query('SELECT key, count FROM auth_limits ORDER BY key')).rows;
      const sessionRows = await cluster.owner.query('SELECT count(*) AS n FROM auth_sessions');
      adminProbe = { limiterBefore, limiterAfter, cookieList, beforeAdmin, afterAdmin, sessions: Number(sessionRows.rows[0].n) };
      assert.equal(beforeAdmin.meStatus, 200, `the client holds a live session before touching the admin route (cookies ${cookieList.join(',') || 'none'})`);
      assert.equal(beforeAdmin.queueStatus, 403, `the review queue API refuses a client session (got ${beforeAdmin.queueStatus} ${JSON.stringify(beforeAdmin.queueBody).slice(0, 160)})`);
      assert.ok(!JSON.stringify(beforeAdmin.queueBody).includes('Disposable pending'), 'no pending review content is disclosed');
      await page.close();
    });

    await step('a real applicant submits provider and salon workspaces, an administrator approves them, and the applicant switches into the granted workspace', async () => {
      mark('applicant: opening a browser context');
      const contextD = await newContext({ viewport: { width: 390, height: 844 } });
      const applicant = await contextD.newPage();
      applicant.on('pageerror', error => errors.push(`applicant pageerror: ${error.message}`));
      await resetRateLimits();
      await signIn(applicant, mail, 'live-applicant@example.test', 'Amina B');
      await dismissTour(applicant);
      const applicantRow = (await cluster.owner.query('SELECT id FROM users WHERE email=$1', ['live-applicant@example.test'])).rows[0];
      mark('applicant: signed in');

      for (const role of ['professional', 'salon']) {
        mark(`applicant: opening onboarding for ${role}`);
        await applicant.goto(`${base}/onboarding/${role}`, { waitUntil: 'domcontentloaded' });
        await dismissTour(applicant);
        await applicant.getByLabel('Professional or business name').fill(role === 'salon' ? 'Live QA Salon Window' : 'Amina Braids');
        await applicant.getByLabel('Services, location and experience').fill('Knotless braids and cornrows, Kilimani, six years');
        await applicant.getByLabel('Contact for verification').fill('+254 700 000 000');
        await activate(applicant, applicant.getByRole('button', { name: 'Submit for review', exact: true }), `${role} workspace application submit`);
        await applicant.waitForURL('**/workspace/application**', { timeout: 20000 });
        mark(`applicant: ${role} application submitted through the form`);
      }
      const applications = await cluster.owner.query("SELECT role, status FROM workspace_applications WHERE user_id=$1 ORDER BY role", [applicantRow.id]);
      assert.deepEqual(applications.rows, [{ role: 'professional', status: 'pending' }, { role: 'salon', status: 'pending' }], 'both applications wait for review');
      const beforeApproval = await cluster.owner.query("SELECT count(*) AS n FROM identity_workspaces WHERE user_id=$1 AND role IN ('professional','salon')", [applicantRow.id]);
      assert.equal(Number(beforeApproval.rows[0].n), 0, 'an application alone never grants a provider workspace');

      mark('review: opening a page in the reviewer context');
      const reviewerPage = await contextReviewer.newPage();
      reviewerPage.on('pageerror', error => errors.push(`reviewer pageerror: ${error.message}`));
      await reviewerPage.goto(`${base}/admin/security`, { waitUntil: 'domcontentloaded' });
      await dismissTour(reviewerPage);
      await reviewerPage.getByText('Amina Braids').first().waitFor({ timeout: 15000 });
      await reviewerPage.getByLabel('Reason for administrative action').fill('Contact and portfolio reviewed in QA');
      mark('review: reason entered, approving the first application');
      const approvals = reviewerPage.getByRole('button', { name: 'Approve workspace', exact: true });
      assert.equal(await approvals.count(), 2, 'the queue lists both pending applications');
      await activate(reviewerPage, approvals.nth(0), 'first workspace approval control');
      await reviewerPage.getByText('Live QA Salon Window').first().waitFor({ timeout: 15000 });
      await activate(reviewerPage, approvals.first(), 'second workspace approval control');
      await reviewerPage.getByText('No applications awaiting review.').waitFor({ timeout: 15000 });
      mark('review: both applications approved in the UI');
      mark('review: reading the application rows');
      const approved = await cluster.owner.query("SELECT role, status, reviewed_by FROM workspace_applications WHERE user_id=$1 ORDER BY role", [applicantRow.id]);
      assert.deepEqual(approved.rows.map(row => row.status), ['approved', 'approved'], 'both applications are recorded as approved');
      assert.deepEqual([...new Set(approved.rows.map(row => row.reviewed_by))], [reviewerId], 'the audit names the reviewer who approved');
      const granted = await cluster.owner.query("SELECT id, role, status FROM identity_workspaces WHERE user_id=$1 AND role <> 'client' ORDER BY role", [applicantRow.id]);
      assert.deepEqual(granted.rows.map(row => ({ role: row.role, status: row.status })), [{ role: 'professional', status: 'active' }, { role: 'salon', status: 'active' }], 'approval provisions the real workspaces');

      mark('switch: opening the workspace switcher from settings');
      await snapshotActivity('baseline before the first workspace switch');
      for (const role of ['professional', 'salon']) {
        // Choosing a workspace reloads the page, so a person has to open the switcher again for
        // the next change. The harness follows that path instead of assuming the button survives.
        await applicant.goto(`${base}/settings/workspaces`, { waitUntil: 'domcontentloaded' });
        await dismissTour(applicant);
        await applicant.getByRole('button', { name: role, exact: true }).waitFor({ state: 'visible', timeout: 20000 });
        await activate(applicant, applicant.getByRole('button', { name: role, exact: true }), `${role} workspace switch`);
        await applicant.waitForURL('**/home', { timeout: 20000 });
        mark(`switch: ${role} switch accepted, arrived at ${new URL(applicant.url()).pathname}`);
        mark(`switch: reading /api/me as ${role}`);
        const startedAt = Date.now();
        const me = await fetchInPage(applicant, { url: '/api/me' });
        const elapsed = Date.now() - startedAt;
        mark(`switch: /api/me returned ${me.status} after ${elapsed}ms as ${role}`);
        if (me.stalled || me.status !== 200 || !me.body) {
          // A trivial evaluate answers only if the page's own thread is free, so this separates
          // a stalled server handler from a client that stopped responding after the switch.
          const responsive = await withTimeout(applicant.evaluate(() => document.readyState), 8000, 'responsiveness probe')
            .then(() => true).catch(() => false);
          await snapshotActivity(`/api/me ${me.stalled ? 'stalled' : `answered ${me.status}`} after the ${role} switch`);
          throw new Error(`reading /api/me after the ${role} switch ${me.stalled ? (me.evaluateHung ? 'never reached the page thread within 60s' : 'never answered within 45s') : `returned HTTP ${me.status}`}, ${elapsed}ms, page ${responsive ? 'responsive' : 'unresponsive to a trivial evaluate'}, body ${JSON.stringify(me.body).slice(0, 160)}`);
        }
        const user = me.body.user;
        assert.equal(user.role, role, `the server session now carries the ${role} workspace`);
        assert.ok(granted.rows.some(row => row.role === role), 'the granted workspace matches the database');
        assert.equal(user.workspaceId, (granted.rows.find(row => row.role === role) || {}).id ?? user.workspaceId);

        // The profile a provider reaches after approval is part of the journey, not a separate
        // demo, so it is opened here while the switch is proven. The deferred salon team
        // surface must not be offered to a real signed-in workspace.
        mark(`profile: opening /profile as ${role}`);
        await applicant.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
        await dismissTour(applicant);
        const workspaceName = role === 'salon' ? 'Live QA Salon Window' : 'Amina Braids';
        const profileVisible = await applicant.getByText(workspaceName).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
        const profileText = (await applicant.locator('main').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
        if (!profileVisible) {
          const state = await fetchInPage(applicant, { url: '/api/me' });
          throw new Error(`/profile as ${role} never showed the ${role} workspace "${workspaceName}"; /api/me answered ${state.status} with ${JSON.stringify(state.body?.user ?? state.body).slice(0, 200)}; page text: ${profileText}`);
        }
        assert.equal(await applicant.getByRole('button', { name: 'Team', exact: true }).count(), 0, `a ${role} profile offers no salon team tab`);
        assert.ok(!/Your team|Prototype only/i.test(profileText), `a ${role} profile renders no team panel: ${profileText.slice(0, 120)}`);
        mark(`profile: ${role} profile rendered, team surface absent`);
      }
      const otherWorkspace = await cluster.owner.query("SELECT id FROM identity_workspaces WHERE user_id=$1 AND role='client'", [applicantRow.id]);
      const borrowed = await fetchInPage(applicant, {
        url: '/api/auth/session', method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId: otherWorkspace.rows[0].id }),
      });
      assert.equal(borrowed.status, 200, 'switching back to an owned client workspace is allowed');
      const forged = await fetchInPage(applicant, {
        url: '/api/auth/session', method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newRole: 'super_admin' }),
      });
      assert.equal(forged.status, 403, 'a client-supplied role is never authority');
      await applicant.close();
      await reviewerPage.close();
      await contextReviewer.close();
      await contextD.close();
    });

    await step('the signed-in shell shows no client-side errors across the tested journeys', async () => {
      assert.deepEqual(errors, []);
    });

    const mailOnly = await cluster.owner.query('SELECT count(*) AS n FROM auth_verifications');
    const receipt = {
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP delivered to a loopback Resend stand-in, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: require('node:child_process').execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      previewOrigin: base, clusterIdentity: cluster.identity, tables: cluster.tables,
      fixtures: { creators: seed.length, syntheticOnly: true, pendingPostsForReview: pendingPosts, reviewerUserId: reviewerId },
      capturedMessages: mail.messages.length, verificationRows: Number(mailOnly.rows[0].n),
      thirdPartyAssetHostsBlocked: [...new Set(blockedHosts)],
      firstRunTourFindings: tourFindings,
      savedPlanFindings: planFindings,
      nonAdminApiProbe: adminProbe,
      directClickFindings: clickFindings,
      journeyStages: stages,
      databaseActivity: activity,
      appServerLogTail: serverLog.join('').slice(-6000),
      apiInterception: 'none; only non-local third-party asset requests are aborted',
      steps: results, passed: results.filter(result => result.status === 'pass').length, failed: results.filter(result => result.status === 'fail').length,
      browserErrors: errors,
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receipt.passed}/${results.length} passed`);
    if (receipt.failed) process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => { console.error('live app journey failed:', String(error.message || error).split('\n')[0]); process.exitCode = 1; })
  .then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
