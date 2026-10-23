const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const {
  MAX_PLAN_SERVICES,
  planServicePool,
  serviceCategoriesFor,
  filterServicesByCategory,
  toggleServiceSelection,
  summarizePlanSelection,
} = require('../lib/plan-offer.cjs');
const { isValidReturnDestination } = require('../lib/plan-context.cjs');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    `(function(require,module,exports){${code}\n})`,
    { console, process, Buffer, Date, URL, Response, Headers, crypto: require('node:crypto').webcrypto },
  )((name) => (name in deps ? deps[name] : require(name)), module, module.exports);
  return module.exports;
}

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

const planSource = readSource('components/appointment-planning.tsx');
const catalogue = load('lib/site-data.ts');

test('plan page no longer links to the development-only auth preview', () => {
  assert.doesNotMatch(planSource, /\/auth\/preview/);
  assert.match(planSource, /data-tour="planning-header"/);
});

test('auth preview stays closed outside development', () => {
  const preview = readSource('app/auth/preview/page.tsx');
  assert.match(preview, /notFound\(\)/);
  assert.match(preview, /NODE_ENV !== 'development'/);
});

test('plan offers exactly one optional sign-in that uses the canonical route', () => {
  const signInLinks = planSource.match(/\/auth\/sign-in/g) ?? [];
  assert.equal(signInLinks.length, 1);
  assert.match(planSource, /href="\/auth\/sign-in\?returnTo=%2Fbook"/);
  assert.doesNotMatch(planSource, /openGuestGate|GUEST_GATE/);
  assert.doesNotMatch(planSource, /from "@\/lib\/guest-session"/);
});

test('sign-in return path to the plan stays internal and loop free', () => {
  const policy = load('lib/auth-policy.ts');
  assert.equal(policy.safeReturnTo('/book'), '/book');
  assert.equal(policy.safeReturnTo('https://evil.example/book'), '/home');
  assert.equal(policy.safeReturnTo('//evil.example/book'), '/home');
  assert.equal(policy.safeReturnTo('/auth/sign-in'), '/home');
  assert.equal(isValidReturnDestination('/book'), true);
  assert.equal(isValidReturnDestination('https://evil.example'), false);
});

test('planning does not require authentication or redirect guests', () => {
  assert.doesNotMatch(planSource, /router\.(replace|push)\(/);
  assert.doesNotMatch(planSource, /redirect\(/);
  assert.match(planSource, /allowedRoles=\{\["guest"/);
});

test('plan copy stays short, plain and honest', () => {
  assert.match(planSource, /Plan your beauty visit/);
  assert.match(planSource, /Choose a service and see an estimate\./);
  assert.match(planSource, />\s*Choose a service\s*</);
  assert.match(planSource, />\s*Your estimate\s*</);
  assert.match(planSource, />\s*See my estimate\s*</);
  assert.match(planSource, /Pick a service to see an estimate\./);
  assert.match(planSource, /Preview only\. Prices are estimates\. Booking is not available yet\./);
  assert.match(readSource('lib/plan-repository.ts'), /not offered by the selected creator/);
  assert.doesNotMatch(
    planSource,
    /BOOKING_COMMITMENTS|Selected planning context|Contextual sign-in|valid account preview|Catalogue estimate|not verified live/,
  );
});

test('interactive selection updates the estimate from real catalogue values', () => {
  const service = catalogue.services.find((item) => item.id === 'knotless-braids');
  assert.ok(service, 'catalogue service knotless-braids exists');
  const pool = planServicePool('general', null, catalogue.services);
  assert.ok(pool.length > 1);
  const single = toggleServiceSelection([], service.id);
  assert.deepEqual(single, [service.id]);
  const estimate = summarizePlanSelection(single.map((id) => pool.find((item) => item.id === id)));
  assert.equal(estimate.count, 1);
  assert.equal(estimate.minTotal, service.minPrice);
  assert.equal(estimate.maxTotal, service.maxPrice);
  assert.equal(estimate.durationMin, service.durationMin);
  assert.equal(estimate.durationMax, service.durationMax);
  assert.deepEqual(toggleServiceSelection(single, service.id), []);
  assert.equal(summarizePlanSelection([]), null);
});

test('no service is pre-selected or added automatically', () => {
  assert.match(planSource, /if \(empty\) planClient\.edit\(next\)/);
  assert.doesNotMatch(planSource, /setSelectedIds\(servicePool\)/);
  assert.doesNotMatch(planSource, /setSelectedIds\(services\)/);
  assert.equal(toggleServiceSelection([], '').length, 0);
});

test('category filtering follows catalogue categories only', () => {
  const pool = planServicePool('general', null, catalogue.services);
  const categories = serviceCategoriesFor(pool);
  assert.ok(categories.length > 0);
  assert.equal(new Set(categories).size, categories.length);
  const firstCategory = categories[0];
  const filtered = filterServicesByCategory(pool, firstCategory);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((service) => service.category === firstCategory));
  assert.equal(filterServicesByCategory(pool, 'All').length, pool.length);
});

test('a resolved provider binds the offer to that provider only', () => {
  const salon = catalogue.salons[0];
  assert.ok(salon, 'catalogue salon exists');
  const pool = planServicePool('provider', salon, catalogue.services);
  const expected = catalogue.services.filter((service) => salon.serviceIds.includes(service.id));
  assert.deepEqual(pool.map((service) => service.id), expected.map((service) => service.id));
  assert.ok(pool.length > 0);
});

test('invalid or unresolved provider input exposes no unrelated services', () => {
  const salon = catalogue.salons[0];
  assert.equal(planServicePool('invalid', salon, catalogue.services).length, 0);
  assert.equal(planServicePool('provider', null, catalogue.services).length, 0);
  const stranger = { slug: 'not-a-provider', serviceIds: ['not-a-real-service'] };
  assert.equal(planServicePool('provider', stranger, catalogue.services).length, 0);
});

test('selection stays bounded and never duplicates an entry', () => {
  let selected = [];
  for (let index = 0; index < MAX_PLAN_SERVICES + 3; index += 1) {
    selected = toggleServiceSelection(selected, `service-${index}`);
  }
  assert.equal(selected.length, MAX_PLAN_SERVICES);
  const removed = toggleServiceSelection(selected, `service-0`);
  assert.equal(removed.includes('service-0'), false);
  assert.equal(removed.length, MAX_PLAN_SERVICES - 1);
});
