// Local headless measurements with intercepted API latency, not field Core Web Vitals.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('./plan-v2.cjs');
const { setup, table, ready, providerIds } = require('./compare.cjs');
const base = process.env.STYLD_BASE_URL || process.argv[3] || 'http://localhost:3107';
if (!/^https?:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}$/.test(base)) throw new Error('Measurements require a loopback origin with mocked APIs.');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const records = [];
  try {
    for (const width of [360,1440]) {
      const f = await setup(browser, { width });
      const consoleErrors=[];f.page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
      const rejected=[];f.page.on('response',response=>{if(response.status()>=400)rejected.push(new URL(response.url()).pathname);});
      if(width===360) f.server.plans.get(f.key()).leadingChoiceProviderWorkspaceId=providerIds[0];
      await f.context.addInitScript(() => {
        window.compareMetrics = { cls: 0, longTasks: 0 };
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.compareMetrics.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(list => { window.compareMetrics.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: true });
      });
      const started = performance.now(); await f.page.goto(base+'/compare'); await ready(f.page);
      const renderMs = Math.round(performance.now()-started);
      const prices=await table(f.page).locator('tbody tr').nth(1).locator('td > span:last-child').allTextContents();
      assert.match(prices[0],/2,000.*listed subtotal/);assert.deepEqual(prices.slice(1),['Not provided','Not provided']);
      const fees=await table(f.page).locator('tbody tr').nth(2).locator('td > span:last-child').allTextContents();
      assert.ok(fees.every(value=>value==='Add-ons, taxes and travel unconfirmed'));
      const layout = await f.page.evaluate(() => {
        const tray=document.querySelector('aside[aria-label="Plan shortlist"]'), nav=document.querySelector('.mobile-bottom-nav');
        const t=tray.getBoundingClientRect(), n=nav?.getBoundingClientRect();
        return { trayPosition:getComputedStyle(tray).position, trayHeight:t.height, viewportHeight:innerHeight, trayFraction:t.height/innerHeight, navClear:!n||getComputedStyle(nav).display==='none'||t.bottom<=n.top, horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
          columns:[...document.querySelectorAll('table thead th')].map(el=>el.getBoundingClientRect().width), ...window.compareMetrics };
      });
      assert.equal(layout.trayPosition,'relative','Compare summary stays in flow so it cannot cover decision rows');assert.equal(layout.horizontalOverflow,false);assert.equal(layout.navClear,true);assert.ok(layout.trayFraction<0.2);
      const primary=f.page.getByRole('link',{name:width===360?'View Mock creator one profile':'Return to my Plan',exact:true});await primary.scrollIntoViewIfNeeded();
      const clear=await primary.evaluate(el=>{const r=el.getBoundingClientRect();const t=document.querySelector('aside[aria-label="Plan shortlist"]').getBoundingClientRect();return r.bottom<=t.top||r.top>=t.bottom;});
      assert.equal(clear,true,'final primary action remains outside the floating tray');
      const profileStarted=performance.now();let position;
      if(width===360){position=await f.page.evaluate(()=>scrollY);await primary.click();}else await table(f.page).getByRole('link',{name:'Profile',exact:true}).first().click();
      await f.page.getByRole('heading',{name:'Mock creator one',exact:true}).waitFor();
      const profileMs=Math.round(performance.now()-profileStarted);const backStarted=performance.now();
      if(width===360)await f.page.goBack();else await f.page.getByRole('link',{name:'Back to compare',exact:true}).click();await ready(f.page);
      if(width===360)await f.page.waitForFunction(y=>Math.abs(scrollY-y)<8,position);
      records.push({width,renderMs,profileMs,backMs:Math.round(performance.now()-backStarted),...layout,planGetRequests:f.page.planTrace.filter(value=>value.startsWith('GET ')).length,browserErrors:f.errors,consoleErrors});
      assert.deepEqual([...new Set(rejected)].sort(), ['/api/auth/session'], 'the shell session probe is the only rejected request, and the mock answers it');
      assert.ok(consoleErrors.every(message=>/Failed to load resource: (net::ERR_(FAILED|ABORTED)|the server responded with a status of 401 \(Unauthorized\))/.test(message)),'no unexpected console errors beyond deliberately blocked external requests and the mocked guest session probe');
      assert.deepEqual(f.errors,[]);assert.deepEqual(f.mutations,[]);await f.context.close();console.log(`PASS Compare ${width}px, actual prices, measured render, transitions, columns, tray and primary clearance`);
    }
    fs.writeFileSync('docs/readiness/sprint3/compare-performance.json',JSON.stringify({conditions:'Windows, installed Chrome headless, local production Next server, mocked API and synthetic media, reduced motion, no CPU/network throttling, fresh contexts, not field CWV',records},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
