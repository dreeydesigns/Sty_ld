/**
 * STYLD Clerk Integration, Identity Resolver & Canonical User Regression Suite
 *
 * Enforces:
 * 1. Single canonical user mapping via users.clerk_user_id (unique, indexed).
 * 2. Unified authentication resolution boundary in lib/auth-resolver.ts.
 * 3. Anti-takeover rules: verified email linking prevents overwriting existing different clerk_user_id.
 * 4. Role escalation prevention: public signup never grants admin or super_admin.
 * 5. Root application wrapping: <ClerkProvider> inside <body> in app/layout.tsx.
 * 6. Middleware architecture: clerkMiddleware with route feature gates and role restrictions.
 * 7. Unified auth flow interface: real Clerk-backed flows for Google, email code, passkey, and legacy bridge.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('sql/migrations/006_clerk_canonical_user.sql establishes clerk_user_id unique column and index', () => {
  const migrationPath = path.join(ROOT_DIR, 'sql', 'migrations', '006_clerk_canonical_user.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration 006 must exist');

  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(sql.includes('clerk_user_id VARCHAR(255)'), 'Must add clerk_user_id column');
  assert.ok(sql.includes('uq_users_clerk_user_id'), 'Must establish unique constraint on clerk_user_id');
  assert.ok(sql.includes('idx_users_clerk_user_id'), 'Must establish index on clerk_user_id');
});

test('app/layout.tsx correctly wraps application with <ClerkProvider> inside <body>', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT_DIR, 'app', 'layout.tsx'), 'utf8');

  // Verify import
  assert.ok(layoutSrc.includes('import { ClerkProvider } from "@clerk/nextjs"'), 'Must import ClerkProvider');

  // Verify nesting: ClerkProvider must be inside body, not wrapping html
  assert.ok(layoutSrc.includes('<body'), 'Must contain <body>');
  assert.ok(layoutSrc.includes('<ClerkProvider>'), 'Must contain <ClerkProvider>');
  assert.ok(layoutSrc.includes('<ThemeApplicator />'), 'Must contain <ThemeApplicator /> inside provider');

  const bodyIndex = layoutSrc.indexOf('<body');
  const clerkIndex = layoutSrc.indexOf('<ClerkProvider>');
  const themeIndex = layoutSrc.indexOf('<ThemeApplicator');
  const closeClerkIndex = layoutSrc.indexOf('</ClerkProvider>');
  const closeBodyIndex = layoutSrc.indexOf('</body>');

  assert.ok(bodyIndex < clerkIndex, 'ClerkProvider must be inside <body>');
  assert.ok(clerkIndex < themeIndex, 'ThemeApplicator must be inside <ClerkProvider>');
  assert.ok(closeClerkIndex < closeBodyIndex, '</ClerkProvider> must close before </body>');
});

test('lib/identity-manager.ts exports findUserByClerkId and enforces anti-takeover logic', () => {
  const identitySrc = fs.readFileSync(path.join(ROOT_DIR, 'lib', 'identity-manager.ts'), 'utf8');

  assert.ok(identitySrc.includes('export async function findUserByClerkId'), 'findUserByClerkId must be exported');
  assert.ok(identitySrc.includes('clerkUserId?: string'), 'resolveOrCreateUser must accept clerkUserId');
  assert.ok(
    identitySrc.includes('This email is already associated with an existing Styld account'),
    'Must prevent account takeover when email is already linked to a different clerk_user_id'
  );
  assert.ok(
    identitySrc.includes("const safeRole = (requestedRole === 'admin' || requestedRole === 'super_admin') ? 'client' : requestedRole;"),
    'Public signup must never allow escalation to admin or super_admin'
  );
});

test('lib/auth-resolver.ts provides unified identity resolution with legacy bridge', () => {
  const resolverSrc = fs.readFileSync(path.join(ROOT_DIR, 'lib', 'auth-resolver.ts'), 'utf8');

  assert.ok(resolverSrc.includes('export async function resolveCurrentStyldUser'), 'resolveCurrentStyldUser must be exported');
  assert.ok(resolverSrc.includes('export async function requireAuthenticatedUser'), 'requireAuthenticatedUser must be exported');
  assert.ok(resolverSrc.includes('findUserByClerkId(clerkUserId)'), 'Must resolve canonical user by clerkUserId');
  assert.ok(resolverSrc.includes("authSource: 'clerk'"), 'Must identify Clerk as auth source');
  assert.ok(resolverSrc.includes("authSource: 'legacy'"), 'Must identify legacy session as auth source');
});

test('middleware.ts integrates clerkMiddleware while preserving route feature gates', () => {
  const middlewareSrc = fs.readFileSync(path.join(ROOT_DIR, 'middleware.ts'), 'utf8');

  assert.ok(middlewareSrc.includes('clerkMiddleware'), 'Must integrate clerkMiddleware');
  assert.ok(middlewareSrc.includes('ROUTE_FEATURE_GATES'), 'Must preserve ROUTE_FEATURE_GATES');
  assert.ok(middlewareSrc.includes('/sign-in'), 'Public routes must include /sign-in');
  assert.ok(middlewareSrc.includes('/sign-up'), 'Public routes must include /sign-up');
  assert.ok(middlewareSrc.includes('/sso-callback'), 'Public routes must include /sso-callback');
  assert.ok(middlewareSrc.includes('/auth/sign-in'), 'Public routes must include /auth/sign-in');
  assert.ok(middlewareSrc.includes('/admin'), 'Protected routes must include /admin check');
});

test('components/auth/unified-auth-flow.tsx is wired to real Clerk hooks and states', () => {
  const authFlowSrc = fs.readFileSync(path.join(ROOT_DIR, 'components', 'auth', 'unified-auth-flow.tsx'), 'utf8');

  // Clerk hook usage
  assert.ok(authFlowSrc.includes('useSignIn'), 'Must use Clerk useSignIn hook');
  assert.ok(authFlowSrc.includes('useSignUp'), 'Must use Clerk useSignUp hook');

  // Google OAuth
  assert.ok(authFlowSrc.includes('strategy: "oauth_google"'), 'Google must use oauth_google strategy');
  assert.ok(authFlowSrc.includes('redirectUrl: "/sso-callback"'), 'OAuth must redirect to /sso-callback');

  // Email Code
  assert.ok(authFlowSrc.includes('strategy: "email_code"'), 'Email must use email_code strategy');
  assert.ok(authFlowSrc.includes('attemptEmailAddressVerification'), 'Sign up must verify code');
  assert.ok(authFlowSrc.includes('attemptFirstFactor'), 'Sign in must verify code');

  // Passkey
  assert.ok(authFlowSrc.includes('authenticateWithPasskey'), 'Passkey must invoke authenticateWithPasskey');
  assert.ok(authFlowSrc.includes('Sign in with a passkey'), 'Button must say Sign in with a passkey');

  // Legacy bridge
  assert.ok(authFlowSrc.includes('/api/auth/signin-multi-role'), 'Must support legacy phone/password sign in');

  // Loading states
  assert.ok(authFlowSrc.includes('Connecting to Google…'), 'Must show Google loading state');
  assert.ok(authFlowSrc.includes('Sending code…'), 'Must show Email sending state');
  assert.ok(authFlowSrc.includes('Checking passkey…'), 'Must show Passkey checking state');
  assert.ok(authFlowSrc.includes('Signing in…'), 'Must show Password signing in state');
});

test('canonical /sign-in, /sign-up, and /sso-callback routes exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'app', 'sign-in', 'page.tsx')), '/sign-in page must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'app', 'sign-up', 'page.tsx')), '/sign-up page must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'app', 'sso-callback', 'page.tsx')), '/sso-callback page must exist');
});
