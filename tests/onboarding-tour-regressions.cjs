/**
 * Interactive Onboarding Tour Regression Tests
 *
 * Verifies role-based step resolution, truthful copy, responsive placement,
 * route handling, controls, and replay functionality.
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

const layout = loadModule('lib/onboarding-tour-layout.ts');

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
  '@/lib/onboarding-tour-layout': layout,
});

const tourSource = fs.readFileSync(
  path.join(__dirname, '..', 'components/onboarding-tour.tsx'),
  'utf8'
);
const discoverSource = fs.readFileSync(
  path.join(__dirname, '..', 'app/discover/page.tsx'),
  'utf8'
);
const marketplaceSource = fs.readFileSync(
  path.join(__dirname, '..', 'components/marketplace-ui.tsx'),
  'utf8'
);
const tourTargetSources = [
  discoverSource,
  marketplaceSource,
  fs.readFileSync(
    path.join(__dirname, '..', 'components/role-profile-workspace.tsx'),
    'utf8'
  ),
].join('\n');

function rect(top, left, width, height) {
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };
}

function cardRect(result) {
  const top = Number(result.style.top);
  const left = Number(result.style.left);
  const width = Number(result.style.width);
  return {
    top,
    left,
    width,
    bottom: top + 320,
    right: left + width,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test('user-scoped persistence keys use correct namespace prefix', () => {
  const userId = 'usr_test_456';
  assert.equal(tour.getOnboardingStorageKey(userId), 'styld:onboarding:v1:usr_test_456');
  assert.equal(tour.getOnboardingStepKey(userId), 'styld:onboarding_step:usr_test_456');
});

test('completed and skipped tours stay dismissed until replay', () => {
  assert.equal(tour.isOnboardingDismissed('completed'), true);
  assert.equal(tour.isOnboardingDismissed('skipped'), true);
  assert.equal(tour.isOnboardingDismissed(null), false);
  assert.equal(tour.isOnboardingDismissed('in_progress'), false);
});

test('client role receives 7 truthful onboarding steps', () => {
  const steps = tour.getStepsForRole('client');
  assert.equal(steps.length, 7);
  const expectedIds = ['welcome', 'discover', 'filters', 'providers', 'booking', 'home', 'profile'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/discover');
  assert.equal(steps[1].targetSelector, '[data-tour="discover-tabs"]');
  assert.equal(steps[2].targetSelector, '[data-tour="discover-filters"]');
  assert.equal(steps[3].route, '/discover?tab=salons');
  assert.equal(steps[3].targetSelector, '[data-tour="provider-card"]');
  assert.equal(steps[4].placement, 'center');
  assert.equal(steps[4].targetSelector, undefined);
  assert.equal(steps[5].route, '/home');
  assert.equal(steps[5].targetSelector, '[data-tour="home-nav"]');
  assert.equal(steps[6].route, '/home');
  assert.equal(steps[6].targetSelector, '[data-tour="profile-nav"]');
});

test('professional role receives 5 workspace steps with valid routes', () => {
  const steps = tour.getStepsForRole('professional');
  assert.equal(steps.length, 5);
  const expectedIds = ['welcome-pro', 'pro-profile', 'pro-portfolio', 'pro-requests', 'pro-navigation'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/profile');
  assert.equal(steps[1].targetSelector, '[data-tour="pro-profile-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="pro-posts-tab"]');
  assert.equal(steps[3].route, '/profile?tab=requests');
  assert.equal(steps[3].targetSelector, '[data-tour="pro-requests-view"]');
  assert.equal(steps[4].route, '/profile');
  assert.equal(steps[4].targetSelector, '[data-tour="profile-nav"]');
});

test('salon role receives 5 team and hub management steps with valid routes', () => {
  const steps = tour.getStepsForRole('salon');
  assert.equal(steps.length, 5);
  const expectedIds = ['welcome-salon', 'salon-profile', 'salon-team', 'salon-requests', 'salon-finish'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/profile');
  assert.equal(steps[1].targetSelector, '[data-tour="salon-profile-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="salon-team-tab"]');
  assert.equal(steps[3].route, '/profile?tab=requests');
  assert.equal(steps[3].targetSelector, '[data-tour="salon-requests-view"]');
  assert.equal(steps[4].route, '/profile');
  assert.equal(steps[4].targetSelector, '[data-tour="profile-nav"]');
});

test('every anchored step points at an existing tour target', () => {
  const allSteps = [
    ...tour.getStepsForRole('client'),
    ...tour.getStepsForRole('professional'),
    ...tour.getStepsForRole('salon'),
  ];
  const selectors = allSteps
    .map((step) => step.targetSelector)
    .filter(Boolean);

  for (const selector of selectors) {
    const match = selector.match(/^\[data-tour="([a-z0-9-]+)"\]$/);
    assert.ok(match, `Invalid target selector: ${selector}`);
    assert.ok(
      tourTargetSources.includes(`"${match[1]}"`),
      `Missing target attribute for ${match[1]}`
    );
  }
});

test('mobile headers expose home and profile tour targets', () => {
  assert.ok(
    marketplaceSource.includes('href="/home" data-tour="home-nav"'),
    'Mobile home target is missing from the header brand link'
  );

  const mobileHeaderStart = marketplaceSource.indexOf(
    'className="ml-auto flex items-center gap-2 lg:hidden"'
  );
  assert.ok(mobileHeaderStart >= 0, 'Mobile header block was not found');
  const mobileHeaderEnd = marketplaceSource.indexOf('</header>', mobileHeaderStart);
  const mobileHeader = marketplaceSource.slice(mobileHeaderStart, mobileHeaderEnd);

  assert.ok(
    mobileHeader.includes('data-tour="profile-nav"'),
    'Mobile profile target is missing from the header avatar link'
  );
});

test('layout stays usable across the agreed viewports', () => {
  const cases = [
    { viewport: { width: 320, height: 568 }, target: rect(90, 16, 288, 44), mode: 'sheet' },
    { viewport: { width: 375, height: 667 }, target: rect(90, 16, 343, 44), mode: 'sheet' },
    { viewport: { width: 390, height: 844 }, target: rect(100, 16, 358, 44), mode: 'sheet' },
    { viewport: { width: 768, height: 1024 }, target: rect(120, 24, 720, 48), mode: 'anchored' },
    { viewport: { width: 1024, height: 768 }, target: rect(140, 80, 220, 44), mode: 'anchored' },
    { viewport: { width: 1366, height: 768 }, target: rect(300, 500, 240, 44), mode: 'anchored' },
  ];

  for (const { viewport, target, mode } of cases) {
    const result = layout.computeTourGuideLayout({
      targetRect: target,
      viewport,
      cardWidth: 420,
      cardHeight: 320,
      preferredPlacement: 'bottom',
    });

    assert.equal(result.mode, mode, `${viewport.width}x${viewport.height} mode`);
    if (result.mode === 'anchored') {
      assert.equal(result.spotlight, true);
      const card = cardRect(result);
      assert.ok(card.left >= 12, `${viewport.width}x${viewport.height} left bound`);
      assert.ok(card.right <= viewport.width - 12, `${viewport.width}x${viewport.height} right bound`);
      assert.ok(card.top >= 12, `${viewport.width}x${viewport.height} top bound`);
      assert.ok(card.bottom <= viewport.height - 12, `${viewport.width}x${viewport.height} bottom bound`);
      assert.equal(overlaps(card, target), false, `${viewport.width}x${viewport.height} overlap`);
    }
  }
});

test('onboarding copy does not claim disabled or unverified functionality', () => {
  const allSteps = [
    ...tour.getStepsForRole('client'),
    ...tour.getStepsForRole('professional'),
    ...tour.getStepsForRole('salon'),
  ];

  for (const step of allSteps) {
    const text = `${step.title} ${step.content}`.toLowerCase();
    assert.equal(text.includes('escrow'), false, `Step "${step.id}" must not claim escrow`);
    assert.equal(text.includes('wallet'), false, `Step "${step.id}" must not reference a wallet`);
    assert.equal(text.includes('authentic'), false, `Step "${step.id}" must not claim authentic ratings`);
    assert.equal(text.includes('vetted'), false, `Step "${step.id}" must not claim vetted providers`);
    assert.equal(text.includes('verified'), false, `Step "${step.id}" must not claim verification`);
    assert.equal(text.includes('commission rates'), false, `Step "${step.id}" must not promise commissions`);
    assert.equal(text.includes('ready for business'), false, `Step "${step.id}" must not promise live operations`);
    assert.equal(text.includes('upcoming appointments'), false, `Step "${step.id}" must not promise appointment tracking`);
    assert.ok(step.title.length > 3, `Step "${step.id}" has valid title`);
    assert.ok(step.content.length > 10, `Step "${step.id}" has descriptive content`);
  }

  const clientSteps = tour.getStepsForRole('client');
  assert.match(clientSteps[4].content, /not live yet/i);
  assert.match(clientSteps[4].content, /nothing is confirmed or charged/i);

  const proSteps = tour.getStepsForRole('professional');
  assert.match(proSteps[3].content, /not live yet/i);

  const salonSteps = tour.getStepsForRole('salon');
  assert.match(salonSteps[2].content, /not live yet/i);
  assert.match(salonSteps[3].content, /not live yet/i);
});

test('desktop layout anchors the card beside the target inside the viewport', () => {
  const viewport = { width: 1366, height: 768 };
  const target = rect(100, 500, 240, 44);
  const result = layout.computeTourGuideLayout({
    targetRect: target,
    viewport,
    cardWidth: 420,
    cardHeight: 320,
    preferredPlacement: 'bottom',
  });

  assert.equal(result.mode, 'anchored');
  assert.equal(result.spotlight, true);
  assert.equal(result.side, 'bottom');

  const card = cardRect(result);
  assert.ok(card.left >= 12, 'card stays inside the left edge');
  assert.ok(card.right <= viewport.width - 12, 'card stays inside the right edge');
  assert.ok(card.top >= 12, 'card stays below the top edge');
  assert.ok(card.bottom <= viewport.height - 12, 'card stays above the bottom edge');
  assert.equal(overlaps(card, target), false, 'card must not cover the target');
});

test('desktop layout falls back to the side with usable space', () => {
  const viewport = { width: 1024, height: 768 };
  const target = rect(600, 300, 220, 44);
  const result = layout.computeTourGuideLayout({
    targetRect: target,
    viewport,
    cardWidth: 420,
    cardHeight: 320,
    preferredPlacement: 'bottom',
  });

  assert.equal(result.mode, 'anchored');
  assert.equal(result.side, 'top');
  const card = cardRect(result);
  assert.ok(card.bottom <= target.top - layout.TOUR_CARD_GAP);
  assert.ok(card.top >= 12);
});

test('mobile layout uses a safe bottom sheet and only spotlights visible targets', () => {
  const viewport = { width: 375, height: 667 };
  const highTarget = rect(80, 20, 200, 44);
  const highResult = layout.computeTourGuideLayout({
    targetRect: highTarget,
    viewport,
    cardWidth: 420,
    cardHeight: 320,
    preferredPlacement: 'bottom',
  });

  assert.equal(highResult.mode, 'sheet');
  assert.equal(highResult.spotlight, true);
  assert.equal(highResult.style.position, 'fixed');
  assert.equal(Number(highResult.style.bottom), layout.TOUR_VIEWPORT_MARGIN);
  assert.equal(Number(highResult.style.width), viewport.width - layout.TOUR_VIEWPORT_MARGIN * 2);
  assert.ok(Number(highResult.style.maxHeight) <= viewport.height);

  const lowTarget = rect(600, 20, 200, 44);
  const lowResult = layout.computeTourGuideLayout({
    targetRect: lowTarget,
    viewport,
    cardWidth: 420,
    cardHeight: 320,
    preferredPlacement: 'bottom',
  });
  assert.equal(lowResult.mode, 'sheet');
  assert.equal(lowResult.spotlight, false);
});

test('missing or mostly offscreen targets fall back to a centered card', () => {
  const viewport = { width: 800, height: 600 };
  const missing = layout.computeTourGuideLayout({
    targetRect: null,
    viewport,
    cardWidth: 420,
    cardHeight: 320,
  });
  assert.equal(missing.mode, 'center');
  assert.equal(missing.spotlight, false);

  const partial = layout.computeTourGuideLayout({
    targetRect: rect(580, 100, 200, 100),
    viewport,
    cardWidth: 420,
    cardHeight: 320,
  });
  assert.equal(partial.mode, 'center');
  assert.equal(partial.spotlight, false);
});

test('target usability requires a real, mostly visible element', () => {
  const viewport = { width: 1024, height: 768 };
  assert.equal(layout.isTourTargetUsable(null, viewport), false);
  assert.equal(layout.isTourTargetUsable(rect(100, 100, 0, 44), viewport), false);
  assert.equal(layout.isTourTargetUsable(rect(100, 100, 200, 44), viewport), true);
  assert.equal(layout.isTourTargetUsable(rect(-80, 100, 200, 100), viewport), false);
  assert.equal(layout.isTourTargetUsable(rect(700, 100, 200, 100), viewport), false);
  assert.equal(layout.isTourTargetUsable(rect(100, -50, 500, 44), { width: 375, height: 667 }), true);
  assert.equal(layout.isTourTargetUsable(rect(100, -400, 500, 44), { width: 375, height: 667 }), false);
});

test('route matching handles same-path query changes', () => {
  assert.equal(layout.routeMatchesStep('/discover?tab=salons', '/discover', ''), false);
  assert.equal(layout.routeMatchesStep('/discover?tab=salons', '/discover', '?tab=salons'), true);
  assert.equal(
    layout.routeMatchesStep('/discover?tab=salons', '/discover', '?tab=salons&q=braids'),
    true
  );
  assert.equal(layout.routeMatchesStep('/home', '/home', ''), true);
  assert.equal(layout.routeMatchesStep('/home', '/discover', ''), false);
});

test('step navigation helpers clamp at both ends', () => {
  assert.equal(layout.getNextTourStepIndex(0, 7), 1);
  assert.equal(layout.getNextTourStepIndex(6, 7), 6);
  assert.equal(layout.getPreviousTourStepIndex(0), 0);
  assert.equal(layout.getPreviousTourStepIndex(3), 2);
  assert.equal(layout.isFinalTourStep(6, 7), true);
  assert.equal(layout.isFinalTourStep(5, 7), false);
});

test('tour source uses settled measurement, full URLs and responsive controls', () => {
  assert.equal(tourSource.includes('Guide card view (target element not in current viewport)'), false);
  assert.equal(tourSource.includes('targetNotFound'), false);
  assert.equal(tourSource.includes('event.key === "Enter"'), false);
  assert.equal(tourSource.includes('contentRect.height'), false);

  assert.match(tourSource, /querySelectorAll/);
  assert.match(tourSource, /window\.location\.search/);
  assert.match(tourSource, /prefers-reduced-motion/);
  assert.match(tourSource, /visualViewport/);
  assert.match(tourSource, /scrollIntoView/);
  assert.match(tourSource, /computeTourGuideLayout/);
  assert.match(tourSource, /showSpotlight && targetRect/);
  assert.match(tourSource, /min-h-\[44px\]/);
  assert.match(tourSource, /shrink-0 border-t/);
  assert.match(tourSource, /aria-modal="true"/);
  assert.match(tourSource, /safe-area-inset-bottom/);
  assert.match(tourSource, /bestArea/);
});

test('discover sync honours tab changes from same-path query navigation', () => {
  assert.match(discoverSource, /externalParamSyncRef/);
  assert.match(discoverSource, /nextUrl === currentUrl/);
  assert.match(discoverSource, /\}, \[searchParams\]\);/);
});

test('restartOnboardingTour broadcasts restart event', () => {
  assert.equal(tour.ONBOARDING_RESTART_EVENT, 'styld:restart-tour');
  lastDispatchedEvent = null;
  tour.restartOnboardingTour();
  assert.equal(lastDispatchedEvent?.type, 'styld:restart-tour');
});
