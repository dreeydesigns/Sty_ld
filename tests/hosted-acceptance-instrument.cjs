/**
 * Holds the two readings the hosted-preview suite got wrong on its first run.
 *
 * The receipt claimed an asset build id of "css" because the instrument matched the first
 * /_next/static/ path in the document, and it timed out navigating with waitUntil 'load' while the
 * suite's own third-party blocking kept that event from firing. Both rules now live in
 * tests/helpers/hosted-acceptance-instrument.cjs, imported by
 * tests/browser/live-hosted-acceptance.cjs, so a drift here fails the gate instead of quietly
 * producing a receipt that names the wrong build or measures the harness.
 *
 * Run: node tests/hosted-acceptance-instrument.cjs
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildIdFromAssetUrls, serverDeliveredWords, RESERVED_STATIC_SEGMENTS } =
  require('./helpers/hosted-acceptance-instrument.cjs');

let passed = 0;
function test(name, run) {
  try {
    run();
    passed++;
    console.log(`pass ${name}`);
  } catch (error) {
    console.log(`FAIL ${name} :: ${error.message}`);
    process.exitCode = 1;
  }
}

test('the folder named first in a Next document is not offered as a build id', () => {
  // This is the exact ordering observed on the built tree: css before chunks before the version.
  const observed = [
    'http://127.0.0.1/x/_next/static/css/d922d2f062f7d7fa.css',
    'http://127.0.0.1/x/_next/static/chunks/main-app-c0652cbf361d6be1.js',
    'http://127.0.0.1/x/_next/static/3JsbY2Kz68LDPZdv6FJoN/_buildManifest.js',
  ];
  assert.equal(buildIdFromAssetUrls(observed), '3JsbY2Kz68LDPZdv6FJoN',
    `the instrument named ${JSON.stringify(buildIdFromAssetUrls(observed))}; the reserved segments are what a document lists first`);
  assert.notEqual(buildIdFromAssetUrls(observed), 'css', 'a folder name is not a build identifier');
});

test('every reserved segment is refused, and a document that lists nothing yields nothing', () => {
  for (const segment of RESERVED_STATIC_SEGMENTS) {
    assert.equal(buildIdFromAssetUrls([`/_next/static/${segment}/anything.js`]), null, `${segment} is not a build`);
  }
  assert.equal(buildIdFromAssetUrls([]), null);
  assert.equal(buildIdFromAssetUrls(null), null);
  assert.equal(buildIdFromAssetUrls(['http://127.0.0.1/discover', '/api/social/posts']), null,
    'application routes are not asset folders');
});

test('the first versioned folder wins and a later one cannot overwrite it', () => {
  assert.equal(buildIdFromAssetUrls([
    '/_next/static/AAAA1111111111111111/_buildManifest.js',
    '/_next/static/BBBB2222222222222222/_ssgManifest.js',
  ]), 'AAAA1111111111111111', 'the run must name one build, not the last folder it happened to see');
});

test('words inside a streamed-hidden payload are not counted as delivered', () => {
  // The shape the first-render defect shipped: the real page behind a hidden Suspense boundary.
  const shell = '<html><body><div class="styld-frame-header">Home Feed Profile</div>'
    + '<!--$?--><template id="B:0"></template><div hidden id="S:0"><p>Twenty real words of prose that a visitor cannot read yet because the swap needs JavaScript to run first.</p></div>'
    + '<script>self.__next_f.push([1,"and script payloads are never words on a page"])</script></body></html>';
  assert.ok(serverDeliveredWords(shell) < 20,
    `a route that ships only a spinner counted ${serverDeliveredWords(shell)} words; the measure has to stay strict`);
});

test('a route that paints its own waiting line clears the bar with visible words', () => {
  const painted = '<main><h1>Community review queue</h1><p>These are real posts awaiting review on this environment. Approving or rejecting changes the published state in the database and writes an audit record against your account.</p>'
    + '<ul><li><p>Disposable pending live QA look 1</p><p>Live QA Braider</p></li></ul></main>';
  assert.ok(serverDeliveredWords(painted) >= 20,
    `a page with genuine prose scored ${serverDeliveredWords(painted)}; the threshold would fail real content`);
});

test('scripts, styles, comments and entities are never counted as copy', () => {
  const padded = '<html><head><style>body{color:red;font-family:Inter}</style>'
    + '<script>{"buildId":"abc123","props":{"pageProps":{"secretToken":"never visible words here"}}}</script>'
    + '<!-- a comment full of words that no visitor is ever handed by the server at all -->'
    + '<template id="B:0"><p>hidden template payload words that are not rendered either</p></template></head>'
    + '<body><p>Shop &amp; save today.</p></body></html>';
  const words = serverDeliveredWords(padded);
  assert.ok(words <= 5, `markup noise scored ${words} words: ${JSON.stringify(padded.slice(0, 0))}`);
  assert.ok(words >= 2, `real copy was dropped from the count (${words})`);
});

test('the deployed documents the measure is run against still clear it', () => {
  const builtRoot = path.resolve(__dirname, '..', '.next', 'server', 'app');
  if (!fs.existsSync(builtRoot)) {
    console.log('  (skipped against .next: no build present; the synthetic cases above still ran)');
    return;
  }
  const sample = ['discover.html', 'index.html', 'terms.html'].filter(name => fs.existsSync(path.join(builtRoot, name)));
  assert.ok(sample.length > 0, 'the built tree holds no sample document to measure');
  for (const name of sample) {
    const html = fs.readFileSync(path.join(builtRoot, name), 'utf8');
    const words = serverDeliveredWords(html);
    assert.ok(words >= 20, `.next/server/app/${name} ships ${words} words before any script runs`);
    assert.equal(buildIdFromAssetUrls([
      ...new Set((html.match(/\/_next\/static\/[^"'\\s]+/g) || [])),
    ]), null, `${name} must not hand a folder name to the receipt as a build id`);
  }
  console.log(`  measured ${sample.join(', ')} in the built tree`);
});

console.log(`\n${passed} tests passed${process.exitCode ? ' with failures above' : ''}`);
