/**
 * T7B1 Counter trust integrity suite.
 *
 * Counter shopping, payment and delivery are not live yet. This suite locks
 * the rule that the Counter surfaces never present fabricated reviews,
 * ratings, review counts, verified-seller or verified-buyer badges, rider
 * verification, or live escrow/payment/delivery promises, and that the cart
 * does not fake a completed transaction.
 *
 *   1. no fabricated reviews, ratings or verification badges on product detail
 *   2. no fabricated social proof, escrow or verification copy in CounterUI
 *   3. the cart offers no checkout, escrow or order-confirmation state
 *   4. disabled surfaces stay disabled
 *   5. Counter subroutes stay contained behind the /counter redirect
 *   6. legitimate product display information is preserved
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

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

test('product detail shows no fabricated reviews, ratings or verification', () => {
  const detail = stripped('components/counter-product-detail.tsx');

  assert.doesNotMatch(detail, /shopVerified/);
  assert.doesNotMatch(detail, /reviewCount/);
  assert.doesNotMatch(detail, /rating:/);
  assert.doesNotMatch(detail, /reviews:\s*\[/);
  assert.doesNotMatch(detail, /verified/i);
  assert.doesNotMatch(detail, /Verified buyer/);
  assert.doesNotMatch(detail, /Top Seller/);
  assert.doesNotMatch(detail, /Verified Brand/);
  assert.doesNotMatch(detail, /escrow/i);
  assert.doesNotMatch(detail, /StarBreakdown/);
  assert.doesNotMatch(detail, /As described/);
  assert.doesNotMatch(detail, /useCartStore/);

  assert.match(detail, /Ordering coming soon/);
  assert.match(detail, /Reviews are not available yet/);
});

test('CounterUI carries no fabricated social proof, escrow or verification copy', () => {
  const ui = stripped('components/counter-ui.tsx');

  assert.doesNotMatch(ui, /Verified sellers/);
  assert.doesNotMatch(ui, /Verified Brand/);
  assert.doesNotMatch(ui, /Top Seller/);
  assert.doesNotMatch(ui, /Escrow/);
  assert.doesNotMatch(ui, /escrow/);
  assert.doesNotMatch(ui, /verified delivery partners/);
  assert.doesNotMatch(ui, /reviewCount/);
  assert.doesNotMatch(ui, /rating:/);
  assert.doesNotMatch(ui, /verified:/i);
  assert.doesNotMatch(ui, /Star\b/);

  assert.match(ui, /Preview only/);
  assert.match(ui, /Ordering coming soon/);
  assert.match(ui, /Delivery coming soon/);
});

test('the cart presents no checkout, escrow or order-confirmation state', () => {
  const cart = stripped('app/counter/cart/page.tsx');

  assert.doesNotMatch(cart, /escrow/i);
  assert.doesNotMatch(cart, /verified Styld partners/);
  assert.doesNotMatch(cart, /Order confirmed/);
  assert.doesNotMatch(cart, /Held in escrow/);
  assert.doesNotMatch(cart, /MOCK_RIDERS/);
  assert.doesNotMatch(cart, /trips/);
  assert.doesNotMatch(cart, /StepPay/);
  assert.doesNotMatch(cart, /StepDelivery/);
  assert.doesNotMatch(cart, /Math\.random\(\)\.toString/);
  assert.doesNotMatch(cart, /openGuestGate/);

  assert.match(cart, /Ordering coming soon/);
});

test('no Counter surface fabricates a verified flag', () => {
  for (const file of [
    'components/counter-product-detail.tsx',
    'components/counter-ui.tsx',
    'app/counter/cart/page.tsx',
  ]) {
    assert.doesNotMatch(stripped(file), /verified:\s*true/, `${file} must not invent verification`);
  }
});

test('disabled surfaces stay disabled', () => {
  const flags = load('lib/feature-flags.ts');
  assert.equal(flags.FEATURES.COUNTER, true);
  assert.equal(flags.FEATURES.SHOP, false);
  assert.equal(flags.FEATURES.DELIVERY, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.equal(flags.ROUTE_FEATURE_GATES['/counter'], 'COUNTER');
});

test('Counter subroutes stay contained behind the /counter redirect', () => {
  const middleware = stripped('middleware.ts');
  assert.match(middleware, /path\.startsWith\('\/counter\/'\)/);
  assert.match(middleware, /redirect\(new URL\('\/counter',request\.url\)\)/);
});

test('legitimate product display information is preserved', () => {
  const detail = stripped('components/counter-product-detail.tsx');
  assert.match(detail, /const PRODUCTS = \[/);
  assert.match(detail, /name: /);
  assert.match(detail, /brand: /);
  assert.match(detail, /price: /);
  assert.match(detail, /images: \[/);
  assert.match(detail, /relatedIds: \[/);
  assert.match(detail, /formatKES\(product\.price\)/);

  const ui = stripped('components/counter-ui.tsx');
  assert.match(ui, /const placeholderProducts: Product\[\]/);
  assert.match(ui, /formatKES\(product\.price\)/);
});

test('the provider verification interface still rejects unsupported claims', () => {
  const verification = load('lib/verification.ts');
  assert.equal(verification.hasVerificationEvidence(true), false);
  assert.equal(verification.hasVerificationEvidence({ verified: true }), false);
  assert.equal(verification.resolveProviderVerification({ slug: 'beauty-base-ke' }), null);
});
