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
 * segment whose server render does not finish in React's first flush commits that loader as the whole
 * first paint and streams the page into `<div hidden id="S:0">`, which is how eight content routes,
 * including the pure server-rendered legal pages, ended up shipping only a spinner. With no loader
 * file the subtraction is empty and a route is silent only when it truly paints nothing.
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

function hiddenElementSpans(html, tag) {
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
    const isHidden = /(^|[\s/])hidden(\s|=|$)/.test(attributes) && !/hidden\s*=\s*("false"|'false')/.test(attributes);
    if (!isHidden) continue;
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
    // The scan resumes after the block just removed, so a hidden element nested inside a hidden
    // element is not counted twice and its text is gone whether or not the outer tag was known.
    from = end;
  }
  return spans;
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

function visible(html) {
  const painted = paintedBody(html);
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

function analyse(html, words, loadingPhrase) {
  const text = visible(html);
  const characters = beyondShell(text, words);
  return {
    bytes: html.length,
    visibleCharacters: text.length,
    charactersBeyondLoader: characters,
    loaderOnly: characters === 0,
    hasLoader: loadingPhrase.length > 0 && text.includes(loadingPhrase),
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
  const loadingPhrase = options.loadingPhrase || words.find(word => /prepar/i.test(word)) || '';
  const rows = walk(directory).map(file => {
    const flight = `${file.slice(0, -'.html'.length)}.rsc`;
    const source = fs.existsSync(flight) ? fs.readFileSync(flight, 'utf8') : '';
    const redirect = redirectOf(source);
    const httpError = redirect ? null : httpErrorOf(source);
    return {
      route: routeOf(file, directory),
      ...analyse(fs.readFileSync(file, 'utf8'), words, loadingPhrase),
      redirectsTo: redirect ? `${redirect.status} ${redirect.target}` : null,
      answersWithError: httpError ? `${httpError} (notFound or an error page)` : null,
    };
  });
  rows.sort((a, b) => a.charactersBeyondLoader - b.charactersBeyondLoader || a.route.localeCompare(b.route));
  const hasNoBody = row => row.redirectsTo || row.answersWithError;
  const isShellOnly = row => row.loaderOnly && !hasNoBody(row);
  return {
    loadingPhrase,
    rows,
    loaderOnly: rows.filter(isShellOnly),
    redirects: rows.filter(row => row.redirectsTo),
    errorAnswers: rows.filter(row => row.answersWithError),
    thin: rows.filter(row => !isShellOnly(row) && !hasNoBody(row) && row.charactersBeyondLoader < 200),
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
      loadingPhrase: result.loadingPhrase,
      routes: rows.length,
      loaderOnlyRoutes: loaderOnly.map(row => row.route),
      redirectRoutes: result.redirects.map(row => ({ route: row.route, redirectsTo: row.redirectsTo })),
      errorAnswerRoutes: result.errorAnswers.map(row => ({ route: row.route, answersWithError: row.answersWithError })),
      thinRoutes: thin.map(row => ({ route: row.route, charactersBeyondLoader: row.charactersBeyondLoader })),
      rows,
    }, null, 2));
  } else {
    console.log(`${rows.length} prerendered routes: ${loaderOnly.length} content routes paint no words at all, ${thin.length} paint less than 200 characters, ${result.redirects.length + result.errorAnswers.length} answer with a redirect or an error and never reach a body of their own.`);
    for (const row of loaderOnly) console.log(`  no content   ${row.route}  (${row.bytes} bytes)`);
    for (const row of thin) console.log(`  thin         ${row.route}  ${row.charactersBeyondLoader} characters painted`);
    for (const row of result.redirects) console.log(`  redirects    ${row.route}  -> ${row.redirectsTo}`);
    for (const row of result.errorAnswers) console.log(`  error answer ${row.route}  -> ${row.answersWithError}`);
  }

  if (Number.isSafeInteger(threshold) && loaderOnly.length > threshold) {
    console.error(`${loaderOnly.length} routes paint no words at all, which is more than the agreed ${threshold}. Whatever the segment is waiting for, the prerender committed a fallback and hid the page for JavaScript to swap in.`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { audit, analyse, visible, beyondShell, shellWords, routeOf, redirectOf, httpErrorOf, paintedBody, stripNonRendered };
