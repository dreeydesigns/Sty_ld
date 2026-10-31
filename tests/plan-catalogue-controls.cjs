/**
 * MOBILE-PLAN-03 regression: a long plan catalogue needs search, category
 * filtering, honest sorting and an in-flow way back. The chosen services live
 * in the plan draft, so filtering must never clear them.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function loadPlanCatalogue() {
  const source = ts.transpileModule(read('lib/plan-catalogue.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = { console, Math, JSON, Object, Array, Number, String, Boolean, Error, Set, RegExp, globalThis: null };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, context)(require, module, module.exports);
  return module.exports;
}

const { filterPlanServices } = loadPlanCatalogue();
const services = [
  { name: 'Box braids', category: 'Braids', price: 450000 },
  { name: 'Gel manicure', category: 'Nails', price: 250000 },
  { name: 'Lash lift', category: 'Lashes', price: null },
  { name: 'Acrylic nails', category: 'Nails', price: 300000 },
];
const names = (result) => Array.from(result).map((service) => service.name);

test('search and category narrow the catalogue without touching the selection model', () => {
  assert.deepEqual(names(filterPlanServices(services, { query: '', category: 'Nails', sort: 'name' })), ['Acrylic nails', 'Gel manicure']);
  assert.deepEqual(names(filterPlanServices(services, { query: '  BRAIDS ', category: 'all', sort: 'name' })), ['Box braids']);
  assert.deepEqual(names(filterPlanServices(services, { query: 'nails', category: 'all', sort: 'name' })), ['Acrylic nails', 'Gel manicure']);
  assert.deepEqual(names(filterPlanServices(services, { query: 'nothing here', category: 'all', sort: 'name' })), []);
});

test('sorting is deterministic and services without a price go last', () => {
  assert.deepEqual(names(filterPlanServices(services, { query: '', category: 'all', sort: 'name' })), ['Acrylic nails', 'Box braids', 'Gel manicure', 'Lash lift']);
  assert.deepEqual(names(filterPlanServices(services, { query: '', category: 'all', sort: 'price' })), ['Gel manicure', 'Acrylic nails', 'Box braids', 'Lash lift']);
  assert.deepEqual(names(filterPlanServices(services, { query: '', category: 'all', sort: 'price-desc' })), ['Box braids', 'Acrylic nails', 'Gel manicure', 'Lash lift']);
});

test('filtering returns a new list and leaves the caller order intact', () => {
  const before = names(services);
  filterPlanServices(services, { query: '', category: 'all', sort: 'price' });
  assert.deepEqual(names(services), before);
});

test('the plan builder renders the controls and keeps selections out of the filters', () => {
  const source = read('components/appointment-planning.tsx');
  assert.match(source, /id="plan-service-search"/);
  assert.match(source, /id="plan-service-sort"/);
  assert.match(source, /aria-pressed=\{serviceCategory === category\}/);
  assert.match(source, /role="status"[\s\S]{0,160}Your selection stays when you change filters\./);
  assert.match(source, /\{serviceMatches\.map\(/, 'the grid renders the filtered list');
  assert.match(source, /filterPlanServices\(eligibleServices/, 'the filtered list comes from the tested helper');
  assert.doesNotMatch(source, /setServiceQuery\([^)]*\)[\s\S]{0,80}edit\(/, 'changing search must not rewrite the plan');
  const backLinks = source.match(/>Back to Discover</g) || [];
  assert.ok(backLinks.length >= 2, 'Back to Discover stays visible at the top and beside the final actions');
});
