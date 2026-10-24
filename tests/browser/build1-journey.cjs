// All content, authentication and persistence are mocked. No QA database traffic.
const assert = require('node:assert/strict');
const { chromium, fixture, backend, id, p1, s1, look1, allServices } = require('./plan-v2.cjs');
const base = process.argv[3]?.startsWith('http') ? process.argv[3] : 'http://localhost:3107';
const worlds = ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude'];
const posts = Array.from({ length: 24 }, (_, index) => ({
  id: index ? id(50 + index) : look1, author_workspace_id: p1,
  look: { postId: index ? id(50 + index) : look1, authorWorkspaceId: p1, authorName: 'Mock creator one', authorRole: 'professional', postType: 'portfolio',
    caption: `Braids inspiration ${index}`, serviceId: s1, mediaUrls: ['https://mock.test/look.svg'], tags: ['Braids'], demoProvenance: { trusted: true } },
}));
async function setup(browser, options) {
  const server = backend();
  server.extraLooks = new Map(posts.map((post) => [post.id, { postId: post.id, creatorWorkspaceId: p1, serviceId: s1, thumbnailUrl: "https://mock.test/look.svg", caption: post.look.caption }]));
  const f = await fixture(browser, server, options);
  f.server = server;
  f.content = { saved: [], feedFail: false, empty: false, saveFail: false, removed: false, feedDelay: 0 };
  await f.context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()), method = route.request().method(), state = f.content;
    let body, status = 200;
    if (url.pathname === '/api/services' && state.nullPrice) body = { success: true, services: allServices.map((service) => ({ ...service, price: service.id === s1 ? null : service.price, duration_minutes: 60 })) };
    else if (url.pathname === '/api/social/posts') {
      if (state.feedGate) await state.feedGate;
      if (state.feedDelay) await new Promise((resolve) => setTimeout(resolve, state.feedDelay));
      status = state.feedFail ? 500 : 200;
      const ids = url.searchParams.get('ids')?.split(',');
      body = { ok: !state.feedFail, posts: state.empty || state.removed ? [] : posts.filter((post) => !ids || ids.includes(post.id)) };
    } else if (url.pathname.startsWith('/api/social/posts/')) {
      const post = posts.find((item) => item.id === url.pathname.split('/').pop());
      status = state.removed || !post ? 404 : 200; body = { ok: status === 200, post };
    } else if (url.pathname.startsWith('/api/social/saves')) {
      if (method !== 'GET' && state.saveFail) { status = 500; body = { ok: false }; }
      else {
        if (method === 'POST') state.saved = [...new Set([...state.saved, route.request().postDataJSON().postId])];
        if (method === 'DELETE') state.saved = state.saved.filter((postId) => postId !== url.pathname.split('/').pop());
        body = { ok: true, savedPostIds: state.saved };
      }
    } else if (url.pathname.startsWith('/api/creators/')) body = { ok: true, creator: { workspaceId: p1, role: 'professional', displayName: 'Mock creator one', specialty: 'Hair', serviceMode: 'Both', bio: 'Mock canonical creator' } };
    else return route.fallback();
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return f;
}
async function screen(page, name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: no horizontal overflow`);
  assert.equal(await page.locator('main img').evaluateAll((images) => images.every((image) => image.getBoundingClientRect().height > 0)), true, `${name}: reserved image space`);
  const contrast = await page.locator('main [class*="bg-[var(--action-primary-bg)]"]').evaluateAll((elements) => elements.map((element) => {
    const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (values) => values.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const style = getComputedStyle(element), foreground = luminance(rgb(style.color)), background = luminance(rgb(style.backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  }));
  assert.ok(contrast.every((ratio) => ratio >= 4.5), `${name}: primary text contrast`);
  const world = await page.locator('html').getAttribute('data-world');
  await page.screenshot({ path: `${require('node:os').tmpdir()}/styld6-${world}-${page.viewportSize().width}-${name}.png` });
}
const visit = (page, path) => page.goto(base + path, { waitUntil: 'domcontentloaded' });
const saveButton = (page, name) => page.getByRole('button', { name, exact: true });
const saved = (page) => page.getByRole('status').filter({ hasText: /^Saved$/ }).waitFor();
async function undo(page) {
  await saveButton(page, 'Undo').click();
  await saveButton(page, 'Undo').waitFor({ state: 'hidden' });
  await page.getByRole('status').filter({ hasText: /^Look (saved|removed from saves)\.$/ }).waitFor();
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0, active;
  try {
    for (const world of process.argv.find((arg) => arg.startsWith('--world=')) ? [process.argv.find((arg) => arg.startsWith('--world=')).slice(8)] : process.argv.includes('--smoke') ? ['default'] : worlds) for (const width of process.argv.find((arg) => arg.startsWith('--width=')) ? [Number(process.argv.find((arg) => arg.startsWith('--width=')).slice(8))] : process.argv.includes('--smoke') ? [360] : [360, 375, 390, 768, 1440]) {
      const f = await setup(browser, { world, width }); const p = f.page; active = p; p.journeyErrors = f.errors;
      if (process.argv.includes('--cta-only')) {
        const hierarchy = async (name, expected = 1) => {
          assert.equal(await p.locator('header a[class*="bg-[var(--action-primary-bg)]"]').count(), 0, 'header does not compete with the page primary action');
          assert.equal(await p.locator('main [class*="bg-[var(--action-primary-bg)]"]').count(), expected, 'page actions follow the intended hierarchy');
          await screen(p, name);
        };
        await visit(p, `/looks/${look1}`); await p.getByRole('link', { name: 'Plan this look', exact: true }).waitFor(); await hierarchy('Look');
        await p.getByRole('link', { name: 'Plan this look', exact: true }).click(); await p.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor(); await saved(p); await hierarchy('Plan');
        await p.getByRole('link', { name: 'See my estimate', exact: true }).click(); await p.getByRole('heading', { name: 'Price breakdown', exact: true }).waitFor(); await hierarchy('Estimate');
        await visit(p, `/creators/${p1}`); await p.getByRole('heading', { name: 'Mock creator one', exact: true }).waitFor(); await p.locator('a[href^="/looks/"]').first().waitFor(); await hierarchy('Creator', 0);
        await visit(p, '/home?tab=saved'); await p.getByRole('heading', { name: 'Your saved looks', exact: true }).waitFor(); await p.getByRole('link', { name: 'Browse looks', exact: true }).waitFor(); await hierarchy('Saved-empty');
        assert.deepEqual(f.errors, []); await f.context.close(); passed++; console.log(`PASS ${world} ${width}px, header/page primary hierarchy, empty Saved, layout and contrast`); continue;
      }
      await visit(p, '/discover?tab=looks&q=braids&chip=Braids');
      const cards = p.locator('main a[href^="/looks/"]'); await cards.first().waitFor();
      assert.equal(await p.locator('html').getAttribute('data-world'), world);
      await screen(p, 'Discover');
      const chip = p.getByRole('button', { name: 'Braids', exact: true });
      assert.ok((await chip.boundingBox()).height >= 44, 'filter touch target');
      await saveButton(p, 'Save look').first().click(); await saveButton(p, 'Unsave look').first().waitFor();
      await p.getByRole('textbox', { name: 'Search discovery', exact: true }).fill('no-matching-look');
      await cards.first().waitFor({ state: 'hidden' });
      await undo(p); assert.deepEqual(f.content.saved, [], 'Undo survives filtering the target out of view');
      await p.getByRole('textbox', { name: 'Search discovery', exact: true }).fill('braids');
      await cards.first().waitFor();
      await p.getByRole('button', { name: 'Load more', exact: true }).click();
      const target = cards.nth(15); await target.scrollIntoViewIfNeeded();
      const origin = p.url(), position = await p.evaluate(() => scrollY), targetHref = await target.getAttribute('href');
      await target.click(); await p.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
      await screen(p, 'Look'); assert.equal(await p.locator('main [class*="bg-[var(--action-primary-bg)]"]').count(), 1);
      await p.getByText('Demo', { exact: true }).waitFor();
      await p.getByRole('link', { name: 'View creator', exact: true }).click();
      await p.getByRole('heading', { name: 'Mock creator one', exact: true }).waitFor(); await screen(p, 'Creator');
      await p.getByRole('link', { name: 'Back to the look', exact: true }).click();
      await p.getByRole('link', { name: 'Back to looks', exact: true }).click();
      await cards.nth(23).waitFor();
      await p.waitForFunction((y) => Math.abs(scrollY - y) < 8, position);
      assert.equal(p.url(), origin, 'filtered origin retained');
      await p.locator(`main a[href="${targetHref}"]`).click();
      await p.getByRole("link", { name: "Plan this look", exact: true }).waitFor();
      await p.goBack({ waitUntil: 'domcontentloaded' }); await cards.nth(23).waitFor();
      await p.waitForFunction((y) => Math.abs(scrollY - y) < 8, position);
      assert.equal(p.url(), origin, 'native Back retains feed context');
      await p.goForward({ waitUntil: 'domcontentloaded' }); await p.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
      await saveButton(p, 'Save look').click(); await saveButton(p, 'Unsave look').waitFor();
      await undo(p); await saveButton(p, 'Save look').click(); await saveButton(p, 'Unsave look').waitFor();
      await p.getByRole('link', { name: 'Back to looks', exact: true }).click();
      await p.getByRole('link', { name: 'Saved looks', exact: true }).click(); await p.locator(`main a[href="${targetHref}"]`).waitFor(); await p.getByRole('heading', { name: 'Your saved looks', exact: true }).waitFor();
      assert.equal(await p.getByRole('button', { name: 'Saved', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.equal(await p.getByRole('button', { name: 'Create post', exact: true }).count(), 0, 'Saved has no floating compose action');
      await screen(p, 'Saved');
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.locator(`main a[href="${targetHref}"]`).click();
      await p.getByRole('link', { name: 'Back to saved looks', exact: true }).click();
      await p.locator(`main a[href="${targetHref}"]`).waitFor();
      assert.equal(new URL(p.url()).search, '?tab=saved');
      await p.locator(`main a[href="${targetHref}"]`).click();
      await p.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
      await p.goBack({ waitUntil: 'domcontentloaded' }); await p.locator(`main a[href="${targetHref}"]`).waitFor();
      await p.goForward({ waitUntil: 'domcontentloaded' }); await p.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
      await saveButton(p, 'Unsave look').click(); await saveButton(p, 'Save look').waitFor(); await undo(p);
      await p.getByRole('link', { name: 'Plan this look', exact: true }).focus(); await p.keyboard.press('Enter');
      await p.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor(); await saved(p);
      await p.getByLabel('Preferred date', { exact: true }).fill('2028-02-29');
      await p.getByLabel('Preferred time window', { exact: true }).selectOption('morning');
      await p.getByLabel('Service mode', { exact: true }).selectOption('mobile');
      await p.getByLabel('General location area', { exact: true }).fill('Kilimani'); await saved(p); await screen(p, 'Plan');
      await p.getByRole('link', { name: 'See my estimate', exact: true }).click();
      await p.getByRole('heading', { name: 'Price breakdown', exact: true }).waitFor(); await p.getByText('Kilimani', { exact: true }).waitFor(); await screen(p, 'Estimate');
      assert.equal(await p.locator('main [class*="bg-[var(--action-primary-bg)]"]').count(), 1);
      assert.equal(await p.getByRole('link', { name: /Compare|Request/ }).count(), 0);
      await p.getByRole('link', { name: 'Edit my plan', exact: true }).click();
      await p.getByLabel('General location area', { exact: true }).fill('South B'); await saved(p);
      await p.getByRole('link', { name: 'See my estimate', exact: true }).click(); await p.getByText('South B', { exact: true }).waitFor();
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.getByText('South B', { exact: true }).waitFor();
      assert.equal(await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      const motion = await p.locator('main a').evaluateAll((links) => links.every((link) => parseFloat(getComputedStyle(link).animationDuration) <= 0.01));
      assert.equal(motion, true, 'reduced motion');
      if (width === 360) await p.screenshot({ path: `${require('node:os').tmpdir()}/styld6-${world}.png`, fullPage: true });
      assert.equal(p.planTrace.includes(`${base}/discover?tab=looks`), false, 'URL hydration never replaces the filtered feed with empty defaults');
      assert.deepEqual(f.errors, []); await f.context.close(); passed++;
      console.log(`PASS ${world} ${width}px: full mocked journey, filtered scroll, Saved reload, creator Back, Save/Unsave/Undo, Plan/Edit/Estimate, keyboard, overflow, reduced motion`);
    }
    if (process.argv.includes('--cta-only')) { console.log(`${passed}/${passed} primary hierarchy browser scenarios passed`); return; }
    const f = await setup(browser, { width: 360 }); const p = f.page;
    f.content.feedFail = true; await visit(p, '/discover?tab=looks'); await p.getByText('Looks are unavailable right now', { exact: true }).waitFor();
    f.content.feedFail = false; await p.getByRole('button', { name: 'Try again', exact: true }).click(); await p.locator('a[href^="/looks/"]').first().waitFor();
    f.content.saveFail = true; await saveButton(p, 'Save look').first().click(); await p.getByText(/could not|try again/i).filter({ hasText: /save/i }).first().waitFor();
    assert.deepEqual(f.content.saved, []); f.content.saveFail = false;
    await saveButton(p, 'Save look').first().click(); await saveButton(p, 'Unsave look').first().waitFor();
    f.content.removed = true; await visit(p, `/looks/${look1}`); await p.getByText('This look is unavailable', { exact: true }).waitFor();
    f.content.removed = false; f.content.empty = true; await visit(p, '/discover?tab=looks'); await p.getByText('No published looks yet', { exact: true }).waitFor();
    f.content.empty = false;
    let releaseFeed; f.content.feedGate = new Promise((resolve) => { releaseFeed = resolve; });
    await visit(p, `/creators/${p1}`);
    await p.getByRole('heading', { name: 'Mock creator one', exact: true }).waitFor();
    await p.getByText('Loading published looks...', { exact: true }).waitFor();
    assert.equal(await p.getByText('No published looks yet', { exact: true }).count(), 0, 'slow response is not an empty collection');
    releaseFeed(); f.content.feedGate = null;
    await p.locator('a[href^="/looks/"]').first().waitFor();
    await f.context.close(); passed++; console.log('PASS feed retry, failed Save rollback/retry, unavailable Look, empty feed, slow creator loading');
    const keyboard = await setup(browser, { width: 360, reduced: false }); const k = keyboard.page;
    await visit(k, `/looks/${look1}`); const primary = k.getByRole('link', { name: 'Plan this look', exact: true }); await primary.waitFor();
    let reached = false;
    for (let index = 0; index < 80; index++) {
      await k.keyboard.press('Tab');
      if (await primary.evaluate((element) => element === document.activeElement)) { reached = true; break; }
    }
    assert.equal(reached, true, 'primary reachable in keyboard tab order');
    assert.equal(await primary.evaluate((element) => getComputedStyle(element).outlineStyle !== 'none'), true, 'visible focus');
    await k.keyboard.press('Enter'); await k.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
    assert.equal(await k.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false);
    await keyboard.context.close(); passed++; console.log('PASS normal motion, actual Tab order, visible focus and Enter navigation');
    const unknown = await setup(browser, { width: 360 }); const u = unknown.page;
    unknown.content.nullPrice = true;
    unknown.server.servicesOverride = allServices.map((service) => ({ ...service, price: service.id === s1 ? null : service.price }));
    await visit(u, `/looks/${look1}`); await u.getByText('Price not provided', { exact: true }).waitFor();
    await u.getByRole('link', { name: 'Plan this look', exact: true }).click();
    await u.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor(); await saved(u);
    await u.getByRole('link', { name: 'See my estimate', exact: true }).click();
    await u.getByRole('heading', { name: 'Price breakdown', exact: true }).waitFor();
    assert.equal(await u.getByText(/Ksh\s*0(?:\.00)?$/, { exact: true }).count(), 0, 'missing price never becomes free');
    await unknown.context.close(); passed++; console.log('PASS unknown linked price preserves Plan handoff without a fabricated zero');
    console.log(`${passed}/${passed} Build 1 mocked browser scenarios passed`);
  } catch (error) {
    if (active && !active.isClosed()) {
      console.error(JSON.stringify({ url: active.url(), text: await active.locator('main').innerText(), trace: active.planTrace, errors: active.journeyErrors }));
      await active.screenshot({ path: `${require('node:os').tmpdir()}/styld6-journey-failure.png`, fullPage: true });
    }
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
