# STYLD MVP code closeout, 16 October 2026

Candidate branch: design/openai-styld-ui-v1. This report covers the pending Phase 7D-F work and follow-up repairs. It does not certify a public transactional launch.

## Completed repairs

- Activity reads and cancels through the existing server-authorized /api/bookings route. The retired /api/activity reference was a nonexistent endpoint. Response mapping uses the actual bookings payload.
- Activity checks the server on mount instead of treating an unhydrated display profile as a guest. A 401 shows sign-in, a failed request shows retry, and only a successful empty result shows no bookings.
- Email sign-in no longer requires interests before completion. The previous flow checked a field that /api/me did not return, creating a repeating onboarding step.
- Optional client interests use the existing owned, active Client workspace profile. The former user_settings.interests target had no migration. Other profile properties are retained. Caller-supplied identity/workspace fields cannot select another user's row.
- Application status comes from /api/workspaces, including all returned applications. Errors and unauthorized responses have separate states. URL status parameters cannot approve applications. Unproven review deadlines and notification promises were removed.
- Existing onboarding, settings, Account Hub and notification changes are retained in the candidate history. Shop and Delivery remain gated. Chair/team strategy remains deferred.

## Release blockers still open

| Requirement | Status and required next action |
|---|---|
| Real email sign-in on preview | BLOCKED. Last environment-name inspection found BETTER_AUTH_SECRET, BETTER_AUTH_URL and RESEND_FROM_EMAIL absent. Identify the verified sender before a real send. The source now returns an honest setup error when configuration is missing. |
| Preview database isolation | BLOCKED. The isolated database override was scoped to codex/auth-mvp-recovery, while this UI branch inherited shared settings. Identify the intended test resource and scope it before authenticated preview testing. No database settings were copied. |
| Historic identities | BLOCKED on founder recovery decision. Preserve all original IDs and booking ownership; do not invent email addresses or auto-link by phone/name. |
| Schema readiness | NOT RUN on a live database. Founder-approved migration/preflight is required before cutover. These repairs add no migration. |
| Live catalog, pricing and availability | PARTIAL / MOCK. Existing provenance reports identify sample discovery data. BOOKING_COMMITMENTS remains false. A planning draft does not hold a slot or confirm a booking. |
| Payments, escrow and orders | NOT IMPLEMENTED for launch. PAYMENTS_LIVE remains false. No billing or transaction service was enabled. |
| Professional and Salon operations | PARTIAL. Intentional applications and server-owned workspaces exist. Complete availability, booking acceptance, portfolio, earnings and salon-team journeys remain unproven. |
| Dependency security | FAIL release gate. Fresh npm audit reports 24 advisories, 22 high and two moderate. Suggested fixes include incompatible major versions and downgrades. Resolve these through a tested dependency upgrade task; do not apply npm audit fix --force. |
| Browser and iOS acceptance | NOT RUN in this closeout. HTTP and fixture tests do not prove Safari persistence or mobile usability. |

Current readiness remains an internal demo. A limited private beta needs configured isolated authentication and browser acceptance. A public transactional MVP additionally needs authoritative catalog/availability and operational booking journeys. Pushing source does not satisfy these gates.

## Rollback

The prior pushed UI revision is 7c151e36ed286bb676f02b4bf5ffc848c922a520. Preserve this reference for a reviewed preview rollback. Use new revert commits if source rollback is needed; do not reset or force-push shared history. Production cutover and the STYLD-AUTH-RECOVERY-ROLLBACK procedure remain a separate founder-approved release action.

## Verification

The final execution ledger is recorded in docs/STYLD_TEST_RESULTS.md. Tests use isolated fixtures and a clearly labelled fake mail transport. No real OTP, production migration or production database mutation was performed.
