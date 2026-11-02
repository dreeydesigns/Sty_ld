// Serves the public investor site exactly as a static host would, then meets it in a real browser
// at desktop and phone widths. This is the artifact the founder reviews before the domain is
// attached: two screenshots, the measured tap targets, and a record of every request the page made.
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const site = path.join(root, 'public-site');
const outDir = 'docs/readiness/beta';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer((request, response) => {
  const url = decodeURIComponent(request.url.split('?')[0]);
  const candidates = [url === '/' ? '/index.html' : url, `${url}.html`];
  const file = candidates.map(entry => path.join(site, entry.replace(/^\/+/, '')))
    .find(candidate => candidate.startsWith(site + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file) { response.writeHead(404, { 'Content-Type': 'text/plain' }); return response.end('not found'); }
  response.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  response.end(fs.readFileSync(file));
});

async function inspect(page, { label, width, height, shots }) {
  const requests = [], failures = [], consoleErrors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()}`));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:4123/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => null);
  // The screenshots are lazy-loaded, so the check scrolls the page the way a visitor does, waits
  // for every frame to actually arrive, and only then returns to the top to measure.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('img'))
    .every(node => node.complete && node.naturalWidth > 0), null, { timeout: 60000 })
    .catch(async () => {
      const stuck = await page.evaluate(() => Array.from(document.querySelectorAll('img'))
        .filter(node => !(node.complete && node.naturalWidth > 0)).map(node => node.getAttribute('src')));
      throw new Error(`${label}: these images never arrived in the browser: ${JSON.stringify(stuck)}`);
    });
  await page.evaluate(() => window.scrollTo(0, 0));
  const measured = await page.evaluate(() => {
    const box = node => { const rect = node.getBoundingClientRect(); return { w: Math.round(rect.width), h: Math.round(rect.height) }; };
    const controls = Array.from(document.querySelectorAll('a[href], button')).map(node => ({
      text: (node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      href: node.getAttribute('href'), ...box(node),
    }));
    const images = Array.from(document.querySelectorAll('img')).map(node => ({
      src: node.getAttribute('src'), loaded: node.complete && node.naturalWidth > 0,
      declaredWidth: Number(node.getAttribute('width') || 0), natural: node.naturalWidth,
    }));
    return {
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
      ogImage: document.querySelector('meta[property="og:image"]')?.content ?? null,
      description: document.querySelector('meta[name="description"]')?.content?.length ?? 0,
      controls, images,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sections: Array.from(document.querySelectorAll('main section[id]')).map(section => section.id),
      // A skip link aims at the main landmark, not a section, so anchor targets are every id on
      // the page; otherwise the check reports a working link as broken.
      idTargets: Array.from(document.querySelectorAll('[id]')).map(node => node.id),
      anchors: Array.from(document.querySelectorAll('a[href^="#"]')).map(link => link.getAttribute('href')),
    };
  });
  const brokenAnchors = measured.anchors.filter(href => href !== '#' && !measured.idTargets.includes(href.slice(1)));
  const small = measured.controls.filter(control => control.h < 44 || control.w < 44);
  const unloaded = measured.images.filter(image => !image.loaded);
  await page.screenshot({ path: path.join(root, outDir, shots), fullPage: true });
  return {
    label, viewport: `${width}x${height}`, title: measured.title, canonical: measured.canonical,
    ogImage: measured.ogImage, descriptionCharacters: measured.description,
    controls: measured.controls.length, controlsUnder44px: small,
    images: measured.images, unloadedImages: unloaded,
    brokenAnchors, horizontalOverflowPixels: measured.horizontalOverflow,
    screenshot: `${outDir}/${shots}`,
    requestsToOtherHosts: [...new Set(requests.filter(url => !url.startsWith('http://127.0.0.1:4123/'))
      .map(url => new URL(url).host))],
    failedRequests: failures, consoleErrors,
  };
}

(async () => {
  await new Promise(resolve => server.listen(4123, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const results = [];
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    results.push(await inspect(await desktop.newPage(), { label: 'desktop', width: 1440, height: 900, shots: 'public-site-desktop.png' }));
    await desktop.close();
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    results.push(await inspect(await phone.newPage(), { label: 'phone', width: 390, height: 844, shots: 'public-site-mobile.png' }));
    await phone.close();

    // Every path-absolute reference on the page is fetched, so a broken link is a number here
    // rather than a click an investor has to make to find.
    const links = [...new Set(`${fs.readFileSync(path.join(site, 'index.html'), 'utf8')}${fs.readFileSync(path.join(site, 'privacy.html'), 'utf8')}`
      .match(/(?:src|href)="\/[^"]+"/g).map(entry => entry.slice(entry.indexOf('"') + 1, -1).split('#')[0]))];
    const checked = [];
    for (const link of links) {
      const response = await fetch(`http://127.0.0.1:4123${link}`);
      checked.push({ link, status: response.status });
    }
    for (const named of ['/robots.txt', '/sitemap.xml']) {
      checked.push({ link: named, status: (await fetch(`http://127.0.0.1:4123${named}`)).status });
    }
    const broken = checked.filter(entry => entry.status >= 400);

    // The receipt is only evidence about this folder if it can be tied to the bytes that were measured.
    // Without a digest a stale run keeps passing after the page changes underneath it, which is the one
    // failure mode a browser gate has to rule out.
    const digest = require('node:crypto').createHash('sha256');
    for (const file of ['index.html', 'privacy.html', 'styles.css']) {
      digest.update(file).update('\n').update(fs.readFileSync(path.join(site, file))).update('\n');
    }

    const receipt = {
      conditions: 'Windows, installed Chrome headless, the public-site folder served by a plain static HTTP server on loopback, no application code and no database in the run',
      commit: require('node:child_process').execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      folderDigest: digest.digest('hex'),
      checkedReferences: checked, brokenReferences: broken, viewports: results,
    };
    fs.writeFileSync(path.join(root, `${outDir}/public-site-static.json`), JSON.stringify(receipt, null, 2));
    for (const result of results) {
      assert.deepEqual(result.unloadedImages, [], `${result.label}: these images did not load: ${JSON.stringify(result.unloadedImages)}`);
      assert.deepEqual(result.brokenAnchors, [], `${result.label}: in-page anchors with no target: ${JSON.stringify(result.brokenAnchors)}`);
      assert.deepEqual(result.failedRequests, [], `${result.label}: failed requests ${JSON.stringify(result.failedRequests)}`);
      assert.deepEqual(result.consoleErrors, [], `${result.label}: console errors ${JSON.stringify(result.consoleErrors)}`);
      assert.ok(result.horizontalOverflowPixels <= 0, `${result.label}: the page scrolls sideways by ${result.horizontalOverflowPixels}px`);
      assert.deepEqual(result.controlsUnder44px, [], `${result.label}: controls under 44px: ${JSON.stringify(result.controlsUnder44px).slice(0, 600)}`);
      assert.equal(result.canonical, 'https://wearestyld.com/', `${result.label}: unexpected canonical`);
      assert.equal(result.ogImage, 'https://wearestyld.com/assets/og.png', `${result.label}: unexpected share image`);
    }
    assert.deepEqual(broken, [], `these references do not answer: ${JSON.stringify(broken)}`);
    console.log(`public site check PASS ${results.map(result => `${result.label} ${result.controls} controls`).join(', ')}, ${checked.length} references`);
  }
  finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error('public site check FAIL:', String(error.message || error).split('\n').slice(0, 6).join(' | '));
  process.exitCode = 1;
});
