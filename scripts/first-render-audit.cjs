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
 * The loader phrase is read from app/loading.tsx, so the audit follows the product if that copy
 * ever changes instead of hard-coding today's sentence.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const built = path.join(root, '.next/server/app');

// The shell's own words are read out of app/loading.tsx, so a route is judged on what it adds,
// not on how many times it happens to repeat the brand name.
function shellWords(loadingSource) {
  return [...loadingSource.matchAll(/>([^<>{}]+)</g)]
    .map(match => match[1].replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    hasLoader: text.includes(loadingPhrase),
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
  const source = fs.readFileSync(options.loading || path.join(root, 'app/loading.tsx'), 'utf8');
  const words = shellWords(source);
  const loadingPhrase = options.loadingPhrase || words.find(word => /prepar/i.test(word)) || 'Preparing your beauty moment';
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
    console.log(`${rows.length} prerendered routes: ${loaderOnly.length} content routes ship only the loading shell, ${thin.length} ship less than 200 characters beyond it, ${result.redirects.length + result.errorAnswers.length} answer with a redirect or an error and never reach a body of their own.`);
    for (const row of loaderOnly) console.log(`  no content   ${row.route}  (${row.bytes} bytes)`);
    for (const row of thin) console.log(`  thin         ${row.route}  ${row.charactersBeyondLoader} characters beyond the shell`);
    for (const row of result.redirects) console.log(`  redirects    ${row.route}  -> ${row.redirectsTo}`);
    for (const row of result.errorAnswers) console.log(`  error answer ${row.route}  -> ${row.answersWithError}`);
  }

  if (Number.isSafeInteger(threshold) && loaderOnly.length > threshold) {
    console.error(`${loaderOnly.length} routes ship only the loading shell, which is more than the agreed ${threshold}. A client component that reads the URL has to sit behind a Suspense boundary.`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { audit, analyse, visible, beyondShell, shellWords, routeOf, redirectOf, httpErrorOf };
