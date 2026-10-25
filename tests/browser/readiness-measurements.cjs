// Local production server only. All account and API behavior is intercepted.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, fixture, backend, look1 } = require('./plan-v2.cjs');
const base = process.argv[3] || 'http://localhost:3107';
if (new URL(base).origin !== 'http://localhost:3107') throw new Error('Measurements are restricted to the mocked local server.');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const records = [];
  try {
    for (const width of [360, 1440]) {
      const f = await fixture(browser, backend(), { width });
      await f.context.addInitScript(() => {
        window.readinessMetrics = { cls: 0, longTasks: 0 };
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.readinessMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => { window.readinessMetrics.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: true });
      });
      for (const [screen, route, heading] of [['Look', `/looks/${look1}`, null], ['Plan', '/book', 'Your preferences'], ['Estimate', '/book?view=estimate', 'Price breakdown']]) {
        const started = performance.now();
        await f.page.goto(base + route, { waitUntil: 'domcontentloaded' });
        if (heading) await f.page.getByRole('heading', { name: heading, exact: true }).waitFor();
        else await f.page.getByRole('link', { name: 'Plan this look', exact: true }).waitFor();
        assert.equal(await f.page.locator('main').count(), 1);
        assert.equal(await f.page.locator('html').getAttribute('lang'), 'en');
        assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const controls = await f.page.locator('main button, main input, main select').evaluateAll((nodes) => nodes.filter((node) => !node.disabled && !node.hidden).map((node) => ({
          tag: node.tagName, name: node.getAttribute('aria-label') || node.labels?.[0]?.textContent?.trim() || node.textContent?.trim(),
        })));
        assert.ok(controls.every((control) => control.name), `${screen}: controls have visible or ARIA names`);
        records.push({ screen, width, readyMs: Math.round(performance.now() - started), ...await f.page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          return { ttfbMs: Math.round(nav.responseStart - nav.requestStart), domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
            transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0), ...window.readinessMetrics };
        }) });
      }
      assert.deepEqual(f.errors, []);
      await f.context.close();
    }
    const report = { mode: 'local production with mocked accounts/APIs and synthetic media', concurrentMachineLoad: true, fieldPerformance: false, records };
    fs.writeFileSync(path.join(os.tmpdir(), 'styld-readiness-measurements.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    console.log('PASS 6 local measurement/accessibility scenarios. No field-performance or screen-reader certification.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
