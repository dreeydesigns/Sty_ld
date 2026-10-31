# STYLD final MVP completion matrix

Date: 2026-10-31
Branch: `qoder/styld-beta-20261027`. Local HEAD `5bd494a`; remote tip and deployed preview `683f8c3`;
local receipts taken on build `YHmKlFY-FAfZVz0NcHCHD`; the 2026-10-31 gate build at HEAD produced
`xsIdSgdtr9XptiCR2L-t4`; the build the preview serves, `yqwyYPWjOIB73R6FF_Irt`.

One status per item, from the seven the directive allows: VERIFIED COMPLETE, IMPLEMENTED BUT
UNVERIFIED, IN PROGRESS, BLOCKED, DEFERRED, SUPERSEDED, FAILED ACCEPTANCE. Two conventions are stated
up front, because they are where a careless reader would over-read this file:

- VERIFIED COMPLETE always names its environment. "local" here means a production `next start` build on
  this machine against an owned disposable PostgreSQL 17.11 cluster, with mail read from a loopback
  capture. Nothing is VERIFIED COMPLETE on hosted infrastructure, because no hosted request has reached
  the application.
- The directive's word NOT RUN is not a status, so it is recorded inside the cell of the allowed status
  that describes it (usually IN PROGRESS or BLOCKED), with the phrase kept visible.

## Verdict

**B. Engineering complete, founder action required.** Not A, because a stranger cannot reach the
deployment, it has no database of its own, and no login code has ever been delivered to a tester. Not C,
because the work that remains is account access and two dates, not code.

## Pillar 1: core functionality and customer journeys

| Item | Status | Environment | Evidence |
| --- | --- | --- | --- |
| JOURNEY-01 Canonical Look with trusted demo provenance | VERIFIED COMPLETE | local | `STYLD_JOURNEY_ACCEPTANCE.md`, `live-auth-journey.json` (14 of 14 steps), `tests/look-contract.cjs` |
| JOURNEY-02 Plan persistence, shortlist, leading choice, conflict | VERIFIED COMPLETE | local | live journey steps 4 and 6, `tests/browser/compare.cjs`, `tests/browser/plan-v2.cjs` |
| JOURNEY-03 Truthful estimate, no invented total | VERIFIED COMPLETE | local | `components/plan-estimate.tsx`, live journey step 5, the plan truthfulness unit cases |
| JOURNEY-04 Compare under a measured slow read | VERIFIED COMPLETE | local | `compare-wait-stress.json`, `tests/browser/compare.cjs` |
| JOURNEY-05 Request to discuss, never a booking | VERIFIED COMPLETE | local | live journey step 6, `tests/discussion-requests.cjs` (13), `tests/postgres/discussion-requests.cjs` (4), `sql/migrations/016_discussion_requests.sql` |
| JOURNEY-06 MFA-gated moderation with audit | VERIFIED COMPLETE for the code and the live path; BLOCKED for provider-side media | local | live journey step 10, `tests/postgres/moderation.cjs`, and the media rows below |
| First render: no route ships a shell with no words | VERIFIED COMPLETE | local, current build | `first-render-audit.json`, 69 routes, 0 loader-only, `gateExit 0`, written against `YHmKlFY-FAfZVz0NcHCHD` at `cc88599` |
| Browser suite board (14 suites) | VERIFIED COMPLETE | local, build `YHmKlFY-FAfZVz0NcHCHD` at `cb9d34b` | `mock-browser-suites.json`, 14 of 14 suites clean, 255 PASS lines, re-run 2026-10-31. One earlier combined run the same day returned 13 of 14 on a 30s `plan-v2` click timeout; that suite run alone printed 50 of 50 and the full board after it was clean, so the stall is recorded as transient, not as a product finding |
| Live authenticated journey (14 steps) | VERIFIED COMPLETE | local, build `YHmKlFY-FAfZVz0NcHCHD` at `cb9d34b` | `live-auth-journey.json`, 14 of 14 steps, re-run 2026-10-31 |
| Deferred scope: Shop, Delivery, live payments, booking commitments, IDEA-009 team invitations | DEFERRED | n/a | `lib/feature-flags.ts:14`, `tests/feature-gates.cjs`, `tests/phase8ba-containment.cjs`, and the copy tests that refuse a commitment claim |
| Unit suite on this tree | VERIFIED COMPLETE | local | `npm test`, 827 of 827, exit 0, on `cb9d34b` |

## Pillar 2: security, privacy, auth and reliability

| Item | Status | Environment | Evidence |
| --- | --- | --- | --- |
| Better Auth email OTP as the only provider, account linking off | VERIFIED COMPLETE | local, and proved by behaviour in the live journey | `lib/better-auth.ts:2`, `:26`, `:38`, `.env.example:45` |
| The three `better-auth` advisories | VERIFIED COMPLETE | local | `package.json:22` pins `1.7.14`; `npm audit` reports none; reachability reading kept in `FOUNDER_ACTIONS.md` section 6 |
| Session integrity, cross-account isolation, privilege gates | VERIFIED COMPLETE | local | live journey steps 7, 8, 9, 12 |
| MFA TOTP with bounded transactions and recovery paths | VERIFIED COMPLETE | local | `app/api/auth/mfa/totp/route.ts:22-25`, `:43-46`, `tests/mfa-totp-recovery.cjs` (16) |
| Origin enforcement on writes | VERIFIED COMPLETE | local | `lib/api-security.ts:6`, pinned in the MFA and discussion-request suites |
| Client IP trust | VERIFIED COMPLETE | local | `lib/better-auth.ts:33`, `tests/client-ip-resolution.cjs` (7) |
| Schema discipline, 014 to 016 | VERIFIED COMPLETE on a disposable cluster; BLOCKED for any hosted database | local | `docs/readiness/sprint4/postgres-result.json`, 28 of 28 at `cb9d34b`, `dirtyTestInputPaths []`, 0 initial rows, database dropped and stopped. This agent has applied nothing to a hosted database |
| Pending media cannot be served without provider proof | VERIFIED COMPLETE | local | `app/api/media/pending/[assetId]/route.ts`, `tests/media-restricted-delivery.cjs` (10), `tests/media-manifest-migration.cjs` (7) |
| Pending media cannot be uploaded without provider proof | VERIFIED COMPLETE | local, new in `cc88599` | `lib/media-delivery-config.cjs:87`, applied at `app/api/upload/route.ts:38` before the limiter, the body and the provider; `tests/media-upload-gate.cjs` (7) |
| Provider-side restricted delivery in Cloudinary | BLOCKED (founder) | n/a | `FOUNDER_ACTIONS.md` item 4; the accept basis needs the config **and** the attestation |
| Read-only environment probe for isolation proof | IMPLEMENTED BUT UNVERIFIED | never called over a network | `app/api/health/environment/route.ts:24`, `lib/environment-probe.cjs`, `tests/hosted-environment-probe.cjs` (6) |
| One fail-closed health-token rule for both readouts | VERIFIED COMPLETE | local | `lib/health-token.cjs`, asserted by both health suites |
| Indexing posture for a preview | VERIFIED COMPLETE | local | `app/robots.ts`, `next.config.mjs:17-18`, `tests/indexing-posture.cjs` (4) |
| No secret, OTP or cookie value in any log or receipt | VERIFIED COMPLETE | local | canary assertions in `tests/email-delivery-auth.cjs` and `tests/hosted-environment-probe.cjs`; the hosted suite records only that a bypass was sent |
| Terms and privacy effective dates | BLOCKED (founder) | n/a | `app/terms/page.tsx:29`, `:31` placeholders; `app/privacy/page.tsx:27` publishes 1 January 2025 against files that first appear in git on 2026-07-20. The requested 1 January 2020 is recorded and not published |
| Security behaviour on the hosted preview | BLOCKED, cannot be attempted | n/a | every anonymous request answers Vercel's login redirect first |

## Pillar 3: a database-backed Vercel beta environment

| Item | Status | Evidence and what changes it |
| --- | --- | --- |
| A preview deployment of this branch builds and reports success | VERIFIED COMPLETE | GitHub Deployments API: deployment `7436081921`, sha `683f8c3`, environment `Preview - sty-ld`, three successful statuses |
| A tester or harness can reach it | BLOCKED (founder item 2) | Measured 2026-10-30: anonymous `GET /api/health` answers `302` to `vercel.com/sso-api` on the branch alias and on a per-deployment host |
| The preview has its own database | BLOCKED (founder item 1) | Reported: one `POSTGRES_URL` targeting both Production and Preview, no override named for this branch. This workspace holds no credential |
| The migration chain is applied to the beta database | BLOCKED (founder, by design) | `001` through `016` in `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md` section C, with the runner command and the read-back query |
| Hosted acceptance suite exists and is wired for both modes | VERIFIED COMPLETE in local mode | `live-hosted-acceptance.json`, 13 of 13 plus 1 correctly skipped; hosted runs record the stop rather than pretending past it (`live-hosted-acceptance-preview-ee52e8c.json`, `...-e38eab6.json`) |
| A real emailed OTP completes a hosted sign-in | BLOCKED (founder item 3) | `RESEND_FROM_EMAIL` reported absent; `lib/auth-readiness.ts:12` answers false and the OTP route refuses |
| The deployed revision carries this branch's newest code | BLOCKED, needs a push | `cc88599` and `cb9d34b` are committed locally only |
| Testers have a stable origin that matches `BETTER_AUTH_URL` | IN PROGRESS, waiting on item 2 | The branch alias is the answer, because `lib/api-security.ts:6` 403s a write whose origin differs and a per-deployment hostname changes on every rebuild |

## Pillar 4: glass, signature loader, motion and performance

| Item | Status | Evidence |
| --- | --- | --- |
| Mobile glass within the 12px ceiling, no layer stacked on a layer | VERIFIED COMPLETE on build `yqwyYPWjOIB73R6FF_Irt` | `STYLD_DESIGN_REFINEMENT_RECEIPTS.md`: 10px on every audited route, counts 1/3/2/2/2 against the baseline 1/4/3/3/3 |
| 44px controls, safe areas, keyboard trail with a drawn ring | VERIFIED COMPLETE, same build | the receipts, plus `tests/signature-loader.cjs` (8) |
| The signature gesture: one per cold tab, seven skip reasons, reduced motion gets no overlay | VERIFIED COMPLETE, same build | `tests/browser/signature-loader.cjs` (5 scenarios), `visual-refined.json` (45 navigations) |
| Accessibility, the half axe can decide | VERIFIED COMPLETE on build `YHmKlFY-FAfZVz0NcHCHD` | `live-accessibility-audit.json` at `5bd494a`: 44 scans, 0 content violations, 0 overflow at 200 percent, 0 animations under reduced motion. A first run the same day reported one `color-contrast` node, and it was the `aria-hidden` signature splash sampled mid-fade (1.17:1); the scan now waits for the splash to detach, and the finding is kept in `DEPARTMENT_LEDGER.md` |
| Performance before and after, with the tradeoff stated | VERIFIED COMPLETE on build `yqwyYPWjOIB73R6FF_Irt` | 12 of 15 ready cells equal or lower, three higher and named; CLS unchanged; +2KB JS, +1KB CSS. Not re-run in the 2026-10-31 round because it is a two-build comparison, stated in `STYLD_MOBILE_AND_UX_ACCEPTANCE.md` |
| The 63 `color-contrast` nodes axe left incomplete (62 in the 2026-10-30 sweep) | BLOCKED, needs a human decision | Recorded in `live-accessibility-audit.json` at `5bd494a` as 63 incompletes, all `color-contrast`, because third-party asset hosts are aborted; no run hand-checked them |
| iOS Safari | IN PROGRESS, and NOT RUN to date | No iPhone, no simulator, no Safari on this machine; scheduled into the market test |
| Low-end Android handsets on Kenyan mobile data | IN PROGRESS, and NOT RUN to date | Throttling here is simulated at 4x CPU on a desktop browser; scheduled into the market test |
| Lighthouse | DEFERRED, never quoted | No run in this work produced one, so the "about 3 points" target can be neither accepted nor rejected |

## Outstanding issues, reconciled one line each

| # | Issue | Status | Where it is now |
| --- | --- | --- | --- |
| 1 | Preview Deployment Protection stops every automated and invited visit | BLOCKED (founder) | `STYLD_HOSTED_PREVIEW_ACCEPTANCE.md` |
| 2 | `POSTGRES_URL` reported as shared between Production and Preview, no branch override | BLOCKED (founder), and the reason the database item is first | `STYLD_FOUNDER_ACTIONS_FINAL.md` item 1 |
| 3 | `RESEND_FROM_EMAIL` reported absent | BLOCKED (founder) | item 3 of the same file |
| 4 | Pending media provider-side restriction unproven | BLOCKED (founder); the accepting side is now refused in code | `STYLD_SECURITY_AND_PRIVACY_SIGNOFF.md` |
| 5 | Terms page still renders placeholders | BLOCKED (founder) | item 5 |
| 6 | Privacy page publishes an effective date no record in this branch supports | BLOCKED (founder) | item 5, stated as two conflicting facts rather than one missing one |
| 7 | Local code is two commits ahead of the deployed preview | BLOCKED, needs a push | item 6 |
| 8 | Browser receipts describe an older build and could not be re-measured | VERIFIED COMPLETE on 2026-10-31, with one caveat | Every local harness was re-run on `YHmKlFY-FAfZVz0NcHCHD`; `visual-baseline.json` and `visual-refined.json` were not, because they are a two-build comparison. `STYLD_HOSTED_PREVIEW_ACCEPTANCE.md` |
| 9 | 62 contrast incompletes undecided | BLOCKED (needs a human eye) | `STYLD_MOBILE_AND_UX_ACCEPTANCE.md` |
| 10 | iOS and Kenyan-device testing | NOT RUN, IN PROGRESS by plan | `STYLD_NAIROBI_MARKET_TEST_HANDOVER.md` |
| 11 | Better Auth configuration partly branch-scoped to an older design branch | BLOCKED (founder), and unverifiable from here | `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md` section A |
| 12 | No hosted run of the acceptance suite has ever identified a served build | BLOCKED, follows from 1 | the build-id reading itself was corrected at `cb9d34b` |

## What this matrix does not say

It does not say the beta is ready for people. It says the engineering is finished for the scope, proved
where a machine could prove it, and that the remaining items are account access, one push, two dates and
the devices this workspace does not have. No percentage is used anywhere in it, because a percentage
made of estimates is how an unfinished thing gets called finished.
