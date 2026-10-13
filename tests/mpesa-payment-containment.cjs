/**
 * R2-S0 M-Pesa payment backend containment suite.
 *
 * Locks the rule that Styld cannot initiate M-Pesa payments, accept
 * payment-completion callbacks, alter payment records, or confirm bookings
 * through dormant payment infrastructure while payment processing is
 * unapproved for the MVP.
 *
 *   1. the disabled M-Pesa callback fails closed and never touches the database
 *   2. the payment provider cannot initiate an STK Push while unapproved
 *   3. every provider obtained from getPaymentProvider is disabled
 *   4. no hardcoded production callback URL or sandbox passkey remains
 *   5. containment does not depend on the payments feature flag
 *   6. no public entry point invokes the payment provider directly
 *
 * Route and provider behavior are exercised directly through a VM harness.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function load(file, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {
    console, process, Buffer, URL, URLSearchParams, AbortSignal,
    fetch: globals.fetch || fetch,
  })((name) => (name in dependencies ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

const next = {
  NextResponse: {
    json: (body, options = {}) => ({ body, status: options.status || 200 }),
  },
};

function providerHarness(globals = {}) {
  let sqlCalls = 0;
  const mod = load('lib/payment-provider.ts', {
    '@vercel/postgres': { sql: async () => { sqlCalls += 1; return { rows: [] }; } },
    './sms': { maskPhone: (p) => p },
  }, globals);
  return { mod, sqlCalls: () => sqlCalls };
}

function callbackHarness() {
  let sqlCalls = 0;
  const route = load('app/api/payments/mpesa/callback/route.ts', {
    'next/server': next,
    '@vercel/postgres': { sql: async () => { sqlCalls += 1; return { rows: [], rowCount: 0 }; } },
  });
  return { route, sqlCalls: () => sqlCalls };
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

test('the disabled M-Pesa callback fails closed and never touches the database', async () => {
  const { route, sqlCalls } = callbackHarness();

  const res = await route.POST();
  assert.equal(res.status, 503, 'the callback is contained with HTTP 503');
  assert.equal(res.body.ok, false);
  assert.equal(res.body.code, 'payments_unavailable');
  assert.match(res.body.error, /not enabled/i);
  assert.equal(sqlCalls(), 0, 'the callback must not reach the database');

  const api = stripped('app/api/payments/mpesa/callback/route.ts');
  assert.doesNotMatch(api, /@vercel\/postgres/i, 'the callback must not import the database client');
  assert.doesNotMatch(api, /INSERT|UPDATE|SELECT/i, 'the callback must not run any query');
  assert.doesNotMatch(api, /payment_logs/i, 'the callback must not write payment records');
  assert.doesNotMatch(api, /bookings/i, 'the callback must not touch bookings');
  assert.doesNotMatch(api, /confirmed/i, 'the callback must not confirm a booking');
  assert.doesNotMatch(api, /req\.json|request\.json/, 'the callback must not parse a request body');
});

test('the payment provider cannot initiate an STK Push while unapproved', async () => {
  let fetchCalls = 0;
  const blockedFetch = async () => { fetchCalls += 1; throw new Error('network must not be used'); };
  const { mod, sqlCalls } = providerHarness({ fetch: blockedFetch });

  const mpesa = new mod.MpesaDarajaProvider();
  const res = await mpesa.initiatePayment({ phoneNumber: '0712345678', amount: 2500, accountReference: 'STYLD' });
  assert.equal(res.ok, false, 'no STK Push may succeed');
  assert.match(res.error, /not enabled/i);
  assert.equal(fetchCalls, 0, 'no STK Push request may be sent');
  assert.equal(sqlCalls(), 0, 'no payment record may be written');

  const query = await mpesa.queryPaymentStatus('checkout-1');
  assert.equal(query.ok, false);
  assert.equal(query.status, 'unknown');
  assert.equal(fetchCalls, 0, 'no status query may be sent');
});

test('every provider obtained from getPaymentProvider is disabled', async () => {
  const blockedFetch = async () => { throw new Error('network must not be used'); };
  const { mod } = providerHarness({ fetch: blockedFetch });

  const mpesa = await mod.getPaymentProvider('mpesa').initiatePayment({ phoneNumber: '0712345678', amount: 100, accountReference: 'X' });
  assert.equal(mpesa.ok, false);

  const stripe = await mod.getPaymentProvider('stripe').initiatePayment({ phoneNumber: '0712345678', amount: 100, accountReference: 'X' });
  assert.equal(stripe.ok, false);
});

test('no hardcoded production callback URL or sandbox passkey remains', () => {
  const provider = stripped('lib/payment-provider.ts');
  assert.doesNotMatch(provider, /styld\.co\.ke\/api\/payments\/mpesa\/callback/i, 'no production callback URL may be hardcoded');
  assert.doesNotMatch(provider, /bfb279f9/i, 'no sandbox passkey may be embedded');
  assert.doesNotMatch(provider, /MPESA_PASSKEY\s*\|\|\s*['"][^'"]+['"]/, 'the passkey must not fall back to a non-empty literal');
  assert.doesNotMatch(provider, /MPESA_CALLBACK_URL\s*\|\|\s*['"][^'"]+['"]/, 'the callback URL must not fall back to a non-empty literal');
});

test('payment containment does not depend on the payments feature flag', async () => {
  const provider = stripped('lib/payment-provider.ts');
  assert.doesNotMatch(provider, /feature-flags/, 'containment must not read feature flags');
  assert.doesNotMatch(provider, /PAYMENTS_LIVE/, 'containment must not depend on the payments flag');
  assert.doesNotMatch(provider, /FEATURES/, 'containment must not read the feature map');

  let fetchCalls = 0;
  const { mod } = providerHarness({ fetch: async () => { fetchCalls += 1; throw new Error('blocked'); } });
  process.env.PAYMENTS_LIVE = 'true';
  try {
    const res = await mod.getPaymentProvider('mpesa').initiatePayment({ phoneNumber: '0712345678', amount: 1, accountReference: 'X' });
    assert.equal(res.ok, false, 'flipping the payments flag must not enable the provider');
    assert.equal(fetchCalls, 0);
  } finally {
    delete process.env.PAYMENTS_LIVE;
  }
});

test('no public entry point invokes the payment provider directly', () => {
  const root = path.join(__dirname, '..');
  const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))];
  const offenders = files.filter((file) =>
    /payment-provider|getPaymentProvider|initiatePayment/.test(fs.readFileSync(file, 'utf8'))
  ).map((file) => path.relative(root, file));

  assert.deepEqual(
    offenders,
    [],
    `no UI or route may call the payment provider while payments are unapproved: ${offenders.join(', ')}`,
  );
});
