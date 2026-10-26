# STYLD delivery ledger

Owner: Qoder, full project execution from 26 October 2026. Hermes is out of the
workflow. This ledger is the audit of previously approved work plus the record of what
this branch changed. Evidence is a commit, a file, or a gate result, not an intention.

Branch: `qoder/styld-preview-closeout`
Base: `5c86d38` on `codex/styld-sprint3-20261026` (16 commits ahead of the STYLD-00
closeout baseline `5f42b1c`, zero behind)
Worktree: `C:/Users/Muti/Documents/GitHub/styld-qoder-preview` (isolated; the founder's
active sprint3 worktree and its uncommitted work were left untouched)

## Classification of previously approved work

Status key: VERIFIED COMPLETE (in code and proven by a gate), PARTIAL (real gaps
remain), MISSING, BLOCKED (needs a founder-only decision or credential), SUPERSEDED,
OUT OF SCOPE.

| Approved item | Status | Evidence |
| :--- | :--- | :--- |
| Next.js security release | VERIFIED COMPLETE | `e631dc3` moved the tree to 15.5.28; `npm.cmd audit` now reports zero advisories |
| Dependency advisories (was 24) | VERIFIED COMPLETE | `07d0545` transitive patching plus the PostCSS pin; re-audit on this branch: 0 total, 0 high |
| Firebase helper and client removal | VERIFIED COMPLETE | `b8464e6`; `tests/ux-interaction-regressions.cjs` asserts no firestore import. Dormant env names remain documented as retired in `docs/ENV_MATRIX.md` |
| next-pwa removal | VERIFIED COMPLETE | `96da0cd` |
| Real Better Auth OTP lifecycle proof | VERIFIED COMPLETE | `82994d3` runs the flow on disposable SQL with captured mail; `npm.cmd run test:auth:integration` |
| Same-origin enforcement on mutations | VERIFIED COMPLETE | `a5f20b7`; `tests/browser/*` and route tests pin the 403 path |
| Fail-closed upload quota | VERIFIED COMPLETE | `3aff91f`; `tests/database-adapter-regression.cjs` "upload quota database failure denies processing" |
| Demo fixture provenance and integrity | VERIFIED COMPLETE | `5c86d38`, `e63d403`, `tests/demo-assets.cjs` |
| Browser acceptance evidence for Build 1 | VERIFIED COMPLETE | `c151deb`; suites now also run against a private port |
| Onboarding layout, role tours, plan navigation, plan draft continuity, settings ownership, profile personalization, beauty worlds, emoji-free UI | VERIFIED COMPLETE in code | `docs/STYLD_PRE_MVP_CLOSEOUT_CHECKLIST.md` rows, each pinned by a suite in `tests/`; browser QA was NOT RUN at that point and is now run on this branch |
| Shop and Delivery gating | VERIFIED COMPLETE | `lib/feature-flags.ts` keeps SHOP and DELIVERY false; interest register only |
| Provider booking ownership integrity | PARTIAL, now documented | `docs/STYLD_BOOKING_OWNERSHIP_BLUEPRINT.md` lists five concrete blockers, including that a booking created today stores no `provider_id` or `provider_workspace_id` |
| Sample data labeling | PARTIAL | Illustrative labels exist on landing, guest home and Counter. This branch adds the missing label on the package detail page. `app/explore` and tour surfaces still need a founder read |
| Client interests persistence | BLOCKED (founder decision) | The endpoint is contained: no queries, 503 with a plain answer. Pinned by `tests/client-interests-security.cjs`, ported on this branch |
| Sign-in origin on the deployed host | BLOCKED (founder credential) | Needs `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` set on the preview environment |
| Real email delivery acceptance | BLOCKED (founder credential) | Gmail transport is now implemented and tested locally; a Google App Password must be saved as a sensitive Preview variable |
| Legacy account recovery | BLOCKED (founder decision) | No engineering work was invented for it |
| Stale documentation review | PARTIAL, improved | `docs/ENV_MATRIX.md` rewritten off Twilio and WhatsApp; `docs/archive` still holds Clerk-era material for founder sign-off |
| Payments and booking commitments | OUT OF SCOPE to enable | Explicitly excluded by the handover; both flags remain false and every surface says so |

## Work delivered on this branch

| Commit | Change | Gate |
| :--- | :--- | :--- |
| `06e6924` | Compare stage, provider shortlist, replace and undo, and the honest comparison page, integrated from the uncommitted sprint3 work. Only exact owned service ids produce a price; missing facts read "Not provided" or "Unconfirmed" | `tests/shortlist-compare.cjs`, `tests/browser/compare.cjs`, `tests/browser/shortlist-saves.cjs`, `tests/plan-v2.cjs` |
| `06e6924` | Browser suites take `STYLD_BASE_URL` and abort only non-local requests, so QA runs against a private preview build without shadowing their own mocks | same suites, run on a private port |
| `e9c2d88` | Activity and application status decide session state from the server answer instead of a value read during render, removing the hydration mismatch for signed-in users | `tests/browser/session-states.cjs` at 390 and 1366 px, guest and signed-in |
| `e9c2d88` | Contact route stops trusting a forgeable header, uses the shared hashed fail-closed limiter, and answers 503 when the store or a trusted source IP is missing. Driver detail stays out of responses and logs | rewritten contact cases in `tests/database-adapter-regression.cjs`, `tests/error-disclosure-regression.cjs`, `tests/database-compat-integration.cjs` |
| `e9c2d88` | The integration harness pins fixture database URLs so a stray shell `POSTGRES_URL` cannot point a local test at a real database | `scripts/test-passwordless-integration.ts` |
| `78f7096` | Gmail OTP transport with explicit sender, TLS on 465, bounded timeouts, attachment access disabled, no SMTP logging, and a fail-closed provider selection | `tests/gmail-delivery.cjs` (3 checks, no message leaves the machine) |
| `1af7bc8` | Booking ownership blueprint, current environment matrix, and the retained QA bootstrap and preview authentication records | documentation only |
| `5f68621` | Copy stops promising a contact unlock and a guaranteed result that no server record supports | `tests/booking-trust-copy.cjs`, `tests/no-emoji-ui.cjs` |
| `49239ea` | Application status no longer overwrites its own guest answer. The 401 branch set the guest flag and the next handler cleared it, so a signed-out visitor saw "no applications yet" as if the server had answered | `tests/browser/session-states.cjs`, guest panel present and no record at 390 and 1366 px |
| `49239ea` | The Compare bulk removal check waits for the write it starts instead of reading server state mid-flight, so the suite no longer fails on a real but unawaited save | `tests/browser/compare.cjs`, 50/50 |
| `49239ea` | The Compare fixture answers the shell session probe instead of letting it reach whatever server is listening, and the measurement guard now names that one rejected path rather than accepting any 401 | `tests/browser/compare-measurements.cjs`, 360 and 1440 px |

## Gate record on the final HEAD

- `npm.cmd run typecheck` (tsc --noEmit): zero errors
- `npm.cmd run lint`: zero errors, 30 pre-existing `<img>` warnings
- `npm.cmd test`: 660 tests, 660 pass, 0 fail
- `npm.cmd run build`: exit 0, 115 static pages generated
- `npm.cmd audit`: zero advisories
- `git diff --check`: clean

## Browser QA on the delivery build

Run against `next start` on a private port with `STYLD_BASE_URL`, with every API and
image request intercepted. No live service, no QA database and no payment or booking
traffic was touched. Viewports include 360, 375, 390, 768, 1366 and 1440 px.

| Suite | Result |
| :--- | :--- |
| `tests/browser/plan-v2.cjs` | PASS, 49 scenarios. Includes offline, failed read, failed save, retry, stale revision and cross-account isolation |
| `tests/browser/build1-journey.cjs` | PASS, 33 scenarios across six worlds at 768 and 1440 px, plus keyboard order, focus, overflow and reduced motion |
| `tests/browser/compare.cjs` | PASS, 50 scenarios at 360 to 1440 px, including guest, conflict, cross-tab and long-name overflow |
| `tests/browser/shortlist-saves.cjs` | PASS, 30 scenarios; shortlist and Saves coexist without cross-writing |
| `tests/browser/private-saves.cjs` | PASS, 32 scenarios; a private estimate is never rendered for another role |
| `tests/browser/email-delivery.cjs` | PASS, 10 scenarios; every failure state refuses to claim delivery |
| `tests/browser/session-states.cjs` | PASS, 6 scenarios; guest boundary keeps `returnTo`, and both answers render without a hydration error |
| `tests/browser/compare-measurements.cjs` | PASS, 360 and 1440 px; tray stays in flow, no horizontal overflow, primary action clear of the tray, render and transition timings recorded in `docs/readiness/sprint3` |
| `tests/browser/readiness-measurements.cjs` | PASS, 6 scenarios; Look, Plan and Estimate timings, transfer size, layout shift and long tasks recorded on a local production build. This is not field Core Web Vitals and no screen reader certification |
| Not proven | A real signed-in browser session. PGlite runs in-process only, so a live session needs the deployed preview with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` set by the founder |

## Preview deployment

`49239ea` was pushed as an isolated branch and Vercel completed two non-production
preview deployments. The app host is
`https://sty-f0914j7hj-dreeydesigns-3368s-projects.vercel.app`. The build is healthy and
the edge serves it, but Vercel Deployment Protection returns a 302 to SSO on every path,
so no anonymous check reached the application and no claim is made that it renders there.
`docs/STYLD_PREVIEW_HANDOVER.md` records the two ways to open it and the environment
variables a working sign-in needs.

## Not done here, and the one action each needs

- Preview environment variables: founder sets `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  the isolated QA `POSTGRES_URL`, and the email sender on the Preview scope.
- Preview access: founder opens it while logged in to Vercel, or turns Deployment
  Protection off for Preview deployments, or supplies a bypass protection secret.
- Real inbox OTP proof: founder creates a Google App Password and saves it directly as
  a sensitive variable, then the sign-in is exercised in a browser.
- Client interests persistence, legacy account recovery, Counter scope: founder
  decisions, no code invented for them.
- Payments, booking commitments, Shop, Delivery and IDEA-009: intentionally untouched.
