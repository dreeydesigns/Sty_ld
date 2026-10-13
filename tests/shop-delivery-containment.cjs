/**
 * T9 Shop and Delivery onboarding containment regression suite.
 *
 * Locks the containment rules while SHOP and DELIVERY are disabled:
 *
 *   1. onboarding flows no longer collect or persist sensitive identity
 *      or payout data (no inputs, no localStorage writes)
 *   2. no simulated verification controls ("Uploaded", fake ID checks)
 *   3. unavailable screens show honest "Coming soon" copy with no earnings,
 *      escrow, payout or verified-seller claims
 *   4. the two legacy draft keys are removed once, without clearing any
 *      other browser storage
 *   5. applications can never activate a workspace and features stay disabled
 *
 * Source-level assertions plus small module loads. No UI is executed.
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

// Strip line and block comments so assertions match rendered copy, not notes.
function stripped(file) {
  return source(file)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function load(file, dependencies = {}) {
  const compiled = ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, { console, process, Buffer, URL, URLSearchParams, AbortSignal, fetch })(
    (name) => dependencies[name] || require(name), module, module.exports,
  );
  return module.exports;
}

const shopOnboarding = stripped('components/shop-onboarding-flow.tsx');
const deliveryOnboarding = stripped('components/delivery-onboarding-flow.tsx');
const shopDashboard = stripped('components/shop-dashboard.tsx');
const deliveryDashboard = stripped('components/delivery-dashboard.tsx');
const cleanup = stripped('components/legacy-storage-cleanup.tsx');
const layout = stripped('app/layout.tsx');

const onboardingFiles = { shopOnboarding, deliveryOnboarding };
const dashboardFiles = { shopDashboard, deliveryDashboard };

test('onboarding flows collect no sensitive data and persist nothing', () => {
  const sensitive = [
    /nationalId/i,
    /kraPin/i,
    /KRA PIN/i,
    /businessReg/i,
    /mpesaNumber/i,
    /mpesaName/i,
    /vehicleType/i,
    /idFrontUploaded/i,
    /idBackUploaded/i,
    /licenseUploaded/i,
    /selectedZones/i,
    /national id/i,
  ];

  for (const [name, text] of Object.entries(onboardingFiles)) {
    assert.doesNotMatch(text, /<input/i, `${name} still renders a data-entry input`);
    assert.doesNotMatch(text, /<textarea/i, `${name} still renders a textarea`);
    assert.doesNotMatch(text, /localStorage/i, `${name} still touches local storage`);
    assert.doesNotMatch(text, /useState|useEffect/, `${name} still holds onboarding state`);
    for (const pattern of sensitive) {
      assert.doesNotMatch(text, pattern, `${name} still references ${pattern}`);
    }
  }
});

test('onboarding flows show no simulated verification controls', () => {
  for (const [name, text] of Object.entries(onboardingFiles)) {
    assert.doesNotMatch(text, /Upload/i, `${name} still shows an upload control`);
    assert.doesNotMatch(text, /Uploaded/i, `${name} still shows a fake upload success state`);
    assert.doesNotMatch(text, /CheckCircle2/i, `${name} still shows a verification tick`);
    assert.doesNotMatch(text, /application submitted/i, `${name} still claims submission`);
    assert.doesNotMatch(text, /under review/i, `${name} still claims review`);
    assert.doesNotMatch(text, /24\s*[-\u2013]?\s*48/, `${name} still promises an approval window`);
  }
});

test('onboarding flows state honestly that applications are not open', () => {
  for (const [name, text] of Object.entries(onboardingFiles)) {
    assert.match(text, /RoleComingSoon/, `${name} no longer uses the shared coming-soon screen`);
    assert.match(text, /Coming soon/i, `${name} is missing a coming-soon title`);
    assert.match(text, /not open yet/i, `${name} does not state that applications are closed`);
    assert.match(text, /not collecting/i, `${name} does not say no data is being collected`);
  }
});

test('shop and delivery dashboards show no unsupported operational claims', () => {
  const forbidden = [
    /\bescrow\b/i,
    /verified seller/i,
    /verified rider/i,
    /withdraw to m-?pesa/i,
    /pending escrow/i,
    /pending release/i,
    /releases on/i,
    /buyer details are only visible/i,
    /KES\s?[\d,]+/i,
  ];

  for (const [name, text] of Object.entries(dashboardFiles)) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${name} still claims: ${pattern}`);
    }
    assert.match(text, /Coming soon/i, `${name} is missing a coming-soon title`);
    assert.match(text, /not live yet/i, `${name} does not state the surface is unavailable`);
  }
});

test('legacy onboarding draft keys are removed without clearing other storage', () => {
  assert.match(cleanup, /shop_onboarding_draft/);
  assert.match(cleanup, /delivery_onboarding_draft/);
  assert.match(cleanup, /removeItem/);
  assert.doesNotMatch(cleanup, /\.clear\s*\(/, 'cleanup must not clear all of storage');
  assert.doesNotMatch(cleanup, /sessionStorage/i, 'cleanup must not touch session storage');
  assert.doesNotMatch(cleanup, /getItem/, 'cleanup must not read legacy values');
  assert.doesNotMatch(cleanup, /console\./, 'cleanup must not log legacy values');
});

test('legacy storage cleanup is mounted in the global layout', () => {
  assert.match(layout, /LegacyStorageCleanup/);
  assert.match(layout, /<LegacyStorageCleanup\s*\/>/);
});

test('shop and delivery features stay disabled and gated', () => {
  const flags = load('lib/feature-flags.ts');
  assert.equal(flags.FEATURES.SHOP, false);
  assert.equal(flags.FEATURES.DELIVERY, false);
  assert.equal(flags.ROUTE_FEATURE_GATES['/onboarding/shop'], 'SHOP');
  assert.equal(flags.ROUTE_FEATURE_GATES['/onboarding/delivery'], 'DELIVERY');
  assert.equal(flags.ROUTE_FEATURE_GATES['/dashboard/shop'], 'SHOP');
  assert.equal(flags.ROUTE_FEATURE_GATES['/dashboard/delivery'], 'DELIVERY');
});

test('submitting an application cannot activate a shop or delivery workspace', () => {
  const policy = load('lib/workspace-policy.ts');
  assert.equal(policy.workspaceAvailable('shop'), false);
  assert.equal(policy.workspaceAvailable('delivery'), false);
  assert.equal(policy.workspaceAvailable('client'), true);
  assert.equal(policy.workspaceAvailable('professional'), true);
  assert.equal(policy.workspaceAvailable('salon'), true);
});

test('onboarding and dashboard page metadata make no promises', () => {
  const pages = {
    shopOnboarding: stripped('app/onboarding/shop/page.tsx'),
    deliveryOnboarding: stripped('app/onboarding/delivery/page.tsx'),
    shopDashboard: stripped('app/dashboard/shop/page.tsx'),
    deliveryDashboard: stripped('app/dashboard/delivery/page.tsx'),
  };

  for (const [name, text] of Object.entries(pages)) {
    assert.match(text, /Coming soon/i, `${name} metadata is not marked coming soon`);
    assert.doesNotMatch(text, /verified sellers only/i, `${name} metadata still claims verified sellers`);
    assert.doesNotMatch(text, /earnings/i, `${name} metadata still promises earnings`);
  }
});
