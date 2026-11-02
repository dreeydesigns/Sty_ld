/**
 * The public investor site is a separate artifact from the beta application, and nothing in the
 * existing gates reads it. `copy-typography.cjs` scans app, components, lib, scripts, tests, sql
 * and docs, so `public-site/` sits outside every typography, copy and routing rule the repo has.
 * This suite holds what the founder's P0 makes load-bearing for that folder: the files are all
 * present and internally consistent, no link or asset points at the protected beta, the page never
 * claims a capability the shipped flags turn off, the beauty world names, copy and colours are the
 * ones `lib/beauty-world.ts` actually renders, the product frames are the ones the live harness
 * captured from an unseeded database, and the last browser pass found no dead link or small target.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const site = path.join(root, 'public-site');
const read = (name) => fs.readFileSync(path.join(site, name), 'utf8');
const html = () => read('index.html');

const REQUIRED = ['index.html', 'privacy.html', 'styles.css', 'robots.txt', 'sitemap.xml', 'vercel.json',
  'README.md', 'assets/styld-mark.svg', 'assets/favicon.svg'];

function localTargets(markup) {
  const found = [];
  for (const match of markup.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (value.startsWith('/') && !value.startsWith('//')) found.push(value.split('?')[0].split('#')[0]);
  }
  return [...new Set(found)];
}

function resolveLocal(target) {
  const clean = target === '/' ? '/index.html' : target;
  const direct = path.join(site, clean.replace(/^\/+/, ''));
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  // vercel.json sets cleanUrls, so /privacy is served from privacy.html.
  const htmlForm = `${direct}.html`;
  return fs.existsSync(htmlForm) ? htmlForm : null;
}

test('every declared file in the public site folder exists', () => {
  assert.ok(fs.existsSync(site), 'public-site/ is missing');
  const missing = REQUIRED.filter(name => !fs.existsSync(path.join(site, name)));
  assert.deepEqual(missing, [], `the public site is missing ${missing.join(', ')}`);
});

test('no path-absolute link or asset in the public site points at a file that is not there', () => {
  const pages = ['index.html', 'privacy.html'];
  const broken = [];
  for (const page of pages) {
    for (const target of localTargets(read(page))) {
      if (!resolveLocal(target)) broken.push(`${page} -> ${target}`);
    }
  }
  assert.deepEqual(broken, [], `these local references have no file behind them: ${broken.join('; ')}`);
});

test('the public site carries no script, and no reference to the beta origin or an internal route', () => {
  const markup = `${html()}\n${read('privacy.html')}\n${read('robots.txt')}`;
  // The JSON-LD block is data, not code, so only executable script tags are an offence.
  const scripts = [...markup.matchAll(/<script\b([^>]*)>/g)].filter(match =>
    !/type="application\/ld\+json"/.test(match[1]));
  assert.deepEqual(scripts, [], 'the public site must ship no executable script');
  assert.equal(/ on[a-z]+="/.test(markup), false, 'the public site must ship no inline event handler');
  for (const forbidden of ['vercel.app', 'sty-ld', 'localhost', '127.0.0.1', 'clerk',
    'beta.wearestyld.com', '/admin', '/api/', '/settings', '/profile', '/onboarding', '/activity', '/notifications']) {
    assert.ok(!markup.includes(forbidden), `the public site references "${forbidden}", which belongs to the beta application`);
  }
});

test('the public site copy holds no em or en dash, the rule the application-wide sweep does not reach', () => {
  const offenders = [];
  for (const entry of fs.readdirSync(site, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/(\.html?|\.css|\.txt|\.md|\.xml|\.svg)$/.test(entry.name)) continue;
    read(entry.name).split('\n').forEach((line, index) => {
      if (/[\u2013\u2014]/.test(line)) offenders.push(`${entry.name}:${index + 1}`);
    });
  }
  for (const name of fs.readdirSync(path.join(site, 'assets')).filter(entry => /\.(svg|md)$/.test(entry))) {
    read(path.join('assets', name)).split('\n').forEach((line, index) => {
      if (/[\u2013\u2014]/.test(line)) offenders.push(`assets/${name}:${index + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `dashes remain in ${offenders.join(', ')}`);
});

// The WORLDS literal is the only place the six definitions exist, so the page is compared against
// the object body rather than the whole module, which also declares intensity and preview copy.
function worldEntries() {
  const source = fs.readFileSync(path.join(root, 'lib', 'beauty-world.ts'), 'utf8');
  const start = source.indexOf('export const WORLDS');
  assert.ok(start >= 0, 'lib/beauty-world.ts no longer declares WORLDS');
  const body = source.slice(start, source.indexOf('\n};', start));
  return body.split(/\r?\n {2}[a-z_]+: \{/).slice(1);
}

test('the six beauty worlds on the page are the shipped worlds, with the shipped names, copy and colours', () => {
  const blocks = worldEntries();
  assert.equal(blocks.length, 6, `lib/beauty-world.ts should define six worlds, found ${blocks.length}`);
  const markup = html();
  const missing = [];
  for (const block of blocks) {
    const field = (name) => (block.match(new RegExp(`${name}: "(.*)"`)) || [])[1];
    for (const [label, value] of [['name', field('displayName')], ['copy', field('copy')],
      ['accent', field('accent')], ['canvas', field('accentSoft')], ['ink', field('ink')]]) {
      if (!value) { missing.push(`a world ${label} is absent from the source`); continue; }
      if (!markup.includes(value)) missing.push(`${label} "${value}" is not on the page`);
    }
  }
  assert.deepEqual(missing, [], `the page and the shipped worlds have drifted: ${missing.join('; ')}`);
});

test('what the page says is live cannot contradict the shipped feature flags', () => {
  const flags = fs.readFileSync(path.join(root, 'lib', 'feature-flags.ts'), 'utf8');
  const reading = (name) => new RegExp(`${name}: (true|false)`).exec(flags)?.[1] === 'true';
  const markup = html();
  const testing = markup.split('Not enabled yet')[1] || '';
  assert.equal(reading('PAYMENTS_LIVE'), false, 'this gate assumes payments are still off, so a flip needs a deliberate edit here');
  for (const [flag, claim] of [['PAYMENTS_LIVE', /payments/i], ['BOOKING_COMMITMENTS', /booking/i],
    ['SHOP', /shop/i], ['DELIVERY', /delivery/i]]) {
    if (reading(flag)) continue;
    assert.ok(claim.test(testing), `FEATURES.${flag} is false but the "Not enabled yet" list no longer names it`);
  }
  assert.ok(!/we accept payment|book instantly|pay now|live availability/i.test(markup),
    'the page must not promise a transaction the build refuses');
});

test('the public site declares the apex domain it is meant to be served from', () => {
  const markup = html();
  assert.ok(/<link rel="canonical" href="https:\/\/wearestyld\.com\/">/.test(markup), 'canonical is the apex root');
  assert.ok(markup.includes('https://wearestyld.com/assets/og.png'), 'the share image is served from the apex');
  assert.ok(/Sitemap: https:\/\/wearestyld\.com\/sitemap\.xml/.test(read('robots.txt')), 'robots names the apex sitemap');
  const routing = JSON.parse(read('vercel.json'));
  const redirect = routing.redirects.find(entry => entry.has?.[0]?.value === 'www.wearestyld.com');
  assert.ok(redirect?.permanent === true, 'www must redirect permanently to the apex');
  assert.equal(redirect.destination, 'https://wearestyld.com/$1');
  for (const url of [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])) {
    const target = url.replace('https://wearestyld.com', '') || '/';
    assert.ok(resolveLocal(target), `sitemap lists ${url}, which has no file in this folder`);
  }
});

test('every screenshot the page shows was captured by the live harness, not left as a placeholder', () => {
  const markup = html();
  const shots = [...markup.matchAll(/<img[^>]+src="(\/assets\/screens\/[^"]+)"/g)].map(match => match[1]);
  assert.equal(shots.length, 4, `the page should reference four product frames, found ${shots.length}`);
  const receiptFile = path.join(root, 'docs/readiness/beta/live-public-screenshots.json');
  if (!fs.existsSync(receiptFile)) {
    assert.fail('docs/readiness/beta/live-public-screenshots.json is missing; run tests/browser/live-public-screenshots.cjs');
  }
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  assert.equal(syntheticRows(receipt), 0, 'the capture run must have used an unseeded database');
  const absent = [];
  for (const shot of shots) {
    const file = path.join(site, shot.replace(/^\/+/, ''));
    if (!fs.existsSync(file)) { absent.push(`${shot} has no file`); continue; }
    const recorded = receipt.captures.find(entry => entry.file === path.basename(shot));
    if (!recorded) { absent.push(`${shot} is not in the capture receipt`); continue; }
    const digest = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (digest !== recorded.sha256) absent.push(`${shot} on disk is not the frame the harness captured`);
  }
  assert.deepEqual(absent, [], absent.join('; '));
});

// The receipt is written by a run against the owned disposable cluster. A provider, post, service
// or booking row in it would mean a synthetic record ended up inside a frame the site publishes.
function syntheticRows(receipt) {
  const rows = receipt.databaseRowsAtCapture || {};
  return ['social_posts', 'services', 'bookings'].reduce((total, table) => total + Number(rows[table] || 0), 0);
}

// The founder's acceptance list is measured in a browser, not read out of the markup, so the run
// that measured it is a gate: a page that drifts back under 44px or gains a dead link fails here.
test('the last browser pass over the public site found no dead link, no unloaded frame and no small target', () => {
  const receiptFile = path.join(root, 'docs/readiness/beta/public-site-static.json');
  if (!fs.existsSync(receiptFile)) {
    assert.fail('docs/readiness/beta/public-site-static.json is missing; run tests/browser/live-public-site-check.cjs');
  }
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  assert.deepEqual(receipt.brokenReferences, [], `dead references ${JSON.stringify(receipt.brokenReferences)}`);
  const labels = receipt.viewports.map(entry => entry.label);
  for (const wanted of ['desktop', 'phone']) {
    assert.ok(labels.includes(wanted), `the browser receipt has no ${wanted} pass`);
  }
  for (const entry of receipt.viewports) {
    assert.deepEqual(entry.unloadedImages, [], `${entry.label}: unloaded frames ${JSON.stringify(entry.unloadedImages)}`);
    assert.deepEqual(entry.brokenAnchors, [], `${entry.label}: in-page anchors with no target ${JSON.stringify(entry.brokenAnchors)}`);
    assert.deepEqual(entry.failedRequests, [], `${entry.label}: failed requests ${JSON.stringify(entry.failedRequests)}`);
    assert.deepEqual(entry.consoleErrors, [], `${entry.label}: console errors ${JSON.stringify(entry.consoleErrors)}`);
    assert.deepEqual(entry.controlsUnder44px, [], `${entry.label}: targets under 44px ${JSON.stringify(entry.controlsUnder44px)}`);
    assert.ok(entry.horizontalOverflowPixels <= 0, `${entry.label}: the page scrolls sideways by ${entry.horizontalOverflowPixels}px`);
    assert.equal(entry.canonical, 'https://wearestyld.com/', `${entry.label}: unexpected canonical`);
    assert.equal(entry.ogImage, 'https://wearestyld.com/assets/og.png', `${entry.label}: unexpected share image`);
    assert.deepEqual([...new Set(entry.requestsToOtherHosts)].sort(), ['fonts.googleapis.com', 'fonts.gstatic.com'],
      `${entry.label}: the page reached unexpected off-origin hosts ${JSON.stringify(entry.requestsToOtherHosts)}`);
  }
});
