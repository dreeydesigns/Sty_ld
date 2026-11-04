// MOBILE-PLAN-04 proof: a client who chooses a package in Discover has to land in Plan holding that
// choice, and a plan that merely went stale must never be described to them as a workspace change.
//
// The founder report came from a real iPhone. Discover -> Packages showed "Book this package", the
// Plan screen then said "Your workspace changed. Reload this page before editing its plan.", and the
// catalogue underneath still read "Your plan is empty. Choose a service to get started." Nothing here
// was ever driven in a browser against a real database: `tests/browser/plan-v2.cjs` answers /api/plan
// from an in-memory mock and never opens a package, and `tests/browser/plan-catalogue-order.cjs`
// measures the picker, not the route into it. This suite signs a real client in on a disposable
// cluster, walks the package cards, and reads back what the server actually stored.
//
// Usage: node tests/browser/package-to-plan.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_PACKAGE_RECEIPT || 'docs/readiness/beta/live-package-to-plan.json';

const CLIENT_EMAIL = 'package-to-plan-client@example.test';
const OTHER_EMAIL = 'package-to-plan-other@example.test';
// A package the shipped catalogue cannot back with services. It has to say so instead of offering a
// button that walks the client into an empty plan.
const UNMAPPED_PACKAGE = 'seasonal';

const results = [];
const notes = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 900) });
    console.log(`FAIL ${name}: ${String(error.message || error).split('\n')[0].slice(0, 300)}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// Runs in the page. Reads the Discover packages grid the way a client reads it: the card names and,
// for each card, every action offered with its words and its destination. Nothing is inferred from
// source, so a button that promises a booking is reported as a button that promises a booking.
function gridProbe() {
  const cards = Array.from(document.querySelectorAll('article'))
    .map((card) => {
      const heading = card.querySelector('h3');
      return {
        name: heading ? (heading.textContent || '').trim() : null,
        actions: Array.from(card.querySelectorAll('a')).map((link) => ({
          text: (link.textContent || '').trim(), href: link.getAttribute('href') || '',
          height: Math.round(link.getBoundingClientRect().height),
        })),
      };
    })
    .filter((card) => card.name && card.actions.some((action) => action.href.includes('/explore/packages/')));
  return {
    cards,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  };
}

// The package detail page: what its own planning action says and where it goes, alongside every
// other route into Plan the page offers, so a provider card is never mistaken for the package choice.
function detailProbe() {
  const packageActions = Array.from(document.querySelectorAll('a[data-package-plan]')).map((link) => ({
    text: (link.textContent || '').trim(), href: link.getAttribute('href') || '',
    height: Math.round(link.getBoundingClientRect().height),
  }));
  return {
    heading: (document.querySelector('h1')?.textContent || '').trim(),
    packageActions,
    otherPlanLinks: Array.from(document.querySelectorAll('a[href^="/book"]'))
      .filter((link) => !link.hasAttribute('data-package-plan'))
      .map((link) => link.getAttribute('href') || ''),
    buttons: Array.from(document.querySelectorAll('button')).map((button) => (button.textContent || '').trim()).filter(Boolean),
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}

// The Plan screen, measured from what is painted: the selected rows, the confirmation the client was
// given, whether an error replaced the builder, and which controls a thumb can actually reach.
function planProbe(scope) {
  const selected = Array.from(document.querySelectorAll('ul li button[aria-label^="Remove "]'))
    .map((button) => (button.getAttribute('aria-label') || '').replace('Remove ', '').trim());
  const statusAlerts = Array.from(document.querySelectorAll('[role="alert"], [role="status"]'))
    .map((node) => (node.textContent || '').trim()).filter(Boolean);
  const search = document.querySelector('#plan-service-search');
  const estimate = Array.from(document.querySelectorAll('a')).find((link) => /See my estimate/.test(link.textContent || ''));
  const probe = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { visible: false, reason: 'zero size' };
    if (rect.top < 0 || rect.bottom > window.innerHeight) return { visible: false, reason: 'outside the viewport' };
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { visible: true, covered: hit ? null : 'no hit', hitIsSelf: Boolean(hit && (hit === element || element.contains(hit) || hit.contains(element))),
      hitTag: hit ? `${hit.tagName.toLowerCase()}${hit.className ? `.${String(hit.className).split(' ')[0]}` : ''}` : null };
  };
  const bar = document.querySelector(scope.bottomBarSelector);
  return {
    selected, selectedCount: selected.length,
    hasDuplicates: selected.length !== new Set(selected).size,
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
    alerts: statusAlerts,
    searchProbe: probe(search), estimateProbe: probe(estimate),
    bottomBar: bar ? { height: Math.round(bar.getBoundingClientRect().height), position: getComputedStyle(bar).position } : null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    primaryButtonHeight: (() => {
      const button = Array.from(document.querySelectorAll('div[role="group"][aria-label="Services"] > button'))[0];
      return button ? Math.round(button.getBoundingClientRect().height) : null;
    })(),
  };
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'package-to-plan' });
  let mail;
  let server;
  let browser;
  const serverLog = [];
  const errors = [];
  const planTrace = [];
  let cleanedUp = false;
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    console.log('cleanup', JSON.stringify(cleanup));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }

  let base = '';
  let bridalIds = [];
  let written = false;
  // A journey that dies part way is the report, not a reason to withhold it. Failing to write the
  // trace is how a run "fails" while telling you nothing about what the client was shown.
  function writeReceipt() {
    if (written) { return; }
    written = true;
    const receipt = {
      conditions: 'Windows, installed Chrome headless at 360 and 390 px, the built application served by next start on loopback, a disposable PostgreSQL 17.11 cluster built from the migration chain, real email OTP sign-in, no production database',
      commit: require('node:child_process').execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      clientEmail: CLIENT_EMAIL, unmappedPackage: UNMAPPED_PACKAGE,
      bridalServiceIds: bridalIds, planRequests: planTrace, steps: results,
      failures: results.filter((result) => result.status === 'fail').map((result) => result.name),
      pageErrors: errors, notes,
      serverLogTail: serverLog.join('').split('\n').filter(Boolean).slice(-40),
    };
    const outPath = path.join(root, receiptPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receiptPath} commit ${receipt.commit}`);
    console.log(`${results.length - receipt.failures.length}/${results.length} steps passed, failures: ${receipt.failures.join(', ') || 'none'}`);
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

    browser = await chromium.launch({ executablePath: chrome, headless: true });

    async function newClient(width = 390) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        return route.abort();
      });
      const page = await context.newPage();
      // The address matters as much as the message: five identical hydration errors mean nothing
      // until you know which screen painted them.
      page.on('pageerror', error => errors.push(`${page.url().replace(base, '')}: ${error.message}`));
      page.on('response', async (response) => {
        if (!response.url().includes('/api/plan')) return;
        let scopeKey = null;
        try { scopeKey = (await response.json()).scopeKey ?? null; } catch { scopeKey = 'unreadable'; }
        planTrace.push({ method: response.request().method(), url: new URL(response.url()).pathname + new URL(response.url()).search,
          status: response.status(), ifMatch: response.request().headers()['if-match'] ?? null,
          etag: response.headers()['etag'] ?? null, scopeKey });
      });
      return { context, page };
    }

    // The OTP journey, from a sign-in form that is already on screen. Split out because a client
    // arriving through their own "sign in to save" link must not be sent back to a fresh sign-in URL
    // that carries none of their choices.
    async function completeSignIn(page, email) {
      await page.getByLabel('Email address').fill(email);
      await cluster.owner.query('DELETE FROM auth_limits');
      await cluster.owner.query('DELETE FROM auth_rate_limits');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
      const code = await mail.waitForCode(email);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
        .waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill('Package QA');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 25000 });
    }

    async function signIn(page, email) {
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await completeSignIn(page, email);
      await page.waitForURL('**/home', { timeout: 25000 });
      await dismissTour(page);
    }

    async function dismissTour(page) {
      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: 8000 }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }
    }

    async function servedPlan(page) {
      const response = await page.request.get(`${base}/api/plan`);
      assert.equal(response.ok(), true, 'the plan endpoint has to answer for the signed-in client');
      return await response.json();
    }

    // The tab decides its own scope from the session it was handed; the endpoint decides the scope it
    // answers for from the server session. If those two ever disagree, the tab is going to be told it
    // changed workspace while it was just sitting there, which is the report this suite exists for.
    async function scopePair(page) {
      const me = await (await page.request.get(`${base}/api/me`)).json();
      const plan = await servedPlan(page);
      return { me: { id: me?.user?.id ?? null, workspaceId: me?.user?.workspaceId ?? null, role: me?.user?.role ?? null },
        server: JSON.parse(plan.scopeKey) };
    }

    async function openPackages(page) {
      await page.goto(`${base}/discover?tab=packages`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('a[href^="/explore/packages/"]', { timeout: 25000 });
      await page.waitForTimeout(400);
      return page.evaluate(gridProbe);
    }

    async function readPlan(page) {
      // Either the builder or whatever replaced it. Waiting only for the search field would turn a
      // blocked client into a timeout, and the report would say nothing about what they were shown.
      await page.waitForFunction(() => Boolean(document.querySelector('#plan-service-search') || document.querySelector('[role="alert"]')), null, { timeout: 25000 });
      await page.waitForTimeout(700);
      return page.evaluate(planProbe, { bottomBarSelector: 'nav[class*="fixed"]' });
    }

    // Every serviceId a package hands to Plan, read back from the served catalogue so the assertion
    // is about whether the id exists rather than about a name this file guessed.
    async function resolveIds(page, ids) {
      const served = await servedPlan(page);
      const byId = new Map(served.services.map((service) => [service.id, service.name]));
      return { missing: ids.filter((id) => !byId.has(id)), names: ids.map((id) => byId.get(id)).filter(Boolean) };
    }

    const { context, page } = await newClient();

    await step('a real client signs in on the disposable cluster', async () => {
      await signIn(page, CLIENT_EMAIL);
      assert.match(page.url(), /\/home$/, 'the client reached their home workspace');
    });

    await step('Discover offers a planning action per package and never a booking promise', async () => {
      const grid = await openPackages(page);
      notes.push(`package card actions: ${JSON.stringify(grid.cards.map((card) => card.actions))}`);
      assert.ok(grid.cards.length >= 6, `the packages grid painted ${grid.cards.length} package cards`);
      const promising = grid.cards.flatMap((card) => card.actions)
        .filter((action) => /book/i.test(action.text));
      assert.deepEqual(promising, [], `these package actions promise a booking that cannot happen: ${JSON.stringify(promising)}`);
      const small = grid.cards.flatMap((card) => card.actions).filter((action) => action.height < 44);
      assert.deepEqual(small, [], `these package actions are under 44px tall: ${JSON.stringify(small)}`);
      assert.equal(grid.overflowX, false, 'the packages grid does not force sideways scrolling');
    });

    await step('the Bridal Package hands Plan a real set of catalogue services', async () => {
      await openPackages(page);
      await page.locator('article a[href="/explore/packages/bridal"]').first().click({ timeout: 20000 });
      await page.waitForURL('**/explore/packages/bridal', { timeout: 20000 });
      await page.waitForSelector('h1', { timeout: 20000 });
      const detail = await page.evaluate(detailProbe);
      assert.equal(detail.heading, 'Bridal Package', `the detail page was headed ${detail.heading}`);
      assert.equal(detail.packageActions.length, 1, `the detail page offered ${detail.packageActions.length} package actions`);
      const action = detail.packageActions[0];
      assert.match(action.text, /plan this package/i, `the action read "${action.text}"`);
      assert.doesNotMatch(action.text, /book/i, `the action still promises a booking: "${action.text}"`);
      assert.ok(action.height >= 44, `the package action is ${action.height}px tall`);
      const url = new URL(action.href, base);
      assert.equal(url.pathname, '/book', 'the package action goes to the plan builder');
      assert.equal(url.searchParams.get('rush'), null, 'the URL must not carry a rush flag the builder ignores');
      bridalIds = String(url.searchParams.get('serviceIds') || '').split(',').filter(Boolean);
      assert.ok(bridalIds.length >= 3, `the package mapped to ${bridalIds.length} catalogue services`);
      const { missing } = await resolveIds(page, bridalIds);
      assert.deepEqual(missing, [], `these package services are not in the catalogue the client is shown: ${missing.join(', ')}`);
    });

    await step('choosing the package carries the selection into Plan and confirms it', async () => {
      await page.locator('a[data-package-plan]').first().click({ timeout: 20000 });
      await page.waitForURL('**/book**', { timeout: 25000 });
      const read = await readPlan(page);
      assert.equal(read.selectedCount, bridalIds.length,
        `Plan showed ${read.selectedCount} selected services for a package of ${bridalIds.length}: ${JSON.stringify(read.selected)}`);
      assert.doesNotMatch(read.text, /Your plan is empty/i, 'the plan builder still reported an empty plan after a package choice');
      assert.match(read.text, /Bridal Package/i, 'the plan never told the client which package they were planning');
      assert.doesNotMatch(read.text, /Your workspace changed/i, 'choosing a package reported a workspace change');
      const served = await servedPlan(page);
      assert.deepEqual(served.plan.serviceIds, bridalIds, `the server stored ${JSON.stringify(served.plan.serviceIds)}`);
    });

    await step('reloading Plan keeps the package selection', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      const read = await readPlan(page);
      assert.equal(read.selectedCount, bridalIds.length, `after reload Plan showed ${JSON.stringify(read.selected)}`);
      assert.doesNotMatch(read.text, /Your workspace changed/i, 'a reload reported a workspace change');
      assert.doesNotMatch(read.text, /Try again/i, 'a reload landed on the recovery alert');
    });

    await step('tapping the package action again adds no duplicates', async () => {
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/explore/packages/bridal', { timeout: 20000 });
      await page.locator('a[data-package-plan]').first().click({ timeout: 20000 });
      await page.waitForURL('**/book**', { timeout: 25000 });
      await page.waitForTimeout(1200);
      const read = await readPlan(page);
      assert.equal(read.hasDuplicates, false, `the plan listed duplicates: ${JSON.stringify(read.selected)}`);
      assert.equal(read.selectedCount, bridalIds.length, `a repeat tap changed the count to ${read.selectedCount}`);
      const served = await servedPlan(page);
      assert.deepEqual(served.plan.serviceIds, bridalIds, 'the repeat tap stored a second copy of the selection');
    });

    await step('a second package adds to the plan without erasing the first', async () => {
      await page.goto(`${base}/explore/packages/self-care`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('a[data-package-plan]', { timeout: 20000 });
      const secondHref = await page.locator('a[data-package-plan]').first().getAttribute('href');
      const secondIds = String(new URL(secondHref, base).searchParams.get('serviceIds') || '').split(',').filter(Boolean);
      assert.ok(secondIds.length >= 2, 'the second package mapped no services');
      await page.locator('a[data-package-plan]').first().click({ timeout: 20000 });
      await page.waitForURL('**/book**', { timeout: 25000 });
      await page.waitForTimeout(900);
      const offered = page.getByRole('button', { name: 'Use choices from this link', exact: true });
      if (await offered.isVisible().catch(() => false)) {
        assert.match((await readPlan(page)).text, /This link has new choices/i, 'the merge prompt appeared with no explanation');
        await offered.click();
        await page.waitForTimeout(1200);
      }
      const read = await readPlan(page);
      assert.ok(read.selectedCount >= bridalIds.length,
        `planning a second package left ${read.selectedCount} services, fewer than the ${bridalIds.length} already chosen`);
      assert.equal(read.hasDuplicates, false, `the merge duplicated: ${JSON.stringify(read.selected)}`);
      const served = await servedPlan(page);
      for (const id of bridalIds) assert.ok(served.plan.serviceIds.includes(id), `the first package's ${id} was dropped`);
      for (const id of secondIds) assert.ok(served.plan.serviceIds.includes(id), `the second package's ${id} was never added`);
      assert.ok(served.plan.serviceIds.length <= 10, 'the server-side ten service limit was exceeded');
    });

    await step('a package the catalogue cannot back offers an honest alternative', async () => {
      await page.goto(`${base}/explore/packages/${UNMAPPED_PACKAGE}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1', { timeout: 20000 });
      await page.waitForTimeout(600);
      const detail = await page.evaluate(detailProbe);
      notes.push(`unmapped package ${UNMAPPED_PACKAGE}: ${JSON.stringify({ packageActions: detail.packageActions, otherPlanLinks: detail.otherPlanLinks })}`);
      assert.equal(detail.packageActions.length, 0, `an unplannable package still offered ${JSON.stringify(detail.packageActions)}`);
      assert.match(detail.text, /no services to plan yet/i, 'the page did not explain why it offers no plan action');
      assert.match(detail.text, /illustrative/i, 'the page stopped calling its prices illustrative');
    });

    await step('the whole journey never blames a workspace that did not change', async () => {
      const stale = planTrace.filter((entry) => entry.status === 412);
      assert.deepEqual(stale, [], `these plan requests came back as a stale precondition: ${JSON.stringify(stale)}`);
      const scope = JSON.parse((await servedPlan(page)).scopeKey);
      const foreign = planTrace.filter((entry) => entry.scopeKey && entry.scopeKey !== scope && entry.scopeKey !== 'unreadable');
      assert.deepEqual(foreign, [], `the plan endpoint answered for a workspace this client is not in: ${JSON.stringify(foreign)}`);
      const read = await readPlan(page);
      assert.doesNotMatch(read.text, /Your workspace changed/i, 'the plan screen blamed the workspace');
    });

    await step('a stale plan version is described as a version, not a workspace change', async () => {
      const served = await servedPlan(page);
      const [, workspaceId] = JSON.parse(served.scopeKey);
      const response = await page.request.put(`${base}/api/plan`, {
        // The tab holds one version and claims to have read another. That is a stale tab, and it
        // is the only thing this precondition can ever mean: identity_workspaces is
        // UNIQUE(user_id, role), so a client cannot own a second client workspace to move to.
        headers: { 'Content-Type': 'application/json', 'If-Match': `"plan:${workspaceId}:${served.plan.revision}"` },
        data: JSON.stringify({ expectedRevision: served.plan.revision + 40, plan: { ...served.plan, locationArea: 'Stale Write' } }),
      });
      assert.equal(response.status(), 412, 'a precondition mismatch has to stay a precondition failure');
      const body = JSON.stringify(await response.json());
      assert.match(body, /version|revision|out of date/i, `the API gave no word about what actually failed: ${body}`);
      assert.doesNotMatch(body, /workspace/i, `the API blamed a workspace for a stale version: ${body}`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const read = await readPlan(page);
      assert.doesNotMatch(read.text, /Your workspace changed/i, 'a stale version put the client on the workspace error');
      assert.doesNotMatch(read.text, /Your plan is empty/i, 'the plan was lost by the failed write');
      const after = await servedPlan(page);
      assert.notEqual(after.plan.locationArea, 'Stale Write', 'a rejected write still reached the plan');
    });

    await step('two tabs editing the same plan both keep a recovery path', async () => {
      const second = await context.newPage();
      await second.goto(`${base}/book`, { waitUntil: 'domcontentloaded' });
      await second.waitForSelector('#plan-service-search', { timeout: 25000 });
      await page.getByLabel('General location area').fill('Tab one area');
      await page.getByRole('status').filter({ hasText: /^Saved$/ }).waitFor({ timeout: 20000 });
      await second.getByLabel('General location area').fill('Tab two area');
      await second.waitForTimeout(2500);
      const text = (await second.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
      assert.doesNotMatch(text, /Your workspace changed/i, `a concurrent edit was blamed on the workspace: ${text.slice(0, 300)}`);
      assert.match(text, /A newer version was saved|Saved|Tab two area/i, 'the second tab was left with no way forward');
      const keep = second.getByRole('button', { name: 'Keep my edits and save', exact: true });
      if (await keep.isVisible().catch(() => false)) {
        await keep.click();
        await second.getByRole('status').filter({ hasText: /^Saved$/ }).waitFor({ timeout: 20000 });
      }
      const served = await servedPlan(second);
      assert.ok(['Tab one area', 'Tab two area'].includes(served.plan.locationArea),
        `both tabs' work disappeared, the plan reads "${served.plan.locationArea}"`);
      await second.close();
    });

    await step('an iPhone width keeps the package action and the next step reachable', async () => {
      for (const width of [360, 390]) {
        const phone = await newClient(width);
        await signIn(phone.page, CLIENT_EMAIL);
        await phone.page.goto(`${base}/explore/packages/bridal`, { waitUntil: 'domcontentloaded' });
        await phone.page.waitForSelector('a[data-package-plan]', { timeout: 20000 });
        await phone.page.locator('a[data-package-plan]').first().scrollIntoViewIfNeeded();
        const detail = await phone.page.evaluate(detailProbe);
        assert.equal(detail.overflowX, false, `${width}x844 forced the package page sideways`);
        assert.equal(detail.packageActions.length, 1, `at ${width}px the package page offered ${JSON.stringify(detail.packageActions)}`);
        const reachable = await phone.page.evaluate(() => {
          const link = document.querySelector('a[data-package-plan]');
          const rect = link.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(rect.height / 2, 20));
          return { covered: Boolean(hit) && !link.contains(hit) && !hit.contains(link),
            hitTag: hit ? hit.tagName.toLowerCase() : null, height: Math.round(rect.height) };
        });
        assert.equal(reachable.covered, false, `at ${width}px something is painted over the package action (${reachable.hitTag})`);
        assert.ok(reachable.height >= 44, `the package action is ${reachable.height}px tall at ${width}px`);
        await phone.page.locator('a[data-package-plan]').first().click({ timeout: 20000 });
        await phone.page.waitForURL('**/book**', { timeout: 25000 });
        const read = await readPlan(phone.page);
        assert.equal(read.searchProbe?.visible, true, 'the service search field is not on the page');
        assert.equal(read.searchProbe?.covered, false, `at ${width}px something is painted over the service search field`);
        assert.equal(read.estimateProbe?.covered, false, `at ${width}px something is painted over See my estimate`);
        assert.ok((read.primaryButtonHeight ?? 0) >= 44, `a service card is ${read.primaryButtonHeight}px tall at ${width}px`);
        assert.equal(read.overflowX, false, `${width}x844 forced the plan builder sideways`);
        await phone.context.close();
      }
    });

    await step('a guest who plans a package keeps it through signing in', async () => {
      const guest = await newClient();
      await guest.page.goto(`${base}/explore/packages/bridal`, { waitUntil: 'domcontentloaded' });
      await guest.page.waitForSelector('a[data-package-plan]', { timeout: 20000 });
      await guest.page.locator('a[data-package-plan]').first().click({ timeout: 20000 });
      await guest.page.waitForURL('**/book**', { timeout: 25000 });
      const before = await readPlan(guest.page);
      assert.equal(before.selectedCount, bridalIds.length, `the guest plan showed ${JSON.stringify(before.selected)}`);
      const continueLink = guest.page.getByRole('link', { name: 'Sign in to save across devices', exact: true });
      await continueLink.waitFor({ timeout: 20000 });
      const href = await continueLink.getAttribute('href');
      const returnTo = new URLSearchParams(href.split('?')[1]).get('returnTo') || '';
      assert.match(returnTo, /serviceIds=/, `sign-in was sent back to ${returnTo}, which carries no selection`);
      await continueLink.click();
      await guest.page.waitForURL('**/auth/sign-in**', { timeout: 25000 });
      await completeSignIn(guest.page, OTHER_EMAIL);
      assert.match(guest.page.url(), /serviceIds=/, `after signing in the client landed on ${guest.page.url()}`);
      const after = await readPlan(guest.page);
      assert.equal(after.selectedCount, bridalIds.length, `the signed-in plan showed ${JSON.stringify(after.selected)}`);
      const served = await servedPlan(guest.page);
      assert.deepEqual(served.plan.serviceIds, bridalIds, 'the signed-in client did not inherit the package they planned');
      await guest.context.close();
    });

    await step('another client never sees this client plan', async () => {
      const other = await newClient();
      await signIn(other.page, 'package-to-plan-third@example.test');
      await other.page.goto(`${base}/book`, { waitUntil: 'domcontentloaded' });
      const read = await readPlan(other.page);
      assert.deepEqual(read.selected, [], `a different client was shown ${JSON.stringify(read.selected)}`);
      const served = await servedPlan(other.page);
      assert.deepEqual(served.plan.serviceIds, [], 'a different client plan contained this package selection');
      assert.notEqual(served.scopeKey, (await servedPlan(page)).scopeKey, 'two accounts shared one plan scope');
      await other.context.close();
    });

    await step('no page error interrupted the journey', async () => {
      assert.deepEqual(errors, [], `page errors during the journey: ${JSON.stringify(errors)}`);
    });

    await step("the tab and the endpoint agree on one workspace the whole way through", async () => {
      const pair = await scopePair(page);
      notes.push(`scope pair: ${JSON.stringify(pair)}`);
      assert.equal(pair.me.workspaceId, pair.server[1], `the session handed the tab workspace ${pair.me.workspaceId} while the plan endpoint answered for ${pair.server[1]}`);
    });

    writeReceipt();
    const failures = results.filter((result) => result.status === 'fail').map((result) => result.name);
    if (failures.length) throw new Error(`MOBILE-PLAN-04 acceptance failed: ${failures.join(', ')}`);
    await teardown();
  } catch (error) {
    writeReceipt();
    console.error(error);
    const tail = serverLog.join('').split('\n').slice(-30).join('\n');
    if (tail) console.error('server log tail:', tail);
    await teardown();
    process.exitCode = 1;
  }
})();
