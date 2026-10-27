const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const records = [], output = path.resolve('docs/readiness/sprint4');
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(output, 'compare-layout-proposal.html')).href);
    const region = page.getByRole('region', { name: 'Proposed provider comparison, scroll horizontally', exact: true });
    for (const scale of [1,2]) {
      if (scale === 2) await page.getByRole('button', { name: 'Use larger text', exact: true }).click();
      await page.waitForFunction(font => parseFloat(getComputedStyle(document.documentElement).fontSize) === font, scale * 16);
      assert.equal(await page.locator('thead th').count(), 3);
      const result = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
        columns: [...document.querySelectorAll('th')].map(el => el.getBoundingClientRect().width),
        rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize), labelFontPx: parseFloat(getComputedStyle(document.querySelector('.label')).fontSize),
        regionWidth: document.querySelector('.comparison').clientWidth, scrollWidth: document.querySelector('.comparison').scrollWidth,
        clippedCells: [...document.querySelectorAll('th,td')].filter(el => el.scrollWidth > el.clientWidth + 1).length }));
      assert.equal(result.overflow, false); assert.equal(result.clippedCells, 0); assert.equal(result.labelFontPx, 12 * scale);
      assert.ok(result.columns.every(width => width >= 160 * scale - 1));
      await region.evaluate(el => { el.scrollLeft = 0; });
      await page.screenshot({ path: path.join(output, 'screenshots', `compare-proposal-360-${scale}x.png`), fullPage: true });
      await region.focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.comparison').scrollLeft > 0);
      result.keyboardScrollLeft = await region.evaluate(el => el.scrollLeft);
      records.push({ scale, ...result }); console.log(`PASS layout proposal 360px ${scale}x, three readable columns reachable by keyboard`);
    }
    fs.writeFileSync(path.join(output, 'compare-layout-proposal.json'), JSON.stringify({ status: 'PROTOTYPE_ONLY', records, approvalRequired: true, deployed: false }, null, 2));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
