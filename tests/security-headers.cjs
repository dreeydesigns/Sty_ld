/**
 * Tests for Production Security Headers and Server Logger Sanitization
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

const loggerModule = load('lib/logger.ts');

test('logger masks phone numbers safely preserving debugging reach', () => {
  assert.equal(loggerModule.maskPhone('+254712345678'), '+2547****5678');
  assert.equal(loggerModule.maskPhone('0712345678'), '07123****5678');
  assert.equal(loggerModule.maskPhone('123'), '***');
  assert.equal(loggerModule.maskPhone(null), '');
});

test('logger sanitizes sensitive credentials and PII deeply', () => {
  const dirty = {
    user: {
      id: 'uuid-1',
      password: 'super-secret-password',
      token: 'jwt-session-token',
      apiKey: 'sk-12345678',
      phone: '+254743817931',
    },
    meta: {
      otp: '123456',
      serviceName: 'Box Braids',
    },
  };

  const clean = loggerModule.sanitizeLogData(dirty);
  assert.equal(clean.user.password, '[REDACTED]');
  assert.equal(clean.user.token, '[REDACTED]');
  assert.equal(clean.user.apiKey, '[REDACTED]');
  assert.equal(clean.meta.otp, '[REDACTED]');
  assert.equal(clean.user.phone, '+2547****7931');
  assert.equal(clean.meta.serviceName, 'Box Braids');
});
