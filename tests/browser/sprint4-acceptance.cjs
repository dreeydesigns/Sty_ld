// Real production UI, intercepted APIs and synthetic media. No live readiness claim.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, p1, s1, look1, allServices } = require('./plan-v2.cjs');
const { setup, table, ready, providerIds, names } = require('./compare.cjs');
const base = process.argv[3] || 'http://localhost:3107';
if (base !== 'http://localhost:3107') throw new Error('Only the mocked local origin is permitted.');
const output = path.resolve('docs/readiness/sprint4'), records = [];
const readabilityOnly = process.argv.includes('--readability-only');
const worlds = ['default', 'feminine', 'natural', 'spiritual', 'cultural', 'african_nude'];
const waitFor = async (fn, label) => { for (let i = 0; i < 600; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(label); };
async function geometry(page) {
  return page.evaluate(() => {
    const t = document.querySelector('table'), tray = document.querySelector('aside[aria-label="Plan shortlist"]');
    const nav = document.querySelector('.mobile-bottom-nav'), n = nav?.getBoundingClientRect(), a = tray?.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, viewportWidth: innerWidth,
      columns: [...t.querySelectorAll('thead th')].map(el => el.getBoundingClientRect().width),
      targets: [...t.querySelectorAll('thead button,thead a')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      trayHeight: a?.height, trayFraction: a ? a.height / innerHeight : 0, trayPosition: tray ? getComputedStyle(tray).position : null,
      navClear: !a || !n || getComputedStyle(nav).display === 'none' || a.bottom <= n.top || getComputedStyle(tray).position === 'relative',
      clippedCells: [...t.querySelectorAll('th,td')].filter(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).length,
      rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      labelFontPx: parseFloat(getComputedStyle(t.querySelector('tbody td > span:first-child')).fontSize),
      valueFontPx: parseFloat(getComputedStyle(t.querySelector('tbody td > span:last-child')).fontSize),
      ...window.sprint4Metrics };
  });
}
async function observe(context) {
  await context.addInitScript(() => {
    window.sprint4Metrics = { cls: 0, longTasks: 0 };
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.sprint4Metrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { window.sprint4Metrics.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: true });
  });
}
(async () => {
  fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0, complete = false;
  try {
    for (const world of readabilityOnly ? [] : worlds) for (const width of [360,375,390,768,1440]) {
      const f = await setup(browser, { world, width }); await observe(f.context); const page = f.page;
      let requests = 0; page.on('request', () => requests++);
      try {
        const started = performance.now();
        await page.goto(base + '/discover?tab=looks');
        const saveButton = page.getByRole('button', { name: 'Save look', exact: true }).first(); await saveButton.waitFor();
        const discoverReadyMs = Math.round(performance.now() - started); await saveButton.click();
        await page.getByRole('button', { name: 'Unsave look', exact: true }).first().waitFor();
        await page.goto(base + '/home?tab=saved');
        await page.getByRole('heading', { name: 'Your saved looks', exact: true }).waitFor();
        await page.locator(`main a[href="/looks/${look1}"]`).click();
        await page.getByRole('link', { name: 'Plan this look', exact: true }).click();
        await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
        await page.getByRole('link', { name: 'See my estimate', exact: true }).click();
        await page.getByRole('heading', { name: 'Price breakdown', exact: true }).waitFor();
        await page.getByRole('link', { name: 'Compare', exact: true }).first().click(); await ready(page);
        assert.equal(await page.locator('html').getAttribute('data-world'), world);
        const layout = await geometry(page);
        assert.equal(layout.overflow, false); assert.equal(layout.reducedMotion, true); assert.equal(layout.navClear, true);
        assert.equal(layout.columns.length, 3); assert.ok(layout.targets.every(target => target.width >= 44 && target.height >= 44));
        const prices = await table(page).locator('tbody tr').nth(1).locator('td > span:last-child').allTextContents();
        assert.match(prices[0], /2,000.*listed subtotal/); assert.deepEqual(prices.slice(1), ['Not provided', 'Not provided']);
        const labels = await table(page).locator('tbody tr td:first-child > span:first-child').allTextContents();
        assert.deepEqual(labels, ['Selected requirements','Listed price','Other charges','General location','Service mode','Stated hours','Appointment availability','Distance','Verification','Reviews and ratings','Cancellation and inclusions']);
        if (width === 360) await page.screenshot({ path: path.join(output, 'screenshots', `compare-${world}-360.png`), fullPage: true });
        if (world === 'default' && width === 360) fs.writeFileSync(path.join(output, 'compare-360-aria.txt'), await table(page).ariaSnapshot());
        const lead = page.getByRole('button', { name: 'Make Mock creator one leading choice', exact: true });
        await lead.focus(); await page.keyboard.press('Enter');
        await waitFor(() => lead.getAttribute('aria-pressed').then(value => value === 'true'), 'leading choice saved');
        await table(page).getByRole('button', { name: 'Remove Mock creator two', exact: true }).click();
        await page.getByRole('button', { name: 'Undo shortlist change', exact: true }).click(); await ready(page);
        await waitFor(() => table(page).locator('thead th').count().then(count => count === 3), 'Undo restores order');
        const primary = page.getByRole('link', { name: 'View Mock creator one profile', exact: true });
        await primary.scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => scrollY);
        await primary.click(); await page.getByRole('heading', { name: 'Mock creator one', exact: true }).waitFor();
        await page.goBack(); await ready(page); await page.waitForFunction(y => Math.abs(scrollY - y) < 8, scroll);
        await page.getByRole('complementary', { name: 'Plan shortlist' }).getByRole('link', { name: 'Plan', exact: true }).click();
        await page.getByRole('heading', { name: 'Your preferences', exact: true }).waitFor();
        assert.equal(f.server.plans.get(f.key()).locationArea, 'Kilimani');
        assert.deepEqual(f.server.plans.get(f.key()).shortlistProviderWorkspaceIds, providerIds.slice(0,3));
        assert.ok(f.mutations.every(value => value === '/api/plan' || value.startsWith('/api/social/saves'))); assert.deepEqual(f.errors, []);
        records.push({ kind: 'journey', world, width, journeyMs: Math.round(performance.now() - started), discoverReadyMs, requests, ...layout });
        passed++; console.log(`PASS ${world} ${width}px full mocked journey, keyboard leading choice, Undo, profile Back and Plan restoration`);
      } finally { await f.context.close(); }
    }
    const original = [...names];
    try {
      names[0] = 'Demo professional with a deliberately long workspace name'; names[1] = 'Demo salon with a distinct long workspace name'; names[2] = 'Demo independent professional with a third long name';
      for (const count of [2,3]) for (const scale of [1,2]) {
        const f = await setup(browser, { width: 360 }, count);
        try {
          await f.page.goto(base + '/compare'); await table(f.page).waitFor();
          if (scale === 2) {
            const initial = await f.page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
            await f.page.addStyleTag({ content: `html { font-size: ${initial * 2}px !important; }` });
            await f.page.waitForFunction(expected => parseFloat(getComputedStyle(document.documentElement).fontSize) === expected, initial * 2);
          }
          await f.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const layout = await geometry(f.page); assert.equal(layout.columns.length, count);
          if (scale === 2) assert.ok(layout.labelFontPx >= layout.rootFontPx * 0.625, 'Compare row labels respect the enlarged root font setting');
          // Record enlarged-text readability for founder review, without changing the agreed layout.
          if (scale === 1) assert.equal(layout.overflow, false);
          await f.page.screenshot({ path: path.join(output, 'screenshots', `compare-long-${count}-360-${scale}x-verified.png`), fullPage: true });
          records.push({ kind: 'mobile-readability', width: 360, count, scale, ...layout });
          assert.deepEqual(f.errors, []); passed++; console.log(`MEASURED ${count} providers, 360px, ${scale}x root font: ${layout.rootFontPx}px, overflow=${layout.overflow}, columns=${layout.columns.join(',')}`);
        } finally { await f.context.close(); }
      }
    } finally { names.splice(0, names.length, ...original); }
    if (!readabilityOnly) { const transferred = await setup(browser, { width: 360 });
    try {
      await transferred.context.route('**/api/plan', async route => {
        if (route.request().method() !== 'GET') return route.fallback();
        const plan = transferred.server.plans.get(transferred.key());
        await route.fulfill({ contentType: 'application/json', headers: { ETag: `"plan:${transferred.binding.actor.workspaceId}:${plan.revision}"` }, body: JSON.stringify({
          ok: true, scopeKey: transferred.key(), plan, services: allServices.map(service => service.id === s1 ? { ...service, workspaceId: providerIds[1], price: 500 } : service),
          creator: { workspaceId: p1, displayName: names[0], modes: ['salon','mobile'] }, look: null, handoff: null,
          comparisonProviders: providerIds.slice(0,3).map((workspaceId,index) => ({ workspaceId, available: true, displayName: names[index], location: null, serviceMode: null })) }) });
      });
      await transferred.page.goto(base + '/compare'); await ready(transferred.page);
      assert.deepEqual(await table(transferred.page).locator('tbody tr').nth(1).locator('td > span:last-child').allTextContents(), ['Not provided','Not provided','Not provided']);
      assert.equal(transferred.server.writes, 0); records.push({ kind: 'ownership-projection', writes: 0 }); passed++; console.log('PASS transferred service price is withheld in real rendered Compare');
    } finally { await transferred.context.close(); } }
    complete = true;
  } finally {
    fs.writeFileSync(path.join(output, readabilityOnly ? 'browser-readability.json' : 'browser-acceptance.json'), JSON.stringify({ status: complete ? 'FINISHED' : 'INCOMPLETE', passed, records,
      functionalPassed: records.filter(record => ['journey','ownership-projection'].includes(record.kind)).length,
      readabilityMeasured: records.filter(record => record.kind === 'mobile-readability').length,
      needsUXDecision: records.some(record => record.kind === 'mobile-readability' && record.clippedCells > 0),
      conditions: 'Windows, local production Next server, installed headless Chrome, intercepted APIs, synthetic media, fresh contexts, reduced motion, no network/CPU throttle. Root-font scaling is not a real screen-reader or browser-zoom session. Measurements are local and are not field Core Web Vitals.' }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
