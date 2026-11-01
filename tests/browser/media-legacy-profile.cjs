// MOBILE-MEDIA-04 and MOBILE-PROFILE-02 proof: a profile record that holds a dead preview address
// must not be presented as a saved photo.
//
// The editor used to write whatever it was holding into the profile, and a `blob:` or `data:`
// preview only lives inside the tab that made it. A record written by that code still carries the
// string, so the account page has to decide what a visitor may be shown: an address they can still
// open next week, or nothing at all. This suite signs a real client in on a disposable cluster,
// writes the legacy value into the record the server actually serves, reloads the page, and measures
// what the avatar and cover slots render. Then it writes a real address into the same record and
// checks the picture comes back, because a guard that hides every photo would pass the first half
// and still be wrong. Finally it drives the picker with a real photo while uploads are disabled and
// measures that the failure is reported instead of a saved photo being claimed.
//
// Where the photo really lives: `GET /api/me` answers from `identity_workspaces.profile` whenever
// the session has an active workspace, and only from `users.profile_image_url` when it does not, so
// the value a signed-in visitor sees is seeded here through the workspace record. A session with no
// workspace cannot be produced through the app, so the fallback branch is not measured below.
//
// Usage: node tests/browser/media-legacy-profile.cjs --bin "<PostgreSQL 17.11 bin>"
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
const receiptPath = process.env.STYLD_MEDIA_RECEIPT || 'docs/readiness/beta/live-media-legacy-profile.json';

const EMAIL = 'legacy-photo-client@example.test';
const LEGACY_AVATAR = 'blob:http://127.0.0.1:59991/0000dead-0000-4000-8000-000000000001';
const LEGACY_COVER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ';
// A file the app really serves, so the "a live address still shows" half can be measured by the
// bytes that arrive rather than by an attribute.
const REAL_AVATAR = '/images/empty_bookings.jpg';
const REAL_COVER = '/images/empty_bookings.jpg';

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

// Runs in the page. Reads the two profile image slots the way a visitor sees them: the element the
// avatar circle holds, and whichever branch the cover took. Nothing here is inferred from source.
function profileProbe() {
  const describe = (holder) => {
    if (!holder) return { present: false };
    const image = holder.querySelector('img');
    return {
      present: true,
      hasImage: Boolean(image),
      src: image ? image.getAttribute('src') : null,
      // A broken image is the other way a dead address leaks onto the screen, so the load state is
      // read rather than assumed.
      complete: image ? image.complete : null,
      naturalWidth: image ? image.naturalWidth : null,
      text: (holder.textContent || '').trim().slice(0, 12),
      fallback: Boolean(holder.querySelector('.bw-cover')),
    };
  };
  const button = document.querySelector('button[aria-label="Change profile photo"]');
  const circle = button && button.parentElement ? button.parentElement.firstElementChild : null;
  const coverImage = document.querySelector('img[alt="Cover"]');
  return {
    avatar: describe(circle),
    cover: coverImage
      ? { present: true, hasImage: true, src: coverImage.getAttribute('src') }
      : { present: true, hasImage: false, src: null },
    coverFallback: Boolean(document.querySelector('.bw-cover')),
    savedClaims: Array.from(document.querySelectorAll('*'))
      .filter(node => node.children.length === 0)
      .map(node => (node.textContent || '').trim())
      .filter(text => text.length < 80
        && /(photo|picture|image)[^.]{0,24}\b(saved|added|updated|uploaded)\b|\b(saved|added|uploaded)\b[^.]{0,24}(photo|picture|image)/i.test(text))
      .slice(0, 5),
  };
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'media-legacy' });
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

    // Both halves of the measurement change the same record, so they share one write and one check
    // that the write landed.
    async function writeProfileImages(avatar, cover) {
      const result = await cluster.owner.query(
        `UPDATE identity_workspaces
            SET profile = profile || jsonb_build_object('profilePhoto', $1::text, 'coverPhoto', $2::text)
          WHERE user_id = (SELECT id FROM users WHERE email = $3) AND status = 'active'
          RETURNING id, role, profile ->> 'profilePhoto' AS avatar, profile ->> 'coverPhoto' AS cover`,
        [avatar, cover, EMAIL]);
      assert.equal(result.rows.length, 1, 'the signed-in workspace was not found, so the write proved nothing');
      assert.equal(result.rows[0].avatar, avatar, 'the stored record did not keep the address it was given');
      assert.equal(result.rows[0].cover, cover, 'and did not keep the cover it was given');
      return result.rows[0];
    }

    async function servedProfile() {
      const response = await page.request.get(`${base}/api/me`);
      assert.equal(response.ok(), true, 'the server has to answer for this account');
      return (await response.json()).user;
    }

    await step('a real client signs in on the disposable cluster', async () => {
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill(EMAIL);
      await cluster.owner.query('DELETE FROM auth_limits');
      await cluster.owner.query('DELETE FROM auth_rate_limits');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
      const code = await mail.waitForCode(EMAIL);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
        .waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill('Legacy Photo QA');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/home', { timeout: 25000 });
      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }
    });

    await step('the clean profile renders no image and offers the initials', async () => {
      await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button[aria-label="Change profile photo"]', { timeout: 20000 });
      const plain = await page.evaluate(profileProbe);
      assert.equal(plain.avatar.present, true, 'the avatar circle was not found, so nothing below is a measurement of it');
      assert.equal(plain.avatar.hasImage, false, 'a brand new account should not show a photo');
      assert.equal(plain.avatar.text, 'L', `the fallback shows ${plain.avatar.text}, expected the first initial`);
      assert.equal(plain.cover.hasImage, false, 'and no cover image either');
      assert.equal(plain.coverFallback, true, 'the cover falls back to the gradient');
      samples.push({ stage: 'plain', ...plain });
    });

    await step('the legacy value is written into the record the server serves', async () => {
      const seeded = await writeProfileImages(LEGACY_AVATAR, LEGACY_COVER);
      const served = await servedProfile();
      assert.equal(served?.profilePhoto, LEGACY_AVATAR,
        `the server serves ${JSON.stringify(served?.profilePhoto)}, so the page below is not refusing a legacy value`);
      assert.equal(served?.coverPhoto, LEGACY_COVER,
        `the server serves cover ${JSON.stringify(served?.coverPhoto)}`);
      samples.push({ stage: 'seeded', workspaceId: seeded.id, role: seeded.role, served });
    });

    await step('the profile page hides a dead preview address and says nothing about a saved photo', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button[aria-label="Change profile photo"]', { timeout: 20000 });
      await page.waitForTimeout(800);
      const lit = await page.evaluate(profileProbe);
      assert.equal(lit.avatar.hasImage, false,
        `the page painted a dead address as a photo: ${JSON.stringify(lit.avatar)}`);
      assert.equal(lit.avatar.text, 'L', 'the initials come back in place of a picture that cannot load');
      assert.equal(lit.cover.hasImage, false,
        `the cover painted a pasted preview: ${JSON.stringify(lit.cover)}`);
      assert.equal(lit.coverFallback, true, 'the cover keeps its gradient fallback');
      assert.deepEqual(lit.savedClaims, [], `the page claimed ${lit.savedClaims.length} saved image(s) with nothing behind them`);
      const broken = await page.evaluate(() => Array.from(document.images)
        .filter(image => /^(blob:|data:)/i.test(image.currentSrc || image.getAttribute('src') || ''))
        .map(image => (image.getAttribute('src') || '').slice(0, 40)));
      assert.deepEqual(broken, [], `${broken.length} element(s) still point at a preview address: ${JSON.stringify(broken)}`);
      samples.push({ stage: 'legacy', ...lit });
    });

    await step('a real address in the same record still shows the photo', async () => {
      await writeProfileImages(REAL_AVATAR, REAL_COVER);
      assert.equal((await servedProfile())?.profilePhoto, REAL_AVATAR, 'the server now serves the real address');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button[aria-label="Change profile photo"]', { timeout: 20000 });
      await page.waitForTimeout(1500);
      const lit = await page.evaluate(profileProbe);
      assert.equal(lit.avatar.hasImage, true, 'the guard must not hide a picture that has an address');
      assert.equal(lit.avatar.src, REAL_AVATAR, `the avatar holds ${lit.avatar.src}`);
      assert.equal(lit.avatar.complete, true, 'the real photo is expected to finish loading');
      assert.ok(lit.avatar.naturalWidth > 0, `the real photo arrived at ${lit.avatar.naturalWidth} px wide`);
      assert.equal(lit.cover.hasImage, true, 'and the cover is the same decision');
      assert.equal(lit.cover.src, REAL_COVER, `the cover holds ${lit.cover.src}`);
      samples.push({ stage: 'real', ...lit });
    });

    await step('a photo the server will not take is reported as a failure, not as a saved picture', async () => {
      // Uploads are switched off server-side for this restricted round, which is the case the
      // editor has to survive honestly: no address comes back, so no photo may be shown as saved.
      const served = await servedProfile();
      assert.equal(served?.profilePhoto, REAL_AVATAR, 'the record holds the real address going in');

      await page.click('button[aria-label="Change profile photo"]', { timeout: 10000 });
      // The sheet buttons carry a caption span, so their accessible names are longer than the label.
      await page.getByRole('button', { name: /Choose from photo library/ }).click({ timeout: 10000 });
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAF0lEQVR42mP8z8AABgYGagwAFwQC'
        + 'BglWQk0AAAAASUVORK5CYII=', 'base64');
      await page.locator('input[type="file"]').first().setInputFiles({ name: 'qa-avatar.png', mimeType: 'image/png', buffer: png });
      await page.getByRole('button', { name: /Use photo/ }).click({ timeout: 15000 });
      const sheet = page.locator('div[role="dialog"][aria-modal="true"]').last();
      await sheet.locator('[role="alert"]').first().waitFor({ timeout: 20000 });
      const message = (await sheet.innerText()).replace(/\s+/g, ' ').trim();
      assert.match(message, /unavailable|not configured|not available|failed|try again/i,
        `the sheet said: ${message.slice(0, 200)}`);

      const after = await page.evaluate(profileProbe);
      assert.equal(after.avatar.src, REAL_AVATAR, 'a refused upload must leave the shown photo alone');
      assert.deepEqual(after.savedClaims, [], `the page claimed a saved photo after a refusal: ${JSON.stringify(after.savedClaims)}`);
      const stillServed = await servedProfile();
      assert.equal(stillServed?.profilePhoto, REAL_AVATAR, 'and the record still holds the real address');
      const status = await page.request.post(`${base}/api/upload`, { data: '' });
      notes.push(`the upload route answered ${status.status()} to a post with no file, which is the server-side `
        + 'refusal this step depends on, not a client-side guess.');
      await page.keyboard.press('Escape');
      samples.push({ stage: 'upload-refused', sheetText: message.slice(0, 300), ...after });
    });

    await step('the profile journey adds no client-side errors', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('the legacy values are written into identity_workspaces.profile (the record '
      + '/api/me serves for a session that has a workspace) and read back from that endpoint before the '
      + 'page is reloaded, so the page is refusing a value the server really serves, not one the harness withheld.');
    notes.push('users.profile_image_url is only served by /api/me when the session has no active workspace, and the '
      + 'app does not produce such a signed-in session, so that fallback branch is not measured here.');
    notes.push('the real address is a file the app itself serves, so the "still shows the photo" step reads the '
      + 'decoded width rather than only the attribute. No third-party host is reached: the route filter aborts '
      + 'everything off loopback.');
    notes.push('uploads are disabled server-side in this build, so the picker step measures the honest failure path. '
      + 'The companion guard for a server that answers 200 with a preview address is covered by '
      + 'tests/image-editor-truthfulness.cjs, which injects that response.');
    notes.push('this drives the client profile card. The provider card uses the same helper but is not signed in '
      + 'here; it stays a code-level guard until a provider session is run.');

    const failed = results.filter(item => item.status === 'fail');
    const receipt = {
      instrument: 'tests/browser/media-legacy-profile.cjs',
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
  console.error('legacy profile proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
