/**
 * Tests for Feature Flags and Route Gating
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const flags = load('lib/feature-flags.ts');

test('beta release gates are properly configured', () => {
  assert.equal(flags.FEATURES.SHOP, false);
  assert.equal(flags.FEATURES.DELIVERY, false);
  assert.equal(flags.FEATURES.COUNTER, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.equal(flags.FEATURES.DISCOVERY, true);
  assert.equal(flags.FEATURES.BOOKINGS, true);
});

test('isFeatureEnabled correctly reports status', () => {
  assert.equal(flags.isFeatureEnabled('SHOP'), false);
  assert.equal(flags.isFeatureEnabled('BOOKINGS'), true);
});

test('route feature gates map all unreleased surfaces', () => {
  assert.equal(flags.ROUTE_FEATURE_GATES['/shop'], 'SHOP');
  assert.equal(flags.ROUTE_FEATURE_GATES['/delivery'], 'DELIVERY');
  assert.equal(flags.ROUTE_FEATURE_GATES['/counter'], 'COUNTER');
  assert.equal(flags.ROUTE_FEATURE_GATES['/dashboard/shop'], 'SHOP');
  assert.equal(flags.ROUTE_FEATURE_GATES['/dashboard/delivery'], 'DELIVERY');
});
