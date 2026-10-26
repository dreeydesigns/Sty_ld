// Run against a local production build. Every API response is intercepted.
// Usage: node tests/browser/private-saves.cjs <playwright module> [base URL]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const base = process.env.STYLD_BASE_URL || process.argv[3] || 'http://localhost:3107';
const postId = '11111111-1111-4111-8111-111111111111';
const workspaceId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
const post = {
  id: postId, author_workspace_id: workspaceId, author_name: 'Mock creator', author_role: 'professional',
  post_type: 'portfolio', caption: 'Mock braided look', tags: ['braids'], media_urls: [], created_at: '2026-10-23T08:00:00Z',
  look: { postId, authorWorkspaceId: workspaceId, authorName: 'Mock creator', authorRole: 'professional',
    postType: 'portfolio', caption: 'Mock braided look', mediaUrls: [], tags: ['braids'], serviceId,
    publicationStatus: 'published', moderationStatus: 'visible', createdAt: '2026-10-23T08:00:00Z', demoProvenance: { trusted: false } },
};
const service = { id: serviceId, name: 'Mock braids', description: 'Browser fixture only', price: 2000, duration_minutes: 60, category: 'Hair' };
const user = { id: 'mock-client', workspaceId: 'mock-workspace', role: 'client', firstName: 'Test', phone: '',
  theme: 'not_set', worldIntensity: 'balanced', tribeBadge: '', quizCompleted: true, themeSetBy: 'quiz',
  themeUpdatedAt: '2026-10-23', subscription: { tier: 'none', status: 'inactive' }, tribes: [], createdAt: '2026-10-23' };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fixture(browser, { width = 390, world = 'default', reduced = false, guest = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  let saved = [], fail = false, unavailable = false, collectionError = false, mutations = 0;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()), method = route.request().method();
    let body = { ok: true }, status = 200;
    if (url.pathname === '/api/me') {
      body = guest ? { ok: false } : { ok: true, user: { ...user, theme: world === 'default' ? 'not_set' : world } };
      status = guest ? 401 : 200;
    } else if (url.pathname.startsWith('/api/social/saves')) {
      if (method !== 'GET') { mutations++; await pause(100); }
      if (method !== 'GET' && fail) { status = 500; body = { ok: false }; }
      else {
        if (method === 'POST') saved = [postId];
        if (method === 'DELETE') saved = [];
        body = { ok: true, savedPostIds: saved };
      }
    } else if (url.pathname === '/api/services') body = { ok: true, services: [service] };
    else if (url.pathname === '/api/social/posts') {
      body = { ok: true, posts: unavailable ? [] : [post] };
      if (collectionError && url.searchParams.has('ids')) { body = { ok: false }; status = 500; }
    }
    else if (url.pathname === `/api/social/posts/${postId}`) { body = unavailable ? { ok: false } : { ok: true, post }; status = unavailable ? 404 : 200; }
    else if (url.pathname.startsWith('/api/creators/')) body = { ok: true, creator: { displayName: 'Mock creator', role: 'professional' } };
    else if (url.pathname === '/api/auth/session') { status = 401; body = { ok: false }; }
    else if (method !== 'GET') throw new Error(`Unexpected API mutation: ${method} ${url.pathname}`);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const localHost = new URL(base).hostname;
  await context.route((url) => url.hostname !== localHost, (route) => route.abort());
  return { context, page, errors, fail: (value) => { fail = value; }, unavailable: (value) => { unavailable = value; },
    collectionError: (value) => { collectionError = value; }, mutations: () => mutations };
}
async function check(page, predicate, label) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await pause(50); }
  throw new Error(label);
}
async function pressed(page, value) {
  await check(page, async () => await page.getByRole('button', { name: value ? 'Unsave look' : 'Save look', exact: true }).getAttribute('aria-pressed').catch(() => '') === String(value), `pressed=${value}`);
  await check(page, async () => await page.getByRole('button', { name: value ? 'Unsave look' : 'Save look', exact: true }).isEnabled().catch(() => false), 'save enabled');
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0;
  let activePage;
  try {
    for (const world of ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude']) {
      for (const width of [360, 375, 390, 768, 1440]) {
        const f = await fixture(browser, { width, world, reduced: true });
        const { page } = f;
        activePage = page;
        await page.goto(`${base}/discover?tab=looks`);
        await pressed(page, false);
        await check(page, async () => await page.locator('html').getAttribute('data-world') === world, 'correct Beauty World');
        await noOverflow(page);
        const cardLink = page.locator(`a[href="/looks/${postId}"]`).first();
        await cardLink.hover();
        assert.equal(await cardLink.evaluate((link) => getComputedStyle(link).transform), 'none', 'reduced motion suppresses card hover movement');
        if (world === 'default' && width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'styld-commit3-feed.png'), fullPage: true });
        const button = page.getByRole('button', { name: 'Save look', exact: true });
        assert.equal(await button.locator('xpath=ancestor::a').count(), 0, 'Save is outside card navigation');
        assert.ok((await button.boundingBox()).height >= 44, 'touch target is at least 44px');
        await button.focus(); assert.equal(await button.evaluate((element) => element === document.activeElement), true);
        await page.keyboard.press('Enter');
        await pressed(page, true);
        assert.match(page.url(), /discover/);
        await page.getByRole('button', { name: 'Undo', exact: true }).click(); await pressed(page, false);
        await page.getByRole('button', { name: 'Save look', exact: true }).click(); await pressed(page, true);
        await page.locator(`a[href="/looks/${postId}"]`).first().click();
        await page.waitForURL(`**/looks/${postId}`);
        await page.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
        await pressed(page, true); await noOverflow(page);
        if (world === 'default' && width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'styld-commit3-detail.png'), fullPage: true });
        assert.equal(await page.getByRole('link', { name: 'Plan this look', exact: true }).count(), 1);
        assert.doesNotMatch(await page.getByRole('button', { name: 'Unsave look', exact: true }).getAttribute('class'), /action-primary-bg/, 'Save remains secondary');
        await page.getByRole('button', { name: 'Unsave look', exact: true }).click(); await pressed(page, false);
        await page.getByRole('button', { name: 'Undo', exact: true }).click(); await pressed(page, true);
        await page.goto(`${base}/home`);
        await page.getByRole('button', { name: 'Saved', exact: true }).click();
        await pressed(page, true); await noOverflow(page);
        if (world === 'default' && width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'styld-commit3-saved.png'), fullPage: true });
        await page.locator(`a[href="/looks/${postId}"]`).first().click();
        await page.waitForURL(`**/looks/${postId}`);
        await pressed(page, true);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.deepEqual(f.errors, []);
        await f.context.close();
        passed++; console.log(`PASS ${world} ${width}px reduced motion, Feed/Detail/Saved, Save/Unsave/Undo, keyboard, navigation`);
      }
    }
    const f = await fixture(browser);
    activePage = f.page;
    await f.page.goto(`${base}/discover?tab=looks`); await pressed(f.page, false);
    f.fail(true);
    await f.page.getByRole('button', { name: 'Save look', exact: true }).click(); await pressed(f.page, false);
    await f.page.getByText('Your saves could not be updated. Try again.', { exact: true }).waitFor();
    f.fail(false);
    await f.page.getByRole('button', { name: 'Save look', exact: true }).evaluate((button) => { button.click(); button.click(); button.click(); });
    await pressed(f.page, true); assert.equal(f.mutations(), 2, 'one failed request and one rapid-tap request');
    f.collectionError(true);
    await f.page.goto(`${base}/home`); await f.page.getByRole('button', { name: 'Saved', exact: true }).click();
    await f.page.getByText('Saved looks could not be loaded.', { exact: false }).waitFor();
    f.collectionError(false);
    await f.page.getByRole('button', { name: 'Try again', exact: true }).click(); await pressed(f.page, true);
    await f.page.getByRole('button', { name: 'Unsave look', exact: true }).click();
    await f.page.getByText('No saved looks yet. Save a look from Inspire to find it here.', { exact: true }).waitFor();
    await check(f.page, async () => await f.page.getByRole('button', { name: 'Undo', exact: true }).isVisible(), 'Undo remains available after removing the last saved Look');
    await f.page.getByRole('button', { name: 'Undo', exact: true }).click(); await pressed(f.page, true);
    f.unavailable(true);
    await f.page.goto(`${base}/home`); await f.page.getByRole('button', { name: 'Saved', exact: true }).click();
    await f.page.getByText('Some saved looks are no longer available.', { exact: true }).waitFor();
    assert.equal(await f.page.locator(`a[href="/looks/${postId}"]`).count(), 0);
    await f.context.close(); passed++;
    const guest = await fixture(browser, { guest: true });
    await guest.page.goto(`${base}/discover?tab=looks`);
    await guest.page.getByRole('link', { name: 'Sign in to save', exact: true }).waitFor();
    assert.equal(guest.mutations(), 0);
    await guest.context.close(); passed++;
    console.log(`PASS ${passed} browser scenarios. All API requests mocked. No live QA or database writes.`);
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: path.join(os.tmpdir(), 'styld-commit3-browser-failure.png'), fullPage: true });
      console.log(await activePage.getByRole('button', { name: 'Saved', exact: true }).evaluateAll((buttons) => buttons.map((button) => ({ rect: button.getBoundingClientRect().toJSON(), parent: button.parentElement.outerHTML.slice(0, 1000) }))));
    }
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
