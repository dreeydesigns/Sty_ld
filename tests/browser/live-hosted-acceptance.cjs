/**
 * Hosted-preview acceptance suite (Quality Assurance and DevOps slice).
 *
 * This is the suite for a deployed preview, distinct from the loopback PostgreSQL harness: it
 * points at the environment a tester actually reaches. Two modes.
 *
 *   node tests/browser/live-hosted-acceptance.cjs                        local mode: starts its own
 *     disposable cluster, loopback mail and next start, so the checks themselves are proven.
 *   STYLD_TARGET_URL=https://<preview>.vercel.app \
 *   STYLD_PREVIEW_COOKIE='<name=value>'  or  STYLD_PREVIEW_BYPASS='<secret>' \
 *   node tests/browser/live-hosted-acceptance.cjs                        hosted mode: same checks
 *     against the deployed preview. The cookie is only what the founder copies from a signed-in
 *     verification session and the bypass is Vercel's protection secret; either one passes
 *     Deployment Protection, and neither is printed or stored by this file.
 *
 * Nothing here writes to a production database, sends mail to a real person, or prints a secret,
 * an OTP or a cookie value. A check it could not run is recorded as skipped with the reason.
 */

const fs = require('node:fs'), net = require('node:net'), path = require('node:path');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');
const { buildIdFromAssetUrls, buildIdFromDocument, buildManifestFor, firstReferencedAsset, serverDeliveredWords } =
  require('../helpers/hosted-acceptance-instrument.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const receiptPath = 'docs/readiness/beta/live-hosted-acceptance.json';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const target = (process.env.STYLD_TARGET_URL || '').replace(/\/$/, '');
const hosted = Boolean(target);
if (hosted && !/^https:\/\//.test(target)) throw new Error('STYLD_TARGET_URL must be an https origin.');
const previewCookie = process.env.STYLD_PREVIEW_COOKIE || '';
const previewBypass = process.env.STYLD_PREVIEW_BYPASS || '';

const checks = [];
const skipped = [];
const failures = [];
let buildId = null;

function record(name, pass, detail) {
  checks.push({ name, pass, detail });
  if (!pass) failures.push(`${name}: ${detail}`);
  console.log(`${pass ? 'pass' : 'FAIL'} ${name} :: ${detail}`);
}

function skip(name, reason) {
  skipped.push({ name, reason });
  console.log(`skipped ${name} :: ${reason}`);
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// Every request carries the preview cookie or the protection bypass value when one was
// supplied, and the receipt records only whether one was sent, never its contents.
function headers(accept) {
  const out = { accept };
  if (previewCookie) out.cookie = previewCookie;
  if (previewBypass) out['x-vercel-protection-bypass'] = previewBypass;
  return out;
}

async function get(base, route) {
  const response = await fetch(base + route, { headers: headers('text/html'), redirect: 'manual' });
  const body = response.status < 400 ? await response.text() : '';
  return { status: response.status, location: response.headers.get('location'), body, headers: Object.fromEntries(response.headers.entries()) };
}

(async () => {
  let cluster = null, mail = null, server = null, browser = null, base = target;
  const serverLog = [];
  try {
    if (!hosted) {
      cluster = await startLiveCluster({ bin, label: 'live-hosted-acceptance' });
      mail = await startMailCapture();
      const appPort = await freePort();
      base = `http://127.0.0.1:${appPort}`;
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
        try { const response = await fetch(`${base}/help`); if (response.status < 500) break; } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 1. The deployment answers, and a protected deployment says so instead of pretending to pass.
    const landing = await get(base, '/discover?tab=looks');
    if ([301, 302, 307].includes(landing.status)) {
      const location = landing.location || '';
      record('deployment reachable', false,
        `GET /discover redirected to ${new URL(location, base).host}; this is Deployment Protection. Supply STYLD_PREVIEW_COOKIE from a signed-in verification session, or open the preview in a browser as the founder.`);
      return void finish();
    }
    record('deployment reachable', landing.status === 200, `GET /discover?tab=looks -> ${landing.status}`);
    if (landing.status !== 200) return void finish();

    // 2. Which build is being tested. A receipt that cannot name its build proves nothing.
    // Matching the first /_next/static/ path in the document named the word "css" on the first
    // run, because that is the folder Next lists first. Next writes the build id itself in two
    // places a served document carries it, the comment after the doctype and the `b` field of the
    // flight payload, so the identifier is read there and both readings must be present and agree.
    // The identifier is then proved against the server by fetching the manifest Next writes into
    // the versioned folder of that name: the folders the document references (chunks, css) are
    // named for their content, so fetching one of them would only prove the server serves files.
    const documentBuild = buildIdFromDocument(landing.body);
    buildId = documentBuild.buildId;
    const referencedAsset = firstReferencedAsset(landing.body);
    const assetProof = referencedAsset
      ? await fetch(`${base}${referencedAsset}`, { headers: headers('*/*') }) : null;
    const manifestPath = buildManifestFor(buildId);
    const manifestProof = manifestPath
      ? await fetch(`${base}${manifestPath}`, { headers: headers('*/*') }) : null;

    const requestedAssets = [];
    const noteAsset = url => requestedAssets.push(url);

    const serverWords = serverDeliveredWords(landing.body);
    record('server delivers words', serverWords >= 20,
      `the /discover document carries ${serverWords} rendered words before any script runs; a preview that ships an empty shell gives a visitor nothing while bundles load`);

    // 3. The feed endpoint that the directive asked to be confirmed working.
    const postsResponse = await fetch(`${base}/api/social/posts?limit=5`, { headers: headers('application/json') });
    const postsPayload = await postsResponse.json().catch(() => null);
    record('guest feed endpoint', postsResponse.status === 200 && postsPayload?.ok === true && Array.isArray(postsPayload.posts),
      `/api/social/posts -> ${postsResponse.status}, ok=${JSON.stringify(postsPayload?.ok)}, posts=${Array.isArray(postsPayload?.posts) ? postsPayload.posts.length : 'not an array'}`);

    // 4. Auth endpoints must refuse a guest cleanly, never half-authenticate or crash.
    for (const route of ['/api/auth/get-session', '/api/me']) {
      const response = await fetch(base + route, { headers: headers('application/json') });
      record(`guest ${route}`, response.status === 200 || response.status === 401,
        `${route} -> ${response.status}; a guest must get an explicit answer, not a 5xx`);
    }

    // 5. Indexing posture of a preview host.
    const robots = await fetch(`${base}/robots.txt`, { headers: headers('text/plain') });
    const robotsText = robots.status < 400 ? await robots.text() : '';
    const restricted = /disallow:\s*\/\s*$/im.test(robotsText);
    if (hosted) record('preview robots', restricted, `robots.txt ${robots.status}, disallow-all=${restricted}; a public beta preview must not be indexable`);
    else skip('preview robots', 'local mode has no public host, so the preview indexing posture is only meaningful against a deployed origin');

    // 6. Response headers that the app is responsible for (middleware.ts and next.config.mjs).
    for (const [name, key] of [['nosniff', 'x-content-type-options'], ['content security policy', 'content-security-policy'], ['referrer policy', 'referrer-policy']]) {
      const value = landing.headers[key];
      record(`document header ${key}`, typeof value === 'string' && value.length > 0, `${key}=${value ? 'present' : 'absent'} on the /discover document`);
    }

    // 7. The journey a guest can actually take, on a phone, against this deployment.
    browser = await chromium.launch({ executablePath: fs.existsSync(chrome) ? chrome : undefined, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      ...(previewBypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': previewBypass } } : {}) });
    if (previewCookie && hosted) {
      const [name, ...rest] = previewCookie.split('=');
      await context.addCookies([{ name, value: rest.join('='), url: base }]);
    }
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message.slice(0, 160)));
    page.on('request', request => noteAsset(request.url()));
    const started = Date.now();
    // 'commit', not 'load'. The browser blocks third-party asset hosts so a run never depends on
    // the public internet, and a blocked font or script keeps the load event from firing; waiting
    // for it measures the harness's own blocking, not the deployment. The feed is then followed to
    // a terminal state below, which is what a visitor on a phone actually experiences.
    await page.goto(`${base}/discover?tab=looks`, { waitUntil: 'commit', timeout: 60_000 });
    // The two numbers that matter are the paint the server delivered before any script ran, and
    // the state the visitor settles into. The first is read at the document level so an early
    // snapshot cannot fail the run on a browser that has not built the DOM yet.
    const firstPaint = await page.evaluate(() => ({
      cards: document.querySelectorAll('a[href*="/looks/"]').length,
      skeleton: document.querySelectorAll('[aria-label="Loading looks"]').length,
      statusAnnounced: Boolean(document.querySelector('[role="status"]')),
      loader: /Preparing your beauty moment/.test(document.body ? document.body.innerText : ''),
    })).catch(() => ({ unavailable: 'no DOM snapshot at commit time' }));
    const terminal = await page.waitForFunction(() => document.querySelectorAll('a[href*="/looks/"]').length > 0
      || /Looks are unavailable right now|No published looks yet|No looks match/.test(document.body.innerText || ''), { timeout: 20_000 })
      .then(() => true).catch(() => false);
    const settled = await page.evaluate(() => ({
      cards: document.querySelectorAll('a[href*="/looks/"]').length,
      error: /Looks are unavailable right now/.test(document.body.innerText || ''),
      empty: /No published looks yet/.test(document.body.innerText || ''),
    }));
    // The browser's own requests are the cross-check: if a versioned asset folder appears among
    // them it has to name the same build the document claims. On this stack none does, because the
    // document loads only chunks and css folders, so the absence is stated rather than assumed as
    // agreement.
    const assetFolder = buildIdFromAssetUrls(requestedAssets);
    const agreement = documentBuild.conflict
      ? `the two build fields in the document disagree (${documentBuild.conflict})`
      : assetFolder && assetFolder !== buildId
        ? `an asset folder (${assetFolder}) names a different build than the document (${buildId})`
        : `both document fields agree${assetFolder ? ` and the browser requested folder ${assetFolder}` : ' (this stack requests no versioned asset folder)'}`;
    // Two things are being claimed here and they are not the same claim, so they are read apart.
    // The identifier itself comes from the document (both fields, agreeing). That it is the build
    // actually being served needs bytes: the derived manifest path is the strongest proof because
    // its folder name IS the identifier, but a build that does not emit that file, or a preview
    // whose protection answers 302, would fail a healthy deployment. So the byte proof is either
    // path, and which one proved it is stated instead of assumed.
    const manifestProves = manifestProof?.status === 200;
    const assetProves = assetProof?.status === 200;
    const byteProof = manifestProves
      ? `${manifestPath} (the folder name is the identifier itself) answered 200`
      : assetProves
        ? `${String(referencedAsset).split('/').pop()} answered 200 while ${manifestPath || 'no manifest path'} answered ${manifestProof ? manifestProof.status : 'not fetched'}, so the identifier is corroborated by an asset the document references rather than by the derived path`
        : 'neither the derived manifest path nor a referenced asset returned bytes';
    const identified = Boolean(buildId) && documentBuild.sources.length === 2 && !documentBuild.conflict
      && (manifestProves || assetProves) && (!assetFolder || assetFolder === buildId);
    record('served build identified', identified, identified
      ? `build ${buildId} read from ${documentBuild.sources.join(' and ')}, proof: ${byteProof}, ${agreement}`
      : `build=${buildId || 'unnamed'} from [${documentBuild.sources.join(', ')}], proof: ${byteProof}, referenced asset=${referencedAsset || 'none'} status=${assetProof ? assetProof.status : 'not fetched'}, ${agreement}`);
    record('feed reaches a usable state', terminal && (settled.cards > 0 || settled.error || settled.empty),
      `first paint ${JSON.stringify(firstPaint)}, terminal after ${Date.now() - started}ms, settled ${JSON.stringify(settled)}`);
    record('no page errors on the feed', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'clean console');

    // An offline device gets the truth, not a silent form.
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    const notice = await page.locator('[role="status"]').filter({ hasText: /offline/i }).first()
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    record('offline notice', notice, notice ? 'the shell states that nothing was sent' : 'no offline status appeared on a phone viewport');
    await context.setOffline(false);
    await context.close();

    // 8. Authenticated journeys need a test inbox that this harness cannot reach for a hosted
    // preview, so they are declared skipped rather than assumed.
    if (hosted) {
      for (const journey of ['signup OTP', 'sign-in OTP', 'expired code', 'rejected code', 'sign-out revocation', 'role isolation']) {
        skip(`authenticated ${journey}`, 'needs STYLD_TEST_INBOX plus a mail transport this suite can read; the founder provisions the preview-scoped sender, then this check runs for real');
      }
    } else {
      record('local mode scope', true, 'authenticated OTP journeys are proven by tests/browser/live-auth-journey.cjs against the disposable stack; this run proves the deployment-facing checks');
    }
    finish();
  } catch (error) {
    record('suite completed', false, error.message.slice(0, 300));
    finish();
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill();
    if (cluster) await cluster.close().catch(() => {});
    if (mail) await mail.stop().catch(() => {});
  }

  function finish() {
    const git = require('node:child_process');
    let commit = 'unknown';
    try { commit = git.execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
    let changedPaths = [];
    try { changedPaths = git.execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).split('\n').filter(Boolean).map(line => line.slice(3).trim()); } catch {}
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify({
      mode: hosted ? 'hosted preview' : 'local production build',
      target: hosted ? target : 'next start on loopback with a disposable cluster',
      cookieSupplied: Boolean(previewCookie),
      bypassSupplied: Boolean(previewBypass),
      workingTree: { dirty: changedPaths.length > 0, changedPaths },
      commit, servedBuildId: buildId,
      checkedAt: new Date().toISOString(),
      checks, skipped, results: { pass: failures.length === 0, failures },
    }, null, 2));
    console.log(`\nreceipt ${receiptPath}: ${checks.filter(c => c.pass).length}/${checks.length} pass, ${failures.length} fail, ${skipped.length} skipped`);
    if (failures.length) process.exitCode = 1;
  }
})().catch(error => { console.error('hosted acceptance failed:', error.message); process.exitCode = 1; });
