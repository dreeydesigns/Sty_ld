/**
 * Interactive Onboarding Tour Regression Tests
 *
 * Verifies role-based step resolution, server session authorization, truthful
 * copy, responsive placement, route handling, controls, and replay behavior.
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
      CustomEvent: class CustomEvent {
        constructor(type, init) {
          this.type = type;
          this.detail = init && init.detail;
        }
      },
    }
  )(
    (name) => dependencies[name] || require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const layout = loadModule('lib/onboarding-tour-layout.ts');
const access = loadModule('lib/onboarding-tour-access.ts');

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
    APP_SESSION_EVENT: 'app-session-event',
  },
  '@/lib/onboarding-tour-access': access,
  '@/lib/onboarding-tour-layout': layout,
});

function readSource(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

const tourSource = readSource('components/onboarding-tour.tsx');
const discoverSource = readSource('components/discover-content.tsx');
const marketplaceSource = readSource('components/marketplace-ui.tsx');
const securityDashboardSource = readSource('components/security-dashboard.tsx');
const securityPageSource = readSource('app/admin/security/page.tsx');
const tourTargetSources = [
  discoverSource,
  marketplaceSource,
  readSource('components/role-profile-workspace.tsx'),
  readSource('components/appointment-planning.tsx'),
  readSource('app/service-comparison/page.tsx'),
  readSource('components/professional-workspace.tsx'),
  readSource('components/salon-workspace.tsx'),
  readSource('app/settings/page.tsx'),
  readSource('app/admin/page.tsx'),
  readSource('components/super-admin-panel.tsx'),
  securityDashboardSource,
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

test('persistence keys are versioned and scoped by user and workspace or role', () => {
  const workspaceKey = tour.getOnboardingStorageKey('usr_test_456', 'workspace:ws_a:client');
  const roleKey = tour.getOnboardingStorageKey('usr_test_456', 'role:client');
  assert.equal(workspaceKey, 'styld:onboarding:v2:usr_test_456:workspace:ws_a:client');
  assert.equal(roleKey, 'styld:onboarding:v2:usr_test_456:role:client');
  assert.equal(
    tour.getOnboardingStepKey('usr_test_456', 'workspace:ws_a:client'),
    'styld:onboarding_step:v2:usr_test_456:workspace:ws_a:client'
  );
  assert.notEqual(workspaceKey, tour.getOnboardingStorageKey('usr_test_456', 'workspace:ws_b:client'));
  assert.notEqual(workspaceKey, roleKey);
});

test('completed and skipped tours stay dismissed until replay', () => {
  assert.equal(tour.isOnboardingDismissed('completed'), true);
  assert.equal(tour.isOnboardingDismissed('skipped'), true);
  assert.equal(tour.isOnboardingDismissed(null), false);
  assert.equal(tour.isOnboardingDismissed('in_progress'), false);
});

test('server session resolves authorized tour roles and workspace scope', () => {
  assert.equal(access.resolveTourAuthorization(null), null);
  assert.equal(access.resolveTourAuthorization({ user_id: 'usr_1' }), null);
  assert.equal(access.resolveTourAuthorization({ assumed_role: 'client' }), null);
  assert.equal(access.resolveTourAuthorization({ user_id: 'usr_1', assumed_role: 'guest' }), null);
  assert.equal(access.resolveTourAuthorization({ user_id: 'usr_1', assumed_role: 'shop' }), null);
  assert.equal(access.resolveTourAuthorization({ user_id: 'usr_1', assumed_role: 'delivery' }), null);
  assert.equal(access.resolveTourAuthorization({ user_id: 'usr_1', assumed_role: 'team_member' }), null);

  const client = access.resolveTourAuthorization({
    user_id: 'usr_1',
    assumed_role: 'client',
    workspaceId: 'ws_a',
  });
  assert.equal(client.scopeKey, 'workspace:ws_a:client');
  assert.equal(client.workspaceId, 'ws_a');

  const roleOnly = access.resolveTourAuthorization({ user_id: 'usr_1', assumed_role: 'salon' });
  assert.equal(roleOnly.scopeKey, 'role:salon');
  assert.equal(roleOnly.workspaceId, null);

  const pro = access.resolveTourAuthorization({
    user_id: 'usr_2',
    assumed_role: 'professional',
    workspaceId: 'ws_p',
  });
  assert.equal(pro.role, 'professional');
  assert.equal(pro.scopeKey, 'workspace:ws_p:professional');
});

test('admin tour authorization requires admin flag and MFA', () => {
  assert.equal(
    access.resolveTourAuthorization({ user_id: 'usr_9', assumed_role: 'super_admin' }),
    null
  );
  assert.equal(
    access.resolveTourAuthorization({
      user_id: 'usr_9',
      assumed_role: 'super_admin',
      admin: true,
      mfaVerified: false,
    }),
    null
  );
  assert.equal(
    access.resolveTourAuthorization({
      user_id: 'usr_9',
      assumed_role: 'super_admin',
      admin: false,
      mfaVerified: true,
    }),
    null
  );

  const admin = access.resolveTourAuthorization({
    user_id: 'usr_9',
    assumed_role: 'super_admin',
    admin: true,
    mfaVerified: true,
    workspaceId: 'ws_ignored',
  });
  assert.equal(admin.role, 'super_admin');
  assert.equal(admin.scopeKey, 'role:super_admin');
  assert.equal(admin.workspaceId, null);
});

test('client role receives 8 truthful onboarding steps', () => {
  const steps = tour.getStepsForRole('client');
  assert.equal(steps.length, 8);
  const expectedIds = ['welcome', 'discover', 'filters', 'providers', 'compare', 'plan', 'home', 'profile'];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/discover');
  assert.equal(steps[1].targetSelector, '[data-tour="discover-tabs"]');
  assert.equal(steps[2].targetSelector, '[data-tour="discover-filters"]');
  assert.equal(steps[3].route, '/discover?tab=salons');
  assert.equal(steps[3].targetSelector, '[data-tour="provider-card"]');
  assert.equal(steps[4].route, '/service-comparison');
  assert.equal(steps[4].targetSelector, '[data-tour="comparison-controls"]');
  assert.equal(steps[5].route, '/book');
  assert.equal(steps[5].targetSelector, '[data-tour="planning-header"]');
  assert.equal(steps[6].route, '/home');
  assert.equal(steps[6].targetSelector, '[data-tour="home-nav"]');
  assert.equal(steps[7].route, '/profile');
  assert.equal(steps[7].targetSelector, '[data-tour="profile-nav"]');
});

test('professional role receives 8 workspace steps with valid routes', () => {
  const steps = tour.getStepsForRole('professional');
  assert.equal(steps.length, 8);
  const expectedIds = [
    'welcome-pro',
    'pro-dashboard',
    'pro-workspace',
    'pro-services',
    'pro-profile',
    'pro-portfolio',
    'pro-requests',
    'pro-settings',
  ];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/profile');
  assert.equal(steps[1].targetSelector, '[data-tour="pro-dashboard-tab"]');
  assert.equal(steps[2].route, '/workspace/professional');
  assert.equal(steps[2].targetSelector, '[data-tour="pro-workspace-header"]');
  assert.equal(steps[3].targetSelector, '[data-tour="pro-services-summary"]');
  assert.equal(steps[4].targetSelector, '[data-tour="pro-profile-header"]');
  assert.equal(steps[5].targetSelector, '[data-tour="pro-posts-tab"]');
  assert.equal(steps[6].route, '/profile?tab=requests');
  assert.equal(steps[6].targetSelector, '[data-tour="pro-requests-view"]');
  assert.equal(steps[7].route, '/settings');
  assert.equal(steps[7].targetSelector, '[data-tour="settings-workspaces"]');
});

test('salon role receives 8 workspace steps with valid routes', () => {
  const steps = tour.getStepsForRole('salon');
  assert.equal(steps.length, 8);
  const expectedIds = [
    'welcome-salon',
    'salon-workspace',
    'salon-services',
    'salon-tools',
    'salon-profile',
    'salon-team',
    'salon-requests',
    'salon-settings',
  ];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.equal(steps[1].route, '/workspace/salon');
  assert.equal(steps[1].targetSelector, '[data-tour="salon-workspace-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="salon-services-summary"]');
  assert.equal(steps[3].targetSelector, '[data-tour="salon-business-tools"]');
  assert.equal(steps[4].targetSelector, '[data-tour="salon-profile-header"]');
  assert.equal(steps[5].targetSelector, '[data-tour="salon-team-tab"]');
  assert.equal(steps[6].route, '/profile?tab=requests');
  assert.equal(steps[6].targetSelector, '[data-tour="salon-requests-view"]');
  assert.equal(steps[7].route, '/settings');
  assert.equal(steps[7].targetSelector, '[data-tour="settings-workspaces"]');
});

test('admin role receives 7 control room steps for authorized sessions only', () => {
  const steps = tour.getStepsForRole('super_admin');
  assert.equal(steps.length, 7);
  const expectedIds = [
    'welcome-admin',
    'admin-header',
    'admin-tabs',
    'admin-security-link',
    'admin-approvals',
    'admin-accounts',
    'admin-events',
  ];
  assert.equal(steps.map((s) => s.id).join(','), expectedIds.join(','));

  assert.equal(steps[0].placement, 'center');
  assert.match(steps[0].content, /MFA/i);
  assert.equal(steps[1].route, '/admin');
  assert.equal(steps[1].targetSelector, '[data-tour="admin-header"]');
  assert.equal(steps[2].targetSelector, '[data-tour="admin-tabs"]');
  assert.equal(steps[3].targetSelector, '[data-tour="admin-security-link"]');
  assert.equal(steps[4].route, '/admin/security');
  assert.equal(steps[4].targetSelector, '[data-tour="admin-approvals"]');
  assert.equal(steps[5].targetSelector, '[data-tour="admin-accounts"]');
  assert.equal(steps[6].targetSelector, '[data-tour="admin-events"]');
});

test('role tours stay distinct and disabled roles receive no tour', () => {
  const tours = {
    client: tour.getStepsForRole('client'),
    professional: tour.getStepsForRole('professional'),
    salon: tour.getStepsForRole('salon'),
    super_admin: tour.getStepsForRole('super_admin'),
  };

  const allIds = Object.values(tours).flatMap((steps) => steps.map((s) => s.id));
  assert.equal(new Set(allIds).size, allIds.length, 'Step ids must be unique across tours');
  assert.equal(tours.client.length, 8);
  assert.equal(tours.professional.length, 8);
  assert.equal(tours.salon.length, 8);
  assert.equal(tours.super_admin.length, 7);

  for (const role of ['guest', 'shop', 'delivery', 'team_member', undefined]) {
    assert.equal(tour.getStepsForRole(role).length, 0);
  }
});

test('every anchored step points at an existing tour target', () => {
  const allSteps = [
    ...tour.getStepsForRole('client'),
    ...tour.getStepsForRole('professional'),
    ...tour.getStepsForRole('salon'),
    ...tour.getStepsForRole('super_admin'),
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

test('admin security route is mounted and access-gated', () => {
  assert.match(securityPageSource, /s\.admin/);
  assert.match(securityPageSource, /s\.mfaVerified/);
  assert.match(securityDashboardSource, /OnboardingTour/);
  assert.match(tourTargetSources, /"admin-approvals"/);
  assert.match(tourTargetSources, /"admin-accounts"/);
  assert.match(tourTargetSources, /"admin-events"/);
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
    ...tour.getStepsForRole('super_admin'),
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
  assert.match(clientSteps[5].content, /planning preview/i);
  assert.match(clientSteps[5].content, /not live yet/i);

  const proSteps = tour.getStepsForRole('professional');
  assert.match(proSteps[6].content, /not live yet/i);

  const salonSteps = tour.getStepsForRole('salon');
  assert.match(salonSteps[2].content, /not available/i);
  assert.match(salonSteps[5].content, /not live yet/i);
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
  assert.equal(layout.getNextTourStepIndex(0, 8), 1);
  assert.equal(layout.getNextTourStepIndex(7, 8), 7);
  assert.equal(layout.getPreviousTourStepIndex(0), 0);
  assert.equal(layout.getPreviousTourStepIndex(3), 2);
  assert.equal(layout.isFinalTourStep(7, 8), true);
  assert.equal(layout.isFinalTourStep(6, 8), false);
});

test('tour source resolves authorization from the server session, not cached roles', () => {
  assert.equal(tourSource.includes('readAppSession'), false);
  assert.equal(tourSource.includes('styld:onboarding:v1'), false);
  assert.match(tourSource, /\/api\/auth\/session/);
  assert.match(tourSource, /cache: "no-store"/);
  assert.match(tourSource, /resolveTourAuthorization/);
  assert.match(tourSource, /APP_SESSION_EVENT/);
  assert.match(tourSource, /ONBOARDING_KEY_PREFIX = "styld:onboarding:v2:/);
  assert.match(tourSource, /ONBOARDING_STEP_PREFIX = "styld:onboarding_step:v2:/);
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

test('restartOnboardingTour broadcasts restart event with options', () => {
  assert.equal(tour.ONBOARDING_RESTART_EVENT, 'styld:restart-tour');
  lastDispatchedEvent = null;
  tour.restartOnboardingTour();
  assert.equal(lastDispatchedEvent?.type, 'styld:restart-tour');

  lastDispatchedEvent = null;
  tour.restartOnboardingTour({ resetStep: false });
  assert.equal(lastDispatchedEvent?.detail?.resetStep, false);
});
