# Onboarding and account repair

Branch: design/openai-styld-ui-v1. Starting commit: 997f80c.

The preserved onboarding draft failed TypeScript, lint and the production build. It also advanced through local-only forms and claimed profiles were created without persisting them.

Client onboarding now uses the canonical email authentication flow and returns to the client workspace. Professional and Salon onboarding share the existing workspace application form with Settings, preselecting the intended role. Applications are submitted to the authenticated server endpoint and remain subject to review. These pages do not grant roles or claim that a provider workspace has been approved. The previous design drafts remain recoverable in commit 997f80c.

The account hub now listens for verified session updates, uses the actual sign-out endpoint before clearing the display cache, and links Help to the existing help page.

## Validation

- PASS: npm run typecheck, final run after the shared form role type correction.
- PASS: npm run lint, zero errors and 31 existing image optimization warnings.
- PASS: npm test, 288 tests. New endpoint tests reject guests and privileged roles and prove application ownership comes from the verified identity.
- PASS: npm run test:auth:integration. Embedded PGlite and fake local email only. Covers OTP, replay, stable identity, revocation and simulated delivery failure.
- PASS: npm run build, exit 0. All 109 pages generated. With no live environment loaded, Better Auth emitted missing base URL/default secret diagnostics during page collection. Build success does not prove live auth configuration.
- PASS: node scripts/smoke-public.cjs. Public pages return 200; protected pages and all three onboarding routes redirect guests to sign-in; guest booking and provider application requests return 401; retired auth endpoints return 410. The local server uses test-only auth configuration with empty database and email credentials.

## Limits

This repair does not establish public marketplace readiness. Discovery still includes explicitly classified example data. Booking commitments, payments, Shop and Delivery remain gated. Live email delivery, production configuration, approved identity recovery and migrations, and actual iOS browser journeys were not validated in this repair. No production database writes or real emails were performed. No main-branch merge or production deployment is included.

Rollback: revert this repair commit on the same test branch. The prior commit is an intentionally preserved, non-building draft, so reverting is for investigation rather than release.
