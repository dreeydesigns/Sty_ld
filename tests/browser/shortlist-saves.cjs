// Rendered controls only, all APIs and identities intercepted locally.
const assert = require('node:assert/strict');
const { chromium, look1 } = require('./plan-v2.cjs');
const { setup, providerIds } = require('./compare.cjs');
const base = process.argv[3] || 'http://localhost:3107';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0;
  try {
    for (const width of [360,375,390,768,1440]) for (const count of [0,3]) for (const screen of ['/discover?tab=looks',`/looks/${look1}`,`/creators/${providerIds[0]}`]) {
      const f = await setup(browser, { width }, count);
      if (!count) await f.context.route('**/api/plan', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }));
      await f.page.goto(base + screen);
      await f.page.getByRole('button', { name: 'Save look', exact: true }).first().click();
      await f.page.getByRole('button', { name: 'Undo', exact: true }).click();
      assert.equal(await f.page.getByRole('complementary', { name: 'Plan shortlist' }).count(), count ? 1 : 0, 'an empty Plan failure cannot float above Saves feedback');
      assert.equal(f.server.writes,0,'Save Undo cannot mutate the Plan shortlist');
      assert.equal(f.server.plans.get(f.key()).shortlistProviderWorkspaceIds.length,count);
      assert.deepEqual(f.errors, []);
      await f.context.close(); passed++;
      console.log(`PASS ${width}px ${screen}, ${count ? 'active shortlist' : 'empty failed Plan'}, Save Undo remains clickable`);
    }
    console.log(`PASS ${passed} rendered shortlist and Saves coexistence checks`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
