// Local browser acceptance with intercepted APIs and in-memory persistence only.
// Usage: node tests/browser/plan-v2.cjs <playwright module> [base URL]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const base = process.argv[3]?.startsWith('http') ? process.argv[3] : 'http://localhost:3107';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const clientWorkspace = id(1), otherWorkspace = id(2), p1 = id(11), p2 = id(12), s1 = id(21), s2 = id(22), s3 = id(23), look1 = id(31), look2 = id(32);
const empty = () => ({ schemaVersion: 2, lookPostId: null, creatorWorkspaceId: null, serviceIds: [], preferredDate: null, timeWindow: null, serviceMode: null, locationArea: '', shortlistProviderWorkspaceIds: [], leadingChoiceProviderWorkspaceId: null, revision: 0, updatedAt: null });
const scope = (actor) => JSON.stringify([actor.id, actor.workspaceId]);
const actor = () => ({ id: 'mock-client', workspaceId: clientWorkspace, role: 'client', firstName: 'Test', phone: '', theme: 'not_set', worldIntensity: 'balanced', tribeBadge: '', quizCompleted: true,
  subscription: { tier: 'none', status: 'inactive' }, tribes: [], createdAt: '2026-10-23' });
const creator = (workspaceId) => ({ workspaceId, displayName: workspaceId === p1 ? 'Mock creator one' : 'Mock creator two', modes: workspaceId === p1 ? ['salon', 'mobile'] : ['salon'] });
const look = (postId) => ({ postId, creatorWorkspaceId: postId === look1 ? p1 : p2, serviceId: postId === look1 ? s1 : s3, thumbnailUrl: 'https://mock.test/look.svg', caption: 'Mock inspiration' });
const allServices = [
  { id: s1, name: 'Mock braids', workspaceId: p1, price: 2000, category: 'Hair', modes: ['salon', 'mobile'] },
  { id: s2, name: 'Mock treatment', workspaceId: p1, price: 500, category: 'Hair', modes: ['salon', 'mobile'] },
  { id: s3, name: 'Mock salon service', workspaceId: p2, price: 1000, category: 'Hair', modes: ['salon'] },
  { id: 'knotless-braids', name: 'Knotless braids', workspaceId: null, price: null, category: 'Hair', modes: [] },
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, label) {
  for (let n = 0; n < 150; n++) { if (await predicate()) return; await sleep(40); }
  throw new Error(label);
}
function backend() { return { plans: new Map(), fail: false, removed: false, writes: 0, arrivals: 0, gate: null, bumpNext: false }; }
async function fixture(browser, server, { width = 390, world = 'default', reduced = true, profile = actor(), legacy = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const binding = { actor: { ...profile, theme: world === 'default' ? 'not_set' : world } };
  if (legacy) await context.addInitScript((record) => sessionStorage.setItem('styld.plan.draft.v1', JSON.stringify(record)), legacy);
  await context.route(/^https?:\/\/(?!localhost:3107)/, (route) => route.abort());
  await context.route('https://mock.test/look.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect width="100" height="120" fill="#C4A495"/></svg>' }));
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()), method = route.request().method(), user = { ...binding.actor };
    const key = scope(user); let body = { ok: true }, status = 200, headers = {};
    const plan = () => server.plans.get(key) || empty();
    if (url.pathname === '/api/me') body = { ok: true, user };
    else if (url.pathname === '/api/plan') {
      if (method === 'PUT') {
        const update = route.request().postDataJSON(); server.arrivals++;
        if (server.gate) await server.gate.promise;
        await sleep(70);
        if (server.bumpNext) { server.bumpNext = false; server.plans.set(key, { ...plan(), revision: plan().revision + 1 }); }
        if (route.request().headers()['if-match'] !== `"plan:${user.workspaceId}:${update.expectedRevision}"`) { status = 412; body = { ok: false }; }
        else if (server.fail) { status = 500; body = { ok: false, error: 'Not saved. Keep this page open and try again.' }; }
        else if (update.expectedRevision !== plan().revision) { status = 409; body = { ok: false, code: 'PLAN_CONFLICT', scopeKey: key, plan: plan() }; }
        else {
          const next = { ...update.plan, revision: plan().revision + 1, updatedAt: new Date().toISOString() };
          server.plans.set(key, next); server.writes++; body = { ok: true, scopeKey: key, plan: next };
        }
      } else {
          const current = plan(), incoming = url.searchParams.get('look');
        body = { ok: true, scopeKey: key, plan: current, services: [...allServices, ...(server.extraServices || [])].filter((service) => !server.removed || service.id !== s1),
          creator: current.creatorWorkspaceId ? creator(current.creatorWorkspaceId) : null,
          look: current.lookPostId && !server.removed ? look(current.lookPostId) : null,
          handoff: incoming && !server.removed ? { look: look(incoming), creator: creator(look(incoming).creatorWorkspaceId) } : null };
      }
      headers.ETag = `"plan:${user.workspaceId}:${plan().revision}"`;
    } else if (url.pathname === '/api/services') body = { success: true, services: allServices.filter((service) => service.workspaceId).map((service) => ({ ...service, duration_minutes: 60 })) };
    else if (url.pathname.startsWith('/api/creators/')) body = { ok: true, creator: { ...creator(p1), serviceMode: 'Both' } };
    else if (url.pathname.startsWith('/api/social/posts/')) {
      const selected = look(url.pathname.split('/').pop());
      body = { ok: true, post: { id: selected.postId, author_workspace_id: selected.creatorWorkspaceId, look: { postId: selected.postId, authorWorkspaceId: selected.creatorWorkspaceId, authorName: creator(selected.creatorWorkspaceId).displayName,
        authorRole: 'professional', postType: 'portfolio', caption: selected.caption, serviceId: selected.serviceId, mediaUrls: [selected.thumbnailUrl], tags: [], demoProvenance: { trusted: false } } } };
    } else if (url.pathname === '/api/social/posts') body = { ok: true, posts: [] };
    else if (url.pathname === '/api/social/saves') body = { ok: true, savedPostIds: [] };
    else if (url.pathname === '/api/auth/session') { status = 401; body = { ok: false }; }
    else if (method !== 'GET') throw new Error(`Forbidden test mutation ${method} ${url.pathname}`);
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage(), errors = [];
  page.planTrace = [];
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) page.planTrace.push(frame.url()); });
  page.on('request', (request) => { if (request.url().includes('/api/plan')) page.planTrace.push(`${request.method()} ${request.url()}`); });
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors, binding, key: () => scope(binding.actor) };
}
const visit = (page, url) => page.goto(url, { waitUntil: 'domcontentloaded' });
const reload = (page) => page.reload({ waitUntil: 'domcontentloaded' });
const saved = (page) => page.getByRole('status').filter({ hasText: /^Saved$/ }).waitFor();
const field = (page, label) => page.getByLabel(label, { exact: true });
async function overflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow'); }

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let active, passed = 0;
  try {
    const smoke = process.argv.includes('--smoke');
    const worldOption = process.argv.find((arg) => arg.startsWith('--world='))?.slice(8);
    for (const world of worldOption ? [worldOption] : smoke ? ['default'] : ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude']) for (const width of smoke ? [390] : [360, 375, 390, 768, 1440]) {
      const server = backend(), f = await fixture(browser, server, { width, world }); const page = f.page; active = page;
      await visit(page, `${base}/looks/${look1}`);
      await page.getByRole('link', { name: 'Plan this look', exact: true }).click();
      await page.waitForURL('**/book?**', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor(); await saved(page);
      assert.deepEqual(server.plans.get(f.key()).serviceIds, [s1], 'canonical service already selected');
      await page.getByRole('img', { name: 'Your selected look', exact: true }).waitFor();
      await page.getByText('Mock creator one', { exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('data-world'), world);
      assert.equal(await page.locator('main [class*="bg-[var(--action-primary-bg)]"]').count(), 1, 'one filled primary CTA');
      await field(page, 'Preferred date').fill('2028-02-29');
      await field(page, 'Preferred time window').selectOption('morning');
      await field(page, 'Service mode').selectOption('mobile');
      await field(page, 'General location area').fill('Kilimani');
      const treatment = page.getByRole('button', { name: /Mock treatment From/ });
      await treatment.click();
      await waitFor(() => server.plans.get(f.key())?.serviceIds.length === 2 && server.plans.get(f.key())?.locationArea === 'Kilimani', 'all edits persisted'); await saved(page);
      await reload(page); await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
      assert.equal(await field(page, 'Preferred date').inputValue(), '2028-02-29'); assert.equal(await field(page, 'Preferred time window').inputValue(), 'morning');
      assert.equal(await field(page, 'Service mode').inputValue(), 'mobile'); assert.equal(await field(page, 'General location area').inputValue(), 'Kilimani');
      await page.getByRole('button', { name: 'Remove Mock treatment', exact: true }).click(); await saved(page);
      await overflow(page);
      await field(page, 'General location area').focus(); assert.equal(await field(page, 'General location area').evaluate((element) => element === document.activeElement), true);
      await page.getByRole('link', { name: 'See my estimate', exact: true }).click();
      await page.waitForURL('**#plan-estimate', { waitUntil: 'domcontentloaded' });
      await page.getByText('Prices and availability are confirmed by the professional.', { exact: true }).waitFor();
      const fullPlanUrl = page.url(), historyLength = await page.evaluate(() => history.length);
      await page.evaluate(() => {
        window.dispatchEvent(new Event('mobile-salon.client-session-change'));
        window.dispatchEvent(new Event('mobile-salon.client-session-change'));
      });
      await page.waitForTimeout(200);
      assert.equal(page.url(), fullPlanUrl, 'session refresh preserves query and fragment');
      assert.equal(await page.evaluate(() => history.length), historyLength, 'refresh adds no history entries');
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.getByRole('link', { name: 'See my estimate', exact: true }).evaluate((element) => getComputedStyle(element).animationName), 'none');
      if (world === 'default' && width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'styld-commit4-plan.png'), fullPage: true });
      await page.getByRole('link', { name: 'Back to the look', exact: true }).click();
      await page.waitForURL(`**/looks/${look1}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
      assert.equal(page.url(), fullPlanUrl, 'Back restores complete Plan context');
      assert.equal(await field(page, 'General location area').inputValue(), 'Kilimani');
      const extra = await f.context.newPage(); await visit(extra, `${base}/book`); await extra.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
      assert.equal(await field(extra, 'General location area').inputValue(), 'Kilimani'); await extra.close();
      assert.deepEqual(f.errors, []); await f.context.close(); passed++; console.log(`PASS ${world} ${width}px, Look handoff, editing, reload, new tab, primary CTA, keyboard, reduced motion`);
    }
    const server = backend(), a = await fixture(browser, server), b = await fixture(browser, server); active = a.page;
    for (const f of [a, b]) { await visit(f.page, `${base}/book`); await f.page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor(); }
    let release;
    server.gate = { promise: new Promise((resolve) => { release = resolve; }) };
    await field(a.page, 'General location area').fill('Westlands'); await waitFor(() => server.arrivals === 1, 'first tab save started');
    await field(b.page, 'General location area').fill('South B');
    await waitFor(() => server.arrivals === 2, 'second tab save started'); release(); server.gate = null; await saved(a.page);
    await b.page.getByText('A newer version was saved in another tab or device.', { exact: false }).waitFor();
    assert.equal(await field(b.page, 'General location area').inputValue(), 'South B');
    await b.page.getByRole('button', { name: 'Keep my edits and save', exact: true }).click(); await saved(b.page);
    server.bumpNext = true; await field(a.page, 'Preferred date').fill('2028-02-29');
    await a.page.getByRole('button', { name: 'Load saved version', exact: true }).click();
    assert.equal(await field(a.page, 'General location area').inputValue(), 'South B');
    server.fail = true; await field(a.page, 'General location area').fill('Kilimani');
    await a.page.getByRole('button', { name: 'Retry save', exact: true }).waitFor(); assert.equal(await field(a.page, 'General location area').inputValue(), 'Kilimani');
    server.fail = false; await a.page.getByRole('button', { name: 'Retry save', exact: true }).click(); await saved(a.page);
    const device = await fixture(browser, server); await visit(device.page, `${base}/book`); await device.page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
    assert.equal(await field(device.page, 'General location area').inputValue(), 'Kilimani'); await device.context.close();
    a.binding.actor = { ...a.binding.actor, id: 'other-client', workspaceId: otherWorkspace };
    await a.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await a.page.getByText('Your workspace changed. Reload this page to load its plan.', { exact: true }).waitFor();
    await a.page.getByRole('button', { name: 'Reload plan', exact: true }).click({ noWaitAfter: true }); await a.page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
    assert.equal(await field(a.page, 'General location area').inputValue(), ''); assert.equal(server.plans.has(a.key()), false);
    await a.context.close(); await b.context.close();
    const reopened = await fixture(browser, server); await visit(reopened.page, `${base}/book`); await reopened.page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
    assert.equal(await field(reopened.page, 'General location area').inputValue(), 'Kilimani'); await reopened.context.close();
    passed++; console.log('PASS conflict recovery, offline retry, close/reopen, fresh device, stale account scope rejection');

    const legacyServer = backend(), legacyProfile = actor();
    const legacy = { version: 1, scopes: { [`user:${legacyProfile.id}:${legacyProfile.workspaceId}`]: { general: { serviceIds: ['knotless-braids'], updatedAt: Date.now() } }, guest: { general: { serviceIds: ['knotless-braids'], updatedAt: Date.now() } } } };
    const f = await fixture(browser, legacyServer, { legacy }); active = f.page;
    await visit(f.page, `${base}/book`); await f.page.getByRole('button', { name: 'Import my tab draft', exact: true }).waitFor(); assert.equal(legacyServer.writes, 0);
    await f.page.getByRole('button', { name: 'Import my tab draft', exact: true }).click(); await saved(f.page);
    const imported = legacyServer.plans.get(f.key()); assert.deepEqual(imported.shortlistProviderWorkspaceIds, []); assert.equal(imported.leadingChoiceProviderWorkspaceId, null);
    assert.ok(await f.page.evaluate(() => sessionStorage.getItem('styld.plan.draft.v1')));
    await f.page.getByRole('link', { name: 'Clear plan', exact: true }).click(); await saved(f.page); await reload(f.page);
    await f.page.getByText('Your plan is empty. Choose a service to get started.', { exact: true }).waitFor();
    assert.equal(await f.page.getByRole('button', { name: 'Import my tab draft', exact: true }).count(), 0);
    await f.context.close(); passed++; console.log('PASS explicit workspace-scoped Version 1 import, clear, legacy preservation, no newer-plan overwrite');

    const choiceServer = backend();
    choiceServer.plans.set(scope(actor()), { ...empty(), revision: 4, updatedAt: new Date().toISOString(), lookPostId: look1, creatorWorkspaceId: p1,
      serviceIds: [s1], preferredDate: '2028-02-29', timeWindow: 'afternoon', serviceMode: 'mobile', locationArea: 'Westlands' });
    const choices = await fixture(browser, choiceServer); active = choices.page;
    await visit(choices.page, `${base}/book?look=${look2}&workspace=${p2}&serviceIds=${s3}`);
    await choices.page.getByRole('button', { name: 'Use choices from this link', exact: true }).waitFor();
    assert.equal(choiceServer.writes, 0, 'a new Look does not silently overwrite a saved plan');
    await field(choices.page, 'General location area').fill('South B'); await saved(choices.page);
    await field(choices.page, 'Service mode').selectOption(''); await saved(choices.page);
    await choices.page.getByRole('button', { name: 'Use choices from this link', exact: true }).click(); await saved(choices.page);
    assert.equal(await field(choices.page, 'Service mode').locator('option[value="mobile"]').count(), 0);
    await field(choices.page, 'Service mode').selectOption('salon'); await saved(choices.page);
    const changed = choiceServer.plans.get(choices.key());
    assert.deepEqual(changed.serviceIds, [s3]); assert.equal(changed.preferredDate, '2028-02-29'); assert.equal(changed.timeWindow, 'afternoon'); assert.equal(changed.locationArea, 'South B');
    await choices.context.close(); passed++; console.log('PASS deliberate different-Look update, preserved latest preferences, supported service modes only');

    const removedServer = backend(); removedServer.removed = true;
    removedServer.plans.set(scope(actor()), { ...empty(), revision: 2, updatedAt: new Date().toISOString(), lookPostId: look1, creatorWorkspaceId: p1, serviceIds: [s1, 'knotless-braids'], locationArea: 'Westlands' });
    const removed = await fixture(browser, removedServer); active = removed.page;
    await visit(removed.page, `${base}/book`);
    await removed.page.getByText('This look is no longer available. Your other choices are still here.', { exact: true }).waitFor();
    assert.equal(await field(removed.page, 'General location area').inputValue(), 'Westlands');
    await removed.page.getByRole('button', { name: 'Remove Unavailable service', exact: true }).click(); await saved(removed.page);
    assert.deepEqual(removedServer.plans.get(removed.key()).serviceIds, ['knotless-braids']);
    await removed.context.close(); passed++; console.log('PASS inactive service and removed Look handling preserves unaffected selections and area');

    const isolatedServer = backend();
    const isolated = await fixture(browser, isolatedServer, { legacy: { version: 1, scopes: { guest: legacy.scopes.guest, 'user:different:workspace': legacy.scopes.guest } } }); active = isolated.page;
    await visit(isolated.page, `${base}/book`); await isolated.page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
    assert.equal(await isolated.page.getByRole('button', { name: 'Import my tab draft', exact: true }).count(), 0); assert.equal(isolatedServer.writes, 0);
    await isolated.context.close(); passed++; console.log('PASS guest and different-account legacy drafts are not imported');

    const cappedServer = backend();
    cappedServer.extraServices = Array.from({ length: 10 }, (_, n) => ({ id: id(100 + n), name: `Mock existing ${n}`, workspaceId: p1, price: 100, category: 'Hair', modes: ['salon', 'mobile'] }));
    cappedServer.plans.set(scope(actor()), { ...empty(), revision: 1, updatedAt: new Date().toISOString(), creatorWorkspaceId: p1, serviceIds: cappedServer.extraServices.map((service) => service.id) });
    const capped = await fixture(browser, cappedServer); active = capped.page;
    await visit(capped.page, `${base}/book?look=${look1}&workspace=${p1}`);
    const apply = capped.page.getByRole('button', { name: 'Use choices from this link', exact: true });
    await apply.waitFor(); assert.equal(await apply.isDisabled(), true);
    await capped.page.getByRole('button', { name: 'Remove Mock existing 0', exact: true }).click(); await saved(capped.page);
    assert.equal(await apply.isEnabled(), true, 'the pending Look can be added after making room');
    await apply.click(); await saved(capped.page);
    const cappedPlan = cappedServer.plans.get(capped.key()); assert.equal(cappedPlan.serviceIds.length, 10); assert.ok(cappedPlan.serviceIds.includes(s1)); assert.equal(cappedPlan.serviceIds.includes(id(100)), false);
    await capped.context.close(); passed++; console.log('PASS service cap recovery keeps current edits and never restores a removed choice from an old proposal');
    console.log(`PASS ${passed} mocked Plan browser scenarios. No live persistence or database writes.`);
  } catch (error) {
    console.error(error);
    console.error('Plan navigation and request trace:', active?.planTrace);
    if (active && !active.isClosed()) await active.screenshot({ path: path.join(os.tmpdir(), 'styld-commit4-browser-failure.png'), fullPage: true, timeout: 10000 }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
