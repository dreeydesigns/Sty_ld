/**
 * Indexing posture suite (DevOps & Release slice).
 *
 * The beta is invite-only and carries real photographs of real people. This proves the app
 * refuses crawlers on every route through robots.txt, that a preview deployment on Vercel is
 * additionally instructed not to index, and that switching that on did not drop any of the
 * security headers the same response carries.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const configUrl = pathToFileURL(path.join(root, 'next.config.mjs')).href;

async function configWithEnv(environment) {
  const previous = process.env.VERCEL_ENV;
  if (environment === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = environment;
  try {
    // The config reads the environment inside headers(), so one import is enough; the value is
    // resolved per call, exactly as Next evaluates it at build time.
    const config = (await import(`${configUrl}?env=${String(environment)}`)).default;
    return { config, entries: await config.headers() };
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
}

function headerMap(entries) {
  const all = new Map();
  for (const entry of entries) for (const header of entry.headers) all.set(header.key.toLowerCase(), header.value);
  return all;
}

test('robots.txt refuses every crawler and offers no sitemap', async () => {
  const source = fs.readFileSync(path.join(root, 'app/robots.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vmRun(`(function(require,module,exports){${js}\n})`)(() => ({}), module, module.exports);
  const robots = await module.exports.default();
  // The value is built inside the module's realm, so its arrays fail a same-realm prototype
  // comparison. Read the rule rather than matching the object.
  assert.equal(robots.rules.length, 1, 'exactly one rule, so nothing is left open by a second entry');
  assert.equal(robots.rules[0].userAgent, '*');
  assert.equal(robots.rules[0].disallow, '/', 'no path is offered to a crawler');
  assert.equal(robots.rules[0].allow, undefined, 'the refusal is not quietly widened again by an allow');
  assert.equal(robots.sitemap, undefined, 'a private beta publishes no sitemap');
});

test('a Vercel preview is told not to index, production and non-Vercel runs are not changed', async () => {
  const preview = await configWithEnv('preview');
  assert.equal(headerMap(preview.entries).get('x-robots-tag'), 'noindex, nofollow');

  const production = await configWithEnv('production');
  assert.equal(headerMap(production.entries).get('x-robots-tag'), undefined, 'the launch deployment keeps its own indexing decision');

  const local = await configWithEnv(undefined);
  assert.equal(headerMap(local.entries).get('x-robots-tag'), undefined, 'a run that is not on Vercel inherits nothing from this rule');
});

test('the preview noindex rule did not displace the headers that protect every response', async () => {
  const { entries } = await configWithEnv('preview');
  const headers = headerMap(entries);
  for (const key of ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
    assert.ok(headers.get(key), `${key} still ships on every response`);
  }
  assert.match(headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
});

test('no page asks a crawler in by the back door', () => {
  const offenders = [];
  for (const dir of ['app']) {
    const walk = current => {
      for (const entry of fs.readdirSync(path.join(root, current), { withFileTypes: true })) {
        const relative = `${current}/${entry.name}`;
        if (entry.isDirectory()) walk(relative);
        else if (/page\.tsx$/.test(entry.name)) {
          const text = fs.readFileSync(path.join(root, relative), 'utf8');
          if (/robots?:\s*{[^}]*index:\s*true/.test(text) || /indexing:\s*{\s*enabled:\s*true/.test(text)) offenders.push(relative);
        }
      }
    };
    walk(dir);
  }
  assert.deepEqual(offenders, [], 'a page that opts back into indexing would undo the beta being private');
});

function vmRun(script) {
  const vm = require('node:vm');
  return vm.runInNewContext(script, { console, process, Buffer, URL, URLSearchParams, Date, Math, JSON, Object, Array, Number, String, Boolean, Error, Set, Map, RegExp, Promise, Symbol });
}
