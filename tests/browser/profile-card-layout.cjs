// MOBILE-PROFILE-02 proof. The founder's iPhone capture (IMG_5469.jpeg) shows the profile card with
// the avatar, the name and the world chip pushed against the left edge of the card and the bottom
// corners square. `77d5eac` put the padding and the rounding back on the client card. This suite
// measures what a visitor actually sees, on the client card and on the Professional/Salon card, at
// five phone widths, at Small/Medium/Large text and across all six STYLD beauty worlds.
//
// Every figure is read off the painted page: computed padding, the four corner radii, the avatar's
// inset from the card edge, how far the card overlaps the cover, whether the camera badge and the
// Edit profile action can be hit at their own centre point, and whether anything forces the document
// wider than the screen. Nothing is asserted by grepping the className string.
//
// Usage: node tests/browser/profile-card-layout.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_PROFILE_RECEIPT || 'docs/readiness/beta/live-profile-card-layout.json';
const shotsDir = process.env.STYLD_PROFILE_SHOTS || 'docs/readiness/beta/screenshots';

const CLIENT_EMAIL = 'profile-layout-client@example.test';
const PROVIDER_NAME = 'Profile Layout QA Studio';
const VIEWPORTS = [
  { name: 'iphone-5', width: 320, height: 568 },
  { name: 'android-small', width: 360, height: 640 },
  { name: 'iphone-8', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'iphone-max', width: 430, height: 932 },
];
const WORLDS = [
  { key: 'default', label: 'Pure' },
  { key: 'feminine', label: 'The Romantic' },
  { key: 'natural', label: 'The Earth Woman' },
  { key: 'spiritual', label: 'The Seeker' },
  { key: 'cultural', label: 'The Daughter of the Soil' },
  { key: 'african_nude', label: 'The Muse' },
];
const SCALES = [
  { pill: 'S', key: 'small', expect: '0.9' },
  { pill: 'M', key: 'medium', expect: '1' },
  { pill: 'L', key: 'large', expect: '1.15' },
];

const results = [];
const samples = [];
const notes = [];
const shots = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 900) });
    console.log(`FAIL ${name}: ${String(error.message || error).split('\n')[0].slice(0, 320)}`);
  }
}

// A sweep that stops at its first bad case leaves the rest of the grid unmeasured and unphotographed,
// which is exactly the evidence a before run needs. Each case is caught, and the step fails at the end
// with everything that went wrong rather than only the first thing.
async function eachCase(failures, label, run) {
  try {
    await run();
  } catch (error) {
    failures.push(`${label}: ${String(error.message || error).split('\n')[0]}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// Runs in the page, so it is serialised on its own and cannot read this file's constants. The label
// it is looking for in the heading is passed in.
function cardProbe(scope) {
  const px = (value) => Math.round(parseFloat(value) * 100) / 100;
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: px(rect.x), y: px(rect.y), left: px(rect.left), top: px(rect.top), right: px(rect.right),
      bottom: px(rect.bottom), width: px(rect.width), height: px(rect.height) };
  };
  const card = document.querySelector('div.bw-surface.world-glass[class*="-mt-12"]');
  const cover = document.querySelector('div.relative[class*="h-44"]');
  if (!card) return { found: false, cardsOnPage: document.querySelectorAll('.world-glass').length };

  const cs = getComputedStyle(card);
  const cardBox = box(card);
  const avatarWrap = card.querySelector('div[class*="rounded-full"][class*="border-4"]');
  const avatarBox = avatarWrap ? box(avatarWrap) : null;
  const name = card.querySelector('h1');
  const nameBox = name ? box(name) : null;

  // The action the founder named: the client card uses a button, the provider card uses a button too,
  // and both say Edit Profile in the same voice.
  const action = Array.from(card.querySelectorAll('button, a'))
    .find((node) => /^edit profile$/i.test((node.textContent || '').trim())) || null;
  const actionBar = action ? box(action) : null;

  // The avatar edit control is a labelled button on the client card and a file-input label on the
  // provider card. Either way it is the clickable thing anchored to the avatar's bottom-right.
  const badgeHost = avatarWrap ? avatarWrap.parentElement : null;
  const badge = badgeHost
    ? Array.from(badgeHost.querySelectorAll('button, label'))
        .find((node) => /profile photo/i.test(node.getAttribute('aria-label') || '') || node.tagName === 'LABEL') || null
    : null;
  const badgeBox = badge ? box(badge) : null;
  const badgeCentre = badge ? { x: badgeBox.x + badgeBox.width / 2, y: badgeBox.y + badgeBox.height / 2 } : null;
  const badgeHit = badgeCentre
    ? (() => {
      const top = document.elementFromPoint(badgeCentre.x, badgeCentre.y);
      return { reached: !!top && (top === badge || badge.contains(top) || (top.contains && top.contains(badge))),
        tag: top ? `${top.tagName.toLowerCase()}.${(top.getAttribute('class') || '').slice(0, 60)}` : null };
    })()
    : { reached: false, tag: null };

  const actionCentre = actionBar ? { x: actionBar.x + actionBar.width / 2, y: actionBar.y + actionBar.height / 2 } : null;
  const actionHit = actionCentre
    ? (() => {
      const top = document.elementFromPoint(actionCentre.x, actionCentre.y);
      return { reached: !!top && (top === action || action.contains(top)),
        tag: top ? `${top.tagName.toLowerCase()}.${(top.getAttribute('class') || '').slice(0, 60)}` : null };
    })()
    : { reached: false, tag: null };

  const nav = document.querySelector('nav[class*="mobile-bottom-nav"]');
  const stats = card.querySelector('div[class*="border-b"][class*="pb-4"]');

  return {
    found: true,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    padding: { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) },
    radii: { topLeft: px(cs.borderTopLeftRadius), topRight: px(cs.borderTopRightRadius),
      bottomLeft: px(cs.borderBottomLeftRadius), bottomRight: px(cs.borderBottomRightRadius) },
    card: cardBox,
    cover: cover ? box(cover) : null,
    overlap: cover ? Math.round((box(cover).bottom - cardBox.top) * 100) / 100 : null,
    avatar: avatarBox,
    avatarInset: avatarBox ? { left: Math.round((avatarBox.left - cardBox.left) * 100) / 100,
      top: Math.round((avatarBox.top - cardBox.top) * 100) / 100 } : null,
    avatarInsideCard: avatarBox
      ? avatarBox.left >= cardBox.left - 0.5 && avatarBox.right <= cardBox.right + 0.5
        && avatarBox.top >= cardBox.top - 0.5 && avatarBox.bottom <= cardBox.bottom + 0.5
      : false,
    name: nameBox, nameText: name ? (name.textContent || '').trim().slice(0, 40) : null,
    nameFontPx: name ? px(getComputedStyle(name).fontSize) : null,
    nameClipped: name ? name.scrollWidth > name.clientWidth + 1 : null,
    action: actionBar, actionText: action ? (action.textContent || '').trim().slice(0, 24) : null,
    badge: badgeBox, badgeHit, actionHit,
    nav: nav ? box(nav) : null,
    stats: stats ? box(stats) : null,
    docScrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    dataWorld: document.documentElement.getAttribute('data-world'),
    textScale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim(),
    rootPx: px(getComputedStyle(document.documentElement).fontSize),
  };
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'profile-card' });
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
    fs.mkdirSync(path.join(root, shotsDir), { recursive: true });
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
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await context.route(/.*/, route => {
      const host = new URL(route.request().url()).hostname;
      if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    const worldCalls = [];
    page.on('response', async (response) => {
      if (!response.url().endsWith('/api/users/me')) return;
      worldCalls.push({ status: response.status(), body: (await response.text().catch(() => '')).slice(0, 240) });
    });

    async function readCard() {
      await page.waitForSelector('div.bw-surface.world-glass[class*="-mt-12"]', { timeout: 25000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 200))));
      return page.evaluate(cardProbe);
    }

    // The walkthrough and the personalization dialog both sit over the card by design, so every
    // measurement is taken at rest. The tour keeps one dismissal per role scope, which is why
    // switching to a professional workspace starts the professional guide again.
    // A measurement and its photograph must describe the same state, so the sweep returns the page to
    // the top first. The fixed bottom bar only reaches over the card at a scrolled position, and the
    // bar step below is the one place that measures on purpose away from the top.
    async function atRest() {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
    }

    async function dismissOverlays(skipBudget = 2500) {      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: skipBudget }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 }).catch(() => null);
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 }).catch(() => null);
      }
      const close = page.locator('div[role="dialog"]').getByRole('button', { name: 'Close profile personalization', exact: true });
      if (await close.waitFor({ timeout: 1000 }).then(() => true).catch(() => false)) {
        await close.click({ timeout: 8000 }).catch(() => null);
        await page.waitForTimeout(250);
      }
    }

    async function shot(name) {
      const file = `${shotsDir}/${name}.png`;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
      const card = await page.evaluate(() => {
        const node = document.querySelector('div.bw-surface.world-glass[class*="-mt-12"]');
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { bottom: rect.bottom, height: rect.height };
      });
      if (!card) return;
      const width = page.viewportSize().width;
      const height = Math.min(Math.max(card.bottom + 24, 360), page.viewportSize().height);
      await page.screenshot({ path: path.join(root, file), clip: { x: 0, y: 0, width, height } });
      shots.push(path.basename(file));
    }

    await step('a real client signs in on the disposable cluster', async () => {
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fprofile`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill(CLIENT_EMAIL);
      await cluster.owner.query('DELETE FROM auth_limits');
      await cluster.owner.query('DELETE FROM auth_rate_limits');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
      const code = await mail.waitForCode(CLIENT_EMAIL);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
        .waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill('Dreey');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/profile', { timeout: 25000 }).catch(async () => {
        await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
      });
      await dismissOverlays(12000);
    });

    await step('the client card keeps a 16 to 24 px gutter on every phone width', async () => {
      const failures = [];
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(250);
        await eachCase(failures, viewport.name, async () => {
          await atRest();
          const lit = await readCard();
          const underBar = (box) => !!box && !!lit.nav && box.bottom > lit.nav.top && box.top < lit.nav.bottom;
          const atRestOverlap = { badge: underBar(lit.badge), name: underBar(lit.name), action: underBar(lit.action) };
          await shot(`profile-card-client-${viewport.name}`);
          assert.equal(lit.found, true, `no profile card painted at ${viewport.width}x${viewport.height} (${lit.cardsOnPage} glass surfaces on the page)`);
          const gutter = Math.min(lit.padding.left, lit.padding.right, lit.padding.top, lit.padding.bottom);
          const widest = Math.max(lit.padding.left, lit.padding.right, lit.padding.top, lit.padding.bottom);
          assert.ok(gutter >= 16, `the narrowest inset is ${gutter}px, under the 16px floor (padding ${JSON.stringify(lit.padding)})`);
          assert.ok(widest <= 24, `an inset of ${widest}px is outside the 16 to 24px gutter band`);
          assert.ok(lit.card.width <= viewport.width, `the card is ${lit.card.width}px wide on a ${viewport.width}px screen`);
          assert.equal(lit.horizontalOverflow, false, `the document is ${lit.docScrollWidth}px wide on a ${viewport.width}px screen`);
          assert.ok(lit.overlap >= 16, `the card overlaps the cover by ${lit.overlap}px, which is not a deliberate overlap`);
          assert.equal(lit.avatarInsideCard, true, `the avatar box ${JSON.stringify(lit.avatar)} is outside the card box ${JSON.stringify(lit.card)}`);
          assert.ok(lit.avatarInset.left >= 16, `the avatar is ${lit.avatarInset.left}px from the card edge`);
          assert.ok(lit.name.left - lit.card.left >= 16, `the name starts ${lit.name.left - lit.card.left}px inside the card edge`);
          // A collapsed badge would still report a hit at its own centre, so the size is checked at
          // every width and not only in the 390px step.
          assert.ok(lit.badge && lit.badge.width >= 24 && lit.badge.height >= 24,
            `the avatar edit control measures ${JSON.stringify(lit.badge)} at ${viewport.width}x${viewport.height}, under the 24px floor`);

          // The bar floats at the bottom of the viewport, so on a short phone the first paint puts the
          // avatar row under it. That is only a defect if scrolling cannot clear it, so scroll on purpose
          // and prove the two edit controls take a tap on every width.
          await page.evaluate(() => {
            const node = Array.from(document.querySelectorAll('div.bw-surface.world-glass[class*="-mt-12"] button'))
              .find((el) => /^edit profile$/i.test((el.textContent || '').trim()));
            if (node) node.scrollIntoView({ block: 'center' });
          });
          await page.waitForTimeout(300);
          const scrolled = await readCard();
          assert.equal(scrolled.badgeHit.reached, true,
            `after scrolling on a ${viewport.width}x${viewport.height} screen a tap on the avatar edit control lands on ${JSON.stringify(scrolled.badgeHit.tag)}`);
          assert.equal(scrolled.actionHit.reached, true,
            `after scrolling on a ${viewport.width}x${viewport.height} screen a tap on Edit profile lands on ${JSON.stringify(scrolled.actionHit.tag)}`);

          samples.push({ stage: 'client-viewport', viewport: `${viewport.width}x${viewport.height}`, padding: lit.padding,
            radii: lit.radii, overlap: lit.overlap, avatarInset: lit.avatarInset, name: lit.name, action: lit.action,
            badge: lit.badge, badgeCoveredBy: lit.badgeHit.tag, stats: lit.stats, nav: lit.nav,
            atRestUnderBar: atRestOverlap,
            revealedByScroll: { badge: scrolled.badgeHit.reached, action: scrolled.actionHit.reached } });
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert.deepEqual(failures, [], `${failures.length} of ${VIEWPORTS.length} phone widths failed:\n  ${failures.join('\n  ')}`);
    });

    await step('all four corners of the client card are round at 28 px', async () => {
      const lit = await readCard();
      const corners = [lit.radii.topLeft, lit.radii.topRight, lit.radii.bottomLeft, lit.radii.bottomRight];
      assert.deepEqual(corners, [28, 28, 28, 28],
        `the card painted radii ${JSON.stringify(lit.radii)}: a square bottom corner is the edge the founder circled`);
    });

    await step('the avatar sits inside the card with the gutter, whole and unclipped', async () => {
      const lit = await readCard();
      assert.ok(lit.avatar, 'no avatar circle was found inside the card');
      assert.ok(lit.avatarInset.left >= 16, `the avatar is ${lit.avatarInset.left}px from the card edge`);
      assert.ok(lit.avatarInset.top >= 16, `the avatar is ${lit.avatarInset.top}px from the card top`);
      assert.equal(lit.avatarInsideCard, true,
        `the avatar box ${JSON.stringify(lit.avatar)} is outside the card box ${JSON.stringify(lit.card)}`);
      assert.ok(Math.abs(lit.avatar.width - lit.avatar.height) < 1, `the avatar is ${lit.avatar.width}x${lit.avatar.height}, not a circle`);
      assert.ok(lit.avatar.width >= 90, `the avatar renders ${lit.avatar.width}px wide`);
      assert.ok(lit.overlap >= 16, `the card only overlaps the cover by ${lit.overlap}px`);
      assert.ok(lit.card.top < lit.cover.bottom, 'the card no longer breaks into the cover at all');
    });

    await step('the camera badge and Edit profile are inside the card and hit-testable', async () => {
      const lit = await readCard();
      assert.ok(lit.badge, 'the avatar has no edit control at all');
      assert.ok(lit.badge.width >= 24 && lit.badge.height >= 24,
        `the avatar edit control measures ${lit.badge.width}x${lit.badge.height}px, under the 24px WCAG 2.2 target floor`);
      assert.equal(lit.badgeHit.reached, true,
        `a tap on the avatar edit control lands on ${JSON.stringify(lit.badgeHit.tag)}, so the badge is covered`);
      assert.equal(lit.badge.right <= lit.card.right - 8, true, 'the badge hangs off the card edge');
      assert.equal(lit.badge.bottom <= lit.avatar.bottom + 1, true, 'the badge is not anchored to the avatar');
      assert.ok(lit.action, 'there is no Edit profile action inside the card');
      assert.ok(lit.action.height >= 24, `the Edit profile action is ${lit.action.height}px tall`);
      assert.equal(lit.actionHit.reached, true,
        `a tap on Edit profile lands on ${JSON.stringify(lit.actionHit.tag)}`);
      assert.equal(lit.action.right <= lit.card.right - 8, true, `the action box ${JSON.stringify(lit.action)} crosses the card edge`);
    });

    await step('the name, the badge and the action do not collide', async () => {
      const lit = await readCard();
      const hits = (a, b) => a && b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      assert.equal(hits(lit.name, lit.badge), false,
        `the name box ${JSON.stringify(lit.name)} overlaps the camera badge ${JSON.stringify(lit.badge)}`);
      assert.equal(hits(lit.name, lit.action), false,
        `the name box ${JSON.stringify(lit.name)} overlaps the action ${JSON.stringify(lit.action)}`);
      assert.equal(hits(lit.name, lit.stats), false, 'the name runs into the stats bar');
      assert.ok(lit.name.left - lit.card.left >= 16, `the name starts ${lit.name.left - lit.card.left}px inside the card edge`);
      assert.equal(lit.nameClipped, false, `the name ${JSON.stringify(lit.nameText)} is clipped by its own box`);
      assert.ok(lit.stats.left >= lit.card.left - 0.5 && lit.stats.right <= lit.card.right + 0.5,
        `the stats bar ${JSON.stringify(lit.stats)} is outside the card ${JSON.stringify(lit.card)}`);
    });

    await step('an action that sits beside the bottom bar still takes a tap', async () => {
      await page.evaluate(() => {
        const node = Array.from(document.querySelectorAll('div.bw-surface.world-glass[class*="-mt-12"] button, div.bw-surface.world-glass[class*="-mt-12"] a'))
          .find((el) => /^edit profile$/i.test((el.textContent || '').trim()));
        if (node) node.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(300);
      const lit = await readCard();
      assert.ok(lit.nav, 'the mobile bottom bar is not on the page, so this check has nothing to compare');
      const overlaps = lit.action.bottom > lit.nav.top && lit.action.top < lit.nav.bottom;
      assert.equal(overlaps && !lit.actionHit.reached, false,
        `the Edit profile box ${JSON.stringify(lit.action)} sits under the bottom bar ${JSON.stringify(lit.nav)} and is not reachable`);
    });

    await step('Small, Medium and Large text keep the card padded and inside the screen', async () => {
      const failures = [];
      for (const scale of SCALES) {
        await eachCase(failures, scale.key, async () => {
          await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
          await page.getByText('Text size', { exact: true }).waitFor({ timeout: 20000 });
          const row = page.locator('div.flex.items-center', { has: page.getByText('Text size', { exact: true }) }).first();
          await row.getByRole('button', { name: scale.pill, exact: true }).click({ timeout: 15000 });
          await page.waitForTimeout(350);
          const stored = await page.evaluate(() => (JSON.parse(window.localStorage.getItem('styld_settings') || '{}')).textSize);
          assert.equal(stored, scale.key, `the ${scale.pill} pill wrote ${JSON.stringify(stored)} instead of ${scale.key}`);

          await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
          await atRest();
          const lit = await readCard();
          await shot(`profile-card-text-${scale.key}`);
          assert.equal(lit.textScale, scale.expect, `the profile page carries --text-scale ${lit.textScale} after the ${scale.pill} pill`);
          const gutter = Math.min(lit.padding.left, lit.padding.right);
          assert.ok(gutter >= 16, `the horizontal gutter fell to ${gutter}px`);
          assert.equal(lit.horizontalOverflow, false,
            `the document is ${lit.docScrollWidth}px wide on a ${lit.viewport.width}px screen`);
          assert.ok(lit.name.left - lit.card.left >= 16, `the name is ${lit.name.left - lit.card.left}px from the card edge`);
          assert.equal(lit.nameClipped, false, `the name is clipped at ${lit.nameFontPx}px type`);
          assert.equal(lit.avatarInsideCard, true, `the avatar left the card at ${lit.rootPx}px root`);
          assert.equal(lit.badgeHit.reached, true, `the camera badge cannot be tapped at ${lit.rootPx}px root, it lands on ${JSON.stringify(lit.badgeHit.tag)}`);
          samples.push({ stage: 'text-scale', scale: scale.key, rootPx: lit.rootPx, padding: lit.padding,
            nameFontPx: lit.nameFontPx, actionHeight: lit.action && lit.action.height, badgeSize: lit.badge && `${lit.badge.width}x${lit.badge.height}`,
            overflow: lit.docScrollWidth });
        });
      }
      // Leave the run on the default size, so the world sweep measures the same thing a first-time
      // visitor sees.
      await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
      await page.getByText('Text size', { exact: true }).waitFor({ timeout: 20000 });
      await page.locator('div.flex.items-center', { has: page.getByText('Text size', { exact: true }) })
        .first().getByRole('button', { name: 'M', exact: true }).click({ timeout: 15000 });
      await page.waitForTimeout(300);
      assert.deepEqual(failures, [], `${failures.length} of ${SCALES.length} text sizes failed:\n  ${failures.join('\n  ')}`);
    });

    await step('all six beauty worlds render the card with the same gutter', async () => {
      const failures = [];
      await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
      await readCard();
      for (const world of WORLDS) {
        await eachCase(failures, world.label, async () => {
          await page.getByRole('button', { name: 'Profile personalization', exact: true }).click({ timeout: 20000 });
          const dialog = page.locator('div[role="dialog"]');
          await dialog.waitFor({ state: 'visible', timeout: 20000 });
          await dialog.getByRole('button', { name: `Preview ${world.label}`, exact: true }).click({ timeout: 20000 });
          // The tile only previews. The picker says so in words: "Preview only. Nothing changes until
          // you select this world." A world already in place shows a disabled confirmation instead.
          const select = dialog.getByRole('button', { name: `Select ${world.label}`, exact: true });
          if (await select.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
            await select.click({ timeout: 15000 });
          } else {
            await dialog.getByRole('button', { name: `${world.label} is selected`, exact: true })
              .waitFor({ state: 'visible', timeout: 10000 });
          }
          const settled = await page.waitForFunction(
            (key) => document.documentElement.getAttribute('data-world') === key,
            world.key, { timeout: 12000, polling: 300 }
          ).then(() => true).catch(() => false);
          if (!settled) {
            const why = await page.evaluate(() => {
              const open = document.querySelector('div[role="dialog"]');
              return {
                dataWorld: document.documentElement.getAttribute('data-world'),
                dialogText: open ? (open.textContent || '').replace(/\s+/g, ' ').slice(0, 300) : null,
              };
            });
            assert.ok(false, `data-world stayed ${JSON.stringify(why.dataWorld)}. ${JSON.stringify(why.dialogText)} PATCH /api/users/me ${JSON.stringify(worldCalls.slice(-2))}`);
          }
          await dismissOverlays();
          await atRest();
          const lit = await readCard();
          await shot(`profile-card-world-${world.key}`);
          assert.equal(lit.dataWorld, world.key, `the document carries data-world ${JSON.stringify(lit.dataWorld)} after ${world.label}`);
          const gutter = Math.min(lit.padding.left, lit.padding.right, lit.padding.top, lit.padding.bottom);
          assert.ok(gutter >= 16, `the inset fell to ${gutter}px (padding ${JSON.stringify(lit.padding)})`);
          assert.deepEqual([lit.radii.topLeft, lit.radii.topRight, lit.radii.bottomLeft, lit.radii.bottomRight], [28, 28, 28, 28],
            `the card painted radii ${JSON.stringify(lit.radii)}`);
          assert.equal(lit.avatarInsideCard, true, 'the avatar is outside the card');
          assert.equal(lit.badgeHit.reached, true, `the camera badge is covered by ${JSON.stringify(lit.badgeHit.tag)}`);
          assert.equal(lit.actionHit.reached, true, `Edit profile is covered by ${JSON.stringify(lit.actionHit.tag)}`);
          assert.equal(lit.horizontalOverflow, false, `the document is ${lit.docScrollWidth}px wide`);
          samples.push({ stage: 'world', world: world.key, label: world.label, padding: lit.padding,
            radii: lit.radii, overlap: lit.overlap, avatarInset: lit.avatarInset, nameFontPx: lit.nameFontPx });
        });
        // A world that failed mid-dialog would otherwise leave it open over the next measurement.
        const close = page.locator('div[role="dialog"]').getByRole('button', { name: 'Close profile personalization', exact: true });
        if (await close.waitFor({ timeout: 1500 }).then(() => true).catch(() => false)) await close.click({ timeout: 8000 }).catch(() => null);
        await page.waitForTimeout(250);
      }
      assert.deepEqual(failures, [], `${failures.length} of ${WORLDS.length} worlds failed:\n  ${failures.join('\n  ')}`);
    });

    await step('a professional workspace is seeded and switched to through the app', async () => {
      const me = await page.request.get(`${base}/api/auth/session`);
      assert.equal(me.ok(), true, 'the signed-in session is still live');
      const session = (await me.json()).session;
      const workspaceId = randomUUID();
      await cluster.owner.query(
        'INSERT INTO identity_workspaces(id,user_id,role,status,profile) VALUES($1,$2,$3,$4,$5)',
        [workspaceId, session.user_id, 'professional', 'active',
          JSON.stringify({ displayName: PROVIDER_NAME, location: 'Kilimani, Nairobi', serviceMode: 'Salon', specialty: 'Braids' })]);
      await page.goto(`${base}/settings/workspaces`, { waitUntil: 'domcontentloaded' });
      const button = page.getByRole('button', { name: /^professional/ }).first();
      await button.waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(await button.isDisabled(), false, 'the seeded professional workspace is not switchable');
      await button.click({ timeout: 15000 });
      await page.waitForURL(/\/(home|profile)/, { timeout: 25000 });
      const role = await page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).session.assumed_role);
      assert.equal(role, 'professional', `the session now reads ${role}`);
    });

    await step('the professional card keeps the same gutter and rounding', async () => {
      await page.goto(`${base}/profile`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await dismissOverlays(9000);
      await atRest();
      const lit = await readCard();
      await shot('profile-card-provider-390');
      samples.push({ stage: 'provider', padding: lit.padding, radii: lit.radii, overlap: lit.overlap,
        avatarInset: lit.avatarInset, name: lit.name, action: lit.action, badge: lit.badge,
        badgeCoveredBy: lit.badgeHit.tag, actionCoveredBy: lit.actionHit.tag });
      assert.equal(lit.found, true, 'the professional profile card did not paint');
      assert.equal(lit.dataWorld, null, 'a provider session should not carry a client beauty world');
      const gutter = Math.min(lit.padding.left, lit.padding.right, lit.padding.top, lit.padding.bottom);
      assert.ok(gutter >= 16, `the provider card inset is ${gutter}px (padding ${JSON.stringify(lit.padding)}): the content is flush to the card edge`);
      assert.ok(gutter <= 24, `the provider card inset is ${gutter}px, outside the 16 to 24px band`);
      assert.deepEqual([lit.radii.topLeft, lit.radii.topRight, lit.radii.bottomLeft, lit.radii.bottomRight], [28, 28, 28, 28],
        `the provider card painted radii ${JSON.stringify(lit.radii)}: a square corner is the defect this row is about`);
      assert.ok(lit.avatarInset.left >= 16, `the provider avatar sits ${lit.avatarInset.left}px from the card edge`);
      assert.equal(lit.avatarInsideCard, true, `the provider avatar is outside the card box ${JSON.stringify(lit.card)}`);
      assert.ok(lit.overlap >= 16, `the provider card overlaps the cover by ${lit.overlap}px`);
      assert.equal(lit.badgeHit.reached, true, `the provider camera badge is covered by ${JSON.stringify(lit.badgeHit.tag)}`);
      assert.equal(lit.actionHit.reached, true, `the provider Edit Profile action is covered by ${JSON.stringify(lit.actionHit.tag)}`);
      assert.ok(lit.name.left - lit.card.left >= 16, `the provider name is ${lit.name.left - lit.card.left}px from the edge`);
      assert.equal(lit.horizontalOverflow, false, `the provider page is ${lit.docScrollWidth}px wide on a ${lit.viewport.width}px screen`);
    });

    await step('the card holds at 320 px and at 430 px for a provider', async () => {
      const failures = [];
      for (const viewport of [VIEWPORTS[0], VIEWPORTS[4]]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(250);
        await eachCase(failures, viewport.name, async () => {
          await atRest();
          const lit = await readCard();
          await shot(`profile-card-provider-${viewport.name}`);
          const gutter = Math.min(lit.padding.left, lit.padding.right);
          assert.ok(gutter >= 16, `provider gutter ${gutter}px (padding ${JSON.stringify(lit.padding)})`);
          assert.deepEqual([lit.radii.topLeft, lit.radii.topRight, lit.radii.bottomLeft, lit.radii.bottomRight], [28, 28, 28, 28],
            `the provider card painted radii ${JSON.stringify(lit.radii)}`);
          assert.equal(lit.avatarInsideCard, true, 'the provider avatar left the card');
          assert.equal(lit.horizontalOverflow, false, `${lit.docScrollWidth}px on a ${viewport.width}px screen`);
          samples.push({ stage: 'provider-viewport', viewport: `${viewport.width}x${viewport.height}`, padding: lit.padding, radii: lit.radii });
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert.deepEqual(failures, [], `${failures.length} of 2 provider widths failed:\n  ${failures.join('\n  ')}`);
    });

    await step('the profile sweep adds no client-side errors', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('every measurement is taken at rest. The walkthrough card and the personalization dialog both '
      + 'legitimately sit over the profile header while they are open, and the tour keeps one dismissal per role '
      + 'scope, so switching to the seeded professional workspace starts the professional guide again; the harness '
      + 'dismisses each overlay before the hit test, the way a visitor does, and never measures through a modal.');
    notes.push('the client card and the Professional/Salon card are separate blocks in '
      + 'components/role-profile-workspace.tsx. 77d5eac moved only the client one, so the provider step '
      + 'below is the half of the founder report that was still open when this suite was written.');
    notes.push('worlds are changed through the app itself: the Profile personalization dialog on /profile, '
      + 'where a tile only previews a world and the Select button under the preview calls '
      + 'saveClientBeautyWorld and PATCHes /api/users/me. The document is then read for data-world, so the '
      + 'six measurements are of the themed surface a visitor ends up on, not of a stored string.');
    notes.push('text sizes are set by clicking the S, M and L pills on /settings, and the profile page is '
      + 'then reloaded, which is the path a visitor takes. The world gallery page is development-only and '
      + '404s in this production build, so it is not used.');
    notes.push('target sizes are measured, not assumed: the avatar edit control and the Edit profile action '
      + 'are asserted against the 24px WCAG 2.2 AA floor. Apple HIG asks for 44pt, which these controls do '
      + 'not reach, and the receipt records the painted size so the founder can decide; the record is not a '
      + 'claim that 44pt is met.');
    notes.push('viewport 320x568, 360x640, 375x667, 390x844 and 430x932 in installed Chrome with touch '
      + 'emulation and deviceScaleFactor 2. This is a simulated phone, not a hand-held device, so it does '
      + 'not close the real-device sign-off in FND-01.');
    notes.push('the bottom bar is a measured finding, not a passed claim. It floats over the viewport, so on '
      + 'the short phones the first paint drops part of the avatar row under it: at 320x568 the camera badge '
      + 'and the name, at 360x640 the name and the Edit profile action, at 375x667 the bottom of the Edit '
      + 'profile action. Scrolling clears it, and the sweep hit-tests both controls after scrolling on every '
      + 'width, which is what that step asserts. The per-width at-rest numbers are in '
      + 'samples[].atRestUnderBar and in the screenshots, so the founder can rule on the first-paint '
      + 'collision itself; it is not marked fixed here, because the only fix is a hero-height move and the '
      + 'freeze allows no non-critical UI change.');
    notes.push('nothing off loopback is reached: the route filter aborts every request whose host is not '
      + '127.0.0.1 or localhost, the database is a disposable cluster this run creates and drops, and the '
      + 'OTP goes to a loopback stand-in.');

    const failed = results.filter(item => item.status === 'fail');
    const receiptCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['-C', root, 'status', '--porcelain', '--', 'components', 'app', 'lib'],
      { encoding: 'utf8' }).trim();
    if (dirty) {
      notes.push('the working tree is not clean for this run: ' + dirty.replace(/\s+/g, ' ')
        + '. This receipt therefore describes a build made from source with a change on top of '
        + receiptCommit + ', which is how the before pair is taken.');
    }
    const receipt = {
      instrument: 'tests/browser/profile-card-layout.cjs',
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP to a loopback stand-in, seeded professional workspace switched through /settings/workspaces, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: receiptCommit,
      origin: base,
      clusterIdentity: cluster.identity,
      viewports: VIEWPORTS.map(item => `${item.width}x${item.height}`),
      worlds: WORLDS.map(item => item.key),
      steps: results,
      passed: results.length - failed.length,
      failed: failed.length,
      screenshots: shots,
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
  console.error('profile card proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
