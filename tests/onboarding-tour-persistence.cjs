/**
 * First-run tour persistence suite (Client Experience slice).
 *
 * Answers the question the readiness report could not: is a dismissed tour really
 * dismissed? The live journey recorded five tour appearances and the receipt did not say
 * whose scopes they belonged to, so the claim "repeated first-run tours" was unverifiable.
 * This suite pins the storage contract, the exit paths that persist, and the scope rule
 * that legitimately produces one tour per workspace.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    console, process, Buffer, URL, Date, Math, JSON, Object, Array, Number, String, Boolean, Error, Set, Map, Symbol, Promise, RegExp, CustomEvent: class {},
  })(name => (Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name)), module, module.exports);
  return module.exports;
}

const noop = () => undefined;
const reactStub = { createElement: () => null, useEffect: noop, useState: () => [undefined, noop], useCallback: fn => fn, useRef: () => ({ current: null }) };
const tour = loadModule('components/onboarding-tour.tsx', {
  react: reactStub,
  'next/navigation': { useRouter: () => ({ push: noop }), usePathname: () => '/' },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '@/lib/client-session': { APP_SESSION_EVENT: 'styld:app-session' },
  '@/lib/onboarding-tour-access': { resolveTourAuthorization: () => null },
  '@/lib/onboarding-tour-layout': { computeTourGuideLayout: () => ({}), getNextTourStepIndex: noop, getPreviousTourStepIndex: noop, isFinalTourStep: () => false, isTourTargetUsable: () => true, routeMatchesStep: () => false },
});
const access = loadModule('lib/onboarding-tour-access.ts', {});

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const WORKSPACE = '33333333-3333-4333-8333-333333333333';

test('a dismissed tour reads as dismissed, and an untouched one does not', () => {
  assert.equal(tour.isOnboardingDismissed('completed'), true);
  assert.equal(tour.isOnboardingDismissed('skipped'), true);
  assert.equal(tour.isOnboardingDismissed(null), false, 'a first visit has no record at all');
  assert.equal(tour.isOnboardingDismissed('running'), false, 'a half-finished tour is not a dismissal');
  assert.equal(tour.isOnboardingDismissed('undefined'), false, 'a garbage value cannot lock a visitor out forever');
});

test('the record is keyed by account and scope, so one visitor cannot silence another', () => {
  const key = tour.getOnboardingStorageKey(USER, `workspace:${WORKSPACE}:professional`);
  assert.match(key, /^styld:onboarding:v2:/);
  assert.ok(key.includes(USER) && key.includes(WORKSPACE) && key.endsWith(':professional'));
  assert.notEqual(key, tour.getOnboardingStorageKey(OTHER, `workspace:${WORKSPACE}:professional`), 'a shared account on one device keeps separate progress');
  assert.notEqual(key, tour.getOnboardingStorageKey(USER, `workspace:${WORKSPACE}:salon`), 'a second workspace gets its own tour');
  assert.notEqual(tour.getOnboardingStepKey(USER, `workspace:${WORKSPACE}:professional`), key, 'step progress and dismissal are separate records');
});

// The two tests below read the component source. They are shape guards, not behaviour proofs: a
// reformat edits them and a broken component can still pass them. The reachable behaviour is what
// tests/browser/live-auth-journey.cjs records on a real build, and that receipt is the evidence.
test('source shape guard: every exit the visitor can reach shares one finish path', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding-tour.tsx'), 'utf8');
  const calls = source.match(/handleFinish\("(\w+)"\)/g) || [];
  assert.ok(calls.length >= 3, `expected the Escape key, the close control and the skip button to share one finish path, found ${calls.length}`);
  for (const call of calls) assert.match(call, /handleFinish\("(completed|skipped)"\)/);
  assert.equal(calls.filter(call => call.includes('"completed"')).length, 1, 'completing the last step is the only completed record');
  assert.match(source, /window\.localStorage\.setItem\(\s*getOnboardingStorageKey/, 'the dismissal is written to durable storage, not session storage');
  assert.match(source, /event\.key === "Escape"[\s\S]{0,120}handleFinish\("skipped"\)/, 'Escape is a real dismissal');
});

test('source shape guard: the eligibility read is the only gate, and restart is visitor-initiated', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding-tour.tsx'), 'utf8');
  assert.match(source, /if \(isOnboardingDismissed\(completed\)\) \{\s*setActive\(false\);\s*return false;/,
    'a stored dismissal stops the overlay before it can paint');
  assert.match(source, /window\.localStorage\.removeItem\(\s*getOnboardingStorageKey/,
    'the visitor-initiated restart on Help and Settings clears the record, which is the only way a tour returns');
});

test('scope keys follow the server session, not anything the browser claims', () => {
  const admin = access.resolveTourAuthorization({ user_id: USER, assumed_role: 'super_admin', admin: true, mfaVerified: true, workspaceId: null });
  assert.equal(admin.scopeKey, 'role:super_admin');
  const professional = access.resolveTourAuthorization({ user_id: USER, assumed_role: 'professional', admin: false, mfaVerified: false, workspaceId: WORKSPACE });
  assert.equal(professional.scopeKey, `workspace:${WORKSPACE}:professional`);
  assert.equal(professional.userId, USER);
  const unsignedAdmin = access.resolveTourAuthorization({ user_id: USER, assumed_role: 'super_admin', admin: true, mfaVerified: false, workspaceId: null });
  assert.equal(unsignedAdmin, null, 'an administrator without a verified second factor gets no tour');
  const roleless = access.resolveTourAuthorization({ user_id: USER, assumed_role: 'delivery', admin: false, mfaVerified: false, workspaceId: WORKSPACE });
  assert.equal(roleless, null, 'an unsupported role gets no tour instead of a broken one');
  const noWorkspace = access.resolveTourAuthorization({ user_id: USER, assumed_role: 'client', admin: false, mfaVerified: false, workspaceId: null });
  assert.equal(noWorkspace.scopeKey, 'role:client', 'a session between workspaces still has a stable scope');
});
