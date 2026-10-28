/**
 * Holds the readings the hosted-preview suite got wrong on its first run.
 *
 * The receipt claimed an asset build id of "css" because the instrument matched the first
 * /_next/static/ path in the document, it named a build from whichever single document field it
 * happened to match, and it proved that build by fetching a css file whose folder says nothing about
 * the build. It also timed out navigating with waitUntil 'load' while the suite's own third-party
 * blocking kept that event from firing. Each rule now lives in
 * tests/helpers/hosted-acceptance-instrument.cjs, imported by
 * tests/browser/live-hosted-acceptance.cjs, so a drift here fails the gate instead of quietly
 * producing a receipt that names the wrong build or measures the harness.
 *
 * Run: node tests/hosted-acceptance-instrument.cjs
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildIdFromAssetUrls, buildIdFromDocument, buildManifestFor, firstReferencedAsset, serverDeliveredWords, RESERVED_STATIC_SEGMENTS } =
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

test('the build id is read where the deployment writes it, twice, and the two must agree', () => {
  const document = '<!DOCTYPE html><!--3JsbY2Kz68LDPZdv6FJoN--><html><body><script>self.__next_f.push([1,'
    + '"0:{\\"P\\":null,\\"b\\":\\"3JsbY2Kz68LDPZdv6FJoN\\",\\"p\\":\\"\\",\\"c\\":[\\"\\",\\"discover\\"]"])</script></body></html>';
  assert.deepEqual(buildIdFromDocument(document), {
    buildId: '3JsbY2Kz68LDPZdv6FJoN', conflict: null, sources: ['doctype comment', 'flight payload'],
  });
  // A document whose two fields disagree cannot be allowed to name a build silently.
  const split = '<!DOCTYPE html><!--AAAA1111111111111111--><html><body><script>self.__next_f.push([1,'
    + '"0:{\\"b\\":\\"BBBB2222222222222222\\"}"])</script></body></html>';
  assert.equal(buildIdFromDocument(split).buildId, null, 'a contradiction must not be resolved by preference');
  assert.match(buildIdFromDocument(split).conflict, /AAAA1111111111111111 \(doctype comment\) vs BBBB2222222222222222 \(flight payload\)/);
  // The second reading has to be the router payload. Application JSON with a `b` key is everywhere
  // in a served document, and reading one of those as the build field would make the "two readings"
  // a coincidence rather than a cross-check.
  const unrelated = '<!DOCTYPE html><!--AAAA1111111111111111--><html><body><script>'
    + 'window.pageData={"hero":{"b":"BBBB2222222222222222"},"b":"CCCC1111111111111111"};</script></body></html>';
  assert.deepEqual(buildIdFromDocument(unrelated), { buildId: 'AAAA1111111111111111', conflict: null, sources: ['doctype comment'] },
    'a `b` field outside the flight payload was read as a second source of the build');
  assert.deepEqual(buildIdFromDocument('<!DOCTYPE html><html><body>nothing</body></html>'),
    { buildId: null, conflict: null, sources: [] });
  assert.deepEqual(buildIdFromDocument(''), { buildId: null, conflict: null, sources: [] });
});

test('a document carrying only one of the two fields names that one and no more', () => {
  // The first version of the reading accepted the comment OR the payload, so a payload-only or a
  // comment-only document passed without the receipt saying which single field it trusted.
  const commentOnly = '<!DOCTYPE html><!--3JsbY2Kz68LDPZdv6FJoN--><html><body><p>words</p></body></html>';
  assert.deepEqual(buildIdFromDocument(commentOnly).sources, ['doctype comment']);
  const flightOnly = '<!DOCTYPE html><html><body><script>self.__next_f.push([1,'
    + '"0:{\\"b\\":\\"3JsbY2Kz68LDPZdv6FJoN\\"}"])</script></body></html>';
  assert.deepEqual(buildIdFromDocument(flightOnly).sources, ['flight payload']);
  // The rule the suite depends on: one source is not an identified build.
  for (const single of [commentOnly, flightOnly]) {
    const read = buildIdFromDocument(single);
    assert.ok(Boolean(read.buildId), 'the identifier is still readable, it is simply not corroborated');
    assert.equal(read.sources.length, 1, 'a single-source read must report itself as one source');
  }
});

test('the build proof path is derived from the identifier alone', () => {
  // The folders a document references are named for their content, so a referenced-asset fetch
  // cannot confirm a build id. This path is built from the read identifier, which is what makes a
  // 200 there evidence rather than decoration.
  assert.equal(buildManifestFor('3JsbY2Kz68LDPZdv6FJoN'), '/_next/static/3JsbY2Kz68LDPZdv6FJoN/_buildManifest.js');
  assert.equal(buildManifestFor(null), null, 'without an identifier there is nothing to ask the server for');
  const builtRoot = path.resolve(__dirname, '..', '.next');
  if (fs.existsSync(path.join(builtRoot, 'BUILD_ID'))) {
    const builtId = fs.readFileSync(path.join(builtRoot, 'BUILD_ID'), 'utf8').trim();
    assert.ok(fs.existsSync(path.join(builtRoot, 'static', builtId, '_buildManifest.js')),
      `the built tree has no manifest at /_next/static/${builtId}/_buildManifest.js, so that path would not prove anything`);
  }
});

test('the asset path reported alongside the proof is one the document really references', () => {
  const document = '<html><head><link href="/_next/static/css/d922d2f062f7d7fa.css" rel="stylesheet">'
    + '<script src="/_next/static/chunks/main-app-c0652cbf361d6be1.js"></script></head><body></body></html>';
  assert.equal(firstReferencedAsset(document), '/_next/static/css/d922d2f062f7d7fa.css');
  assert.equal(firstReferencedAsset('<html><body>no assets</body></html>'), null);
  assert.equal(firstReferencedAsset(null), null);
});

test('the deployed documents the measure is run against still clear it', () => {
  const builtRoot = path.resolve(__dirname, '..', '.next', 'server', 'app');
  if (!fs.existsSync(builtRoot)) {
    console.log('  (skipped against .next: no build present; the synthetic cases above still ran)');
    return;
  }
  const sample = ['discover.html', 'index.html', 'terms.html'].filter(name => fs.existsSync(path.join(builtRoot, name)));
  assert.ok(sample.length > 0, 'the built tree holds no sample document to measure');
  const builtId = fs.existsSync(path.resolve(builtRoot, '..', '..', 'BUILD_ID'))
    ? fs.readFileSync(path.resolve(builtRoot, '..', '..', 'BUILD_ID'), 'utf8').trim() : null;
  for (const name of sample) {
    const html = fs.readFileSync(path.join(builtRoot, name), 'utf8');
    const words = serverDeliveredWords(html);
    assert.ok(words >= 20, `.next/server/app/${name} ships ${words} words before any script runs`);
    assert.equal(buildIdFromAssetUrls([
      ...new Set((html.match(/\/_next\/static\/[^"'\\s]+/g) || [])),
    ]), null, `${name} must not hand a folder name to the receipt as a build id`);
    if (builtId) {
      const read = buildIdFromDocument(html);
      assert.deepEqual(read, { buildId: builtId, conflict: null, sources: ['doctype comment', 'flight payload'] },
        `.next/server/app/${name} names the build ${JSON.stringify({ buildId: read.buildId, conflict: read.conflict, sources: read.sources })}, not the ${builtId} the tree was built as`);
      assert.ok(firstReferencedAsset(html), `${name} references no asset at all`);
    }
  }
  console.log(`  measured ${sample.join(', ')} in the built tree${builtId ? ` against build ${builtId}` : ''}`);
});

test('the manifest folder the read build id names exists in the built tree', () => {
  const nextRoot = path.resolve(__dirname, '..', '.next');
  if (!fs.existsSync(path.join(nextRoot, 'BUILD_ID'))) {
    console.log('  (skipped: no built tree present, so there is no served build to cross-check)');
    return;
  }
  const builtId = fs.readFileSync(path.join(nextRoot, 'BUILD_ID'), 'utf8').trim();
  assert.equal(buildManifestFor(builtId), `/_next/static/${builtId}/_buildManifest.js`);
  assert.ok(fs.existsSync(path.join(nextRoot, 'static', builtId, '_buildManifest.js')),
    `the tree's own BUILD_ID (${builtId}) has no manifest folder under .next/static, so a served 200 on that path would be luck rather than proof`);
  console.log(`  build ${builtId} has a manifest folder in the tree it was built into`);
});

console.log(`\n${passed} tests passed${process.exitCode ? ' with failures above' : ''}`);
