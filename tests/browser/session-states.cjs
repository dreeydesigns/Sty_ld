// Session state proof for the pages that used to decide it during render.
// Guest and signed-in answers come only from the intercepted API, so a first
// client render that disagrees with the server markup shows as a hydration error.
// /activity is protected by middleware, so a guest never reaches the page: the
// boundary plus the returnTo is what is checkable without a live session.
// Usage: node tests/browser/session-states.cjs [playwright module] [base URL]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.STYLD_BASE_URL || (process.argv[3]?.startsWith('http') ? process.argv[3] : 'http://localhost:3107');

const HYDRATION = /hydrat|did not match|content does not match|server HTML|Text content/i;

async function open(browser, width, handlers) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const localHost = new URL(base).hostname;
  const failures = [];
  await context.route((url) => url.hostname !== localHost, (r) => r.abort());
  await context.route('**/api/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"ok":false,"error":"Not authenticated."}' }));
  for (const [pathname, reply] of Object.entries(handlers)) {
    await context.route(`${base}${pathname}`, (r) => r.fulfill({ status: reply.status || 200, contentType: 'application/json', body: JSON.stringify(reply.body) }));
  }
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`pageerror ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error' && HYDRATION.test(message.text())) failures.push(`console ${message.text()}`); });
  return { context, page, failures };
}

const applicationData = { '/api/workspaces': { body: { applications: [{ role: 'professional', status: 'pending', created_at: '2026-10-20T08:00:00Z' }] } } };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let checks = 0;
  try {
    for (const width of [390, 1366]) {
      // A guest on /activity is sent to sign in and keeps the destination.
      const guestActivity = await open(browser, width, {});
      await guestActivity.page.goto(`${base}/activity`, { waitUntil: 'domcontentloaded' });
      await guestActivity.page.waitForURL('**/auth/sign-in**', { timeout: 20000 });
      assert.match(new URL(guestActivity.page.url()).searchParams.get('returnTo') || '', /^\/activity$/, 'the sign-in redirect keeps the intended destination');
      assert.deepEqual(guestActivity.failures, [], `/activity guest boundary at ${width}px renders no hydration or script error`);
      await guestActivity.context.close();
      checks += 1;
      console.log(`PASS /activity guest ${width}px redirects to sign in with returnTo=/activity`);

      // /workspace/application is open, so both answers are provable in the page.
      const guestApplication = await open(browser, width, {});
      await guestApplication.page.goto(`${base}/workspace/application`, { waitUntil: 'domcontentloaded' });
      await guestApplication.page.getByText('Please sign in', { exact: false }).first().waitFor({ timeout: 20000 });
      assert.equal(await guestApplication.page.getByText('Under Review').count(), 0, 'a guest answer renders no application record');
      assert.deepEqual(guestApplication.failures, [], `/workspace/application guest at ${width}px renders no hydration or script error`);
      await guestApplication.context.close();
      checks += 1;
      console.log(`PASS /workspace/application guest ${width}px shows the sign-in panel and no data`);

      const signedApplication = await open(browser, width, applicationData);
      await signedApplication.page.goto(`${base}/workspace/application`, { waitUntil: 'domcontentloaded' });
      await signedApplication.page.getByText('Under Review', { exact: false }).first().waitFor({ timeout: 20000 });
      assert.equal(await signedApplication.page.getByText('Please sign in', { exact: false }).count(), 0, 'a server answer never leaves the guest panel up');
      assert.deepEqual(signedApplication.failures, [], `/workspace/application signed-in at ${width}px renders no hydration or script error`);
      await signedApplication.context.close();
      checks += 1;
      console.log(`PASS /workspace/application signed-in ${width}px renders the server record with no guest panel`);
    }
    console.log(`${checks}/${checks} session state browser checks passed against ${base}`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
