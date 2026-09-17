/**
 * Interactive Onboarding Tour Regression Tests
 *
 * Verifies role-based step resolution, storage key formats, truthful copy,
 * and replay functionality for the interactive onboarding walkthrough.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

let lastDispatchedEvent = null;
const testWindow = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  dispatchEvent: (ev) => { lastDispatchedEvent = ev; },
  addEventListener: () => {},
  removeEventListener: () => {},
};

function loadModule(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    `(function(require, module, exports) { ${source}\n})`,
    {
      console,
      process,
      Buffer,
      URL,
      URLSearchParams,
      AbortSignal,
      fetch,
      window: testWindow,
      CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    }
  )(
    (name) => dependencies[name] || require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const mockReact = {
  useEffect: () => {},
  useState: (init) => [init, () => {}],
  useCallback: (fn) => fn,
  useRef: (init) => ({ current: init }),
  createElement: () => null,
  Fragment: 'div',
};

const tour = loadModule('components/onboarding-tour.tsx', {
  'next/navigation': { useRouter: () => ({ push() {} }), usePathname: () => '/home' },
  'react': mockReact,
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'div' },
  'lucide-react': {
    Sparkles: () => null,
    ChevronRight: () => null,
    ChevronLeft: () => null,
    X: () => null,
    Loader2: () => null,
    CheckCircle2: () => null,
  },
  '@/lib/client-session': {
    readAppSession: () => ({ id: 'usr_test_123', role: 'client' }),
    APP_SESSION_EVENT: 'app-session-event',
  },
});

test('user-scoped persistence keys use correct namespace prefix', () => {
  const userId = 'usr_test_456';
  assert.equal(tour.getOnboardingStorageKey(userId), 'styld:onboarding:v1:usr_test_456');
  assert.equal(tour.getOnboardingStepKey(userId), 'styld:onboarding_step:usr_test_456');
});

test('client role receives 7 structured onboarding steps', () => {
  const steps = tour.getStepsForRole('client');
  assert.equal(steps.length, 7);
  const expectedIds = ['welcome', 'discover', 'filters', 'providers', 'booking', 'activity', 'profile'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  // Step 1 is centered welcome
  assert.equal(steps[0].placement, 'center');

  // Discover and filter steps have routes and valid selectors
  assert.equal(steps[1].route, '/discover');
  assert.equal(steps[1].targetSelector, '[data-tour="discover-tabs"]');
  assert.equal(steps[2].targetSelector, '[data-tour="discover-filters"]');
  assert.equal(steps[3].targetSelector, '[data-tour="provider-card"]');
  assert.equal(steps[4].targetSelector, '[data-tour="book-service"]');
});

test('professional role receives 5 workspace steps', () => {
  const steps = tour.getStepsForRole('professional');
  assert.equal(steps.length, 5);
  const expectedIds = ['welcome-pro', 'pro-profile', 'pro-portfolio', 'pro-requests', 'pro-navigation'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].targetSelector, '[data-tour="pro-profile-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="pro-posts-tab"]');
  assert.equal(steps[3].targetSelector, '[data-tour="pro-requests-view"]');
  assert.equal(steps[4].targetSelector, '[data-tour="profile-nav"]');
});

test('salon role receives 5 team and hub management steps', () => {
  const steps = tour.getStepsForRole('salon');
  assert.equal(steps.length, 5);
  const expectedIds = ['welcome-salon', 'salon-profile', 'salon-team', 'salon-requests', 'salon-finish'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].targetSelector, '[data-tour="salon-profile-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="salon-team-tab"]');
  assert.equal(steps[3].targetSelector, '[data-tour="salon-requests-view"]');
  assert.equal(steps[4].targetSelector, '[data-tour="profile-nav"]');
});

test('onboarding copy maintains truthfulness and avoids fictional wallet/escrow claims', () => {
  const allSteps = [
    ...tour.getStepsForRole('client'),
    ...tour.getStepsForRole('professional'),
    ...tour.getStepsForRole('salon'),
  ];

  for (const step of allSteps) {
    const text = `${step.title} ${step.content}`.toLowerCase();
    assert.equal(text.includes('escrow'), false, `Step "${step.id}" must not claim escrow`);
    assert.equal(text.includes('wallet'), false, `Step "${step.id}" must not reference fictional wallet`);
    assert.ok(step.title.length > 3, `Step "${step.id}" has valid title`);
    assert.ok(step.content.length > 10, `Step "${step.id}" has descriptive content`);
  }
});

test('restartOnboardingTour broadcasts restart event', () => {
  assert.equal(tour.ONBOARDING_RESTART_EVENT, 'styld:restart-tour');
  lastDispatchedEvent = null;
  tour.restartOnboardingTour();
  assert.equal(lastDispatchedEvent?.type, 'styld:restart-tour');
});
