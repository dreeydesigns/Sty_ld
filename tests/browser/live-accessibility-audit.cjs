// Wave C accessibility, resilience and performance evidence on the real production build.
// Own disposable cluster, own loopback mail, real Next server, axe-core injected in the page.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = 'docs/readiness/beta/live-accessibility-audit.json';
// axe-core is not declared in package.json. It resolves here as a hoisted transitive dependency of
// eslint-plugin-jsx-a11y, so a future lint upgrade could remove it. The receipt records where it came
// from and this check names the prerequisite instead of letting require.resolve throw a bare path.
let axePath;
try {
  axePath = require.resolve('axe-core/axe.min.js');
} catch {
  throw new Error('axe-core is not installed. Run: npm install --no-save --ignore-scripts axe-core');
}

const VIEWPORTS = [
  { name: 'android-small', width: 360, height: 640, mobile: true },
  { name: 'iphone-375', width: 375, height: 812, mobile: true },
  { name: 'iphone', width: 390, height: 844, mobile: true },
  { name: 'iphone-max', width: 428, height: 926, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'laptop', width: 1024, height: 768, mobile: false },
  { name: 'laptop-1366', width: 1366, height: 768, mobile: false },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];
// The full guest sweep runs at these widths. The others carry the three route shapes that change
// layout the most, so the matrix is a coverage decision and the receipt names it per viewport.
const FULL_SWEEP = ['android-small', 'iphone-375', 'iphone', 'desktop'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'aria'];
const findings = [];
const notes = [];

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function record(entry) { findings.push(entry); console.log(entry.summary); }

(async () => {
  const cluster = await startLiveCluster({ bin, label: 'live-accessibility-audit' });
  let mail;
  let server;
  let browser;
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
    fs.writeFileSync('docs/readiness/beta/live-a11y-cleanup.json', JSON.stringify({ ...cleanup, serverLogTail: serverLog.slice(-4).join('').slice(-800) }, null, 2));
    console.log('cleanup', JSON.stringify(cleanup));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }
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
    const userId = randomUUID(), workspaceId = randomUUID(), serviceId = randomUUID(), postId = randomUUID();
    await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userId, 'qa-a11y@example.test', 'Live QA Braider']);
    await cluster.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,'professional',$3)",
      [workspaceId, userId, JSON.stringify({ displayName: 'Live QA Braider', location: 'Kilimani, Nairobi', serviceMode: 'House calls', specialty: 'Braids' })]);
    await cluster.owner.query('INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,$4,$5,true)',
      [serviceId, workspaceId, userId, 'Box braids', 2500]);
    await cluster.owner.query(`INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
      VALUES($1,$2,$3,'Live QA Braider','professional','portfolio','Disposable accessibility fixture',$4,ARRAY[]::text[],'public','published','visible')`,
      [postId, userId, workspaceId, [`svc:${serviceId}`]]);

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const routes = ['/', '/discover?tab=looks', `/looks/${postId}`, `/creators/${workspaceId}`, '/compare', '/auth/sign-in', '/account', '/help'];
    const reducedRoutes = ['/', '/discover?tab=looks', '/auth/sign-in'];
    const matrix = [];
    for (const viewport of VIEWPORTS) {
      for (const route of (FULL_SWEEP.includes(viewport.name) ? routes : reducedRoutes)) matrix.push({ viewport, route });
    }

    // One context per viewport keeps the axe scan honest about responsive states.
    const grouped = [];
    for (const cell of matrix) {
      if (!grouped.length || grouped[grouped.length - 1].viewport.name !== cell.viewport.name) grouped.push({ viewport: cell.viewport, routes: [] });
      grouped[grouped.length - 1].routes.push(cell.route);
    }
    for (const group of grouped) {
      const viewport = group.viewport;
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: 2 });
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        return route.abort();
      });
      for (const route of group.routes) {
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message.slice(0, 200)));
        let bytes = 0, responses = 0;
        page.on('response', async response => {
          responses++;
          const length = response.headers()['content-length'];
          if (length) bytes += Number(length);
        });
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.addScriptTag({ path: axePath });
        const scan = await page.evaluate(async tags => {
          const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
          return {
            violations: result.violations.map(violation => ({
              id: violation.id, impact: violation.impact, help: violation.help,
              nodes: violation.nodes.slice(0, 3).map(node => {
                const contrast = node.data && node.data.colorContrastData;
                return {
                  target: node.target.join(' '),
                  html: (node.html || '').replace(/\s+/g, ' ').slice(0, 180),
                  colour: contrast ? {
                    foreground: contrast.foreColor, background: contrast.backColor,
                    ratio: Number(contrast.contrastRatio), needs: contrast.expectedContrastRatio,
                    text: `${contrast.fontSize} ${contrast.fontWeight}`,
                  } : null,
                  failure: (node.failureSummary || '').slice(0, 220),
                };
              }),
              count: violation.nodes.length,
            })),
            incomplete: result.incomplete.map(item => ({ id: item.id, count: item.nodes.length })),
            passes: result.passes.length,
          };
        }, AXE_TAGS);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
          headings: [...document.querySelectorAll('h1,h2,h3')].map(node => node.tagName).slice(0, 6),
          landmarks: [...document.querySelectorAll('main,nav,header,footer,[role="main"]')].length,
          imagesWithoutText: [...document.querySelectorAll('img')].filter(image => !image.getAttribute('alt')).length,
        }));
        record({
          summary: `${viewport.name} ${route}: ${scan.violations.length} violation rules, ${scan.violations.reduce((sum, item) => sum + item.count, 0)} nodes, ${overflow.scrollWidth > overflow.innerWidth + 1 ? 'horizontal overflow' : 'no overflow'}, ${Math.round(bytes / 1024)} KB reported over ${responses} responses${pageErrors.length ? `, ${pageErrors.length} page errors` : ''}`,
          viewport: viewport.name, route, axe: scan, layout: overflow, pageErrors, transferBytes: bytes, responses,
        });
        if (scan.violations.some(violation => violation.impact === 'critical' || violation.impact === 'serious')) {
          failures.push(`${viewport.name} ${route}: ${scan.violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}(${v.count})`).join(', ')}`);
        }
        if (overflow.scrollWidth > overflow.innerWidth + 1) failures.push(`${viewport.name} ${route}: horizontal overflow ${overflow.scrollWidth} > ${overflow.innerWidth}`);
        await page.close();
      }
      await context.close();
    }

    // Keyboard order and visible focus on the phone viewport.
    const keyboardContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await keyboardContext.route(/.*/, route => (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.fallback() : route.abort()));
    for (const route of ['/auth/sign-in', '/discover?tab=looks', '/compare']) {
      const page = await keyboardContext.newPage();
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      const trail = [];
      for (let index = 0; index < 14; index++) {
        await page.keyboard.press('Tab');
        trail.push(await page.evaluate(() => {
          const active = document.activeElement;
          if (!active || active === document.body) return 'LOST';
          const rect = active.getBoundingClientRect();
          return `${active.tagName.toLowerCase()}${active.getAttribute('aria-label') ? `[${active.getAttribute('aria-label')}]` : ''} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
        }));
      }
      const lost = trail.filter(step => step === 'LOST').length;
      const smallTargets = trail.filter(step => step !== 'LOST').map(step => {
        const match = /(\d+)x(\d+)$/.exec(step);
        return match ? Math.min(Number(match[1]), Number(match[2])) : 0;
      }).filter(size => size > 0 && size < 24).length;
      record({ summary: `keyboard ${route}: ${lost} lost focus stops of 14 tabs, ${smallTargets} tab stops under 24px on a side`, viewport: 'iphone', route, keyboard: { trail, lost, smallTargets } });
      if (lost > 3) failures.push(`keyboard ${route}: focus was lost at ${lost} of 14 tab stops`);
      await page.close();
    }
    notes.push('Undersized keyboard tab stops are recorded as findings and do not fail this run. The failure threshold is focus loss at more than 3 of 14 tab stops.');
    await keyboardContext.close();

    // Reduced motion: the product must stop decorative movement for visitors who ask.
    // The first version of this metric asked whether a duration was non-zero, and the product's
    // global reduced-motion rule collapses every duration to 0.01ms, which is not zero. That
    // reported 411 moving elements on a page that does not move, so the metric now measures the
    // magnitude of the duration instead of its existence.
    const motionContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true });
    await motionContext.route(/.*/, route => (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.fallback() : route.abort()));
    const motionPage = await motionContext.newPage();
    await motionPage.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await motionPage.waitForLoadState('networkidle').catch(() => {});
    const motion = await motionPage.evaluate(() => {
      const toMs = value => String(value || '').split(',').map(part => part.trim()).filter(Boolean)
        .map(part => part.endsWith('ms') ? parseFloat(part) : parseFloat(part) * 1000);
      const longestOn = node => {
        const style = getComputedStyle(node);
        const durations = [
          ...(style.animationName && style.animationName !== 'none' ? toMs(style.animationDuration) : []),
          ...toMs(style.transitionDuration),
        ];
        return durations.length ? Math.max(...durations) : 0;
      };
      let declared = 0;
      let movingCount = 0;
      const sample = [];
      for (const node of document.querySelectorAll('body *')) {
        const longest = longestOn(node);
        if (longest > 0) declared++;
        if (longest > 50) {
          movingCount++;
          if (sample.length < 6) sample.push(`${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]} ${Math.round(longest)}ms`);
        }
      }
      return {
        preference: matchMedia('(prefers-reduced-motion: reduce)').matches, declaredCount: declared, movingCount,
        runningAnimations: typeof document.getAnimations === 'function' ? document.getAnimations().length : null,
        sample,
      };
    });
    // The product's own global rule collapses every duration to 0.01ms, so zero is the expected
    // result rather than a tolerance. If the emulation ever stops applying, that is a broken check
    // and must fail loudly instead of passing quietly.
    if (!motion.preference) {
      failures.push('reduced motion: the browser did not report the reduce preference, so this check measured nothing');
    } else if (motion.movingCount > 0) {
      failures.push(`reduced motion: ${motion.movingCount} elements still move beyond 50ms with the preference set`);
    }
    record({ summary: `reduced motion: ${motion.preference ? 'preference honoured by the browser' : 'preference not applied'}, ${motion.declaredCount} elements declare a duration, ${motion.movingCount} exceed 50ms, ${motion.runningAnimations} animations running`, viewport: 'iphone', route: '/', motion });
    await motionPage.close();
    await motionContext.close();

    // Text scaled to two hundred percent, the WCAG 1.4.4 condition.
    const zoomContext = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
    await zoomContext.route(/.*/, route => (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.fallback() : route.abort()));
    const zoomReports = [];
    for (const route of ['/', '/discover?tab=looks', '/auth/sign-in', '/compare']) {
      const page = await zoomContext.newPage();
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.waitForTimeout(400);
      const zoom = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
        clipped: [...document.querySelectorAll('main h1,main h2,main p,button')].filter(node => node.scrollWidth > node.clientWidth + 4 && getComputedStyle(node).overflow !== 'visible').length }));
      zoomReports.push({ route, ...zoom });
      if (zoom.scrollWidth > zoom.innerWidth + 1) failures.push(`200% text ${route}: horizontal overflow ${zoom.scrollWidth} > ${zoom.innerWidth}`);
      await page.close();
    }
    record({ summary: `200% text scaling across ${zoomReports.length} routes: ${zoomReports.filter(item => item.scrollWidth > item.innerWidth + 1).length} pages overflow horizontally`, viewport: 'android-small', route: 'multiple', zoomReports });
    await zoomContext.close();

    // Kenyan low-bandwidth reality: a slow 3G class link and a hard offline state.
    const bandwidthContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    await bandwidthContext.route(/.*/, route => (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.fallback() : route.abort()));
    const bandwidthPage = await bandwidthContext.newPage();
    const cdp = await bandwidthContext.newCDPSession(bandwidthPage);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: Math.round(1.6 * 1024 * 1024 / 8), uploadThroughput: Math.round(750 * 1024 / 8) });
    const slowStart = Date.now();
    await bandwidthPage.goto(`${base}/discover?tab=looks`, { waitUntil: 'domcontentloaded' });
    const slowDom = Date.now() - slowStart;
    await bandwidthPage.waitForLoadState('load').catch(() => {});
    const slowLoad = Date.now() - slowStart;
    const slowPaint = await bandwidthPage.evaluate(() => {
      const entry = performance.getEntriesByType('paint').find(item => item.name === 'first-contentful-paint');
      return { fcp: entry ? Math.round(entry.startTime) : null, cards: document.querySelectorAll('a[href*="/looks/"]').length, text: (document.body.innerText || '').length };
    });
    record({ summary: `slow link (400ms RTT, ~1.6 Mbps): DOM ${slowDom}ms, load ${slowLoad}ms, FCP ${slowPaint.fcp ?? 'n/a'}ms, ${slowPaint.cards} real cards rendered`, viewport: 'iphone', route: '/discover?tab=looks', slow: { slowDom, slowLoad, ...slowPaint } });
    await bandwidthContext.close();

    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(`${base}/discover?tab=looks`, { waitUntil: 'domcontentloaded' });
    await offlinePage.waitForLoadState('networkidle').catch(() => {});
    await offlineContext.setOffline(true);
    await offlinePage.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await offlinePage.waitForTimeout(1500);
    const offline = await offlinePage.evaluate(() => ({ url: location.pathname, text: (document.body.innerText || '').slice(0, 240), nodes: document.querySelectorAll('*').length }));
    record({ summary: `offline reload: ${offline.nodes} nodes, ${offline.text.replace(/\s+/g, ' ').slice(0, 90)}`, viewport: 'iphone', route: '/discover offline', offline });
    notes.push('offline reload behaviour is recorded as observed; the app has no service worker, so an offline reload shows the browser error page rather than a STYLD state.');
    await offlineContext.close();

    const totalViolations = findings.reduce((sum, item) => sum + (item.axe ? item.axe.violations.reduce((s, v) => s + v.count, 0) : 0), 0);
    const ruleTally = {};
    for (const item of findings) for (const violation of (item.axe ? item.axe.violations : [])) ruleTally[violation.id] = (ruleTally[violation.id] || 0) + violation.count;
    const git = require('node:child_process');
    const porcelain = git.execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
    const declared = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const receipt = {
      conditions: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL disposable cluster, schema-only fixture, axe-core injected in the page, no API interception. Third-party asset hosts are aborted for every request, so paint timing, transfer size and any axe rule that grades text against a webfont are measured with first-party assets only.',
      axeCore: require('axe-core/package.json').version,
      axeCoreSource: {
        resolvedFrom: path.relative(root, axePath).replace(/\\/g, '/'),
        declaredInPackageJson: Boolean((declared.dependencies || {})['axe-core'] || (declared.devDependencies || {})['axe-core']),
        note: 'When declaredInPackageJson is false this run used a hoisted transitive copy. It works today and is not a guarantee.',
      },
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: git.execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      // The commit field alone cannot say whether the build matched the tree it was run from.
      workingTree: { dirty: porcelain.length > 0, changedPaths: porcelain.split('\n').filter(Boolean).length },
      clusterIdentity: cluster.identity, viewports: VIEWPORTS.map(item => item.name), routes,
      sweep: { fullSweepViewports: FULL_SWEEP, reducedSweepViewports: VIEWPORTS.map(v => v.name).filter(n => !FULL_SWEEP.includes(n)), scans: matrix.length },
      violationNodesTotal: totalViolations, ruleTally, results: { pass: failures.length === 0, failures },
      findings, notes,
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`axe violation nodes: ${totalViolations}`);
    console.log(`rule tally: ${JSON.stringify(ruleTally)}`);
    console.log(`failures: ${failures.length}`);
    for (const failure of failures.slice(0, 40)) console.log(`  ${failure}`);
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    console.error('accessibility audit failed:', String(error.message || error).split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => { console.error('accessibility audit crashed:', String(error.message || error).split('\n')[0]); process.exitCode = 1; });
