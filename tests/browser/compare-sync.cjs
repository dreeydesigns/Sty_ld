// Run separately so two actual tabs start in a fresh browser on constrained hosts.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('./plan-v2.cjs');
const {setup,table,ready,names}=require('./compare.cjs');
const base=process.argv[3]||'http://localhost:3107';
async function waitFor(fn,label){for(let n=0;n<300;n++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error(label);}
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  let f,second;
  try{
    f=await setup(browser,{width:360});f.page.setDefaultTimeout(60000);
    await f.page.goto(base+'/compare');await ready(f.page);
    second=await f.context.newPage();second.setDefaultTimeout(60000);second.on('pageerror',error=>f.errors.push(error.message));await second.goto(base+'/compare');await ready(second);
    await f.page.bringToFront();
    await table(f.page).getByRole('button',{name:'Remove '+names[1],exact:true}).click();
    await waitFor(async()=>await table(second).locator('thead th').count()===2,'background tab receives the confirmed shortlist');
    await f.page.getByRole('button',{name:'Undo shortlist change',exact:true}).click();
    await waitFor(async()=>await table(second).locator('thead th').count()===3,'background tab receives the confirmed Undo');
    await second.bringToFront();await ready(second);
    assert.equal(f.server.writes,2);assert.deepEqual(f.errors,[]);assert.ok(f.mutations.every(value=>value==='/api/plan'));
    console.log('PASS 1 real two-tab BroadcastChannel shortlist and Undo scenario, mocked APIs only');
  }catch(error){
    try{fs.writeFileSync('docs/readiness/sprint3/compare-sync-diagnostic.json',JSON.stringify({url:f?.page.url(),secondUrl:second?.url(),status:await f?.page.locator('[role="status"],[role="alert"]').allTextContents(),writes:f?.server.writes},null,2));}catch{}
    throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
