// Standalone, synthetic layout study. No application API or persistence.
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:3108');
    for (const provider of ['A', 'B', 'C']) await page.getByRole('button', { name: 'Shortlist Mock provider ' + provider, exact: true }).click();
    await page.getByRole('button', { name: 'Shortlist Mock provider D', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Keep my choices' }).click();
    assert.equal(await page.getByText('3 of 3', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Shortlist Mock provider D', exact: true }).click();
    await page.getByRole('button', { name: 'Replace Mock provider B', exact: true }).click();
    await page.getByRole('button', { name: 'Undo removal' }).click();
    assert.equal(await page.getByRole('button', { name: 'Remove Mock provider B', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Compare choices', exact: true }).click();
    assert.equal(await page.locator('#providers').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Compare choices', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Make Mock provider A leading choice', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Leading choice: Mock provider A', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByText(/Price not provided/).count() > 0, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const targets = await page.locator('button:visible').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().height));
    assert.ok(targets.every(height => height >= 44));
    await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'styld-sprint2-compare-360.png'), fullPage: true });
    console.log('PASS mock Compare study at 360px: three-choice cap, fourth replacement/cancel, Undo, leading choice, unknown price, no overflow, 44px targets');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
