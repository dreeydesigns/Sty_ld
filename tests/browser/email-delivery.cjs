// Local UI regressions only. All APIs and external requests are intercepted.
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://localhost:3107';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let passed = 0;
  try {
    for (const width of [360, 1440]) for (const [status, code, message] of [
      [503, 'RESEND_TEST_RECIPIENT_RESTRICTED', /could not deliver/i],
      [503, 'RESEND_DOMAIN_NOT_VERIFIED', /could not deliver/i],
      [503, 'EMAIL_NOT_CONFIGURED', /not configured/i],
      [429, 'RESEND_RATE_LIMITED', /too many emails/i],
      [503, 'EMAIL_NETWORK_ERROR', /could not deliver/i],
    ]) {
      const context = await browser.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      let sends = 0;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        if (url.pathname.endsWith('/email-otp/send-verification-otp')) {
          sends++;
          return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code, message: 'private-provider-canary' }) });
        }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: url.pathname === '/api/me' ? 401 : 200, contentType: 'application/json', body: url.pathname.endsWith('/get-session') ? 'null' : '{}' });
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(base + '/auth/sign-in');
      await page.getByLabel('Email address').fill('authorized-mock@example.test');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByText(message).waitFor();
      assert.equal(await page.getByLabel('Verification code').count(), 0, 'failed delivery never enters code stage');
      assert.equal(await page.getByText('private-provider-canary').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Continue with email', exact: true }).isEnabled(), true, 'retry remains available');
      assert.equal(sends, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await context.close(); passed++;
      console.log(`PASS email rejection ${code}, ${width}px, no delivery claim or provider detail`);
    }
    console.log(`${passed}/${passed} mocked email browser scenarios passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
