# STYLD test results

Recovery worktree: ../styld-auth-recovery. Branch: codex/auth-mvp-recovery. Baseline: 925d0fc789431d68b9352493192e15005b5d2f87. Results recorded 13 October 2026 (Africa/Nairobi).

## Environment isolation

No production environment file was copied into this worktree. scripts/test-passwordless-integration.ts now uses embedded PostgreSQL (PGlite), explicit local test credentials and a FAKE HTTP email capture server bound to 127.0.0.1. It does not load .env.local or connect to a live database. Real OTP messages were not sent. It tests the real Better Auth handler and email adapter against local fixtures, not production deliverability.

## Execution ledger

| Check | Status | Evidence |
|---|---|---|
| Branch refresh and backup | PASS | git fetch --all --prune; git worktree list; patch plus untracked backup and manifest created before moving work |
| npm ci | PASS | Exit 0, 843 packages installed. Slow extraction took 27 minutes. Early missing-file checks were inconclusive and superseded by completed-install checks. |
| TypeScript | PASS | npm run typecheck (tsc --noEmit), exit 0 after completed installation. |
| Lint | PASS with warnings | npm run lint, exit 0, zero errors and 28 existing image optimization warnings. Counter's internal anchor error was fixed with Next Link. |
| Unit/security suite | PASS | npm test: 134 tests passed, zero failed. Includes guest draft privacy/expiry, forbidden workspace selection, guest route access, retired seeder, and cache invalidation. |
| Real auth handler against embedded DB and fake mail | PASS | node node_modules/tsx/dist/cli.mjs scripts/test-passwordless-integration.ts, exit 0. Dispatch, wrong OTP, pending hash storage, cooldown, expiry, replay, same identity on repeat login, revocation, suspended user and separate profiles tested. Fake transport outage returns 503. |
| Production build | PASS | npm run build, exit 0, including the no-cookie guest resolver fix. |
| Dependency audit | FAIL release gate | npm audit --json: 24 advisories, two moderate and 22 high, zero critical. Direct affected packages include eslint-config-next, firebase, next and next-pwa. Review transitive paths and compatible fixes before release; no forced upgrades applied. |
| Local production HTTP smoke | PASS | node scripts/smoke-public.cjs, exit 0. Eight public pages return 200, three protected pages redirect, /api/me returns 401 for guests, guest booking is denied, phone/WhatsApp/admin-setup retirement returns 410, and Google is hidden. The script's initial incorrect WhatsApp URL was corrected to the actual endpoint. |
| Production deployment SHA / build logs | BLOCKED | Vercel initially required reauthentication; latest connector retry failed at transport. HTTP fingerprints do not prove exact SHA. |
| Real email delivery | BLOCKED | No verified sender domain. Explicit founder restriction prohibits real OTP tests until verified. |
| Mobile/iOS Safari browser | BLOCKED | Initially no connected browser. A later in-app browser became available, but local navigation timed out. Automatic approval review rejected the browser-server launch with test environment assignments (reason: blocked by policy). Launch without assignments failed required-secret initialization. No visual or actual Safari cookie claim. |

## Required journeys and evidence limits

1. Guest discovery/Counter: middleware and local production HTTP tests PASS for public access. Browser refresh remains BLOCKED. Counter is an availability page, not functional shopping.
2. Guest draft: isolated store tests cover refresh restoration, expiry and exclusion of contact details. Full login-and-resume browser journey remains BLOCKED.
3. New client email OTP: embedded handler test PASS; real delivery and browser completion BLOCKED.
4. Existing identity: repeat login retains fixture user ID, PASS. Actual historic booking/account migration NOT RUN; no live writes permitted.
5. Client/Professional switching: route authorization and independent-profile fixture tests exist. Full browser workflow and cross-subsystem cache isolation remain unverified.
6. Salon/Shop/Delivery: Salon schema/approval implementation is partial. Shop/Delivery feature-gated. Complete operational journeys NOT RUN.
7. Admin denial, MFA and suspension: negative route/policy tests and suspended-user embedded test. Complete admin MFA browser enrollment remains BLOCKED.
8. OTP failures/expiry/replay/cooldown/outage: embedded test PASS. Incorrect callback/back/deep-link browser behavior remains BLOCKED.
9. No external Clerk screen in candidate source: single authority and retired endpoint tests. Production still serves Clerk resources; live repair NOT DEPLOYED.
10. Build/lint/typecheck/security: PASS within the isolated scope described above. Dependency audit fails the release gate; browser and live-environment acceptance remain blocked.

Fixture warnings: legacy nullable email is deliberately preserved for recovery review. Do not invent emails or enforce NOT NULL on unrecovered users merely to silence a schema warning. Outside Vercel, Better Auth uses a shared per-path IP limiter unless a trusted ingress is configured. This is conservative but can cause shared rate-limit contention.

Initial failures were retained here as diagnostic history: an obsolete /home protection test, a missed contact-field removal caught by the new draft test, an internal anchor lint error, and the guest database-initialization HTTP failure. None was suppressed by weakening authentication.
