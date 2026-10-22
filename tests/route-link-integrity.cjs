/**
 * Route, link and metadata integrity regression suite.
 *
 * 1. Every literal internal page link resolves to a real route, an intentional
 *    redirect (middleware or page level) or a feature-gated surface.
 * 2. Every literal fetch("/api/...") target resolves to a real route handler,
 *    except the documented dormant scenario script that nothing imports.
 * 3. The root layout publishes a default document title so no route renders
 *    an empty title.
 * 4. Metadata titles and descriptions stay free of em and en dashes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DORMANT_SOURCES = new Set(['lib/test-multi-role-scenarios.tsx']);
const REDIRECT_SOURCES = new Set(['/explore', '/settings/profile']);
const GATED_PREFIXES = [
  '/shop',
  '/delivery',
  '/dashboard/shop',
  '/dashboard/delivery',
  '/onboarding/shop',
  '/onboarding/delivery',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function collectRoutes(dir, urlPrefix, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('(') || entry.name.startsWith('@')) continue;
      collectRoutes(path.join(dir, entry.name), urlPrefix + '/' + entry.name, out);
    } else if (entry.name === 'page.tsx') {
      out.add(urlPrefix === '' ? '/' : urlPrefix);
    }
  }
  return out;
}

function collectApi(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) collectApi(path.join(dir, entry.name), out);
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      const rel = path.relative(path.join(ROOT, 'app', 'api'), dir).split(path.sep).join('/');
      out.add('/api' + (rel ? '/' + rel : ''));
    }
  }
  return out;
}

function routeToRegex(route) {
  const parts = route.split('/').map((seg) => {
    if (seg.startsWith('[...') && seg.endsWith(']')) return '.*';
    if (seg.startsWith('[') && seg.endsWith(']')) return '[^/]+';
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^' + parts.join('/') + '$');
}

const routes = collectRoutes(path.join(ROOT, 'app'), '', new Set());
const apiRoutes = collectApi(path.join(ROOT, 'app', 'api'), new Set());
const pagePatterns = [...routes].map((r) => ({ route: r, re: routeToRegex(r) }));
const apiPatterns = [...apiRoutes].map((r) => ({ route: r, re: routeToRegex(r) }));

function probe(pathname) {
  return pathname.split('/').map((s) => (s === '*' ? 'wildcard-seg' : s)).join('/');
}

function isRedirect(pathname) {
  if (REDIRECT_SOURCES.has(pathname)) return true;
  if (pathname.startsWith('/counter/')) return true;
  return GATED_PREFIXES.some((g) => pathname === g || pathname.startsWith(g + '/'));
}

const sourceFiles = [
  ...walk(path.join(ROOT, 'app')),
  ...walk(path.join(ROOT, 'components')),
  ...walk(path.join(ROOT, 'lib')),
].filter((f) => /\.(tsx|ts)$/.test(f) && !f.endsWith('.d.ts'));

const PAGE_LINKS = [
  /\bhref\s*=\s*["']([^"']+)["']/g,
  /\bhref\s*=\s*\{\s*`([^`]+)`\s*\}/g,
  /\brouter\.(?:push|replace|prefetch)\(\s*["'`]([^"'`]+)["'`]/g,
  /\bredirect\(\s*["']([^"']+)["']/g,
];
const API_LINKS = /fetch\(\s*["'`]([^"'`]+)["'`]/g;

test('every literal internal page link resolves to a route, redirect or gate', () => {
  const broken = [];
  for (const file of sourceFiles) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8');
    for (const pattern of PAGE_LINKS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(src))) {
        const raw = match[1];
        if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/api/')) continue;
        const pathname = raw.split('#')[0].split('?')[0].replace(/\$\{[^}]*\}/g, '*');
        if (!pathname) continue;
        const hit = pagePatterns.some((p) => p.re.test(probe(pathname)));
        if (hit || isRedirect(pathname)) continue;
        broken.push(rel + ' -> ' + pathname);
      }
    }
  }
  assert.deepEqual(broken, [], 'broken internal links:\n' + broken.join('\n'));
});

test('every literal API call target has a route handler outside dormant sources', () => {
  const broken = [];
  for (const file of sourceFiles) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (DORMANT_SOURCES.has(rel)) continue;
    const src = fs.readFileSync(file, 'utf8');
    API_LINKS.lastIndex = 0;
    let match;
    while ((match = API_LINKS.exec(src))) {
      const raw = match[1];
      if (!raw.startsWith('/api/')) continue;
      const pathname = raw.split('#')[0].split('?')[0].replace(/\$\{[^}]*\}/g, '*');
      const hit = apiPatterns.some((p) => p.re.test(probe(pathname)));
      if (!hit) broken.push(rel + ' -> ' + pathname);
    }
  }
  assert.deepEqual(broken, [], 'API calls without handlers:\n' + broken.join('\n'));
});

test('the root layout publishes a default document title', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8');
  assert.match(source, /export const metadata\s*=/);
  assert.match(source, /title:\s*["']STYLD["']/);
});

test('metadata titles and descriptions use no em or en dashes', () => {
  const offenders = [];
  const metadataFiles = sourceFiles.filter((f) => /(?:page|layout)\.tsx$/.test(f));
  for (const file of metadataFiles) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8');
    const single = src.match(/export const metadata[^\n]*;/);
    const block = single ? null : src.match(/export const metadata[\s\S]*?\n\};/);
    const metadataText = single ? single[0] : block ? block[0] : '';
    if (metadataText && /[\u2014\u2013]/.test(metadataText)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], 'metadata blocks with em or en dashes:\n' + offenders.join('\n'));
});
