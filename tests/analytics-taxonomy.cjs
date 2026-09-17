/**
 * Tests for Analytics Taxonomy and Property Sanitization
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

const analytics = load('lib/analytics.ts', {
  '@vercel/postgres': { sql: async () => ({}) },
  './logger': { logger: { warn() {}, info() {} } },
});

test('sanitizeEventProperties strips forbidden credential and PII keys', () => {
  const dirtyProps = {
    category: 'braids',
    zone: 'kilimani',
    password: 'client-password',
    otp: '987654',
    phone: '+254700000000',
    secretToken: 'sensitive-token',
    totalKES: 3500,
  };

  const clean = analytics.sanitizeEventProperties(dirtyProps);
  assert.equal(clean.category, 'braids');
  assert.equal(clean.zone, 'kilimani');
  assert.equal(clean.totalKES, 3500);
  assert.equal(clean.password, undefined);
  assert.equal(clean.otp, undefined);
  assert.equal(clean.phone, undefined);
  assert.equal(clean.secretToken, undefined);
});

test('sanitizeEventProperties truncates long strings to prevent payload abuse', () => {
  const longString = 'a'.repeat(1000);
  const clean = analytics.sanitizeEventProperties({ note: longString });
  assert.equal(clean.note.length, 500);
});
