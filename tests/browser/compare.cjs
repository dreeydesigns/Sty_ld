// Production UI with intercepted APIs, synthetic images and disposable mock state only.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { chromium, fixture, backend, id, p1, s1, look1, empty, allServices } = require('./plan-v2.cjs');
const base = process.env.STYLD_BASE_URL || process.argv[3] || 'http://localhost:3107';
const providerIds = [p1,id(12),id(13),id(14)], names = ['Mock creator one','Mock creator two','Mock creator three','Mock creator four'];
const services = [...allServices, ...[2,3].map((n) => ({ id: id(24+n), name: 'Mock service '+n, workspaceId: providerIds[n], price: null, category: 'Hair', modes: ['salon'] }))];
async function setup(browser, options = {}, count = 3) {
  const server = backend(), f = await fixture(browser, server, options); let saved = [];
  const seed = { ...empty(), creatorWorkspaceId: p1, lookPostId: look1, serviceIds: [s1], locationArea: 'Kilimani', shortlistProviderWorkspaceIds: providerIds.slice(0,count), revision: 1, updatedAt: '2026-10-26T00:00:00Z' };
  server.plans.set(f.key(), seed);
  const facts = workspaceId => { const i = providerIds.indexOf(workspaceId); const available=i>=0&&!(server.unavailable||[]).includes(workspaceId); return { workspaceId, available, displayName: available ? names[i] : null, location: available&&i === 0 ? 'Nairobi' : null, serviceMode: available&&i === 0 ? 'Both' : null }; };
  await f.context.route('**/api/**', async route => {
    const url = new URL(route.request().url()), method = route.request().method(); let body, status = 200, headers = {};
    const plan = server.plans.get(f.key()) || empty();
    if (url.pathname === '/api/plan' && method === 'GET') {
      if(server.readFail)return route.fulfill({status:500,contentType:'application/json',body:'{"ok":false}'});
      body = { ok: true, scopeKey: f.key(), plan, services, comparisonProviders: plan.shortlistProviderWorkspaceIds.map(facts),
        creator: plan.creatorWorkspaceId ? { workspaceId: p1, displayName: names[0], modes: ['salon','mobile'] } : null,
        look: plan.lookPostId ? { postId: look1, creatorWorkspaceId: p1, serviceId: s1, thumbnailUrl: 'https://mock.test/look.svg', caption: 'Mock Look' } : null, handoff: null };
      headers.ETag = `"plan:${f.binding.actor.workspaceId}:${plan.revision}"`;
    } else if (url.pathname.startsWith('/api/creators/')) { const creator = facts(url.pathname.split('/').pop()); body = { ok: true, creator: { ...creator, role: 'professional', serviceMode: 'Both' } }; }
    else if (url.pathname === '/api/services') body = { success: true, services: services.map(s => ({ ...s, workspace_id: s.workspaceId, is_active: true })) };
    else if (url.pathname.startsWith('/api/social/saves')) {
      if (method === 'POST') saved = [...new Set([...saved,route.request().postDataJSON().postId])];
      if (method === 'DELETE') saved = saved.filter(value => value !== url.pathname.split('/').pop());
      body = { ok: true, savedPostIds: saved };
    } else if (url.pathname === '/api/social/posts') {
      const filter = url.searchParams.get('ids')?.split(',');
      body = { ok: true, posts: providerIds.map((workspaceId,i) => ({ id: i ? id(40+i) : look1, author_workspace_id: workspaceId,
        look: { postId: i ? id(40+i) : look1, authorWorkspaceId: workspaceId, authorName: names[i], authorRole: 'professional', postType: 'portfolio', caption: 'Mock Look '+i,
          serviceId: i === 0 ? s1 : services.find(s => s.workspaceId === workspaceId).id, mediaUrls: ['https://mock.test/look.svg'], tags: [], demoProvenance: { trusted: false } } })).filter(post => !filter || filter.includes(post.id)) };
    } else return route.fallback();
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const mutations = []; f.page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/')) mutations.push(new URL(request.url()).pathname); });
  return { ...f, server, mutations };
}
const table = page => page.getByRole('table', { name: 'Providers compared against the same Plan' });
async function ready(page) { await table(page).waitFor(); const choice = page.getByRole('button', { name: 'Make Mock creator one leading choice', exact: true }); await choice.waitFor(); await waitFor(() => choice.isEnabled(), 'shortlist becomes editable'); }
async function waitFor(fn, label) { for(let n=0;n<150;n++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw new Error(label); }
module.exports = { setup, table, ready, providerIds, names };
if (require.main === module) (async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); let passed = 0;
  const measurements = [];
  try {
    const worlds = process.argv.includes('--smoke') ? ['default'] : ['default','feminine','natural','spiritual','cultural','african_nude'];
    for (const world of worlds) for (const width of process.argv.includes('--smoke') ? [360] : [360,375,390,768,1440]) {
      const f = await setup(browser,{world,width}); const page=f.page;
      await page.goto(base+'/compare'); await ready(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      const columns=await table(page).locator('thead th').evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().width)));
      assert.equal(columns.length,3); assert.ok(columns.every(value=>value>=90)); measurements.push({world,width,columns});
      const buttons=await table(page).locator('thead button, thead a').evaluateAll(items=>items.map(item=>({w:item.getBoundingClientRect().width,h:item.getBoundingClientRect().height})));
      assert.ok(buttons.every(value=>value.w>=44&&value.h>=44));
      await page.getByRole('button',{name:'Make Mock creator one leading choice',exact:true}).click();
      await waitFor(async()=>await page.getByRole('button',{name:'Make Mock creator one leading choice',exact:true}).getAttribute('aria-pressed').catch(()=>null)==='true','leading choice saved');
      await table(page).getByRole('button',{name:'Remove Mock creator two',exact:true}).click();
      await page.getByRole('button',{name:'Undo shortlist change',exact:true}).click(); await ready(page);
      await waitFor(async()=>await table(page).locator('thead th').count()===3,'Undo restores three providers');
      assert.equal(f.server.plans.get(f.key()).locationArea,'Kilimani');
      await table(page).getByRole('link',{name:'Profile',exact:true}).first().click();
      await page.getByRole('heading',{name:names[0],exact:true}).waitFor(); await page.getByRole('link',{name:'Back to compare',exact:true}).click(); await ready(page);
      assert.ok(f.mutations.every(value=>value==='/api/plan'),'no request, booking, message or payment mutation');
      assert.deepEqual(f.errors,[]);
      if(width===360) await page.screenshot({path:path.join(os.tmpdir(),`styld-sprint3-compare-${world}-360.png`),fullPage:true});
      await f.context.close(); passed++; console.log(`PASS ${world} ${width}px, three-provider rows, exact Plan prices, leading choice, remove/Undo, profile Back, no commitment`);
    }
    for (const count of [0,1,2]) {const f=await setup(browser,{width:360},count);await f.page.goto(base+'/compare');if(count<2)await f.page.getByRole('heading',{name:count?'Choose one more provider':'Your shortlist is empty',exact:true}).waitFor();else await ready(f.page);assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await f.context.close();passed++;console.log(`PASS ${count}-provider empty/selection state`);}
    for(const world of worlds){const fourth=await setup(browser,{width:360,world});await fourth.page.goto(base+'/creators/'+providerIds[3]);
    await fourth.page.getByRole('button',{name:'Shortlist '+names[3],exact:true}).first().click(); await fourth.page.getByRole('dialog').waitFor();
    assert.equal(await fourth.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await fourth.page.locator('html').getAttribute('data-world'),world);
    await fourth.page.getByRole('button',{name:'Keep my choices',exact:true}).click();assert.equal(await fourth.page.getByRole('button',{name:'Shortlist '+names[3],exact:true}).first().evaluate(el=>el===document.activeElement),true);
    await fourth.page.getByRole('button',{name:'Shortlist '+names[3],exact:true}).first().click();await fourth.page.getByRole('button',{name:'Replace '+names[1],exact:true}).click();
    await waitFor(()=>fourth.page.evaluate(name=>document.activeElement?.id==='shortlist-link'||document.activeElement?.getAttribute('aria-label')==='Remove '+name,names[3]),'replacement closes and restores focus to trigger or safe tray link');
    await fourth.page.getByRole('button',{name:'Undo shortlist change',exact:true}).click();
    await waitFor(()=>JSON.stringify(fourth.server.plans.get(fourth.key()).shortlistProviderWorkspaceIds)===JSON.stringify(providerIds.slice(0,3)),'replacement Undo');await fourth.context.close();passed++;console.log(`PASS ${world} fourth-provider replacement, cancel/replace focus and revision-safe Undo`);}
    const failed=await setup(browser,{width:360});await failed.page.goto(base+'/compare');await ready(failed.page);failed.server.fail=true;
    await table(failed.page).getByRole('button',{name:'Remove '+names[1],exact:true}).click();await failed.page.getByRole('button',{name:'Retry shortlist',exact:true}).waitFor();
    assert.equal(await failed.page.getByRole('button',{name:'Undo shortlist change',exact:true}).isEnabled(),false);failed.server.fail=false;await failed.page.getByRole('button',{name:'Retry shortlist',exact:true}).click();await ready(failed.page);assert.equal(failed.server.plans.get(failed.key()).shortlistProviderWorkspaceIds.length,2);
    await failed.context.close();passed++;console.log('PASS failed mutation is never Saved, Undo blocked, explicit retry persists');
    const unavailableRead=await setup(browser,{width:360});unavailableRead.server.readFail=true;await unavailableRead.page.goto(base+'/compare');
    await unavailableRead.page.getByRole('button',{name:'Retry shortlist',exact:true}).waitFor();assert.equal(await unavailableRead.page.getByText('Loading your saved shortlist...',{exact:true}).count(),0);
    unavailableRead.server.readFail=false;await unavailableRead.page.getByRole('button',{name:'Retry shortlist',exact:true}).click();await ready(unavailableRead.page);await unavailableRead.context.close();passed++;console.log('PASS initial read failure has an honest error and working retry, never an infinite loading state');
    const conflict=await setup(browser,{width:360});await conflict.page.goto(base+'/compare');await ready(conflict.page);conflict.server.bumpNext=true;
    await table(conflict.page).getByRole('button',{name:'Remove '+names[1],exact:true}).click();await conflict.page.getByRole('alert').filter({hasText:'changed elsewhere'}).waitFor();
    assert.equal(conflict.server.plans.get(conflict.key()).shortlistProviderWorkspaceIds.length,3);assert.equal(await conflict.page.getByRole('button',{name:'Undo shortlist change',exact:true}).isEnabled(),false);
    await conflict.page.getByRole('link',{name:'Review plan',exact:true}).click();await conflict.page.getByRole('button',{name:'Load saved version',exact:true}).click();await conflict.page.getByRole('link',{name:'Compare',exact:true}).last().click();await ready(conflict.page);await conflict.context.close();passed++;console.log('PASS stale revision preserves server shortlist, blocks Undo and recovers through Plan');
    const switched=await setup(browser,{width:360});await switched.page.goto(base+'/compare');await ready(switched.page);const originalKey=switched.key();
    switched.binding.actor={...switched.binding.actor,id:'other-mock-client',workspaceId:id(2)};await switched.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await waitFor(async()=>await table(switched.page).count()===0,'old account table cleared');await switched.page.reload();await switched.page.getByRole('heading',{name:'Your shortlist is empty',exact:true}).waitFor();
    assert.equal(switched.server.plans.get(originalKey).shortlistProviderWorkspaceIds.length,3);assert.equal(switched.server.plans.has(switched.key()),false);await switched.context.close();passed++;console.log('PASS switched identity clears old shortlist and restores only its own Plan');
    const tabs=await setup(browser,{width:360});await tabs.page.goto(base+'/compare');await ready(tabs.page);const second=await tabs.context.newPage();await second.goto(base+'/compare');await ready(second);
    await table(tabs.page).getByRole('button',{name:'Remove '+names[1],exact:true}).click();await waitFor(async()=>await table(second).locator('thead th').count()===2,'cross-tab shortlist restored');
    await tabs.page.getByRole('button',{name:'Undo shortlist change',exact:true}).click();await waitFor(async()=>await table(second).locator('thead th').count()===3,'cross-tab Undo restored');await tabs.context.close();passed++;console.log('PASS real BroadcastChannel restores shortlist and Undo across rendered tabs');
    const keyboard=await setup(browser,{width:360});await keyboard.page.goto(base+'/creators/'+providerIds[3]);const toggle=keyboard.page.getByRole('button',{name:'Shortlist '+names[3],exact:true}).first();await toggle.focus();await keyboard.page.keyboard.press('Enter');await keyboard.page.getByRole('dialog').waitFor();
    await keyboard.page.keyboard.press('Escape');await waitFor(()=>toggle.evaluate(el=>el===document.activeElement),'Escape restores trigger focus');assert.equal(keyboard.server.writes,0);await keyboard.context.close();passed++;console.log('PASS keyboard dialog, Escape, focus restoration and no accidental write');
    const removed=await setup(browser,{width:360});removed.server.unavailable=providerIds.slice(1,3);await removed.page.goto(base+'/compare');await table(removed.page).waitFor();
    assert.equal(await table(removed.page).getByText('Provider unavailable',{exact:true}).count(),2);await removed.page.getByRole('button',{name:'Remove unavailable providers',exact:true}).click();
    await removed.page.getByRole('heading',{name:'Choose one more provider',exact:true}).waitFor();assert.deepEqual(removed.server.plans.get(removed.key()).shortlistProviderWorkspaceIds,[p1]);await removed.context.close();passed++;console.log('PASS removed providers retain order and honest unavailable state, bulk removal avoids invalid intermediate Plans');
    const journey=await setup(browser,{width:390});const jp=journey.page;await jp.goto(base+'/discover?tab=looks');const cards=jp.locator('main a[href^="/looks/"]');await cards.first().waitFor();
    await jp.getByRole('button',{name:'Save look',exact:true}).first().click();await jp.getByRole('button',{name:'Unsave look',exact:true}).first().waitFor();
    await jp.goto(base+'/home?tab=saved');await jp.getByRole('heading',{name:'Your saved looks',exact:true}).waitFor();await jp.locator(`main a[href="/looks/${look1}"]`).click();await jp.getByRole('link',{name:'Plan this look',exact:true}).click();
    await jp.getByRole('heading',{name:'Your preferences',exact:true}).waitFor();await jp.getByRole('link',{name:'See my estimate',exact:true}).click();await jp.getByRole('heading',{name:'Price breakdown',exact:true}).waitFor();
    await jp.getByRole('link',{name:'Compare',exact:true}).first().click();await ready(jp);await jp.getByRole('link',{name:'Return to my Plan',exact:true}).click();await jp.getByRole('heading',{name:'Your preferences',exact:true}).waitFor();
    assert.equal(journey.server.plans.get(journey.key()).locationArea,'Kilimani');assert.deepEqual(journey.errors,[]);await journey.context.close();passed++;console.log('PASS Discover to Save, Saved, canonical Look, Plan, Estimate, Compare and return to same Plan');
    const shortName=names[0];names[0]='LongProviderName'.repeat(10);const long=await setup(browser,{width:360});long.server.plans.get(long.key()).leadingChoiceProviderWorkspaceId=p1;
    await long.page.goto(base+'/compare');await table(long.page).waitFor();await long.page.getByRole('link',{name:'View '+names[0]+' profile',exact:true}).waitFor();
    assert.equal(await long.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await long.context.close();names[0]=shortName;passed++;console.log('PASS long provider names wrap without losing identity or overflowing at 360px');
    const guest=await setup(browser,{width:360});await guest.context.route('**/api/me',route=>route.fulfill({status:401,contentType:'application/json',body:'{"ok":false}'}));
    await guest.page.goto(base+'/compare');await guest.page.getByRole('link',{name:'Sign in to compare your saved plan',exact:true}).waitFor();assert.equal(await table(guest.page).count(),0);assert.deepEqual(guest.mutations,[]);assert.equal(guest.page.planTrace.some(value=>value.startsWith('GET ')),false);await guest.context.close();passed++;console.log('PASS guest sees sign-in recovery without loading or persisting a private shortlist');
    const cardScenario=await setup(browser,{width:360},2);await cardScenario.page.goto(base+'/discover?tab=looks');const cardToggle=cardScenario.page.locator('main').getByRole('button',{name:'Shortlist '+names[2],exact:true});await cardToggle.waitFor();
    await waitFor(()=>cardToggle.isEnabled(),'card toggle ready');const origin=cardScenario.page.url();await cardToggle.evaluate(el=>{el.click();el.click();el.click();});
    await waitFor(()=>cardScenario.server.plans.get(cardScenario.key()).shortlistProviderWorkspaceIds.length===3,'one ordered card addition');assert.equal(cardScenario.server.writes,1);assert.equal(cardScenario.page.url(),origin);
    const removeCard=cardScenario.page.locator('main').getByRole('button',{name:'Remove '+names[2],exact:true});await waitFor(()=>removeCard.isEnabled(),'card removal ready');await removeCard.click();await cardScenario.page.getByRole('button',{name:'Undo shortlist change',exact:true}).click();
    await waitFor(()=>cardScenario.server.plans.get(cardScenario.key()).shortlistProviderWorkspaceIds.length===3,'card remove Undo');assert.deepEqual(cardScenario.server.plans.get(cardScenario.key()).shortlistProviderWorkspaceIds,providerIds.slice(0,3));assert.equal(cardScenario.page.url(),origin);await cardScenario.context.close();passed++;console.log('PASS real card toggles, rapid repeated clicks, ordered persistence and Remove/Undo never trigger card navigation');
    fs.writeFileSync('docs/readiness/sprint3/compare-columns.json',JSON.stringify(measurements,null,2));
    console.log(`PASS ${passed} mocked integrated Compare browser scenarios`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
