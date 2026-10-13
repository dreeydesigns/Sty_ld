/**
 * M-Pesa payment callback containment regression tests.
 *
 * A production source review found the deployed callback handler
 * (app/api/payments/mpesa/callback/route.ts) processed inbound STK Push
 * callbacks without authenticating their origin: it parsed the request body,
 * wrote to payment_logs, and could set a booking to status = 'confirmed'.
 *
 * These tests lock in the fail-closed containment: the endpoint must answer
 * 503 for every request, never read the payload, never touch the database,
 * never confirm a booking, and must not be reactivatable by feature flags.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const CALLBACK_PATH = 'app/api/payments/mpesa/callback/route.ts';

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${source}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readCode(file) {
  return stripComments(readSource(file));
}

function loadCallback(dbState) {
  const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
  return load(CALLBACK_PATH, {
    'next/server': next,
    '@vercel/postgres': {
      sql: async () => {
        dbState.touched = true;
        throw new Error('database must not be accessed by the disabled callback');
      },
    },
  });
}

test('callback answers 503 fail-closed for every request', async () => {
  const dbState = { touched: false };
  const route = loadCallback(dbState);
  const response = await route.POST({ json: async () => ({ Body: { stkCallback: { ResultCode: 0 } } }) });
  assert.equal(response.status, 503);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.code, 'payments_unavailable');
});

test('callback never reads the inbound payload', async () => {
  let bodyParsed = false;
  const dbState = { touched: false };
  const route = loadCallback(dbState);
  await route.POST({
    json: async () => {
      bodyParsed = true;
      return { Body: { stkCallback: { CheckoutRequestID: 'ws_CO_1', ResultCode: 0 } } };
    },
    text: async () => {
      bodyParsed = true;
      return '';
    },
  });
  assert.equal(bodyParsed, false);
  assert.equal(dbState.touched, false);
});

test('callback performs no database access, payment write or booking confirmation', async () => {
  const dbState = { touched: false };
  const route = loadCallback(dbState);
  const response = await route.POST({ json: async () => ({}) });
  assert.equal(response.status, 503);
  assert.equal(dbState.touched, false);

  const source = readCode(CALLBACK_PATH);
  assert.doesNotMatch(source, /@vercel\/postgres/, 'must not import the database client');
  assert.doesNotMatch(source, /\bsql`/, 'must not run SQL');
  assert.doesNotMatch(source, /\b(UPDATE|INSERT|DELETE)\b/, 'must not mutate records');
  assert.doesNotMatch(source, /payment_logs|payment_status/, 'must not touch payment records');
  assert.doesNotMatch(source, /status\s*=\s*['"]confirmed['"]/, 'must not confirm bookings');
});

test('callback containment is not driven by feature flags', async () => {
  const source = readCode(CALLBACK_PATH);
  assert.doesNotMatch(source, /PAYMENTS_LIVE|feature-flags|isFeatureEnabled|FEATURES/, 'must not read feature flags');

  const previous = process.env.PAYMENTS_LIVE;
  process.env.PAYMENTS_LIVE = 'true';
  try {
    const dbState = { touched: false };
    const route = loadCallback(dbState);
    const response = await route.POST({ json: async () => ({ Body: { stkCallback: { ResultCode: 0 } } }) });
    assert.equal(response.status, 503);
    assert.equal(dbState.touched, false);
  } finally {
    if (previous === undefined) delete process.env.PAYMENTS_LIVE;
    else process.env.PAYMENTS_LIVE = previous;
  }
});

test('callback does not process STK metadata or receipt numbers', async () => {
  const source = readCode(CALLBACK_PATH);
  assert.doesNotMatch(source, /CheckoutRequestID|CallbackMetadata|MpesaReceiptNumber|ResultCode/);
  assert.doesNotMatch(source, /req\.json\(/, 'must not parse the request body');
});
