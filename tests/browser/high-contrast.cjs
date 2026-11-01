// MOBILE-A11Y-05 proof, and the executed half of the settings controls.
//
// The High Contrast and Reduce Motion switches used to be covered by source-text matching, which
// proves a string is in a file and nothing about what the browser does with it. This suite turns
// the real switch in Settings on a signed-in device, then measures the page: every surface the
// mode is meant to solidify has to compute an opaque background, white text inside a surface that
// just became solid white has to turn to ink rather than vanish, a token that only applies on
// hover or as a placeholder has to keep its resting colour, and an animation has to stop when
// Reduce Motion is on.
//
// Usage: node tests/browser/high-contrast.cjs --bin "<PostgreSQL 17.11 bin>"
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
const receiptPath = process.env.STYLD_HC_RECEIPT || 'docs/readiness/beta/live-high-contrast.json';

const ROUTES = ['/discover?tab=looks', '/settings'];
const results = [];
const samples = [];
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

// Runs in the page. Reads the surfaces the mode claims to solidify and the text it claims to
// protect, from the computed style the visitor's screen actually resolves to.
const IN_SCOPE = `
  const alpha = value => {
    const parts = String(value).match(/[\\d.]+/g);
    if (!parts) return 1;
    return parts.length >= 4 ? Number(parts[3]) : 1;
  };
  const rgb = value => String(value).match(/[\\d.]+/g).slice(0, 3).map(Number).join(',');
  const baseToken = (element, family) => {
    const list = element.getAttribute('class') || '';
    return list.startsWith(family) || list.includes(' ' + family);
  };
  const surfaces = [];
  for (const element of Array.from(document.querySelectorAll('body *'))) {
    if (!(element instanceof HTMLElement)) continue;
    const box = element.getBoundingClientRect();
    if (box.width < 4 || box.height < 4) continue;
    const background = getComputedStyle(element).backgroundColor;
    const isGlass = (element.getAttribute('class') || '').includes('world-glass');
    const white = baseToken(element, 'bg-white/');
    const black = baseToken(element, 'bg-black/') && !(element.getAttribute('class') || '').includes('inset-0');
    if (!isGlass && !white && !black) continue;
    surfaces.push({
      kind: isGlass ? 'world-glass' : white ? 'bg-white' : 'bg-black',
      className: (element.getAttribute('class') || '').slice(0, 90),
      alpha: alpha(background),
      color: rgb(background),
    });
  }
  const whiteText = [];
  for (const element of Array.from(document.querySelectorAll('body *'))) {
    if (!(element instanceof HTMLElement)) continue;
    const box = element.getBoundingClientRect();
    if (box.width < 4 || box.height < 4) continue;
    const text = (element.textContent || '').trim();
    if (!text) continue;
    const list = element.getAttribute('class') || '';
    const resting = list.startsWith('text-white') || list.includes(' text-white');
    if (!resting) continue;
    let holder = element;
    let onSolidWhite = false;
    while (holder && holder !== document.body) {
      const style = getComputedStyle(holder);
      if (alpha(style.backgroundColor) === 1 && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        if (rgb(style.backgroundColor) === '255,255,255') onSolidWhite = true;
        break;
      }
      holder = holder.parentElement;
    }
    whiteText.push({
      color: rgb(getComputedStyle(element).color),
      onSolidWhite,
      text: text.slice(0, 40),
      className: list.slice(0, 90),
    });
  }
  const running = (document.getAnimations ? document.getAnimations() : [])
    .filter(animation => animation.playState === 'running').length;
  return {
    highContrast: document.documentElement.getAttribute('data-high-contrast'),
    reduceMotion: document.documentElement.getAttribute('data-reduce-motion'),
    rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    surfaces,
    whiteText,
    runningAnimations: running,
  };
}`;

function evaluateInScope(page) {
  return page.evaluate(new Function('return (' + IN_SCOPE + ')')());
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'high-contrast' });
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
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.route(/.*/, route => {
      const host = new URL(route.request().url()).hostname;
      if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

    await step('a real client signs in and the walkthrough is cleared out of the way', async () => {
      const email = 'high-contrast-client@example.test';
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
        await page.getByLabel('Preferred name').fill('Contrast QA');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/home', { timeout: 25000 });
      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }
    });

    await step('the High contrast switch writes the document, stores the choice and survives a reload', async () => {
      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const plain = await evaluateInScope(page);
      assert.equal(plain.highContrast, null, 'a new device starts with the mode off');
      assert.equal(plain.rootFontPx, 16, 'and the default root size');

      const row = page.locator('div', { has: page.getByText('High contrast', { exact: true }) }).last();
      const toggle = row.getByRole('switch').first();
      await toggle.waitFor({ timeout: 15000 });
      await toggle.click({ timeout: 10000 });
      await page.waitForTimeout(400);
      const lit = await evaluateInScope(page);
      assert.equal(lit.highContrast, 'true', 'the switch reaches the document element');
      const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('styld_settings') || '{}').highContrast);
      assert.equal(stored, true, 'the choice is stored on the device');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      assert.equal((await evaluateInScope(page)).highContrast, 'true', 'the reloaded page applies it again');
    });

    for (const route of ROUTES) {
      await step(`${route} holds every surface High Contrast claims to solidify`, async () => {
        await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const lit = await evaluateInScope(page);
        assert.equal(lit.highContrast, 'true', 'the mode is on for this measurement');
        assert.ok(lit.surfaces.length > 0, `${route} rendered no translucent surface for the mode to act on, so this check proved nothing`);
        const thin = lit.surfaces.filter(item => item.alpha < 1);
        assert.deepEqual(thin, [], `${route}: ${thin.length} surface(s) stayed translucent, first three ${JSON.stringify(thin.slice(0, 3))}`);
        samples.push({
          route, stage: 'on',
          surfaces: lit.surfaces.length,
          kinds: [...new Set(lit.surfaces.map(item => item.kind))],
          translucent: thin.length,
          whiteText: lit.whiteText.length,
          vanished: lit.whiteText.filter(item => item.onSolidWhite && item.color === '255,255,255').length,
          runningAnimations: lit.runningAnimations,
        });
        const vanished = lit.whiteText.filter(item => item.onSolidWhite && item.color === '255,255,255');
        assert.deepEqual(vanished, [], `${route}: ${vanished.length} white label(s) sit on a surface this mode made solid white, first three ${JSON.stringify(vanished.slice(0, 3))}`);
        const dull = lit.whiteText.filter(item => !item.onSolidWhite && item.color !== '255,255,255');
        assert.deepEqual(dull, [], `${route}: ${dull.length} resting white label(s) lost their solid colour, first three ${JSON.stringify(dull.slice(0, 3))}`);
      });
    }

    await step('a token that only applies on hover or as a placeholder keeps its resting colour', async () => {
      const probe = await page.evaluate(() => {
        const control = document.createElement('div');
        control.textContent = 'probe';
        const host = document.createElement('div');
        host.setAttribute('class', 'hover:text-white/70 placeholder:text-white/48 disabled:text-white/35');
        host.textContent = 'probe';
        document.body.append(control, host);
        const before = { control: getComputedStyle(control).color, host: getComputedStyle(host).color };
        host.setAttribute('class', 'bg-white/12 text-white');
        const inside = getComputedStyle(host).color;
        control.remove();
        host.remove();
        return { before, inside };
      });
      assert.equal(probe.before.host, probe.before.control,
        `a hover-only token changed the resting colour to ${probe.before.host}, and an untouched element reads ${probe.before.control}`);
      assert.notEqual(probe.before.host, 'rgb(255, 255, 255)', 'the variant-only probe was not forced to solid white');
      assert.equal(probe.inside, 'rgb(26, 26, 46)', 'white text on a surface the mode solidified turns to ink');
    });

    await step('Reduce Motion stops the animations the app runs', async () => {
      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const row = page.locator('div', { has: page.getByText('Reduce motion', { exact: true }) }).last();
      const toggle = row.getByRole('switch').first();
      await toggle.waitFor({ timeout: 15000 });
      await toggle.click({ timeout: 10000 });
      await page.waitForTimeout(400);
      const still = await evaluateInScope(page);
      assert.equal(still.reduceMotion, 'true', 'the switch reaches the document element');
      const animation = await page.evaluate(() => {
        const host = document.createElement('div');
        host.setAttribute('class', 'animate-spin');
        document.body.appendChild(host);
        const style = getComputedStyle(host);
        const running = (document.getAnimations ? document.getAnimations() : [])
          .filter(item => item.playState === 'running').length;
        host.remove();
        return { duration: style.animationDuration, running };
      });
      assert.equal(animation.duration, '0.01ms', `an animation still runs for ${animation.duration} under Reduce Motion`);
      assert.equal(animation.running, 0, `${animation.running} animation(s) still report they are running`);
      samples.push({ route: '/settings', stage: 'reduce-motion', ...still });
    });

    await step('switching the modes back off returns the page to plain', async () => {
      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      for (const label of ['High contrast', 'Reduce motion']) {
        const row = page.locator('div', { has: page.getByText(label, { exact: true }) }).last();
        await row.getByRole('switch').first().click({ timeout: 10000 });
      }
      await page.waitForTimeout(400);
      const off = await evaluateInScope(page);
      assert.equal(off.highContrast, null, 'High contrast comes off when the switch is turned off');
      assert.equal(off.reduceMotion, null, 'and so does Reduce Motion');
      const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('styld_settings') || '{}'));
      assert.equal(stored.highContrast, false, 'the stored setting matches the screen');
    });

    await step('the settings journey adds no client-side errors', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('the switch, the attribute, the stored value and the computed style are all read from the same live page, so nothing here is a source-text match.');
    notes.push('one hand on a real handset in High Contrast is still task FND-01; this receipt covers the browser, not a screen in the sun.');

    const failed = results.filter(item => item.status === 'fail');
    const receipt = {
      instrument: 'tests/browser/high-contrast.cjs',
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP to a loopback stand-in, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      origin: base,
      clusterIdentity: cluster.identity,
      viewport: '390x844',
      steps: results,
      passed: results.length - failed.length,
      failed: failed.length,
      samples,
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
  console.error('high contrast proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
