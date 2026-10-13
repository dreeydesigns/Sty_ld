# STYLD authentication root cause

## Observed and inferred sequence

Founder evidence: on iPhone, landing CTA opens branded access, then a Clerk development-hosted missing-Username screen.

1. HTTP GET / on the live domain returns 200 and includes Clerk resources. The public key identifies a test instance at lucky-husky-21.clerk.accounts.dev. No secret was required to observe this.
2. GET /auth/sign-up and /auth/sign-in return 200 with the older Google/email/phone options. GET /api/auth/options returns 404, unlike the passwordless branch.
3. In main at 8279186, app/layout.tsx:2 imports ClerkProvider; line 21 mounts it. Lines 5 through 7 select the configured public key or a hardcoded development fallback.
4. components/auth/unified-auth-flow.tsx:328 through 344 starts Clerk Google authentication with redirectUrl /sso-callback and redirectUrlComplete set to the destination. Email signup supplies a generated username at line 436; that is not a custom OAuth completion handler.
5. app/sso-callback/page.tsx:10 through 12 delegates completion to AuthenticateWithRedirectCallback with /home fallback destinations.
6. Read-only GET of the public Clerk /v1/environment returned username.enabled=true and username.required=true. This configuration plus hosted incomplete-signup handling explains the screenshot. The precise browser redirect chain after OAuth has NOT been captured, so it remains an evidence-backed inference rather than a fully reproduced transaction.

Other live HTTP observations: /home redirects to /auth/sign-in?returnTo=%2Fhome; /discover returns 200; /counter redirects to a feature-gated notice; GET /api/setup/init-admin returns 410. GET /api/auth/phone-signin returned 405, which does not prove POST retirement on production.

## Repair direction

The approved baseline uses Better Auth in lib/better-auth.ts, first-party cookie sessions and app/api/auth/[...all]/route.ts. The recovery removes the remaining WhatsApp guest-modal invocation, exposes public discovery routes, validates return destinations and hides Google unless explicitly configured and verified. Existing retired endpoint tests invoke their handlers, rather than trusting documentation.

No Clerk dashboard, keys or production environment settings were changed. The old revision and configuration remain available for an approved rollback. Reverting to that revision also restores its known authentication defects.

## Limits and release requirements

The exact production commit, deployment environment and build logs remain BLOCKED. Initial Vercel access required reauthentication; the latest retry failed at the connector transport. Founder must reconnect Vercel. No browser was available for iPhone/Safari, refresh/back/deep-link or OAuth reproduction. HTTP source fingerprints do not establish an exact deployed SHA.

Real email OTP remains BLOCKED until a verified sender domain and approved test recipient are available. No real OTP was sent in this recovery phase. See STYLD_TEST_RESULTS.md for isolated evidence.
