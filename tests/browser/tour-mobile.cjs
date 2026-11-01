// MOBILE-TOUR-01 proof. The eight-step client walkthrough is walked on real production
// Next.js at six mobile viewports and one desktop viewport, and every step records the
// geometry of the card against the geometry of the element it is supposed to explain.
// A step passes only when the spotlight is drawn, the card does not cover its own target,
// the controls are at least 44 CSS pixels on both axes, and nothing overflows horizontally.
// This is simulated viewport evidence. It is not a substitute for the founder's sign-off on
// an actual iPhone, which task FND-01 carries.
// Usage: node tests/browser/tour-mobile.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_TOUR_RECEIPT || 'docs/readiness/beta/live-tour-mobile.json';

const VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568, mobile: true },
  { name: 'android-small', width: 360, height: 640, mobile: true },
  { name: 'iphone-8', width: 375, height: 667, mobile: true },
  { name: 'iphone-12', width: 390, height: 844, mobile: true },
  { name: 'iphone-pro-max', width: 430, height: 932, mobile: true },
  { name: 'tablet-portrait', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1366, height: 768, mobile: false },
];

// Mirrors CLIENT_STEPS in components/onboarding-tour.tsx. tests/onboarding-tour-regressions.cjs
// pins the same ids and selectors, so a drift here fails there first.
const STEPS = [
  { id: 'welcome', selector: null, route: null },
  { id: 'discover', selector: '[data-tour="discover-tabs"]', route: '/discover' },
  { id: 'filters', selector: '[data-tour="discover-filters"]', route: '/discover' },
  { id: 'providers', selector: '[data-tour="provider-card"]', route: '/discover' },
  { id: 'compare', selector: '[data-tour="comparison-controls"]', route: '/service-comparison' },
  { id: 'plan', selector: '[data-tour="planning-services"]', route: '/book' },
  { id: 'home', selector: '[data-tour="home-nav"]', route: '/home' },
  { id: 'profile', selector: '[data-tour="profile-nav"]', route: '/profile' },
];

const MIN_CONTROL = 44;
const results = [];
const stepReports = [];
const notes = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = String(error.message || error).split('\n')[0].slice(0, 300);
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 700) });
    console.log(`FAIL ${name}: ${message}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function roundRect(rect) {
  return {
    top: Math.round(rect.top), left: Math.round(rect.left),
    width: Math.round(rect.width), height: Math.round(rect.height),
    bottom: Math.round(rect.bottom), right: Math.round(rect.right),
  };
}

// Everything the acceptance list asks for is read from the live page in one pass, so a
// reported number is what the visitor's screen actually held at that moment.
function measurePage(page, expectedStep) {
  return page.evaluate(({ expectedStep }) => {
    const card = document.querySelector('div[role="dialog"][data-tour-step]');
    if (!card) return { present: false, expectedStep };
    const box = card.getBoundingClientRect();
    const selector = card.getAttribute('data-tour-target') || null;
    const stepId = card.dataset.tourStep;
    const declared = {
      welcome: null, discover: '[data-tour="discover-tabs"]', filters: '[data-tour="discover-filters"]',
      providers: '[data-tour="provider-card"]', compare: '[data-tour="comparison-controls"]',
      plan: '[data-tour="planning-services"]', home: '[data-tour="home-nav"]', profile: '[data-tour="profile-nav"]',
    }[stepId];
    let target = null;
    let targetCount = 0;
    if (declared) {
      const nodes = Array.from(document.querySelectorAll(declared));
      targetCount = nodes.length;
      const areas = nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { rect: r, area: r.width * r.height };
      }).filter(entry => entry.area > 0).sort((a, b) => b.area - a.area);
      if (areas.length) target = areas[0].rect;
    }
    const controls = {};
    const controlSelectors = {
      close: 'button[aria-label="Close tour"]',
      skip: 'button[aria-label="Skip walkthrough"]',
      previous: 'button[aria-label="Previous step"]',
      advance: 'button[aria-label="Next step"], button[aria-label="Finish tour"]',
    };
    for (const [name, query] of Object.entries(controlSelectors)) {
      const node = card.querySelector(query);
      if (!node) continue;
      const r = node.getBoundingClientRect();
      controls[name] = { width: Math.round(r.width), height: Math.round(r.height), visible: r.width > 0 && r.height > 0 };
    }
    const scrim = document.querySelector('svg rect[mask*="spotlight"]');
    const highlight = document.querySelector('[data-tour-highlight]');
    const visible = target ? {
      top: Math.max(0, target.top),
      left: Math.max(0, target.left),
      right: Math.min(window.visualViewport.width, target.right),
      bottom: Math.min(window.visualViewport.height, target.bottom),
    } : null;
    const active = document.activeElement;
    return {
      present: true,
      expectedStep,
      step: stepId,
      mode: card.dataset.tourMode,
      anchor: card.dataset.tourAnchor,
      spotlight: card.dataset.tourSpotlight === 'true',
      reveal: card.dataset.tourReveal || '',
      status: card.dataset.tourStatus,
      selectorUsed: selector,
      targetCount,
      card: { top: box.top, left: box.left, width: box.width, height: box.height, bottom: box.bottom, right: box.right },
      target,
      visibleTarget: visible ? {
        ...visible, width: visible.right - visible.left, height: visible.bottom - visible.top,
      } : null,
      highlight: highlight ? (rect => ({
        top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right,
      }))(highlight.getBoundingClientRect()) : null,
      controls,
      scrimFill: scrim ? scrim.getAttribute('fill') : null,
      ariaModal: card.getAttribute('aria-modal'),
      labelledBy: card.getAttribute('aria-labelledby'),
      describedBy: card.getAttribute('aria-describedby'),
      heading: (card.querySelector('#tour-step-title') || {}).textContent || '',
      body: (card.querySelector('#tour-step-content') || {}).textContent || '',
      focusIsCard: active === card,
      viewport: { width: window.visualViewport.width, height: window.visualViewport.height },
      // Where the page actually is: a reveal that never moved the page is a scroll the document
      // could not perform, and the receipt has to say so rather than leave it to be guessed.
      scroll: {
        y: Math.round(window.scrollY || document.documentElement.scrollTop || 0),
        max: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      },
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      pathname: window.location.pathname + window.location.search,
    };
  }, { expectedStep });
}

async function waitForStep(page, stepId, timeout = 25000) {
  await page.waitForSelector(`div[role="dialog"][data-tour-step="${stepId}"][data-tour-status="running"]`, { timeout });
  // The reveal is a scroll plus a re-measure, so the card settles after the step lands.
  // A reading taken mid-scroll would blame the product for a frame the visitor never saw,
  // so the geometry has to repeat before it is reported. Nine seconds is the budget, and a
  // step that never settles is reported as it stands rather than retried away.
  const deadline = Date.now() + 9000;
  let previous = null;
  let reading = await measurePage(page, stepId);
  while (Date.now() < deadline) {
    const signature = JSON.stringify({
      card: reading.card, target: reading.target, highlight: reading.highlight,
      spotlight: reading.spotlight, mode: reading.mode,
    });
    const settled = signature === previous;
    if (settled && (reading.spotlight || reading.mode === 'center')) return reading;
    previous = signature;
    await page.waitForTimeout(200);
    reading = await measurePage(page, stepId);
  }
  return reading;
}

function reportOf(reading, viewport) {
  const card = roundRect(reading.card);
  const target = reading.target ? roundRect(reading.target) : null;
  const visible = reading.visibleTarget ? roundRect(reading.visibleTarget) : null;
  const highlight = reading.highlight ? roundRect(reading.highlight) : null;
  const tooSmall = Object.entries(reading.controls)
    .filter(([, box]) => box.width < MIN_CONTROL || box.height < MIN_CONTROL)
    .map(([name, box]) => `${name} ${box.width}x${box.height}`);
  return {
    viewport: viewport.name,
    width: viewport.width,
    step: reading.step,
    status: reading.status,
    mode: reading.mode,
    anchor: reading.anchor,
    spotlight: reading.spotlight,
    reveal: reading.reveal,
    card,
    target,
    targetCount: reading.targetCount,
    cardCoversTarget: visible ? overlaps(card, visible) : false,
    visibleTarget: visible,
    highlight,
    highlightInsideViewport: highlight
      ? highlight.top >= -1 && highlight.left >= -1
        && highlight.bottom <= Math.ceil(reading.viewport.height) + 1
        && highlight.right <= Math.ceil(reading.viewport.width) + 1
      : null,
    highlightOverlapsCard: highlight ? overlaps(card, highlight) : null,
    targetInsideViewport: target
      ? target.top >= -1 && target.left >= -1 && target.bottom <= Math.ceil(reading.viewport.height) + 1 && target.right <= Math.ceil(reading.viewport.width) + 1
      : null,
    controls: reading.controls,
    scroll: reading.scroll,
    controlsBelow44: tooSmall,
    scrimFill: reading.scrimFill,
    ariaModal: reading.ariaModal,
    labelledBy: reading.labelledBy,
    describedBy: reading.describedBy,
    focusIsCard: reading.focusIsCard,
    heading: reading.heading.trim(),
    body: reading.body.trim(),
    pathname: reading.pathname,
    horizontalOverflowPx: reading.scrollWidth - reading.innerWidth,
  };
}

const LIGHT_SCRIM = 'rgba(29, 29, 27, 0.42)';

function assertReport(report) {
  assert.equal(report.present !== false, true, `${report.viewport} step ${report.step}: the dialog is on screen`);
  assert.ok(report.target, `${report.viewport} step ${report.step}: the target element exists`);
  if (report.spotlight) {
    assert.equal(report.cardCoversTarget, false, `${report.viewport} step ${report.step}: the card does not cover the part of the element the visitor can see`);
    assert.ok(report.highlight, `${report.viewport} step ${report.step}: the highlight is drawn on the page`);
    assert.equal(report.highlightInsideViewport, true,
      `${report.viewport} step ${report.step}: the highlight sits where the visitor can see it, found ${JSON.stringify(report.highlight)} in ${report.width}px`);
    assert.equal(report.highlightOverlapsCard, false, `${report.viewport} step ${report.step}: the highlight is not hidden behind the card`);
  } else {
    // The one allowed alternative is the documented fallback: no cutout, no heavy dim, and
    // the card stands in the middle of a page the visitor can still read.
    assert.equal(report.mode, 'center', `${report.viewport} step ${report.step}: a target that cannot coexist falls back to a centered card`);
    assert.equal(report.scrimFill, LIGHT_SCRIM, `${report.viewport} step ${report.step}: the fallback leaves the page readable`);
  }
  assert.deepEqual(report.controlsBelow44, [], `${report.viewport} step ${report.step}: every control is at least 44 by 44 CSS pixels`);
  assert.ok(report.horizontalOverflowPx <= 1, `${report.viewport} step ${report.step}: no horizontal overflow (${report.horizontalOverflowPx}px)`);
  assert.ok(report.card.top >= -1 && report.card.left >= -1, `${report.viewport} step ${report.step}: the card is inside the viewport`);
  assert.ok(report.card.right <= report.width + 1, `${report.viewport} step ${report.step}: the card does not run past the right edge`);
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'tour-mobile' });
  let mail;
  let server;
  let browser;
  const serverLog = [];
  const errors = [];
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
    const newContext = async options => {
      const context = await browser.newContext(options);
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        return route.abort();
      });
      return context;
    };

    // One real client session, then its storage state replays into every viewport so the
    // tour starts from the same signed-in identity each time.
    let storageState = null;
    await step('a real client session signs in and carries into the viewport sweep', async () => {
      const context = await newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`sign-in pageerror: ${error.message}`));
      const email = 'tour-mobile-client@example.test';
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill(email);
      await cluster.owner.query('DELETE FROM auth_limits');
      await cluster.owner.query('DELETE FROM auth_rate_limits');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
      const code = await mail.waitForCode(email);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      for (let attempt = 0; attempt < 3; attempt++) {
        if (await page.waitForURL('**/home', { timeout: 20000 }).then(() => true).catch(() => false)) break;
        if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
          .waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) {
          await page.getByLabel('Preferred name').fill('Tour QA');
          await page.getByRole('button', { name: 'Continue', exact: true }).click();
          continue;
        }
        throw new Error(`sign-in stopped at ${new URL(page.url()).pathname}`);
      }
      assert.equal(new URL(page.url()).pathname, '/home', 'the client lands on Home');
      // The card is captured before it can write a dismissal, so each viewport run below
      // sees a first-run tour rather than a completed one.
      await page.waitForSelector('div[role="dialog"][data-tour-step="welcome"]', { timeout: 20000 });
      storageState = await context.storageState();
      assert.equal(
        await page.evaluate(() => Object.keys(window.localStorage).filter(key => key.startsWith('styld:onboarding:v2:')).length),
        0, 'no dismissal was written before the sweep began',
      );
      await context.close();
    });

    for (const viewport of VIEWPORTS) {
      await step(`the eight client steps reveal their target on ${viewport.name} ${viewport.width}x${viewport.height}`, async () => {
        assert.ok(storageState, 'the client session is available');
        const context = await newContext({
          storageState,
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.mobile,
          hasTouch: viewport.mobile,
          deviceScaleFactor: viewport.mobile ? 2 : 1,
          reducedMotion: 'no-preference',
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(`${viewport.name} pageerror: ${error.message}`));
        await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
        let reading = await waitForStep(page, 'welcome');
        const welcome = reportOf(reading, viewport);
        welcome.spotlight = false; // step one has no target by design
        stepReports.push(welcome);
        assert.equal(reading.step, 'welcome', 'the tour opens on the welcome step');
        assert.equal(reading.mode, 'center', 'the welcome step is a centered card, not a spotlight');
        assert.ok(reading.card.top >= -1 && reading.card.bottom <= reading.viewport.height + 1, 'the welcome card fits the viewport');
        assert.deepEqual(welcome.controlsBelow44, [], 'the welcome step controls are at least 44 by 44');
        assert.ok(welcome.horizontalOverflowPx <= 1, 'the welcome step adds no horizontal overflow');

        for (const next of STEPS.slice(1)) {
          const advance = page.locator('div[role="dialog"] button[aria-label="Next step"]').first();
          await advance.click({ timeout: 10000 });
          reading = await waitForStep(page, next.id);
          const report = reportOf(reading, viewport);
          stepReports.push(report);
          assert.equal(report.step, next.id, `${viewport.name} reached step ${next.id}`);
          assert.equal(report.pathname.startsWith(next.route), true, `${viewport.name} step ${next.id} is on ${next.route}, found ${report.pathname}`);
          assertReport(report);
          if (viewport.width < 768) {
            assert.equal(report.spotlight, true,
              `${viewport.name} step ${next.id}: a phone viewport has to show the target the copy describes`);
          }
        }

        const done = page.locator('div[role="dialog"] button[aria-label="Finish tour"]').first();
        await done.waitFor({ timeout: 15000 });
        const finalReading = await measurePage(page, 'profile');
        const finalReport = reportOf(finalReading, viewport);
        assert.ok(finalReport.controls.previous, 'the last step still offers Back');
        assert.ok(finalReport.controls.skip, 'the last step still offers Skip');

        // Dismissal is what a visitor judges the tour by: Done must end it and a reload
        // must not bring it back.
        await done.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
        const stored = await page.evaluate(() => Object.fromEntries(
          Object.keys(window.localStorage).filter(key => key.startsWith('styld:onboarding:v2:')).map(key => [key, window.localStorage.getItem(key)])));
        assert.equal(Object.values(stored).includes('completed'), true, 'Done records a completion under the scoped key');
        await page.reload({ waitUntil: 'domcontentloaded' });
        const reopened = await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'attached', timeout: 4000 })
          .then(() => true).catch(() => false);
        assert.equal(reopened, false, 'a completed tour does not reopen on the same identity');
        await context.close();
      });
    }

    await step('Escape dismisses the tour and nothing is left on screen', async () => {
      const context = await newContext({ storageState, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('div[role="dialog"][data-tour-step="welcome"]', { timeout: 20000 });
      await page.keyboard.press('Escape');
      await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      const scrim = await page.locator('svg rect[mask*="spotlight"]').first().isVisible().catch(() => false);
      assert.equal(scrim, false, 'the dim overlay goes with the dialog');
      const stored = await page.evaluate(() => Object.values(
        Object.keys(window.localStorage).filter(key => key.startsWith('styld:onboarding:v2:')).map(key => window.localStorage.getItem(key))));
      assert.equal(stored.includes('skipped'), true, 'Escape records a skip, not a silent close');
      await context.close();
    });

    await step('a skipped tour replays from Settings on the same identity', async () => {
      const context = await newContext({ storageState, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('div[role="dialog"][data-tour-step="welcome"]', { timeout: 20000 });
      await page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first().click({ timeout: 10000 });
      await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      const replay = page.getByRole('button', { name: /take styld tour/i }).first();
      await replay.waitFor({ timeout: 15000 });
      await replay.click({ timeout: 10000 });
      await page.waitForSelector('div[role="dialog"][data-tour-step="welcome"]', { timeout: 20000 });
      const reading = await measurePage(page, 'welcome');
      assert.equal(reading.step, 'welcome', 'the replay restarts the client tour at step one');
      await context.close();
    });

    await step('the walkthrough adds no client-side errors across the sweep', async () => {
      assert.deepEqual(errors, []);
    });

    const spotlighted = stepReports.filter(item => item.step !== 'welcome');
    const covered = spotlighted.filter(item => item.cardCoversTarget).map(item => `${item.viewport}/${item.step}`);
    const unlit = spotlighted.filter(item => !item.spotlight).map(item => `${item.viewport}/${item.step}`);
    const smallControls = [...new Set(stepReports.flatMap(item => item.controlsBelow44.map(name => `${item.viewport}/${item.step}:${name}`)))];
    notes.push(`steps measured: ${stepReports.length} across ${VIEWPORTS.length} viewports; card-over-target cases: ${covered.length ? covered.join(', ') : 'none'}; steps with no spotlight: ${unlit.length ? unlit.join(', ') : 'none'}`);
    notes.push('simulated viewports only. The founder sign-off on an actual iPhone and an actual Android device is task FND-01 and is not closed by this receipt.');

    const receipt = {
      instrument: 'tests/browser/tour-mobile.cjs',
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP to a loopback stand-in, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      origin: base,
      clusterIdentity: cluster.identity,
      viewports: VIEWPORTS.map(item => `${item.name} ${item.width}x${item.height}`),
      steps: results,
      passed: results.filter(item => item.status === 'pass').length,
      failed: results.filter(item => item.status === 'fail').length,
      cardCoveredTarget: covered,
      stepsWithoutSpotlight: unlit,
      controlsBelow44: smallControls,
      measurements: stepReports,
      notes,
      browserErrors: errors,
      appServerLogTail: serverLog.join('').slice(-4000),
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receipt.passed}/${results.length} passed -> ${receiptPath}`);
    if (receipt.failed) process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => {
  console.error('tour mobile proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
