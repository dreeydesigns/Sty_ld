/**
 * Plan draft persistence regressions.
 *
 * A shopper must keep the same selected services and estimate while browsing
 * Discover, provider pages or other tabs. The draft is browser-tab scoped,
 * versioned and only ever stores sanitized service ids plus a validated
 * provider context key. Prices always come from the catalogue.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const { MAX_PLAN_SERVICES, matchesPlanServiceIds, planServicePool, summarizePlanSelection } = require('../lib/plan-offer.cjs');
const { sanitizePlanContext, resolvePlanContext } = require('../lib/plan-context.cjs');

function loadTs(file, deps = {}) {
  const full = path.join(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const moduleRequire = (name) => {
    if (name in deps) return deps[name];
    if (name.startsWith('./') || name.startsWith('../')) {
      return require(path.join(path.dirname(full), name));
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(moduleRequire, module, module.exports);
  return module.exports;
}

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function createStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    readAll: () => Object.fromEntries(map),
  };
}

const draft = loadTs('lib/plan-draft.ts');
const catalogue = loadTs('lib/site-data.ts');
const flags = loadTs('lib/feature-flags.ts');
const planSource = readSource('components/appointment-planning.tsx');
const discoverSource = readSource('components/discover-content.tsx');

const SCOPE = 'user:client-1:default';
const SERVICE_IDS = ['knotless-braids', 'gel-manicure'];
const ALL_IDS = catalogue.services.map((service) => service.id);

function makeAllowed(services) {
  return services.map((service) => service.id);
}

test('selected services persist across a page visit and a refresh', () => {
  const storage = createStorage();
  draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, storage);
  assert.deepEqual(draft.readPlanDraft(SCOPE, 'general', storage), SERVICE_IDS);

  const reloaded = createStorage(storage.readAll());
  assert.deepEqual(draft.readPlanDraft(SCOPE, 'general', reloaded), SERVICE_IDS);

  const stored = storage.readAll()[draft.PLAN_DRAFT_STORAGE_KEY];
  assert.match(stored, /knotless-braids/);
  assert.doesNotMatch(stored, /minPrice|maxPrice|durationMin|durationMax|price/i);
});

test('estimate totals and duration are recalculated from the catalogue', () => {
  const storage = createStorage();
  draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, storage);
  const restored = draft.readPlanDraft(SCOPE, 'general', storage);
  const selection = draft.choosePlanServiceIds({
    explicit: false,
    draftIds: restored,
    allowedIds: ALL_IDS,
    allowDraft: true,
  });
  assert.equal(selection.source, 'draft');

  const selected = selection.serviceIds.map((id) => catalogue.services.find((service) => service.id === id));
  assert.equal(selected.length, 2);
  const estimate = summarizePlanSelection(selected);
  const expected = selected.reduce(
    (total, service) => ({
      minTotal: total.minTotal + service.minPrice,
      maxTotal: total.maxTotal + service.maxPrice,
      durationMin: total.durationMin + service.durationMin,
      durationMax: total.durationMax + service.durationMax,
    }),
    { minTotal: 0, maxTotal: 0, durationMin: 0, durationMax: 0 },
  );
  assert.equal(estimate.count, 2);
  assert.equal(estimate.minTotal, expected.minTotal);
  assert.equal(estimate.maxTotal, expected.maxTotal);
  assert.equal(estimate.durationMin, expected.durationMin);
  assert.equal(estimate.durationMax, expected.durationMax);
});

test('back and forward navigation keeps general and provider drafts separate', () => {
  const storage = createStorage();
  const providerKey = draft.planContextKey({ mode: 'provider', targetType: 'salons', targetId: 'kilimani-texture-house' });
  assert.equal(providerKey, 'provider:salons:kilimani-texture-house');

  draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, storage);
  draft.writePlanDraft(SCOPE, providerKey, ['knotless-braids'], storage);

  assert.deepEqual(draft.readPlanDraft(SCOPE, 'general', storage), SERVICE_IDS);
  assert.deepEqual(draft.readPlanDraft(SCOPE, providerKey, storage), ['knotless-braids']);

  draft.clearPlanDraft(SCOPE, providerKey, storage);
  assert.equal(draft.readPlanDraft(SCOPE, providerKey, storage), null);
  assert.deepEqual(draft.readPlanDraft(SCOPE, 'general', storage), SERVICE_IDS);
});

test('an explicit valid URL selection overrides an older stored draft', () => {
  const selection = draft.choosePlanServiceIds({
    explicit: true,
    explicitIds: ['knotless-braids'],
    draftIds: SERVICE_IDS,
    allowedIds: ALL_IDS,
    allowDraft: true,
  });
  assert.deepEqual(selection.serviceIds, ['knotless-braids']);
  assert.equal(selection.source, 'url');
});

test('an invalid explicit provider fails closed and never restores storage', () => {
  const context = sanitizePlanContext({
    targetType: 'professionals',
    targetId: 'missing-provider',
    serviceIds: 'knotless-braids',
  });
  assert.equal(context.mode, 'provider');
  const resolved = resolvePlanContext(context, catalogue);
  assert.equal(resolved.mode, 'invalid');
  assert.deepEqual(resolved.services, []);

  const selection = draft.choosePlanServiceIds({
    explicit: false,
    draftIds: SERVICE_IDS,
    allowedIds: [],
    allowDraft: false,
  });
  assert.deepEqual(selection.serviceIds, []);
  assert.ok(
    planSource.indexOf('if (mode === "invalid")') < planSource.indexOf('readPlanDraft(draftScope'),
    'invalid provider branch must run before any stored draft is read',
  );
});

test('a provider plan never shows services the provider does not offer', () => {
  const salon = catalogue.salons.find((item) => item.slug === 'kilimani-texture-house');
  assert.ok(salon);
  const pool = planServicePool('provider', salon, catalogue.services);
  const allowed = makeAllowed(pool);
  const unrelated = catalogue.services.find((service) => !salon.serviceIds.includes(service.id));
  assert.ok(unrelated);

  const selection = draft.choosePlanServiceIds({
    explicit: true,
    explicitIds: [pool[0].id, unrelated.id],
    allowedIds: allowed,
    allowDraft: false,
  });
  assert.deepEqual(selection.serviceIds, [pool[0].id]);

  const restored = draft.choosePlanServiceIds({
    explicit: false,
    draftIds: [pool[0].id, unrelated.id],
    allowedIds: allowed,
    allowDraft: true,
  });
  assert.deepEqual(restored.serviceIds, [pool[0].id]);
});

test('a general draft survives browsing a specific provider', () => {
  const storage = createStorage();
  const providerKey = draft.planContextKey({ mode: 'provider', targetType: 'professionals', targetId: 'faith-odhiambo' });
  draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, storage);
  draft.writePlanDraft(SCOPE, providerKey, ['makeup-soft-glam'], storage);
  draft.clearPlanDraft(SCOPE, providerKey, storage);
  assert.deepEqual(draft.readPlanDraft(SCOPE, 'general', storage), SERVICE_IDS);
});

test('clear plan removes persisted drafts and rebuilds a clean plan URL', () => {
  const storage = createStorage();
  draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, storage);
  draft.writePlanDraft(SCOPE, 'provider:salons:kilimani-texture-house', ['knotless-braids'], storage);
  draft.clearPlanScope(SCOPE, storage);
  assert.equal(draft.readPlanDraft(SCOPE, 'general', storage), null);
  assert.equal(draft.readPlanDraft(SCOPE, 'provider:salons:kilimani-texture-house', storage), null);
  assert.deepEqual(storage.readAll(), {});

  assert.equal(draft.buildPlanHref({}), '/book');
  assert.equal(draft.buildPlanHref({ serviceIds: SERVICE_IDS }), '/book?serviceIds=knotless-braids%2Cgel-manicure');
  assert.match(
    draft.buildPlanHref({ serviceIds: ['knotless-braids'], targetType: 'salons', targetId: 'kilimani-texture-house' }),
    /^\/book\?targetType=salons&targetId=kilimani-texture-house&serviceIds=knotless-braids$/,
  );
  assert.equal(draft.buildPlanHref({ targetType: 'evil', targetId: 'kilimani-texture-house' }), '/book');

  assert.match(planSource, /Clear plan/);
  assert.match(planSource, /edit\(emptyPlanFields\(\)\)/);
  assert.doesNotMatch(planSource, /clearPlanScope\(draftScope\)/);
});

test('missing, malformed or unavailable storage fails safely', () => {
  const empty = createStorage();
  assert.equal(draft.readPlanDraft(SCOPE, 'general', empty), null);

  const corrupt = createStorage({ [draft.PLAN_DRAFT_STORAGE_KEY]: '{not json' });
  assert.equal(draft.readPlanDraft(SCOPE, 'general', corrupt), null);

  const oldVersion = createStorage({
    [draft.PLAN_DRAFT_STORAGE_KEY]: JSON.stringify({ version: 0, scopes: { [SCOPE]: { general: { serviceIds: SERVICE_IDS } } } }),
  });
  assert.equal(draft.readPlanDraft(SCOPE, 'general', oldVersion), null);

  const malformedShape = createStorage({
    [draft.PLAN_DRAFT_STORAGE_KEY]: JSON.stringify({ version: 1, scopes: [] }),
  });
  assert.equal(draft.readPlanDraft(SCOPE, 'general', malformedShape), null);

  const unsafeContext = createStorage({
    [draft.PLAN_DRAFT_STORAGE_KEY]: JSON.stringify({
      version: 1,
      scopes: { [SCOPE]: { '../../etc/passwd': { serviceIds: SERVICE_IDS, updatedAt: 1 } } },
    }),
  });
  assert.equal(draft.readPlanDraft(SCOPE, '../../etc/passwd', unsafeContext), null);

  const throwing = {
    getItem() {
      throw new Error('storage unavailable');
    },
    setItem() {
      throw new Error('storage full');
    },
    removeItem() {
      throw new Error('storage unavailable');
    },
  };
  assert.equal(draft.readPlanDraft(SCOPE, 'general', throwing), null);
  assert.doesNotThrow(() => draft.writePlanDraft(SCOPE, 'general', SERVICE_IDS, throwing));
  assert.doesNotThrow(() => draft.clearPlanDraft(SCOPE, 'general', throwing));
  assert.doesNotThrow(() => draft.clearPlanScope(SCOPE, throwing));
});

test('draft service ids stay sanitized, unique and capped', () => {
  const storage = createStorage();
  const many = Array.from({ length: MAX_PLAN_SERVICES + 4 }, (_, index) => `service-${index}`);
  const written = draft.writePlanDraft(SCOPE, 'general', [...many, many[0], 42, '', 'bad id'], storage);
  assert.equal(written.length, MAX_PLAN_SERVICES);
  assert.equal(new Set(written).size, MAX_PLAN_SERVICES);
  assert.deepEqual(written, many.slice(0, MAX_PLAN_SERVICES));

  const badOnly = draft.writePlanDraft(SCOPE, 'general', [null, '', 'bad id', 'a'.repeat(80)], storage);
  assert.deepEqual(badOnly, []);
  assert.equal(draft.readPlanDraft(SCOPE, 'general', storage), null);
});

test('account switching and guest browsing never share a draft', () => {
  const storage = createStorage();
  draft.writePlanDraft('user:client-a:default', 'general', SERVICE_IDS, storage);

  assert.equal(draft.readPlanDraft('user:client-b:default', 'general', storage), null);
  assert.equal(draft.readPlanDraft('guest', 'general', storage), null);

  assert.equal(draft.planDraftScope({ id: 'client-a', role: 'client' }, true), 'user:client-a:default');
  assert.equal(
    draft.planDraftScope({ id: 'client-a', role: 'client', workspaceId: 'workspace-2' }, true),
    'user:client-a:workspace-2',
  );
  assert.equal(draft.planDraftScope({ id: 'guest_123', role: 'guest' }, true), 'guest');
  assert.equal(draft.planDraftScope(null, false), null);
  assert.equal(draft.planDraftScope(null, true), 'guest');
});

test('stored context entries are bounded to the most recent plans', () => {
  const storage = createStorage();
  for (let index = 0; index < draft.MAX_PLAN_DRAFT_CONTEXTS + 3; index += 1) {
    draft.writePlanDraft(
      SCOPE,
      `provider:professionals:provider-${index}`,
      [`service-${index}`],
      storage,
      1000 + index,
    );
  }
  assert.equal(draft.readPlanDraft(SCOPE, 'provider:professionals:provider-0', storage), null);
  assert.deepEqual(
    draft.readPlanDraft(SCOPE, `provider:professionals:provider-${draft.MAX_PLAN_DRAFT_CONTEXTS + 2}`, storage),
    [`service-${draft.MAX_PLAN_DRAFT_CONTEXTS + 2}`],
  );
});

test('matchesPlanServiceIds intersects plan services without inventing matches', () => {
  assert.equal(matchesPlanServiceIds(['knotless-braids', 'gel-manicure'], ['gel-manicure']), true);
  assert.equal(matchesPlanServiceIds(['knotless-braids'], ['gel-manicure']), false);
  assert.equal(matchesPlanServiceIds([], ['gel-manicure']), false);
  assert.equal(matchesPlanServiceIds(['knotless-braids'], []), false);
});

test('the plan page shares the full selection and Discover offers a return path', () => {
  assert.doesNotMatch(planSource, /selectedServices\[0\]\.id/);
  assert.match(planSource, /exploreParams\.set\("serviceIds", draft\.serviceIds\.join\(","\)\)/);
  assert.doesNotMatch(discoverSource, /q=\$\{encodeURIComponent\(selectedServices/);
  assert.match(discoverSource, /planServiceIds/);
  assert.match(discoverSource, /matchesPlanServiceIds/);
  assert.match(discoverSource, /buildPlanHref/);
  assert.match(discoverSource, /Back to your plan/);
  assert.match(discoverSource, /Return to your plan/);
});

test('restored selections cannot be overwritten by an empty first render', () => {
  assert.match(planSource, /state\.loadedQuery !== query/);
  assert.match(planSource, /data\.plan\.revision === 0/);
});

test('no booking, payment or checkout behaviour is activated', () => {
  assert.equal(flags.FEATURES.BOOKING_COMMITMENTS, false);
  assert.equal(flags.FEATURES.PAYMENTS_LIVE, false);
  assert.doesNotMatch(planSource, /\/api\/bookings|\/api\/payments|payment_status/);
  assert.match(planSource, /Preview only\. Prices are estimates\. Booking is not available yet\./);
});
