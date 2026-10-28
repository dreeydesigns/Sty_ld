/**
 * The first-render measurement, measured (Quality Assurance).
 *
 * scripts/first-render-audit.cjs is the instrument behind the claim that a route ships useful
 * HTML before any JavaScript runs. An instrument that quietly counts the loading shell as content
 * would let every route pass, so this file proves what the counter does to known input: what it
 * ignores, what it subtracts, and what it refuses to call useful.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { analyse, routeOf, shellWords, visible, audit, redirectOf, httpErrorOf, withoutFrame, FRAME_CLASSES } = require('../scripts/first-render-audit.cjs');

// The sentence the root app/loading.tsx used to paint. That file was removed once it was measured
// that a route-level loader is committed as the entire first paint for any segment that misses the
// first flush of the stream, so the audit has to keep its subtraction from a source it is handed.
const LOADER_SOURCE = '<div role="status" aria-live="polite"><p>Styld</p><p>Preparing your beauty moment</p></div>';
const SHELL_WORDS = shellWords(LOADER_SOURCE);
const LOADING_PHRASE = SHELL_WORDS.find(word => /prepar/i.test(word));

test('the loader copy is read from its markup rather than remembered as a count', () => {
  assert.ok(SHELL_WORDS.length >= 2, `the shell should be read as its own sentences, got ${JSON.stringify(SHELL_WORDS)}`);
  assert.match(LOADING_PHRASE, /prepar/i);
});

test('a route whose whole body is the loading shell is reported as shipping nothing', () => {
  const html = `<html><body><div role="status" aria-live="polite">${SHELL_WORDS.map(word => `<p>${word}</p>`).join('')}</div></body></html>`;
  const measured = analyse(html, SHELL_WORDS);
  assert.equal(measured.loaderOnly, true, 'a shell is not content');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('text inside a script, a style or a comment is not visible to a visitor', () => {
  const html = '<html><body><p>Only these words reach the screen.</p><script>var copy = "a very long invented sentence indeed"</script>'
    + '<style>.hidden{content:"another long stretch of words"}</style><!-- and a comment full of letters too --></body></html>';
  assert.equal(visible(html), 'Only these words reach the screen.');
  assert.equal(analyse(html, []).charactersBeyondLoader,
    'Only these words reach the screen.'.replace(/[^A-Za-z0-9]/g, '').length,
    'only the letters of the visible sentence are counted');
});

// The finding this exists for: React ships a Suspense boundary that did not finish during the
// render inside a hidden element and swaps it in with JavaScript. Measuring it as first paint is
// what let /discover look finished on build fpiXdJsVDoGOYteLdHt2E.
test('content React hides behind a Suspense placeholder is not first paint', () => {
  const html = '<body><div role="status"><p>Styld</p><p>Preparing your beauty moment</p></div>'
    + '<div hidden id="S:0"><h1>Discover</h1><p>Looks, salons, professionals and services, all of it '
    + 'held back until the browser has run the swap script for me.</p></div></body>';
  const words = ['Styld', 'Preparing your beauty moment'];
  const measured = analyse(html, words);
  assert.equal(measured.loaderOnly, true, 'the deferred payload is not something a no-JS visitor sees');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('a nested hidden block and a template both go, and the open element stays counted', () => {
  const html = '<body><p>Words the visitor reads.</p>'
    + '<div hidden id="S:1"><section hidden><p>None of this is painted by the browser.</p></section></div>'
    + '<template id="B:1"><div><p>Template content is inert.</p></div></template></body>';
  assert.equal(visible(html), 'Words the visitor reads.');
});

test('a document title is not evidence that the route painted', () => {
  const html = '<html><head><title>Terms and Conditions | Styld</title>'
    + '<meta name="description" content="a long description that is never painted on the page at all"/></head>'
    + `<body>${SHELL_WORDS.map(word => `<p>${word}</p>`).join('')}</body></html>`;
  const measured = analyse(html, SHELL_WORDS);
  assert.equal(measured.loaderOnly, true, 'the tab label belongs to browser chrome, not to the page');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('an element merely marked aria-hidden or hidden="false" is still painted', () => {
  const html = '<body><p aria-hidden="true">Decorative repetition</p>'
    + '<div data-role="hidden"><p>Sentences inside an attribute that happens to spell hidden.</p></div>'
    + '<div hidden="false"><p>This one is explicitly not hidden.</p></div>'
    + '<divider>Not the tag being scanned</divider></body>';
  const text = visible(html);
  for (const phrase of ['Decorative repetition', 'Sentences inside an attribute', 'explicitly not hidden', 'Not the tag being scanned']) {
    assert.ok(text.includes(phrase), `"${phrase}" was removed although the browser paints it: ${text}`);
  }
});

test('a route that only repeats the loading shell is still reported as shipping nothing', () => {
  const words = ['Styld', 'Preparing your beauty moment'];
  const html = '<body><div role="status"><p>STYLD</p><p>Styld</p><p>Preparing your beauty moment</p>'
    + '<p>preparing your beauty moment</p></div></body>';
  const measured = analyse(html, words);
  assert.equal(measured.loaderOnly, true, 'the frame repeating itself is not the route speaking');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('a route that says something new is credited only for what it says', () => {
  const words = ['Styld', 'Preparing your beauty moment'];
  const html = '<body><div role="status"><p>STYLD</p><p>Preparing your beauty moment</p></div>'
    + '<h1>Discover</h1></body>';
  assert.equal(analyse(html, words).charactersBeyondLoader, 'Discover'.length);
});

test('a redirect in the flight payload is read as an alias, not as a route that lost its body', () => {
  const flight = '8:I[1,[],"a"]\n7:E{"digest":"NEXT_REDIRECT;replace;/discover;307;"}';
  assert.deepEqual(redirectOf(flight), { method: 'replace', target: '/discover', status: 307 });
  assert.equal(redirectOf('1:"$Sreact.fragment"\n2:{...}'), null);
});

test('a notFound in the flight payload is read the same way', () => {
  assert.equal(httpErrorOf('7:E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}'), 404);
  assert.equal(httpErrorOf('7:E{"digest":"NEXT_REDIRECT;replace;/discover;307;"}'), null);
  assert.equal(httpErrorOf('1:"$Sreact.fragment"'), null);
});

test('a Suspense fallback that carries real words counts as first-render content', () => {
  const words = ['Styld', 'Preparing your beauty moment'];
  const html = '<body><div role="status"><p>Styld</p><p>Preparing your beauty moment</p></div>'
    + '<h1>Discover</h1><div role="status" aria-label="Loading looks"><span>Looks, salons, professionals and services</span></div></body>';
  const measured = analyse(html, words);
  assert.equal(measured.loaderOnly, false, 'a named heading and a labelled feed skeleton are what the fix is for');
  assert.ok(measured.charactersBeyondLoader > 20, `only ${measured.charactersBeyondLoader} characters were found beyond the shell`);
});

test('routes are named the way the browser asks for them', () => {
  const base = path.sep + 'built';
  assert.equal(routeOf(path.join(base, 'index.html'), base), '/');
  assert.equal(routeOf(path.join(base, 'about', 'index.html'), base), '/about');
  assert.equal(routeOf(path.join(base, 'discover.html'), base), '/discover');
  assert.equal(routeOf(path.join(base, 'looks', 'workspace', 'index.html'), base), '/looks/workspace');
});

test('the audit separates the shell, the thin routes and the routes with content', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'styld-first-render-'));
  try {
    const write = (segments, html) => {
      const file = path.join(directory, ...segments);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, html);
    };
    // Real Next output puts the route body inside <body>; a fixture that appended it after the
    // closing tag would be silently dropped by the body-only rule the audit now measures under.
    const page = (body = '') => `<html><head><title>Styld</title></head><body>`
      + `${SHELL_WORDS.map(word => `<p>${word}</p>`).join('')}${body}</body></html>`;
    write(['index.html'], page());
    write(['discover', 'index.html'], page());
    write(['guide', 'index.html'], page('<h1>How STYLD works</h1><p>Find a look, check the person behind it, then plan.</p>'));
    write(['legal', 'privacy.html'], page(`<p>${'summary of the privacy position '.repeat(30)}</p>`));
    write(['salons', 'index.html'], page());
    write(['salons', 'index.rsc'], '7:E{"digest":"NEXT_REDIRECT;replace;/discover;307;"}');
    write(['auth', 'preview.html'], page());
    write(['auth', 'preview.rsc'], '7:E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}');

    const result = audit({ built: directory, shellWords: SHELL_WORDS });
    assert.deepEqual(result.loaderOnly.map(row => row.route), ['/', '/discover'], 'sorted by how little a visitor sees');
    assert.deepEqual(result.thin.map(row => row.route), ['/guide'], 'a short heading is still flagged as thin');
    assert.deepEqual(result.redirects.map(row => `${row.route} ${row.redirectsTo}`), ['/salons 307 /discover'],
      'an alias is reported as an alias, and kept out of both defect lists');
    assert.deepEqual(result.errorAnswers.map(row => `${row.route} ${row.answersWithError}`), ['/auth/preview 404 (notFound or an error page)']);
    assert.ok(result.rows.find(row => row.route === '/legal/privacy').charactersBeyondLoader > 200, 'real prose clears the thin bar');
    assert.equal(result.rows.length, 6);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('a build with no route-level loading file is still measured', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'styld-no-loader-'));
  try {
    fs.writeFileSync(path.join(directory, 'terms.html'),
      '<html><body><main><h1>Terms</h1><p>' + 'these are the terms of use for the platform. '.repeat(8) + '</p></main></body></html>');
    const result = audit({ built: directory, loading: path.join(directory, 'app/loading.tsx') });
    assert.equal(result.rows.length, 1);
    assert.equal(result.loaderOnly.length, 0, 'real prose is counted as it paints');
    assert.equal(result.frameSubtracted, true, 'with no loader copy to subtract, the shared frame is taken out by region');
    assert.ok(result.rows[0].charactersBeyondLoader > 200);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

// The instrument bug this exists for: `class="ml-auto hidden items-center lg:flex"` carries the word
// hidden inside a utility list on an element every desktop visitor sees. Reading it as the hidden
// attribute removed painted prose and made routes look worse than they are, which is still a wrong
// measurement.
test('the word hidden inside a class list does not hide an element the browser paints', () => {
  const html = '<body><p>Words a visitor reads on a wide screen.</p>'
    + '<nav class="ml-auto hidden items-center gap-0.5 lg:flex"><a href="/book">Plan</a></nav></body>';
  assert.equal(visible(html), 'Words a visitor reads on a wide screen. Plan');
});

test('a bare hidden attribute still hides, and hidden="false" does not', () => {
  const html = '<body><p>Kept.</p><div hidden id="S:0"><p>Deferred payload.</p></div>'
    + '<div hidden="false"><p>Explicitly painted.</p></div></body>';
  assert.equal(visible(html), 'Kept. Explicitly painted.');
});

test('the shared frame is taken out by region, not word by word', () => {
  const html = '<html><body>'
    + `<header class="${FRAME_CLASSES[0]} sticky top-0"><span>Trusted beauty access</span></header>`
    + '<main><p role="status" class="mb-4">Opening your Styld world...</p></main>'
    + `<p role="status" class="${FRAME_CLASSES[1]} mb-4">Preview: listings include sample data.</p>`
    + `<nav class="${FRAME_CLASSES[2]} fixed bottom-3"><a href="/home">Home</a><a href="/discover">Discover</a></nav>`
    + '</body></html>';
  assert.equal(visible(html).includes('Trusted beauty access'), true, 'the frame words are painted, so plain visible() keeps them');
  const without = visible(html, { withoutFrame: true });
  assert.equal(without, 'Opening your Styld world...');
  const measured = analyse(html, [], { withoutFrame: true });
  assert.equal(measured.loaderOnly, false, 'the route does say something, even though it is only that it is waiting');
  assert.equal(measured.announcedWaitOnly, true, 'a short sentence inside a status region is an open wait, not content');
});

test('a route with real content of its own is not classed as an open wait', () => {
  const html = '<html><body><main><h1>Plan your beauty visit</h1><p>' + 'Choose a service and see an estimate before you contact anyone. '.repeat(5) + '</p></main></body></html>';
  const measured = analyse(html, [], { withoutFrame: true });
  assert.equal(measured.announcedWaitOnly, false, `${measured.charactersBeyondLoader} characters of prose is the route speaking`);
});

// Round three of the review found this hole: while a route-level loading file existed the audit
// measured word by word but read role="status" from the raw document, so a status region that
// React shipped inside a hidden Suspense payload, or one that lives in the shared frame, could
// mark a page as openly waiting when everything it says is invisible to a visitor.
test('a status region a visitor never sees does not speak for the route', () => {
  const hiddenPayload = '<html><body><div hidden id="S:0"><p role="status">Loading the guide.</p></div>'
    + '<div><!--$?--><template id="B:0"></template><p class="loader-bloom"></p><!--/$--></div></body></html>';
  const measured = analyse(hiddenPayload, shellWords('<p role="status">Preparing your beauty moment</p>'), {});
  assert.equal(measured.silentAndUnannounced, true, 'the sentence is in the bytes but not on the screen, so the route is silent');
  assert.equal(measured.announcedWaitOnly, false, 'a hidden promise is not an announced wait');

  const frameOnly = '<html><body><div class="page"><p>' + 'Real guide words about booking a stylist in Nairobi. '.repeat(6) + '</p></div>'
    + `<p role="status" class="${FRAME_CLASSES[1]}">Preview: listings include sample data.</p></body></html>`;
  const withOwnWords = analyse(frameOnly, shellWords('<p role="status">Preparing your beauty moment</p>'), {});
  assert.equal(withOwnWords.announcedWaitOnly, false, 'the route has content, so it is not classed as a wait either way');
  assert.equal(withOwnWords.silentAndUnannounced, false, 'and it is not silent');
});

// The frame rule is only honest while the shipped components still carry the hook classes. If a
// refactor renames one, the audit would start crediting nav labels as page content without saying so.
test('the shipped frame elements still carry the classes the audit subtracts', () => {
  const sources = ['components/app-shell.tsx', 'components/marketplace-ui.tsx', 'components/client-session-gate.tsx']
    .map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
  for (const marker of FRAME_CLASSES) {
    assert.ok(new RegExp(`class(?:Name)=.{0,4}"[^"]*\\b${marker}\\b[^"]*"`).test(sources),
      `${marker} is subtracted as frame but no longer marks a shipped element`);
  }
  assert.equal(FRAME_CLASSES.length, 3, 'the frame is a checked-in list of three regions, header, notice and nav');
});
