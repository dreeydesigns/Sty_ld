# STYLD MVP code closeout, 16 October 2026

Updated 17 October 2026 after comparing the newer local containment and planning branches.

Validation completed 18 October: typecheck, lint, 352 tests, embedded auth integration, production build and local HTTP smoke passed. The in-app browser passed guest discovery refresh, branded access, guest return and Back navigation, with a readable 390 x 844 sign-in view. Real email authentication and Safari sessions remain unverified.

Candidate branch: design/openai-styld-ui-v1. This report covers the pending Phase 7D-F work and follow-up repairs. It does not certify a public transactional launch.

## Completed repairs

- Activity reads and cancels through the existing server-authorized /api/bookings route. The retired /api/activity reference was a nonexistent endpoint. Response mapping uses the actual bookings payload.
- Activity checks the server on mount instead of treating an unhydrated display profile as a guest. A 401 shows sign-in, a failed request shows retry, and only a successful empty result shows no bookings.
- Email sign-in no longer requires interests before completion. The previous flow checked a field that /api/me did not return, creating a repeating onboarding step.
- Optional client interests remain disabled with an honest 503 and no storage access, preserving the later Phase 8B-A containment decision. The former user_settings.interests target had no migration. A proposed workspace-profile repair was preserved in da54e47, then superseded by the safer disabled endpoint until storage approval.
- Application status comes from /api/workspaces, including all returned applications. Errors and unauthorized responses have separate states. URL status parameters cannot approve applications. Unproven review deadlines and notification promises were removed.
- Existing onboarding, settings, Account Hub and notification changes are retained in the candidate history. Shop and Delivery remain gated. Chair/team strategy remains deferred.
- Integrated reviewed containment commits cbbde42 and d8b1f3e from the newer local work. Shared-browser private messages, requests, saves, follows and reactions cannot be presented as authorized per-account data. Booking updates remain disabled with commitments.
- Reused planning-context fixes from local/mvp-sprint1-planning-integrity at d681ba9. Selected sample services must belong to the chosen sample provider; unknown and mismatched IDs are excluded. This is planning validation, not a live inventory or authorization service. Its alternative application-status implementation was not copied over the server-authoritative repair.

## Release blockers still open

| Requirement | Status and required next action |
|---|---|
| Real email sign-in on preview | BLOCKED. Refreshed environment-name inspection on 17 October still found BETTER_AUTH_SECRET, BETTER_AUTH_URL and RESEND_FROM_EMAIL absent. Identify the verified sender before a real send. The source now returns an honest setup error when configuration is missing. |
| Preview database isolation | BLOCKED. The isolated database override was scoped to codex/auth-mvp-recovery, while this UI branch inherited shared settings. Identify the intended test resource and scope it before authenticated preview testing. No database settings were copied. |
| Historic identities | BLOCKED on founder recovery decision. Preserve all original IDs and booking ownership; do not invent email addresses or auto-link by phone/name. |
| Schema readiness | NOT RUN on a live database. Founder-approved migration/preflight is required before cutover. These repairs add no migration. |
| Live catalog, pricing and availability | PARTIAL / MOCK. Existing provenance reports identify sample discovery data. BOOKING_COMMITMENTS remains false. A planning draft does not hold a slot or confirm a booking. |
| Payments, escrow and orders | NOT IMPLEMENTED for launch. PAYMENTS_LIVE remains false. No billing or transaction service was enabled. |
| Professional and Salon operations | PARTIAL. Intentional applications and server-owned workspaces exist. Complete availability, booking acceptance, portfolio, earnings and salon-team journeys remain unproven. |
| Dependency security | FAIL release gate. Fresh npm audit reports 24 advisories, 22 high and two moderate. Suggested fixes include incompatible major versions and downgrades. Resolve these through a tested dependency upgrade task; do not apply npm audit fix --force. |
| Browser and iOS acceptance | PARTIAL. Local guest/access navigation and mobile-sized sign-in rendering passed. Real email login, authenticated workspace switching and actual Safari persistence remain unverified. |

Current readiness remains an internal demo. A limited private beta needs configured isolated authentication and browser acceptance. A public transactional MVP additionally needs authoritative catalog/availability and operational booking journeys. Pushing source does not satisfy these gates.

The newly available Neon connector lists styld-qa-auth-isolated (project falling-band-35175280, created 16 October). This identifies a candidate test resource only. Its schema, connection binding and sender setup were not verified, and no database query or mutation was performed. A matching name does not establish that the UI preview is connected to it.

## Rollback

The prior pushed UI revision is 7c151e36ed286bb676f02b4bf5ffc848c922a520. Preserve this reference for a reviewed preview rollback. Use new revert commits if source rollback is needed; do not reset or force-push shared history. Production cutover and the STYLD-AUTH-RECOVERY-ROLLBACK procedure remain a separate founder-approved release action.

## Verification

The final execution ledger is recorded in docs/STYLD_TEST_RESULTS.md. Tests use isolated fixtures and a clearly labelled fake mail transport. No real OTP, production migration or production database mutation was performed.
