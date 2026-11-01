// MOBILE-TYPE-06 proof. The Large text setting is walked on a real production Next.js build at
// three phone viewports and five routes, and every element that carries visible text is measured
// before and after the setting changes. A page passes only when each of those sizes grows by the
// same ratio as the root font size, because an element that keeps its old pixel size is the defect
// this task closes: the setting moved everything except the labels, chips and prices that were
// written as pixels. The sweep also runs at the 2.0 root a visitor reaches by asking the browser
// for 200 percent text, and records whether any route gains a horizontal scrollbar there.
// Usage: node tests/browser/text-scale.cjs --bin "<PostgreSQL 17.11 bin>"
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
const receiptPath = process.env.STYLD_TYPE_RECEIPT || 'docs/readiness/beta/live-text-scale.json';

const VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'android-small', width: 360, height: 640 },
  { name: 'iphone-12', width: 390, height: 844 },
];
const ROUTES = ['/discover?tab=looks', '/book', '/service-comparison', '/home', '/settings'];
const SCALES = [
  { key: 'medium', expect: 1, label: 'the default' },
  { key: 'large', expect: 1.15, label: 'the Large step' },
  { key: 'double', expect: 2, label: 'a 200 percent browser text setting' },
];

const results = [];
const readings = [];
const notes = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 700) });
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

// One pass over the live DOM. Each element that draws text is stamped so the next pass can find the
// same element again, and its used font size is read in pixels, which is the only unit that shows
// whether the root scale reached it. The stamp counter is kept on the window and never restarts: a
// pass that began again at zero would hand a fresh element a number an earlier element already owns.
//
// The stamp travels with the DOM node and React reuses nodes between renders, so a node that is now
// part of a different component keeps its number while meaning something else. The ancestry line is
// recorded with the size: when it changes, the two readings are not the same element and comparing
// them says nothing about the scale. Those cases are counted, never dropped silently.
function measure(page) {
  return page.evaluate(() => {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const sizes = {};
    const lines = {};
    let stamped = window.__styldTs || 0;
    for (const element of Array.from(document.querySelectorAll('body *'))) {
      if (!(element instanceof HTMLElement)) continue;
      const drawsText = Array.from(element.childNodes)
        .some(node => node.nodeType === 3 && (node.textContent || '').trim().length > 0);
      if (!drawsText) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      if (!element.hasAttribute('data-styld-ts')) {
        stamped += 1;
        element.setAttribute('data-styld-ts', String(stamped));
      }
      const id = element.getAttribute('data-styld-ts');
      let line = '';
      for (let node = element, depth = 0; node && depth < 4; depth += 1) {
        line += `${node.nodeName}.${(node.getAttribute('class') || '').slice(0, 40)}>`;
        node = node.parentElement;
      }
      sizes[id] = parseFloat(getComputedStyle(element).fontSize);
      lines[id] = line;
    }
    return {
      rootPx,
      textScale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim(),
      elements: Object.keys(sizes).length,
      sizes,
      lines,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
}

// Applied the way the app applies it: the stored preference is written, the change event fires and
// ThemeApplicator moves the root. The 2.0 case writes the same variable a browser text setting
// reaches, because the app itself stops at Large.
async function applyScale(page, key) {
  await page.evaluate((which) => {
    if (which === 'double') {
      document.documentElement.style.setProperty('--text-scale', '2');
      return;
    }
    const raw = window.localStorage.getItem('styld_settings');
    const next = Object.assign({}, raw ? JSON.parse(raw) : {}, { textSize: which });
    window.localStorage.setItem('styld_settings', JSON.stringify(next));
    window.localStorage.setItem('ms_app_settings.v1', JSON.stringify(next));
    window.dispatchEvent(new Event('ms-settings-change'));
  }, key);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 250))));
}

function labelOf(route) {
  return route.replace(/^\//, '').replace(/[?&]/g, '-');
}

// These pages are client renders behind a session, so the measure has to wait for the content
// instead of a fixed number of milliseconds. A half-painted page would otherwise be read as a page
// with a few stubborn pixel sizes, which is the opposite of what this suite is for.
async function settle(page, limit = 8000) {
  const deadline = Date.now() + limit;
  let previous = -1;
  let reading = await measure(page);
  while (Date.now() < deadline) {
    if (reading.elements === previous && reading.elements > 15) return reading;
    previous = reading.elements;
    await page.waitForTimeout(250);
    reading = await measure(page);
  }
  return reading;
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'text-scale' });
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

    // The golden path goes through the control a visitor uses, on a signed-in device, and the
    // preference has to survive the reload that follows it.
    let storageState = null;
    await step('a real client changes Text size to Large in Settings and the root moves', async () => {
      const context = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`sign-in pageerror: ${error.message}`));
      const email = 'type-scale-client@example.test';
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
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
        await page.getByLabel('Preferred name').fill('Type QA');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/home', { timeout: 25000 });
      const tour = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await tour.waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
        await tour.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }

      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      await page.getByText('Text size', { exact: true }).waitFor({ timeout: 15000 });
      const before = await settle(page);
      assert.ok(before.elements > 20, `only ${before.elements} text elements were found on Settings, so the measure is not reading the page`);
      assert.equal(before.textScale, '1', 'a new device starts at the default size');
      assert.ok(Math.abs(before.rootPx - 16) < 0.01, `the default root is 16px, found ${before.rootPx}`);

      // The pills sit in the row's flex container, beside the label rather than inside it, so the
      // search stops at that container: the deepest div carrying the words holds only the label
      // and never the buttons.
      const row = page.locator('div.flex.items-center', { has: page.getByText('Text size', { exact: true }) }).first();
      await row.getByRole('button', { name: 'L', exact: true }).click({ timeout: 10000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 300))));
      const after = await measure(page);
      assert.equal(after.textScale, '1.15', 'the control writes the Large step');
      assert.ok(Math.abs(after.rootPx - 18.4) < 0.01, `the root font size became 18.4px, found ${after.rootPx}`);
      const stored = await page.evaluate(() => (JSON.parse(window.localStorage.getItem('styld_settings') || '{}')).textSize);
      assert.equal(stored, 'large', 'the choice is stored on the device');

      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloaded = await measure(page);
      assert.equal(reloaded.textScale, '1.15', 'the preference is applied again after a reload');
      // Measured at domcontentloaded, before React hydrates: a preference that only arrives with
      // the client applicator would read 1 here, and the visitor would see the page resize itself.
      assert.ok(
        await page.evaluate(() => !!document.getElementById('styld-settings-no-flash')),
        'the pre-paint script is in the document'
      );
      storageState = await context.storageState();
      await context.close();
      readings.push({ viewport: 'sign-in', route: '/settings', stage: 'control', before: before.rootPx, after: after.rootPx, reloaded: reloaded.rootPx });
    });

    for (const viewport of VIEWPORTS) {
      for (const route of ROUTES) {
        await step(`every text element on ${labelOf(route)} grows with the setting at ${viewport.width}x${viewport.height}`, async () => {
          assert.ok(storageState, 'the client session is available');
          const context = await newContext({
            storageState,
            viewport: { width: viewport.width, height: viewport.height },
            isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'no-preference',
          });
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(`${viewport.name} ${route} pageerror: ${error.message}`));
          await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);

          await applyScale(page, 'medium');
          const baseline = await settle(page);
          assert.ok(baseline.elements > 15,
            `only ${baseline.elements} text elements measured on ${route}, so a blank or redirected page would look like a pass`);

          const perScale = [];
          for (const scale of SCALES.slice(1)) {
            await applyScale(page, scale.key);
            const now = await measure(page);
            const expectedRatio = now.rootPx / baseline.rootPx;
            const offenders = [];
            let remodelled = 0;
            for (const id of Object.keys(baseline.sizes)) {
              const beforePx = baseline.sizes[id];
              const afterPx = now.sizes[id];
              if (afterPx === undefined) continue; // the element left the page for an unrelated reason
              if (now.lines[id] !== baseline.lines[id]) {
                remodelled += 1; // the node now carries different markup, so the two sizes are not one element
                continue;
              }
              const ratio = afterPx / beforePx;
              if (Math.abs(ratio - expectedRatio) > 0.01) {
                offenders.push({ id, ratio: Number(ratio.toFixed(3)) });
              }
            }
            const detail = offenders.length
              ? await page.evaluate(ids => ids.map(({ id, ratio }) => {
                const element = document.querySelector(`[data-styld-ts="${id}"]`);
                if (!element) return { id, ratio, gone: true };
                return {
                  id, ratio,
                  px: getComputedStyle(element).fontSize,
                  className: (element.getAttribute('class') || '').slice(0, 120),
                  text: (element.textContent || '').trim().slice(0, 40),
                };
              }), offenders.slice(0, 6))
              : [];
            assert.deepEqual(detail, [],
              `${viewport.name} ${route} at ${scale.label}: ${offenders.length} element(s) kept a size the root scale did not reach, first six ${JSON.stringify(detail)}`);
            // Re-rendering is allowed, but a page that rebuilt most of its text between the two
            // readings is not the page that was measured, and that would hide every offender.
            assert.ok(remodelled <= Math.max(2, baseline.elements * 0.1),
              `${viewport.name} ${route} at ${scale.label}: ${remodelled} of ${baseline.elements} elements were rebuilt as different markup, so the sweep is not comparing one page with itself`);
            perScale.push({
              key: scale.key, rootPx: now.rootPx, ratio: expectedRatio,
              overflowPx: now.overflow, elements: now.elements, unstyled: offenders.length,
              remodelled,
            });
            await applyScale(page, 'medium');
          }

          const large = perScale.find(item => item.key === 'large');
          const double = perScale.find(item => item.key === 'double');
          assert.ok(large.overflowPx <= 1,
            `${viewport.name} ${route} at Large has ${large.overflowPx}px of horizontal overflow`);
          assert.ok(double.overflowPx <= 1,
            `${viewport.name} ${route} at 200 percent has ${double.overflowPx}px of horizontal overflow`);
          readings.push({ viewport: `${viewport.width}x${viewport.height}`, route, scales: perScale });
          await context.close();
        });
      }
    }

    await step('the sweep adds no client-side errors', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('the 2.0 case is written to --text-scale directly, which is the same root the Large control moves, so it stands for a visitor who asks the browser for 200 percent text; the app itself offers Small, Medium and Large only.');
    notes.push('the sweep compares each element with itself across one page load: every element keeps a stamp and an ancestry line, so an element that kept a pixel size cannot hide behind a different element count, and a DOM node React reused for different markup is counted in "remodelled" instead of being compared with itself.');

    const failed = results.filter(item => item.status === 'fail');
    const receipt = {
      instrument: 'tests/browser/text-scale.cjs',
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP to a loopback stand-in, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      origin: base,
      clusterIdentity: cluster.identity,
      viewports: VIEWPORTS.map(item => `${item.width}x${item.height}`),
      routes: ROUTES,
      steps: results,
      passed: results.length - failed.length,
      failed: failed.length,
      measurements: readings,
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
  console.error('text scale proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
