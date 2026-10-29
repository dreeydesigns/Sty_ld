// Stage A measurement for Pillar 4. Production Next server, owned disposable PostgreSQL,
// real Better Auth, no route interception. It records the no-loader baseline so the
// signature-loader delta is measured on the same routes and conditions, not asserted.
//
// It is a measurement, not a verdict: the only hard failure is a route that never becomes
// usable, because a measurement of a page that never worked would be a measurement of nothing.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net'), zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const outIndex = process.argv.indexOf('--out');
const receiptPath = outIndex >= 0 ? process.argv[outIndex + 1] : 'docs/readiness/beta/visual-baseline.json';
const samplesIndex = process.argv.indexOf('--samples');
const SAMPLES = Number(samplesIndex >= 0 ? process.argv[samplesIndex + 1] : 3);
const MAX_READY_MS = Number(process.env.STYLD_READY_BUDGET_MS || 45000);

const CONDITIONS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false, throttle: null },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true, throttle: null },
  {
    name: 'mobile-fast-3g-4x-cpu',
    viewport: { width: 390, height: 844 },
    mobile: true,
    throttle: { latencyMs: 150, downloadMbps: 1.6, uploadMbps: 0.75, cpuSlowdown: 4 },
  },
];

// The init script has to be installed before the document runs, otherwise the largest
// contentful paint entry that matters has already been dispatched.
const instrument = () => {
  window.__styldPerf = { lcp: 0, lcpElement: null, cls: 0, longTasks: [], fps: null };
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.startTime > window.__styldPerf.lcp) {
          window.__styldPerf.lcp = entry.startTime;
          window.__styldPerf.lcpElement = entry.element ? `${entry.element.tagName.toLowerCase()}.${String(entry.element.className || '').split(' ')[0]}` : null;
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__styldPerf.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__styldPerf.longTasks.push({ start: Math.round(entry.startTime), duration: Math.round(entry.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch (error) {
    window.__styldPerf.error = String(error && error.message);
  }
};

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function median(values) {
  const clean = values.filter(value => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : Math.round((clean[middle - 1] + clean[middle]) / 2);
}

function bytesToKb(value) {
  return value === null || value === undefined ? null : Math.round(value / 1024);
}

function distBytes() {
  const roots = [
    ['js', path.join(root, '.next/static/chunks')],
    ['css', path.join(root, '.next/static/css')],
  ];
  const summary = {};
  for (const [kind, directory] of roots) {
    let files = 0, raw = 0, gzip = 0;
    const largest = [];
    const walk = folder => {
      if (!fs.existsSync(folder)) return;
      for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith(kind === 'js' ? '.js' : '.css')) continue;
        const content = fs.readFileSync(full);
        const compressed = zlib.gzipSync(content).length;
        files++; raw += content.length; gzip += compressed;
        largest.push({ file: path.relative(path.join(root, '.next/static'), full).replace(/\\/g, '/'), raw, gzip: compressed });
      }
    };
    walk(directory);
    largest.sort((a, b) => b.gzip - a.gzip);
    summary[kind] = { files, rawKb: bytesToKb(raw), gzipKb: bytesToKb(gzip), largest: largest.slice(0, 8) };
  }
  return summary;
}

(async () => {
  const cluster = await startLiveCluster({ bin, label: 'visual-baseline' });
  let mail, server, browser;
  const serverLog = [];
  const failures = [];
  const notes = [];
  let cleanedUp = false;
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    if (cleanup && cleanup.dropped === false) failures.push(`cluster cleanup did not drop the database: ${JSON.stringify(cleanup)}`);
    console.log('cleanup', JSON.stringify({ dropped: cleanup && cleanup.dropped, stopped: cleanup && cleanup.stopped }));
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
    let booted = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) { booted = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!booted) throw new Error(`next start did not answer within 90s: ${serverLog.slice(-4).join('').slice(-400)}`);

    const userId = randomUUID(), workspaceId = randomUUID(), serviceId = randomUUID(), postId = randomUUID();
    await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)', [userId, 'qa-visual@example.test', 'Visual QA Braider']);
    await cluster.owner.query("INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,'professional',$3)",
      [workspaceId, userId, JSON.stringify({ displayName: 'Visual QA Braider', location: 'Kilimani, Nairobi', serviceMode: 'House calls', specialty: 'Braids' })]);
    await cluster.owner.query('INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,$4,$5,true)',
      [serviceId, workspaceId, userId, 'Box braids', 2500]);
    await cluster.owner.query(`INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status)
      VALUES($1,$2,$3,'Visual QA Braider','professional','portfolio','Disposable visual baseline fixture',$4,ARRAY[]::text[],'public','published','visible')`,
      [postId, userId, workspaceId, [`svc:${serviceId}`]]);

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const routes = [
      { name: 'landing', path: '/', ready: 'main h1' },
      { name: 'discover', path: '/discover?tab=looks', ready: 'a[href*="/looks/"]' },
      { name: 'look', path: `/looks/${postId}`, ready: 'main h1' },
      { name: 'creator', path: `/creators/${workspaceId}`, ready: 'main h1' },
      { name: 'book', path: '/book', ready: 'main h1' },
    ];

    const newContext = async condition => {
      const context = await browser.newContext({
        viewport: condition.viewport, isMobile: condition.mobile, hasTouch: condition.mobile,
        deviceScaleFactor: condition.mobile ? 2 : 1,
      });
      await context.addInitScript(instrument);
      // Third-party hosts are aborted so a font or image CDN cannot decide the measurement.
      await context.route(/.*/, route => {
        const host = new URL(route.request().url()).hostname;
        if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
        return route.abort();
      });
      return context;
    };

    const measureOnce = async (condition, route) => {
      const context = await newContext(condition);
      const page = await context.newPage();
      try {
        if (condition.throttle) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: condition.throttle.latencyMs,
            downloadThroughput: Math.round(condition.throttle.downloadMbps * 1024 * 1024 / 8),
            uploadThroughput: Math.round(condition.throttle.uploadMbps * 1024 * 1024 / 8),
          });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: condition.throttle.cpuSlowdown });
        }
        const started = Date.now();
        await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: MAX_READY_MS });
        const domMs = Date.now() - started;
        let readyMs = null;
        let readyError = null;
        try {
          await page.locator(route.ready).first().waitFor({ state: 'visible', timeout: MAX_READY_MS - domMs });
          readyMs = Date.now() - started;
        } catch (error) {
          readyError = String(error.message || error).split('\n')[0].slice(0, 200);
        }
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
        await page.waitForTimeout(300);
        const reading = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paints = performance.getEntriesByType('paint') || [];
          const firstPaint = paints.find(entry => entry.name === 'first-paint');
          const firstContentful = paints.find(entry => entry.name === 'first-contentful-paint');
          const resources = performance.getEntriesByType('resource') || [];
          const byType = {};
          let transfer = 0, decoded = 0;
          for (const resource of resources) {
            const type = resource.initiatorType === 'link' ? 'css' : resource.initiatorType === 'script' ? 'js' : resource.initiatorType;
            const entry = byType[type] || (byType[type] = { requests: 0, transfer: 0, decoded: 0 });
            entry.requests += 1; entry.transfer += resource.transferSize || 0; entry.decoded += resource.decodedBodySize || 0;
            transfer += resource.transferSize || 0; decoded += resource.decodedBodySize || 0;
          }
          const loaderNodes = document.querySelectorAll('[data-styld-loader], .styld-loader, #styld-loader');
          return {
            ttfbMs: Math.round((nav.responseStart || 0) - (nav.requestStart || 0)),
            fcpMs: firstContentful ? Math.round(firstContentful.startTime) : null,
            firstPaintMs: firstPaint ? Math.round(firstPaint.startTime) : null,
            domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
            loadMs: Math.round(nav.loadEventEnd || 0),
            lcpMs: window.__styldPerf ? Math.round(window.__styldPerf.lcp) : null,
            lcpElement: window.__styldPerf ? window.__styldPerf.lcpElement : null,
            cls: window.__styldPerf ? Number(window.__styldPerf.cls.toFixed(4)) : null,
            longTasks: window.__styldPerf ? window.__styldPerf.longTasks.length : null,
            blockingMs: window.__styldPerf ? window.__styldPerf.longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0) : null,
            loaderNodes: loaderNodes.length,
            requests: resources.length + 1,
            transferKb: Math.round(transfer / 1024),
            decodedKb: Math.round(decoded / 1024),
            byTypeKb: Object.fromEntries(Object.entries(byType).map(([type, entry]) => [type, { requests: entry.requests, transferKb: Math.round(entry.transfer / 1024), decodedKb: Math.round(entry.decoded / 1024) }])),
            viewportMeta: (document.querySelector('meta[name="viewport"]') || {}).content || null,
            safeAreaSupport: typeof CSS !== 'undefined' && CSS.supports ? CSS.supports('padding-bottom: env(safe-area-inset-bottom)') : null,
          };
        });
        return { condition: condition.name, route: route.name, domMs, readyMs, readyError, ...reading };
      } finally {
        await context.close();
      }
    };

    const results = [];
    for (const condition of CONDITIONS) {
      for (const route of routes) {
        for (let sample = 0; sample < SAMPLES; sample++) {
          const record = await measureOnce(condition, route);
          results.push({ ...record, sample: sample + 1 });
          console.log(`[${condition.name}] ${route.name} #${sample + 1}: ready ${record.readyMs ?? 'never'}ms, LCP ${record.lcpMs}ms, CLS ${record.cls}, ${record.transferKb}KB`);
          if (record.readyError) failures.push(`${condition.name} ${route.name}: never became usable (${record.readyError})`);
        }
      }
    }

    // Mobile layout audit, one pass per route, outside the timing samples so the audit's own
    // tabbing and element queries cannot inflate the numbers above.
    const mobileAudit = [];
    const auditContext = await newContext(CONDITIONS[1]);
    for (const route of routes) {
      const page = await auditContext.newPage();
      await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: MAX_READY_MS });
      await page.locator(route.ready).first().waitFor({ state: 'visible', timeout: MAX_READY_MS }).catch(() => null);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
      const layout = await page.evaluate(() => {
        const visible = node => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        };
        const describe = node => (node.getAttribute('aria-label') || node.textContent || node.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
        const controls = [...document.querySelectorAll('button, input:not([type="hidden"]), select, textarea, [role="button"], a[href]')]
          .filter(visible)
          .map(node => ({
            tag: node.tagName.toLowerCase(),
            inlineTextLink: node.tagName === 'A' && Boolean(node.closest('p,span,li')),
            name: describe(node),
            width: Math.round(node.getBoundingClientRect().width),
            height: Math.round(node.getBoundingClientRect().height),
          }));
        const undersized = controls.filter(control => Math.min(control.width, control.height) < 44);
        const glass = [...document.querySelectorAll('body *')].filter(visible).map(node => {
          const style = getComputedStyle(node);
          return { node, filter: style.backdropFilter || style.webkitBackdropFilter || 'none' };
        }).filter(entry => entry.filter && entry.filter !== 'none').map(entry => ({
          tag: entry.node.tagName.toLowerCase(),
          className: String(entry.node.className || '').split(' ').slice(0, 3).join(' '),
          blurPx: Number((/blur\(([\d.]+)px\)/.exec(entry.filter) || [])[1] || 0),
          satisfiesSupport: typeof CSS !== 'undefined' && CSS.supports ? CSS.supports('backdrop-filter', entry.filter) : null,
        }));
        const styleText = [...document.styleSheets].map(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).join('\n'); } catch { return ''; } }).join('\n');
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          controls: controls.length,
          undersized: undersized.length,
          undersizedControls: undersized.filter(item => !item.inlineTextLink).slice(0, 10),
          undersizedInlineLinks: undersized.filter(item => item.inlineTextLink).length,
          glassLayers: glass,
          maxGlassBlurPx: glass.length ? Math.max(...glass.map(item => item.blurPx)) : 0,
          safeAreaCssRules: (styleText.match(/env\(safe-area-inset-(bottom|top|left|right)\)/g) || []).length,
          viewportMeta: (document.querySelector('meta[name="viewport"]') || {}).content || null,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
        };
      });

      // Visible focus and keyboard reach on the same page.
      const tabTrail = [];
      for (let index = 0; index < 10; index++) {
        await page.keyboard.press('Tab');
        tabTrail.push(await page.evaluate(() => {
          const active = document.activeElement;
          if (!active || active === document.body) return { stop: 'LOST' };
          const style = getComputedStyle(active);
          const rect = active.getBoundingClientRect();
          return {
            stop: `${active.tagName.toLowerCase()}`,
            name: (active.getAttribute('aria-label') || active.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
            focusDrawn: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none',
            width: Math.round(rect.width), height: Math.round(rect.height),
          };
        }));
      }
      mobileAudit.push({ route: route.name, path: route.path, ...layout, tabTrail });
      console.log(`[audit] ${route.name}: ${layout.undersized} undersized controls, max glass blur ${layout.maxGlassBlurPx}px, ${layout.glassLayers.length} glass layers, safe-area rules ${layout.safeAreaCssRules}, focus ${tabTrail.filter(stop => stop.focusDrawn).length}/10 drawn`);
      await page.close();
    }
    await auditContext.close();

    // Summary per route and condition. Median across samples, min and max kept so a single
    // 20 second tail cannot hide behind an average.
    const summary = {};
    for (const condition of CONDITIONS) {
      summary[condition.name] = {};
      for (const route of routes) {
        const rows = results.filter(item => item.condition === condition.name && item.route === route.name);
        const field = key => median(rows.map(row => row[key]));
        summary[condition.name][route.name] = {
          samples: rows.length,
          readyMs: { median: field('readyMs'), min: Math.min(...rows.map(row => row.readyMs).filter(Number.isFinite)), max: Math.max(...rows.map(row => row.readyMs).filter(Number.isFinite)) },
          fcpMs: field('fcpMs'), domContentLoadedMs: field('domContentLoadedMs'), loadMs: field('loadMs'),
          lcpMs: { median: field('lcpMs'), min: Math.min(...rows.map(row => row.lcpMs).filter(Number.isFinite)), max: Math.max(...rows.map(row => row.lcpMs).filter(Number.isFinite)) },
          cls: { median: field('cls'), max: Math.max(...rows.map(row => row.cls).filter(Number.isFinite)) },
          lcpElement: rows.find(row => row.lcpElement) ? rows[0].lcpElement : null,
          ttfbMs: field('ttfbMs'),
          blockingMs: field('blockingMs'), longTasks: field('longTasks'),
          requests: field('requests'), transferKb: field('transferKb'), decodedKb: field('decodedKb'),
          jsRequests: median(rows.map(row => (row.byTypeKb.js || {}).requests || 0)),
          jsTransferKb: median(rows.map(row => (row.byTypeKb.js || {}).transferKb || 0)),
          cssTransferKb: median(rows.map(row => (row.byTypeKb.css || {}).transferKb || 0)),
          loaderNodes: Math.max(...rows.map(row => row.loaderNodes)),
        };
      }
    }

    const glassByRoute = Object.fromEntries(mobileAudit.map(item => [item.route, item.glassLayers]));
    const glassMax = mobileAudit.length ? Math.max(...mobileAudit.map(item => item.maxGlassBlurPx)) : 0;
    if (glassMax > 12) {
      notes.push(`The mobile audit measured ${glassMax}px of backdrop blur, which is above the Pillar 4 mobile limit of 12px. The layers are listed per route in mobileAudit so the fix can name them instead of reducing blur everywhere.`);
    }
    if (results.some(row => row.loaderNodes > 0)) {
      failures.push('the baseline already renders a signature-loader node, so this is not a no-loader baseline');
    }
    notes.push('Third-party hosts are aborted, so font and media CDN bytes are absent from every figure. Transfer sizes are therefore first-party only.');
    notes.push('Desktop and mobile run unthrottled on loopback; the slow condition uses Lighthouse Fast 3G values (150ms RTT, 1.6 Mbps down, 750 kbps up) plus a 4x CPU slowdown. Loopback removes internet RTT from the server side, so ttfb here is a floor, not a field number.');
    notes.push('The ready selector per route is what a visitor must see to act: a heading on landing, creator and book, a Look card on discover, and the document body on a Look page. It is a usability mark, not a paint metric.');

    const git = require('node:child_process');
    const porcelain = git.execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
    const receipt = {
      mode: process.env.STYLD_VISUAL_MODE || 'no-loader baseline',
      measuredAt: new Date().toISOString(),
      conditions: CONDITIONS,
      samplesPerCell: SAMPLES,
      commit: git.execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      buildId: fs.existsSync(path.join(root, '.next/BUILD_ID')) ? fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim() : null,
      workingTree: { dirty: porcelain.length > 0, changedPaths: porcelain.split('\n').filter(Boolean).length },
      buildBytes: distBytes(),
      routes: routes.map(route => ({ name: route.name, path: route.path.replace(postId, ':postId').replace(workspaceId, ':workspaceId'), ready: route.ready })),
      summary,
      results,
      mobileAudit,
      glassByRoute,
      failures,
      passedAll: failures.length === 0,
      notes,
      conditionsText: 'Windows, installed Chrome headless, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, one seeded professional workspace with one published Look and one service, no route interception, third-party hosts aborted.',
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify({ out: receiptPath, passedAll: receipt.passedAll, glassMax, failures }, null, 2));
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    failures.push(String(error.message || error).slice(0, 500));
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify({ mode: 'no-loader baseline', measuredAt: new Date().toISOString(), failures, serverLogTail: serverLog.slice(-6).join('').slice(-1500) }, null, 2));
    console.error('visual baseline failed:', String(error.message || error).split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => { console.error('visual baseline crashed:', String(error.message || error).split('\n')[0]); process.exitCode = 1; });
