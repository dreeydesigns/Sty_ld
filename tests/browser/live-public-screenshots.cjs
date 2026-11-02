// Public-site screenshot capture: the production build, an owned disposable database that is
// never seeded, and one fresh invitation-free QA identity signed in with a real emailed code.
// The frames are the empty product, so nothing in them is a synthetic provider, post or price.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const outDir = 'public-site/assets/screens';
const receiptPath = 'docs/readiness/beta/live-public-screenshots.json';
const identity = { email: 'public-site-qa@example.test', name: 'STYLD QA' };

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

let base = '';
let clusterHandle = null;
const captures = [];
const failures = [];

async function signIn(page, mail) {
  await clusterHandle.owner.query('DELETE FROM auth_limits');
  await clusterHandle.owner.query('DELETE FROM auth_rate_limits');
  await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(identity.email);
  await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
  await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 30000 });
  const code = await mail.waitForCode(identity.email);
  await page.getByLabel('Verification code').fill(code);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.waitForURL('**/home', { timeout: 30000 }).then(() => true).catch(() => false)) return;
    if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
      .waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) {
      await page.getByLabel('Preferred name').fill(identity.name);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    throw new Error(`sign-in stopped at ${new URL(page.url()).pathname}`);
  }
  throw new Error('sign-in needed more than three steps.');
}

// A first-run tour paints a spotlight over the page, and a frame with a tour in it is not a
// frame of the product surface the investor site describes. The dismissal is the one a visitor
// makes: press Escape. Whether an overlay was standing at all is recorded.
async function clearTour(page) {
  const dialog = page.locator('div[role="dialog"][data-tour-status="running"]');
  const standing = await dialog.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (!standing) return false;
  await page.keyboard.press('Escape');
  await dialog.first().waitFor({ state: 'detached', timeout: 8000 })
    .then(() => true).catch(() => { throw new Error(`the first-run tour overlay at ${new URL(page.url()).pathname} did not clear on Escape`); });
  return true;
}

async function capture(page, { file, url, wait, label }) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => null);
    await clearTour(page);
    await wait(page);
    await page.waitForTimeout(1200);
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    await page.screenshot({ path: path.join(root, outDir, file) });
    const digest = createHash('sha256').update(fs.readFileSync(path.join(root, outDir, file))).digest('hex');
    console.log(`captured ${file} (${new URL(url).pathname}) sha256 ${digest.slice(0, 16)}`);
    return { label, file, url: new URL(url).pathname, textSample: text.slice(0, 400), sha256: digest };
  }
  catch (error) {
    // A frame that cannot be reached is a finding about the product surface, so the failure
    // carries what the page did offer rather than only the locator that gave up.
    const offered = await page.locator('body').innerText().catch(() => '');
    const labels = await page.evaluate(() => Array.from(document.querySelectorAll('button[aria-label]'))
      .map(button => button.getAttribute('aria-label')).slice(0, 40)).catch(() => []);
    const detail = `${file}: ${String(error.message || error).split('\n')[0].slice(0, 200)}`
      + `; page reads ${JSON.stringify(offered.replace(/\s+/g, ' ').slice(0, 300))}`
      + `; aria-labels ${JSON.stringify(labels).slice(0, 400)}`;
    console.log(`FAILED ${detail}`);
    failures.push(detail);
    return null;
  }
}

(async () => {
  assert.ok(bin, 'run with --bin <path to PostgreSQL 17 bin>');
  fs.mkdirSync(path.join(root, outDir), { recursive: true });
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  const cluster = await startLiveCluster({ bin, label: 'live-public-screenshots' });
  clusterHandle = cluster;
  let mail, server, browser;
  const serverLog = [];
  async function teardown() {
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
    for (let attempt = 0; attempt < 90; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await signIn(page, mail);
    await clearTour(page);

    captures.push(await capture(page, {
      file: 'plan-builder.png', url: `${base}/book`, label: 'the beauty plan surface',
      wait: async () => { await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor({ timeout: 30000 }); },
    }));

    // The six-world chooser is a panel on the client profile, not a page of its own, so the
    // capture opens it the way a client does and waits for a named world card to be drawn.
    const openWorlds = async (target) => {
      await target.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
      await target.waitForLoadState('networkidle').catch(() => null);
      await clearTour(target);
      await target.getByRole('button', { name: 'Profile personalization', exact: true }).waitFor({ timeout: 30000 });
      await target.getByRole('button', { name: 'Profile personalization', exact: true }).click();
      await target.getByRole('dialog').filter({ hasText: 'Beauty world' }).waitFor({ timeout: 30000 });
      for (const name of ['Preview Pure', 'Preview The Romantic', 'Preview The Earth Woman',
        'Preview The Seeker', 'Preview The Daughter of the Soil', 'Preview The Muse']) {
        await target.getByRole('button', { name, exact: true }).waitFor({ timeout: 30000 });
      }
      // The intensity row belongs to the world that is saved, not the one being previewed, so the
      // capture previews a world, presses the real Select control, and waits for the three
      // intensity options to draw. The public site describes that control, so the frame has to
      // show it rather than a preview panel that offers no choice.
      await target.getByRole('button', { name: 'Preview The Romantic', exact: true }).click();
      // The control reads "Select The Romantic" while the world is not saved and "The Romantic is
      // selected" once it is, which is the state the phone context inherits from the desktop run.
      const select = target.getByRole('button', { name: 'Select The Romantic', exact: true });
      if (await select.count() > 0) await select.click();
      await target.locator('[data-world-intensity-option="calm"]').waitFor({ timeout: 30000 });
      await target.getByRole('button', { name: 'Preview The Romantic', exact: true }).scrollIntoViewIfNeeded();
    };

    captures.push(await capture(page, {
      file: 'world-picker.png', url: `${base}/profile`, label: 'the beauty world chooser',
      wait: () => openWorlds(page),
    }));

    captures.push(await capture(page, {
      file: 'community-feed.png', url: `${base}/discover?tab=looks`, label: 'the creator feed',
      wait: async () => { await page.waitForTimeout(1500); },
    }));

    await page.close();
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    // The session cookie is per context, so the phone context signs in as the same account
    // through the same real OTP path rather than by copying a token across.
    const phonePage = await mobile.newPage();
    await signIn(phonePage, mail);
    await clearTour(phonePage);
    captures.push(await capture(phonePage, {
      file: 'mobile-worlds.png', url: `${base}/profile`, label: 'the world chooser at phone width',
      wait: () => openWorlds(phonePage),
    }));
    await phonePage.close();

    const rows = {};
    for (const table of ['users', 'identity_workspaces', 'social_posts', 'services', 'bookings']) {
      rows[table] = Number((await cluster.owner.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
    }
    const emails = mail.messages.map(message => message.to);
    const receipt = {
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster with the schema-only base fixture, one fresh QA identity created by real emailed OTP, no seed rows of any kind',
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      clusterIdentity: cluster.identity,
      databaseRowsAtCapture: rows,
      syntheticDataSeeded: 'none',
      otpEmailsCaptured: emails,
      captures: captures.filter(Boolean),
      appServerLogTail: serverLog.join('').slice(-3000),
      failures,
    };
    fs.writeFileSync(path.join(root, receiptPath), JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receipt.captures.length}/4 frames, users ${rows.users}, posts ${rows.social_posts}`);
    if (receipt.captures.length !== 4) process.exitCode = 1;
  }
  catch (error) {
    failures.push(String(error.message || error).split('\n')[0].slice(0, 400));
    fs.writeFileSync(path.join(root, receiptPath), JSON.stringify({ captures, failures }, null, 2));
    console.log('capture run failed:', failures[0]);
    process.exitCode = 1;
  }
  finally {
    await teardown();
  }
})().then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
