# STYLD MVP readiness

Current classification: internal demo. Authentication source improvements do not establish marketplace readiness.

17 October update: the combined UI candidate includes sign-in loop repair, server-owned activity/application loading, Phase 8B-A containment of shared-browser account actions and provider/service planning validation. Fresh typecheck, lint, 352 unit/security tests and fake-mail auth integration pass. See STYLD_MVP_CLOSEOUT_2026-10-16.md and the latest execution ledger in STYLD_TEST_RESULTS.md for final build evidence and remaining release gates. Preview authentication configuration and actual delivery remain blocked; a new test database resource alone does not prove preview isolation.

| Journey | Status | Evidence and limitation |
|---|---|---|
| Client discovery and provider profiles | MOCK / PARTIAL | lib/site-data.ts supplies sample providers, service options and times; collection pages render these. Public browsing is being repaired. |
| Five-step booking | PARTIAL | components/booking-experience.tsx provides steps and drafts. app/api/bookings/route.ts blocks new commitments pending authoritative price/provider/availability integration. |
| Existing booking activity | PARTIAL | Database reads remain scoped to identity; provider reads require a stable workspace association. Historic ambiguous associations need review. |
| Professional | PARTIAL | Application/approval and workspace profile exist. Services can be persisted; actual availability, booking acceptance, portfolio and earnings journey is not proven end to end. |
| Salon | PARTIAL | Distinct workspace profile and ownership model; full team permissions and operational booking journey need tests. |
| Shop / Counter | NOT IMPLEMENTED for transactions | Shop remains gated. Counter has a public availability page, not a functioning product marketplace. Legacy product cards are sample UI. |
| Delivery | NOT IMPLEMENTED for launch | Feature-gated legacy screens; no verified assignment/fulfilment journey. |
| Admin | PARTIAL | Server role checks, MFA, security events and approval endpoints exist. Complete moderation and operational acceptance remain unverified. |
| Email | EXTERNAL SETUP BLOCKED | No verified sender domain in the audited account. Local fake transport tests are not delivery evidence. |
| Uploads | PARTIAL | Existing integration code preserved; external configuration and authorized upload journey need live-environment verification. |
| Payments / escrow | NOT IMPLEMENTED for launch | PAYMENTS_LIVE=false. Existing integration code does not prove funds collection, settlement, escrow or refunds. |
| Reviews / community / notifications | PARTIAL / MOCK | Legacy client-side social caches and sample data remain. Actual persistence and authorization need vertical-journey tests. |
| Mobile accessibility | PARTIAL | Local in-app browser guest/access navigation and 390 x 844 sign-in inspection passed on 18 October. Complete accessibility and actual iOS Safari acceptance remain unverified. |

## P0 release blockers

1. Verified sender and approved real delivery test; real authentication deployment configuration.
2. Founder-approved schema migration and preservation preflight, plus a chosen recovery process for seven email-less accounts.
3. Complete isolated test/build results, mobile browser refresh/back/deep-link tests and deployment SHA confirmation.
4. Verify authorization and tenant isolation on every legacy private read/write, including non-booking product subsystems.
5. Keep sample catalog and booking behavior explicitly labeled. No public transactional release with unproven pricing, availability or payment state.
6. Dependency audit reports 24 advisories (22 high, two moderate). Review affected runtime/transitive paths and compatible updates before release. A passing build does not resolve these findings.

## P1 blockers for a transactional marketplace

Authoritative provider/service catalog and slot reservation, persisted provider acceptance and cancellation transitions, real salon/team permissions, trustworthy verification status, upload validation, payment reconciliation/refunds and transactional notifications. Review dependency advisories before release rather than applying unreviewed major upgrades.

## P2 and later scope

Shop inventory/orders, authorized delivery assignment, expanded moderation analytics and additional access methods. Preserve the role architecture without advertising these as usable services.

A restricted private beta requires the P0 authentication/configuration/ownership checks to pass, a clearly limited scope and no simulated paid transactions. A public transactional MVP additionally requires verified Client, Professional and Salon booking/payment journeys. Shop and Delivery need not launch in that MVP, but must remain truthfully gated.
