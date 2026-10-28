#!/usr/bin/env node
/**
 * First-render audit (Quality Assurance).
 *
 * Reads the HTML Next.js actually prerendered in .next/server/app and reports, per route, how
 * much a visitor who has not run JavaScript yet can see. This separates three things the browser
 * suites keep confusing: a route that ships no content at all, a route that ships a loading shell,
 * and a route that ships real content and simply takes a while on a slow link. A route whose flight
 * payload carries a redirect digest is reported as an alias, because it never reaches a body.
 *
 *   node scripts/first-render-audit.cjs                 summary plus every thin route
 *   node scripts/first-render-audit.cjs --json          machine-readable receipt
 *   node scripts/first-render-audit.cjs --max-loader-only=0
 *                                                       fail instead of report, for the gate
 *
 * The gate counts content routes only, so a passing run means no page that ought to say something
 * is silent.
 * While app/loading.tsx exists its copy is subtracted, so a route is judged on what it adds rather
 * than on how often the spinner repeats the brand name. The file was removed on 2026-10-28: a route
 * segment whose server render does not finish during the first flush of the stream commits that
 * loader as the whole first paint and streams the page into `<div hidden id="S:0">`, which is how
 * eight content routes, including the pure server-rendered legal pages, ended up shipping only a
 * spinner. The build ships React 18.2.0 with Next 15.5.28, and the hidden-payload and template
 * markers described here are what that pairing wrote into .next/server/app on the measured build.
 * With no loader file the word subtraction is empty, so the shared frame (the brand header, the
 * mobile nav and the preview banner every shell route repeats) is taken out by region instead of by
 * word: counting those phrases as content would credit a route with words it never chose. Three
 * readings come out of the body that is left. Nothing to read and no message saying why is a defect
 * and fails the gate. Nothing to read but a status region that speaks is a page waiting in the open,
 * which is where an authenticated hub sits while its own session is resolved. Words that are all
 * inside that status region are the same thing with a sentence attached.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const built = path.join(root, '.next/server/app');

// The spinner's own words, when a route-level loading file still exists, so a route is judged on
// what it adds rather than on how many times it happens to repeat the brand name.
function shellWords(loadingSource) {
  return [...loadingSource.matchAll(/>([^<>{}]+)</g)]
    .map(match => match[1].replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// React sends the content of a Suspense boundary that did not finish during the render inside a
// hidden element, and swaps it in with JavaScript after hydration. A visitor who has not run
// JavaScript never sees it, so counting it as first-render content lets a route that shows only a
// spinner pass the audit. Reviewer finding on build fpiXdJsVDoGOYteLdHt2E: /discover carried 477
// characters by the old rule and every one of them was inside `<div hidden id="S:0">`.
// The scanner never rewrites the string while it walks it: it collects the byte ranges the browser
// will not paint, merges them, and splices them out once, at the end.
function stripNonRendered(html) {
  const spans = [];
  for (const match of html.matchAll(/<template[\s\S]*?<\/template\s*>/gi)) {
    spans.push([match.index, match.index + match[0].length]);
  }
  for (const tag of ['div', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav', 'span', 'p', 'ul', 'body']) {
    spans.push(...hiddenElementSpans(html, tag));
  }
  return spliceOut(html, spans);
}

// The frame AppShell repeats on every route it wraps: the brand header, the mobile bottom nav and the
// preview disclaimer. Their words travel with the layout, not with the page, so a route is not credited
// for them. The hook classes are added by components/marketplace-ui.tsx and components/app-shell.tsx
// for exactly this measurement, and tests/first-render-audit.cjs proves they are still on those elements.
const FRAME_CLASSES = ['styld-frame-header', 'styld-frame-notice', 'mobile-bottom-nav'];

function withoutFrame(html) {
  return removeMarked(html, (_names, attributes) => {
    const value = /class="([^"]*)"/.exec(attributes || '');
    return !!value && FRAME_CLASSES.some(marker => value[1].split(/\s+/).includes(marker));
  });
}

// A message inside `role="status"` is the page saying it is waiting, not the page arriving.
function withoutStatusRegions(html) {
  return removeMarked(html, (_names, attributes) => /role="status"/.test(attributes || ''));
}

function removeMarked(html, keep) {
  const spans = [];
  for (const tag of ['header', 'nav', 'div', 'section', 'aside', 'footer', 'main', 'p', 'span', 'ul', 'li', 'h1', 'h2', 'h3', 'strong', 'em']) {
    spans.push(...elementSpansWhere(html, tag, keep));
  }
  return spliceOut(html, spans);
}

function spliceOut(html, spans) {
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  let out = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    out += `${html.slice(cursor, start)} `;
    cursor = end;
  }
  return out + html.slice(cursor);
}

// Every top-level element of `tag` whose opening attributes satisfy `keep`, as byte ranges that
// include the element's whole subtree.
function elementSpansWhere(html, tag, keep) {
  const lowered = html.toLowerCase();
  const openToken = `<${tag}`;
  const closeToken = `</${tag}`;
  const spans = [];
  let from = 0;
  for (;;) {
    const at = findTag(lowered, openToken, from);
    if (at < 0) break;
    const tagEnd = lowered.indexOf('>', at);
    if (tagEnd < 0) break;
    from = tagEnd + 1;
    const attributes = lowered.slice(at + openToken.length, tagEnd);
    // `<div hidden>`, `<div hidden id="S:0">` and `<div data-x="hidden">` are told apart here:
    // only a bare `hidden` attribute (optionally valueless) means the browser will not paint it.
    // Quoted values are emptied first, because `class="ml-auto hidden items-center lg:flex"` carries
    // the word hidden inside a Tailwind utility list on an element the browser does paint.
    if (!keep(attributeNamesOnly(attributes), attributes)) continue;
    let depth = 1;
    let cursor = tagEnd + 1;
    let end = lowered.length;
    while (depth > 0) {
      const nextOpen = findTag(lowered, openToken, cursor);
      const nextClose = findTag(lowered, closeToken, cursor);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        cursor = lowered.indexOf('>', nextOpen) + 1;
      } else {
        depth--;
        if (depth === 0) end = lowered.indexOf('>', nextClose) + 1;
        cursor = nextClose + closeToken.length;
      }
    }
    spans.push([at, end]);
    // The scan resumes after the block just removed, so an element nested inside a removed element
    // is not counted twice and its text is gone whether or not the outer tag was known.
    from = end;
  }
  return spans;
}

function hiddenElementSpans(html, tag) {
  return elementSpansWhere(html, tag, (names, attributes) => /(^|[\s/])hidden(\s|=|$)/.test(names) && !/hidden\s*=\s*"false"/.test(attributes));
}

// Only the attribute names survive: a quoted value is a value, not an attribute, so the word
// "hidden" inside a class list cannot read as the hidden attribute.
function attributeNamesOnly(attributes) {
  return attributes.replace(/"[^"]*"|'[^']*'/g, '=""');
}

// `<div>` and `</div>` match, `<divider>` and `</division>` do not.
function findTag(lowered, token, from) {
  let at = lowered.indexOf(token, from);
  while (at >= 0) {
    const after = lowered[at + token.length];
    if (after === undefined || /[\s/>]/.test(after)) return at;
    at = lowered.indexOf(token, at + token.length);
  }
  return -1;
}

function visible(html, options = {}) {
  let painted = paintedBody(html);
  if (options.withoutFrame) painted = withoutFrame(painted);
  if (options.withoutStatus) painted = withoutStatusRegions(painted);
  return stripNonRendered(painted)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Only the document body is measured. The reviewer's second finding on the same build: a route can
// carry a correct `<title>` while its body paints nothing but the spinner, and the title's words were
// enough to move /terms, /community-guidelines and others out of the defect list. A title is shown in
// browser chrome, not on the page, so it cannot be the evidence that a route rendered.
function paintedBody(html) {
  const lowered = html.toLowerCase();
  const start = lowered.indexOf('<body');
  if (start < 0) return html;
  const open = lowered.indexOf('>', start);
  if (open < 0) return html;
  const end = lowered.lastIndexOf('</body');
  return html.slice(open + 1, end < 0 ? html.length : end);
}

// Every occurrence of the shell's own words is removed. The shell repeats the brand mark in the
// layout chrome as well as in the loader, and a second "Styld" is the frame speaking, not the route
// adding content. Measured on the build at 4e243e8: alias and dispatcher routes left the page body
// as the shell plus one uppercase logo, and counting that logo as five characters of content let a
// route with no content at all look like a route with a little.
function beyondShell(text, words) {
  let rest = text;
  for (const word of words) {
    rest = rest.split(new RegExp(escapeForPattern(word), 'gi')).join('');
  }
  return rest.replace(/[^A-Za-z0-9]/g, '').length;
}

function escapeForPattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A server component that calls redirect() renders no body of its own. The browser is answered with
// a 3xx and the .html left in the build output is only the layout shell, which is the correct shape
// for an alias route. The flight payload is the objective record of that: Next writes the redirect
// into it as a digest, so an alias is separated from a content route that lost its content without
// keeping a hand-written allowlist of routes.
function redirectOf(flightSource) {
  const match = /NEXT_REDIRECT;([a-z]+);([^;]*);(\d{3});/.exec(flightSource);
  if (!match) return null;
  return { method: match[1], target: match[2], status: Number(match[3]) };
}

// The same reasoning covers a page that calls notFound(): the build leaves the shell in its .html
// and the real answer is the 404 page. /auth/preview is that case, guarded to development.
function httpErrorOf(flightSource) {
  const match = /NEXT_HTTP_ERROR_FALLBACK;(\d{3})/.exec(flightSource);
  return match ? Number(match[1]) : null;
}

function analyse(html, words, options = {}) {
  const text = visible(html, options);
  const characters = beyondShell(text, words);
  // What is left once the announced waiting message is taken out too. A route whose every word lives
  // inside a status region is not showing content, it is showing that it is waiting, and saying so.
  const beyondAnnouncement = beyondShell(visible(html, { ...options, withoutStatus: true }), words);
  // The announcement has to belong to the route and be on the screen. AppShell's preview banner is
  // itself a status region, so reading the whole document would credit every shell route with a wait
  // it never said, and reading a raw document would let a status region buried in a hidden Suspense
  // payload, or in the shared frame, speak for a page that paints nothing.
  const announced = /role="status"/.test(stripNonRendered(withoutFrame(paintedBody(html))));
  return {
    bytes: html.length,
    visibleCharacters: text.length,
    charactersBeyondLoader: characters,
    loaderOnly: characters === 0,
    announcedWaitOnly: announced && beyondAnnouncement === 0,
    // The defect the gate is for: nothing to read and nothing that even says it is loading.
    silentAndUnannounced: characters === 0 && !announced,
  };
}

function routeOf(file, base) {
  const rel = path.relative(base, file).replace(/\\/g, '/');
  const withoutHtml = rel.replace(/\.html$/, '');
  if (withoutHtml === 'index') return '/';
  if (withoutHtml.endsWith('/index')) return `/${withoutHtml.slice(0, -'/index'.length)}`;
  return `/${withoutHtml}`;
}

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.html')) out.push(path.join(dir, entry.name));
  }
  return out;
}

function audit(options = {}) {
  const directory = options.built || built;
  const loadingFile = options.loading || path.join(root, 'app/loading.tsx');
  const words = options.shellWords || (fs.existsSync(loadingFile) ? shellWords(fs.readFileSync(loadingFile, 'utf8')) : []);
  // With a route-level loading file its own copy is subtracted by word. With none, the shared frame
  // is subtracted by region, because the words it repeats belong to the layout rather than the page.
  const measure = words.length > 0 ? {} : { withoutFrame: true };
  const rows = walk(directory).map(file => {
    const flight = `${file.slice(0, -'.html'.length)}.rsc`;
    const source = fs.existsSync(flight) ? fs.readFileSync(flight, 'utf8') : '';
    const redirect = redirectOf(source);
    const httpError = redirect ? null : httpErrorOf(source);
    return {
      route: routeOf(file, directory),
      ...analyse(fs.readFileSync(file, 'utf8'), words, measure),
      redirectsTo: redirect ? `${redirect.status} ${redirect.target}` : null,
      answersWithError: httpError ? `${httpError} (notFound or an error page)` : null,
    };
  });
  rows.sort((a, b) => a.charactersBeyondLoader - b.charactersBeyondLoader || a.route.localeCompare(b.route));
  const hasNoBody = row => row.redirectsTo || row.answersWithError;
  const isContentRoute = row => !hasNoBody(row);
  return {
    frameSubtracted: measure.withoutFrame === true,
    rows,
    // Silent and unannounced: the body is a fallback that does not even say it is a fallback.
    loaderOnly: rows.filter(row => row.silentAndUnannounced && isContentRoute(row)),
    announcedWait: rows.filter(row => row.announcedWaitOnly && isContentRoute(row)),
    redirects: rows.filter(row => row.redirectsTo),
    errorAnswers: rows.filter(row => row.answersWithError),
    thin: rows.filter(row => isContentRoute(row) && !row.silentAndUnannounced && !row.announcedWaitOnly && row.charactersBeyondLoader < 200),
  };
}

function main() {
  if (!fs.existsSync(built)) {
    console.error('No prerendered output found. Run npm run build first.');
    process.exit(1);
  }
  const result = audit();
  const { rows, loaderOnly, thin } = result;
  const thresholdArg = process.argv.find(arg => arg.startsWith('--max-loader-only='));
  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : null;

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      frameSubtracted: result.frameSubtracted,
      routes: rows.length,
      loaderOnlyRoutes: loaderOnly.map(row => row.route),
      announcedWaitRoutes: result.announcedWait.map(row => ({ route: row.route, charactersBeyondLoader: row.charactersBeyondLoader })),
      redirectRoutes: result.redirects.map(row => ({ route: row.route, redirectsTo: row.redirectsTo })),
      errorAnswerRoutes: result.errorAnswers.map(row => ({ route: row.route, answersWithError: row.answersWithError })),
      thinRoutes: thin.map(row => ({ route: row.route, charactersBeyondLoader: row.charactersBeyondLoader })),
      rows,
    }, null, 2));
  } else {
    console.log(`${rows.length} prerendered routes: ${loaderOnly.length} paint no words and say nothing about it, ${result.announcedWait.length} paint only a message that they are waiting, ${thin.length} paint less than 200 characters, ${result.redirects.length + result.errorAnswers.length} answer with a redirect or an error and never reach a body of their own.`);
    for (const row of loaderOnly) console.log(`  no content   ${row.route}  (${row.bytes} bytes)`);
    for (const row of result.announcedWait) console.log(`  waits openly ${row.route}  ${row.charactersBeyondLoader === 0 ? 'no visible words, but a status region speaks' : `${row.charactersBeyondLoader} characters, all inside a status region`}`);
    for (const row of thin) console.log(`  thin         ${row.route}  ${row.charactersBeyondLoader} characters painted`);
    for (const row of result.redirects) console.log(`  redirects    ${row.route}  -> ${row.redirectsTo}`);
    for (const row of result.errorAnswers) console.log(`  error answer ${row.route}  -> ${row.answersWithError}`);
  }

  if (Number.isSafeInteger(threshold) && loaderOnly.length > threshold) {
    console.error(`${loaderOnly.length} routes paint no words and do not even announce the wait, which is more than the agreed ${threshold}. Whatever the segment is waiting for, the prerender committed a fallback and hid the page for JavaScript to swap in.`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { audit, analyse, visible, beyondShell, shellWords, routeOf, redirectOf, httpErrorOf, paintedBody, stripNonRendered, withoutFrame, withoutStatusRegions, FRAME_CLASSES };
