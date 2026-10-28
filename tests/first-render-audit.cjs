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

const root = path.resolve(__dirname, '..');
const { analyse, routeOf, shellWords, visible, audit, redirectOf, httpErrorOf } = require('../scripts/first-render-audit.cjs');

const SHELL_WORDS = shellWords(fs.readFileSync(path.join(root, 'app/loading.tsx'), 'utf8'));
const LOADING_PHRASE = SHELL_WORDS.find(word => /prepar/i.test(word));

test('the loader copy is taken from app/loading.tsx rather than remembered', () => {
  assert.ok(SHELL_WORDS.length >= 2, `the shell should be read as its own sentences, got ${JSON.stringify(SHELL_WORDS)}`);
  assert.match(LOADING_PHRASE, /prepar/i);
});

test('a route whose whole body is the loading shell is reported as shipping nothing', () => {
  const html = `<html><body><div role="status" aria-live="polite">${SHELL_WORDS.map(word => `<p>${word}</p>`).join('')}</div></body></html>`;
  const measured = analyse(html, SHELL_WORDS, LOADING_PHRASE);
  assert.equal(measured.hasLoader, true);
  assert.equal(measured.loaderOnly, true, 'a shell is not content');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('text inside a script, a style or a comment is not visible to a visitor', () => {
  const html = '<html><body><p>Only these words reach the screen.</p><script>var copy = "a very long invented sentence indeed"</script>'
    + '<style>.hidden{content:"another long stretch of words"}</style><!-- and a comment full of letters too --></body></html>';
  assert.equal(visible(html), 'Only these words reach the screen.');
  assert.equal(analyse(html, [], LOADING_PHRASE).charactersBeyondLoader, 28, 'only the letters of the visible sentence are counted');
});

test('a route that only repeats the loading shell is still reported as shipping nothing', () => {
  const words = ['Styld', 'Preparing your beauty moment'];
  const html = '<body><div role="status"><p>STYLD</p><p>Styld</p><p>Preparing your beauty moment</p>'
    + '<p>preparing your beauty moment</p></div></body>';
  const measured = analyse(html, words, 'Preparing your beauty moment');
  assert.equal(measured.loaderOnly, true, 'the frame repeating itself is not the route speaking');
  assert.equal(measured.charactersBeyondLoader, 0);
});

test('a route that says something new is credited only for what it says', () => {
  const words = ['Styld', 'Preparing your beauty moment'];
  const html = '<body><div role="status"><p>STYLD</p><p>Preparing your beauty moment</p></div>'
    + '<h1>Discover</h1></body>';
  assert.equal(analyse(html, words, 'Preparing your beauty moment').charactersBeyondLoader, 'Discover'.length);
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
  const measured = analyse(html, words, 'Preparing your beauty moment');
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
    const shell = `<body>${SHELL_WORDS.map(word => `<p>${word}</p>`).join('')}</body>`;
    write(['index.html'], shell);
    write(['discover', 'index.html'], shell);
    write(['guide', 'index.html'], shell + '<h1>How STYLD works</h1><p>Find a look, check the person behind it, then plan.</p>');
    write(['legal', 'privacy.html'], shell + `<p>${'summary of the privacy position '.repeat(30)}</p>`);
    write(['salons', 'index.html'], shell);
    write(['salons', 'index.rsc'], '7:E{"digest":"NEXT_REDIRECT;replace;/discover;307;"}');
    write(['auth', 'preview.html'], shell);
    write(['auth', 'preview.rsc'], '7:E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}');

    const result = audit({ built: directory, loadingPhrase: LOADING_PHRASE });
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
