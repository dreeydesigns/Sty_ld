// First-render evidence in a real browser against the real production build (Quality Assurance).
//
// The HTML audit (scripts/first-render-audit.cjs) proves what the server puts on the wire. This
// suite proves what a person actually gets, which is a different question with three parts the
// reports kept conflating: what is readable before JavaScript runs, what happens when JavaScript
// runs slowly on a Kenyan mobile connection, and whether the client swap from fallback to real
// content makes the page shift, error, or lie about its state.
//
//   node tests/browser/live-first-render.cjs --bin "<PostgreSQL 17.11 bin>"
//
// Own disposable cluster, own loopback mail, real `next start`. Nothing is mocked and no route is
// judged against a dev server.

const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');
const { visible, beyondShell, shellWords } = require('../../scripts/first-render-audit.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = 'docs/readiness/beta/live-first-render.json';

// Each entry is a route a guest can reach without an account, plus the words its own first paint
// has to carry. The list is the product's claim, so a route that loses its heading fails here
// rather than quietly dropping back to a spinner.
const FIRST_PAINT = [
  { route: '/', expect: ['Explore Kenyan beauty marketplace'] },
  { route: '/discover?tab=looks', expect: ['Looks, salons, professionals & services', 'Find a Look, explore its creator, or browse services.'] },
  { route: '/book', expect: ['Plan your beauty visit', 'Choose a service and see an estimate.', 'Loading the plan builder.'] },
  { route: '/privacy', expect: ['Privacy Policy'] },
  { route: '/contact', expect: ['Contact us'] },
  { route: '/terms', expect: ['Terms', 'Conditions of Use'] },
  // Middleware protects /dashboard, so a guest never receives its body: the route is checked as the
  // boundary it is, and its own words are read from the HTML prerendered for a signed-in visitor.
  { route: '/dashboard', expect: ['Taking you to your workspace.', 'Open your feed'], boundary: '/auth/sign-in', file: 'dashboard' },
  { route: '/theme-quiz', expect: ['Let us find your world.'] },
];

// The two routes that fetch their own data decide whether the fix is real: the shell arriving early
// is worth nothing if the content still takes twenty seconds or the swap moves the page. `readyWhen`
// is a phrase only the finished page renders, so the timing measures the journey and not a spinner.
const THROTTLED = [
  { route: '/discover?tab=looks', feed: '/api/social/posts', readyWhen: /Live QA Braider/ },
  { route: '/book', feed: '/api/services', readyWhen: /Choose a service/ },
];

// Roughly what a 3G phone in Nairobi sees: a long round trip, a modest downlink, and a uplink an
// order of magnitude smaller than the downlink.
const KENYAN_3G = { offline: false, latency: 350, downloadThroughput: Math.round(1_500_000 / 8), uploadThroughput: Math.round(420_000 / 8) };

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'").replace(/&#x2F;/gi, '/')
    .replace(/&amp;/g, '&');
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

(async () => {
  if (!fs.existsSync(path.join(root, '.next/BUILD_ID'))) throw new Error('Run npm run build first: this suite measures the built artifact.');
  let buildId = fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim();
  const cluster = await startLiveCluster({ bin, label: 'live-first-render' });
  let mail, server, browser;
  const serverLog = [];
  const failures = [];
  let cleanedUp = false;
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    fs.mkdirSync('docs/readiness/beta', { recursive: true });
    console.log('cleanup', JSON.stringify(cleanup));
    return cleanup;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }
  const results = { firstPaint: [], throttled: [], errorState: null, reducedMotionWait: null };
  try {
    mail = await startMailCapture();
    const appPort = await freePort();
    const base = `http://127.0.0.1:${appPort}`;
    const environment = {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
      POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
      EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'qa-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
      RESEND_API_URL: mail.apiUrl,
    };
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(appPort)],
      { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => serverLog.push(String(chunk)));
    server.stderr.on('data', chunk => serverLog.push(String(chunk)));
    for (let attempt = 0; attempt < 90; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // One real look, so the feed has something to render and the timings measure a working page.
    const userId = randomUUID(), workspaceId = randomUUID(), serviceId = randomUUID(), postId = randomUUID();
    await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userId, 'qa-first-render@example.test', 'Live QA Braider']);
    await cluster.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,'professional',$3)",
      [workspaceId, userId, JSON.stringify({ displayName: 'Live QA Braider', location: 'Kilimani, Nairobi', serviceMode: 'House calls', specialty: 'Braids' })]);
    await cluster.owner.query('INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,$4,$5,true)',
      [serviceId, workspaceId, userId, 'Box braids', 2500]);
    await cluster.owner.query(`INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
      VALUES($1,$2,$3,'Live QA Braider','professional','portfolio','Disposable first-render fixture',$4,ARRAY[]::text[],'public','published','visible')`,
      [postId, userId, workspaceId, [`svc:${serviceId}`]]);

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    // Nothing is subtracted any more: the root app/loading.tsx is gone, so every word painted in the
    // body belongs to the route. The file is still read if a project puts one back.
    const loaderFile = path.join(root, 'app/loading.tsx');
    const shell = fs.existsSync(loaderFile) ? shellWords(fs.readFileSync(loaderFile, 'utf8')) : [];

    // ── 1. What a visitor reads before JavaScript runs ─────────────────────────
    // Fetched over HTTP rather than opened in a JavaScript-disabled tab on purpose: no script runs
    // here either, and the answer is the exact bytes the server chose for that route.
    for (const entry of FIRST_PAINT) {
      // A route the middleware protects is answered with a redirect before any body is chosen, so the
      // only way to see its own first paint is the HTML the build prerendered for a signed-in visitor.
      if (entry.boundary) {
        const response = await fetch(`${base}${entry.route}`, { redirect: 'manual' });
        const location = response.headers.get('location') || '';
        const prerendered = fs.readFileSync(path.join(root, '.next/server/app', `${entry.file}.html`), 'utf8');
        const painted = decodeEntities(visible(prerendered));
        const missing = entry.expect.filter(phrase => !painted.includes(phrase));
        results.firstPaint.push({ route: entry.route, status: response.status, redirectsTo: location,
          authenticatedBoundary: true, charactersBeyondFrame: beyondShell(visible(prerendered, shell.length === 0 ? { withoutFrame: true } : {}), shell),
          missingExpectedCopy: missing, announcedByAStatusRegion: /role="status"/.test(prerendered),
          firstWords: painted.replace(/STYLD|Styld/g, ' ').trim().slice(0, 120) });
        if (response.status !== 307) failures.push(`${entry.route} should send a guest to sign in, got ${response.status}`);
        if (!location.includes(entry.boundary)) failures.push(`${entry.route} redirected to ${JSON.stringify(location)}, not ${entry.boundary}`);
        if (missing.length) failures.push(`${entry.route} first paint is missing ${JSON.stringify(missing)}`);
        if (!/role="status"/.test(prerendered)) failures.push(`${entry.route} does not announce the wait to a screen reader`);
        continue;
      }
      const response = await fetch(`${base}${entry.route}`);
      const html = await response.text();
      // With no route-level loading file the shared frame (brand header, mobile nav, preview banner)
      // is what repeats on every shell route, so it is taken out by region rather than by word.
      const text = visible(html, shell.length === 0 ? { withoutFrame: true } : {});
      const readable = decodeEntities(text);
      const characters = beyondShell(text, shell);
      const missing = entry.expect.filter(phrase => !readable.includes(phrase));
      results.firstPaint.push({ route: entry.route, status: response.status, charactersBeyondFrame: characters,
        missingExpectedCopy: missing, announcedByAStatusRegion: /role="status"/.test(html),
        firstWords: readable.replace(/STYLD|Styld/g, ' ').trim().slice(0, 120) });
      if (response.status >= 400) failures.push(`${entry.route} answered ${response.status}`);
      if (characters === 0) failures.push(`${entry.route} shows no words of its own before JavaScript`);
      if (missing.length) failures.push(`${entry.route} first paint is missing ${JSON.stringify(missing)}`);
    }

    // ── 2. The same routes on a slow Kenyan connection, JavaScript on ──────────
    for (const entry of THROTTLED) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const consoleErrors = [];
      const requests = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => consoleErrors.push(`pageerror ${error.message}`));
      page.on('request', request => requests.push({ url: request.url(), at: Date.now() }));
      await page.addInitScript(() => {
        window.__styldShifts = { total: 0, largest: 0, entries: [] };
        try {
          new PerformanceObserver(list => {
            for (const item of list.getEntries()) {
              if (item.hadRecentInput) continue;
              window.__styldShifts.total += item.value;
              window.__styldShifts.largest = Math.max(window.__styldShifts.largest, item.value);
              window.__styldShifts.entries.push({ value: Number(item.value.toFixed(4)), sources: (item.sources || []).map(source => (source.node && source.node.nodeName) || 'unknown').slice(0, 3) });
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch { window.__styldShifts.unsupported = true; }
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', KENYAN_3G);

      const startedAt = Date.now();
      await page.goto(`${base}${entry.route}`, { waitUntil: 'commit', timeout: 120000 });
      // The prerendered first paint is only useful if it arrives before the bundles finish, so the
      // two moments are sampled separately: when the page said something, and when it was done.
      let usefulAt = null, firstWordsAt = null, genericSpinnerAt = null, waitingElement = null;
      for (let tick = 0; tick < 240 && usefulAt === null; tick++) {
        const sample = await page.evaluate(() => document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : '');
        const elapsed = Date.now() - startedAt;
        // The sentence app/loading.tsx used to paint for every route. Meeting it here would mean a
        // visitor spent the wait on a generic spinner instead of the page's own honest picture.
        if (genericSpinnerAt === null && sample.includes('Preparing your beauty moment')) genericSpinnerAt = elapsed;
        if (firstWordsAt === null && /Looks, salons, professionals|Plan your beauty visit/.test(sample)) firstWordsAt = elapsed;
        // The waiting element has to be measured while it is on screen. Read after the content
        // arrives and there is nothing left to measure, which is how an earlier pass recorded a
        // reduced-motion result of null and still reported no failure.
        if (waitingElement === null) {
          const probe = await page.evaluate(() => {
            const spinner = document.querySelector('.loader-bloom, .animate-pulse');
            if (!spinner) return undefined;
            const style = getComputedStyle(spinner);
            const region = spinner.closest('[role="status"]') || spinner.querySelector('[role="status"]') || document.querySelector('[role="status"]');
            return { selector: String(spinner.className).split(' ')[0], seenAt: Math.round(performance.now()),
              animationName: style.animationName, animationDuration: style.animationDuration,
              animationIterationCount: style.animationIterationCount, ariaHidden: spinner.getAttribute('aria-hidden'),
              announcedBy: region ? String(region.getAttribute('aria-label') || region.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) : null };
          });
          if (probe !== undefined) waitingElement = probe;
        }
        if (entry.readyWhen.test(sample)) usefulAt = elapsed;
        await page.waitForTimeout(tick === 0 ? 120 : 250);
      }
      const feedRequest = requests.find(request => request.url.includes(entry.feed || 'zzz'));
      const shifts = await page.evaluate(() => window.__styldShifts);
      const hydrationErrors = consoleErrors.filter(message => /hydrat|Minified React error|An error occurred during hydration/i.test(message));
      const bloom = waitingElement;
      results.throttled.push({ route: entry.route, profile: KENYAN_3G, msUntilFirstWords: firstWordsAt, msUntilUsefulContent: usefulAt,
        msGenericSpinnerWasSeen: genericSpinnerAt, feedRequestedAt: feedRequest ? feedRequest.at - startedAt : null,
        realRecordRendered: usefulAt !== null, layoutShift: shifts, consoleErrors, hydrationErrors, reducedMotionSpinner: bloom });
      if (usefulAt === null) failures.push(`${entry.route} never reached its finished content within the sampling window`);
      if (hydrationErrors.length) failures.push(`${entry.route} reported ${hydrationErrors.length} hydration error(s)`);
      if (shifts && shifts.largest > 0.1) failures.push(`${entry.route} shifted ${shifts.largest.toFixed(3)} after load, above the 0.1 budget`);
      if (genericSpinnerAt !== null) failures.push(`${entry.route} still shows the generic loading shell at ${genericSpinnerAt}ms`);
      if (bloom && bloom.animationIterationCount !== '1') failures.push(`${entry.route} keeps animating ${bloom.selector} under reduced motion (${bloom.animationIterationCount})`);
      await context.close();
    }

    // ── 3. Does the page tell the truth when the feed cannot be read? ──────────
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.route('**/api/social/posts**', route => route.abort('failed'));
      // 'commit' rather than 'domcontentloaded': this page streams, and the question is what the
      // settled page says, so the step must not fail because the first flush took a slow minute.
      await page.goto(`${base}/discover?tab=looks`, { waitUntil: 'commit', timeout: 120000 });
      const stated = await page.waitForFunction(() => document.body.innerText.includes('Looks are unavailable right now'), null, { timeout: 60000 })
        .then(() => true).catch(() => false);
      const retried = await page.getByRole('button', { name: /try again/i }).count();
      const claimedData = await page.getByText('Live QA Braider').count();
      results.errorState = { feedRefused: stated, retryControl: retried, dataClaimedWhileRefused: claimedData };
      if (!stated) failures.push('/discover did not say the feed was unavailable when the request failed');
      if (retried < 1) failures.push('/discover offered no way to retry a refused feed');
      if (claimedData > 0) failures.push('/discover showed provider data while reporting the feed as unavailable');
      await context.close();
    }

    // ── 4. A visitor who asked for less motion, and one who cannot run any ─────
    // The bloom /dashboard paints while it decides is the same class /join-team paints while it
    // checks a token, and /join-team is reachable without a session. Blocking the bundles leaves the
    // prerendered page exactly as a visitor with JavaScript turned off would keep it, which is the
    // shape the sentence has to survive on its own.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await page.route('**/_next/static/**', route => route.abort());
      await page.goto(`${base}/join-team`, { waitUntil: 'commit', timeout: 120000 });
      const wait = await page.evaluate(() => {
        const spinner = document.querySelector('.loader-bloom');
        if (!spinner) return null;
        const style = getComputedStyle(spinner);
        const region = spinner.closest('[role="status"]');
        return { route: location.pathname, selector: String(spinner.className).split(' ')[0], hydrationBlocked: true,
          animationName: style.animationName, animationDuration: style.animationDuration,
          animationIterationCount: style.animationIterationCount, decorative: spinner.getAttribute('aria-hidden') === 'true',
          announcedBy: region ? String(region.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) : null };
      });
      results.reducedMotionWait = wait;
      if (!wait) failures.push('/join-team did not keep its own waiting spinner on screen while the bundles were blocked');
      else {
        if (wait.animationIterationCount !== '1') failures.push(`/join-team keeps spinning under reduced motion (${wait.animationIterationCount})`);
        if (!wait.decorative) failures.push('/join-team reads the decorative bloom to a screen reader');
        // The sentence has to be on the screen, not only in an attribute: a sighted visitor waiting
        // for a page deserves to see why the spinner is there.
        if (!/Checking the invitation/.test(wait.announcedBy || '')) failures.push(`/join-team's wait is not said in visible words, got ${JSON.stringify(wait.announcedBy)}`);
      }
      // The same sentence a signed-in visitor reads at /dashboard, read out of the built artifact
      // because middleware answers a guest with the redirect before the body is chosen.
      const dashboardHtml = fs.readFileSync(path.join(root, '.next/server/app/dashboard.html'), 'utf8');
      const dashboardWait = /<div class="loader-bloom[^"]*"[^>]*aria-hidden="true"/.test(dashboardHtml);
      results.reducedMotionWait = { ...(wait || {}), dashboardBloomSharesTheClass: dashboardWait,
        dashboardAnnouncement: /role="status"/.test(dashboardHtml) };
      if (!dashboardWait) failures.push('/dashboard no longer paints the bloom this step measures on the same class');
      if (!/role="status"/.test(dashboardHtml)) failures.push('/dashboard does not announce its wait to a screen reader');
      await context.close();
    }

    const receipt = {
      commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      buildId,
      measuredAt: new Date().toISOString(),
      conditions: { server: 'next start (production build)', cluster: cluster.identity, network: KENYAN_3G, viewport: '390x844 mobile',
        firstPaintPass: 'HTTP fetch, no JavaScript runs on the page', throttledPass: 'JavaScript on, reducedMotion reduce, Kenyan 3G',
        waitingElementPass: 'reducedMotion reduce with the bundles blocked, so the prerendered page stays as a no-JS visitor keeps it' },
      results,
      failures,
    };
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    for (const row of results.firstPaint) console.log(`first paint ${row.route}  ${row.charactersBeyondFrame} chars beyond the frame${row.missingExpectedCopy.length ? `  MISSING ${JSON.stringify(row.missingExpectedCopy)}` : ''}`);
    for (const row of results.throttled) console.log(`throttled   ${row.route}  useful at ${row.msUntilUsefulContent}ms, feed at ${row.feedRequestedAt}ms, largest shift ${(row.layoutShift.largest || 0).toFixed(4)}, hydration errors ${row.hydrationErrors.length}, waiting ${row.reducedMotionSpinner ? `${row.reducedMotionSpinner.selector} repeats ${row.reducedMotionSpinner.animationIterationCount}` : 'none seen'}`);
    console.log(`error state ${JSON.stringify(results.errorState)}`);
    console.log(`reduced motion ${JSON.stringify(results.reducedMotionWait)}`);
    const cleanup = await teardown();
    fs.writeFileSync('docs/readiness/beta/live-first-render-cleanup.json', JSON.stringify({ ...cleanup, serverLogTail: serverLog.slice(-4).join('').slice(-800) }, null, 2));
    if (failures.length) { console.log(`FAIL ${failures.length}: ${failures.join(' | ')}`); process.exit(1); }
    console.log(`PASS ${results.firstPaint.length} first paints, ${results.throttled.length} throttled journeys, refused feed stated honestly, waiting elements announced and still`);
  } catch (error) {
    fs.mkdirSync('docs/readiness/beta', { recursive: true });
    // A crash has to be diagnosable from the receipt alone, so the server's own last words travel
    // with it. Without this a browser timeout is the only evidence anyone gets.
    fs.writeFileSync(receiptPath, JSON.stringify({ commit: require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(), buildId, crashed: String(error && error.message || error), serverLogTail: serverLog.join('').slice(-2000), failures, results }, null, 2));
    await teardown();
    console.error('CRASHED', error && error.stack || error);
    process.exit(1);
  }
})();
