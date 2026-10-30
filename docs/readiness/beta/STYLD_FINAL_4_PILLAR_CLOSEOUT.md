# STYLD final four pillar closeout

Date: 2026-10-29
Branch: `qoder/styld-beta-20261027`
Pushed revision at first record: `ee52e8c3ef961f76c93192427d7c1efcb3fac50a` (24 commits as
`a7b6db6..ee52e8c`). The branch tip moves after this sentence each time the receipts are refreshed,
so the SHA that describes the application is this one instead: the last commit that changed a build
input is `2fa521d`, and everything after it edits documents and receipts only. Whatever preview
Vercel most recently built from this branch serves build `yqwyYPWjOIB73R6FF_Irt`, the build `2fa521d`
produced and every receipt in this folder names.
Deployment: Vercel deployment `7419556619`, project `sty-ld`, environment `Preview - sty-ld`,
sha `ee52e8c`, platform status `success`, created 2026-10-29T17:31:17Z.
Preview URL: `https://sty-4254wlg18-dreeydesigns-3368s-projects.vercel.app`

Verdict: **READY EXCEPT FOR FOUNDER GATES**.

That verdict is deliberate. No code work remains that this machine can complete and prove, and the
four things that stop a tester from reaching the application are account permissions and credentials
that only the founder controls. Market testing must not begin until items 1 to 3 of
`STYLD_FOUNDER_ACTIONS_MINIMAL.md` are closed. This document says what is proved, what is not, and
what turns each open item green.

## The verdict in one table

| Pillar | State | Proved | Not proved |
| --- | --- | --- | --- |
| 1. MVP core functionality and customer journeys | COMPLETE AND VERIFIED IN A LOCAL PRODUCTION BUILD | JOURNEY-01 to JOURNEY-06 accepted, 14 of 14 live authenticated steps, 14 of 14 browser suites, 814 unit tests, the 69-route first-render gate | A hosted tester journey, because the preview is protected |
| 2. Security, privacy, auth and reliability | COMPLETE FOR THE AUDITED SET, ONE PROVIDER-SIDE ITEM BLOCKED | Advisories closed at `better-auth` 1.7.14, session and privilege negative paths proved live, migrations 014 to 016 proved on disposable PostgreSQL 17.11, media gate refuses without provider proof | Restricted Cloudinary delivery, which needs account-side configuration |
| 3. Database-backed Vercel beta environment | DEPLOYED, HOSTED ACCEPTANCE BLOCKED | A new preview of the pushed revision builds and reports success | Any request to it, because Deployment Protection answers 302 to Vercel SSO; no preview database is provisioned |
| 4. Glass, signature loader, motion and performance | BUILT AND MEASURED, TRADEOFFS STATED | 45 of 45 measured navigations, 10px mobile glass, 0 undersized controls, 0 axe violations, no-loader baseline and delta | iOS Safari, real Kenyan hardware, a Lighthouse score, and 62 contrast nodes no run has decided |

The single sentence version: the product is finished and proved on this machine, the deployment
exists and is healthy, and a stranger still cannot see it.

## Pillar 1: MVP core functionality and customer journeys

Launch scope is Client, Professional and Salon. Shop and Delivery stay disabled and are covered by
tests that keep them off.

What was proved, and where:

- `docs/readiness/beta/STYLD_JOURNEY_ACCEPTANCE.md` accepts JOURNEY-01 to JOURNEY-06, each naming the
  receipt that wrote the result. JOURNEY-06 is PASS for the code and the live path, with provider-side
  media protection still blocked on the founder.
- `docs/readiness/beta/live-auth-journey.json`, 14 of 14 steps, written at `0a3d225` on build
  `yqwyYPWj`. These are not mocked: a production `next start` on an owned, disposable PostgreSQL 17.11
  cluster, a real Better Auth session, real emailed codes read by a loopback mail capture. The steps
  cover a guest feed and a sign-in bounce that keeps the original target, a first-time sign-in, a
  refused wrong code, shortlisting two providers and seeing them in Compare, a private durable save,
  a request to discuss that creates no booking, a second account that cannot read the first account
  plan, a forged cookie string refused, a database-level session revocation that signs the browser
  out, a real second factor, an admin console refused to a non-admin, an applicant who is approved
  into a provider and salon workspace, and a console clean of client errors across the run.
- `docs/readiness/beta/mock-browser-suites.json`, 14 of 14 suites clean, 255 PASS lines, on build
  `yqwyYPWj` at `39fde0c`. The suites are `plan-v2`, `private-saves`, `build1-journey`,
  `session-states`, `email-delivery`, `compare`, `compare-sync`, `shortlist-saves`,
  `sprint4-acceptance`, `compare-study`, `compare-layout-proposal`, `compare-measurements`,
  `readiness-measurements` and `signature-loader`.
- `docs/readiness/beta/first-render-audit.json`, 69 routes, `gateExit 0`, 0 loader-only routes, written
  at `2fa521d` and regenerated against build `yqwyYPWj`. It records 18 redirect routes, 5 routes that
  declare their wait, 21 thin routes, and one route that answers 404 by design (`/auth/preview` calls
  `notFound()` outside development at `app/auth/preview/page.tsx:4`). No route ships a shell that a
  visitor cannot read.
- `npm test`, 814 of 814, including the journey contracts, the plan estimate truthfulness tests, the
  discussion request non-binding tests and the scope pins.

What is not in this pillar and must not be presented as finished: provider-side restricted media
delivery (founder item 4 in `FOUNDER_ACTIONS.md`), the terms effective date (founder item 5), and the
deferred surfaces named under "What is deliberately off".

## Pillar 2: Security, privacy, auth and reliability

The authentication and authorization source (`lib/better-auth.ts`, `middleware.ts`,
`lib/auth-policy.ts`, `lib/auth-resolver.ts`) was not edited in this work. Authorization stays
server-side and never reads a client supplied role, user id or workspace id.

Closed and pinned:

- `better-auth` is pinned exactly at `1.7.14` (`package.json:22`), above the `1.7.7` fix line. The
  three advisories that named this tree (`GHSA-965c-763c-88jm`, `GHSA-r4xp-prcw-77qf`,
  `GHSA-44jh-23m7-hpcf`) are closed; `npm audit` reports none of them. The reachability reading for the
  older version is kept in `FOUNDER_ACTIONS.md` section 6 so a future reader can see what was asked.
- Session and privilege negative paths are proved live, not read from source: a stolen cookie string
  cannot forge a session (step 8), deleting the session row signs the browser out (step 9), one
  account cannot read another account plan or saves (step 7), and the admin console refuses a signed
  in non-admin at the server (step 12). The same run sets up a real time-based second factor (step 11).
- Client IP resolution fails closed. `lib/better-auth.ts:33` reads `x-vercel-forwarded-for` only when
  `VERCEL` is set, so no spoofable header is ever trusted. The recorded residual is availability off
  Vercel, where every visitor shares one bucket; launch is on Vercel, and `tests/client-ip-resolution.cjs`
  pins the behaviour.
- Schema changes are new numbered files and were applied only to disposable clusters:
  `sql/migrations/014_users_integrity_guards.sql`, `015_media_manifests.sql` and
  `016_discussion_requests.sql`. `docs/readiness/sprint4/postgres-result.json`, 28 of 28, exit 0,
  `dirtyTestInputPaths []`, 40 tables created, cluster dropped and stopped, written at `912d0e4`.
  No production database was read or written.
- Pending media cannot leak by assumption. `app/api/upload/route.ts` and the delivery route refuse
  until the provider proves the asset is not public, a manifest row starts with
  `provider_restriction_verified = false`, and the route answers 503 with no configuration. That
  refusal is the truthful answer, not a working feature, and is why provider-side delivery is still
  an open founder item.
- Headers and guest endpoints answer honestly on a production build: `x-content-type-options`,
  `content-security-policy` and `referrer-policy` present, a guest session request answered explicitly,
  `/api/me` answering 401 rather than 5xx, and a guest feed returning 200 with `ok=true`. Recorded in
  `docs/readiness/beta/live-hosted-acceptance.json`, 13 of 13 checks plus 1 correctly skipped.
- Dependency hygiene: `playwright` is declared at the version this work measured against, a test walks
  the whole of `tests/` for every require and import shape, and `docs/readiness/beta/clean-install.json`
  records a clean `npm ci --ignore-scripts` resolution.
- Resilience: the offline notice shows honest copy when the offline event fires, an offline reload
  with no service worker shows the browser's own error page (recorded in the receipt, not hidden), the
  feed reports a terminal state that is either cards, an honest empty or an honest error, and a
  declared wait is announced to assistive technology.

Recorded residuals a reader should know:

- Off Vercel, Better Auth sees no client IP and all visitors share one rate limit bucket. Availability,
  not security, and launch is on Vercel.
- 62 axe `color-contrast` nodes came back as incomplete, which means axe did not decide them. No run
  hand-checked them. The pairs axe did decide pass, because the sweep records 0 violations.
- Restricted media delivery remains blocked on the Cloudinary account configuration.

## Pillar 3: A real database-backed Vercel beta environment

What exists:

- A Vercel preview built from the pushed revision, `7419556619`, environment `Preview - sty-ld`,
  sha `ee52e8c`, platform status `success`, at
  `https://sty-4254wlg18-dreeydesigns-3368s-projects.vercel.app`. The build is not the problem.
- The hosted acceptance suite, `tests/browser/live-hosted-acceptance.cjs`, which points at whatever
  origin a tester reaches and records only whether a cookie or bypass was sent, never the value.

What happened when it was pointed at that host, with no cookie and no bypass, at 17:32 UTC on
2026-10-29:

- `GET /`, `GET /api/health` and `GET /discover` each answered `302` with
  `Location: https://vercel.com/sso-api?url=...` and an `X-Vercel-Id`, which is Vercel Deployment
  Protection at the edge, not an application error.
- The suite recorded the stop instead of pretending past it:
  `docs/readiness/beta/live-hosted-acceptance-preview-ee52e8c.json`, mode `hosted preview`, one check
  executed, `deployment reachable` failed on the redirect, `cookieSupplied false`, `bypassSupplied
  false`, identification never reached.
- The same suite run in local mode on this tree, against the same production build served from
  `.next`, passed 13 of 13 with 1 correctly skipped:
  `docs/readiness/beta/live-hosted-acceptance.json`, commit `ee52e8c`, served build `yqwyYPWj`,
  `checkedAt 2026-10-29T17:37:49Z`. That is the suite proving itself on the final code; it is not a
  hosted result and is not presented as one.

What is missing for a database-backed hosted environment:

- The preview has no isolated database. The two migrations a beta database needs, applied in order,
  are `sql/migrations/014_users_integrity_guards.sql` and `015_media_manifests.sql` (016 is required
  by the discussion request path). They were proved on a disposable cluster and have not been applied
  to any hosted database by this agent.
- The preview has no live email sender, so a hosted OTP sign-in cannot complete.
- The preview host is not reachable by a tester because of Deployment Protection.

Close it with founder items 1, 2 and 3. With a protection bypass the hosted run is one command and
takes minutes: `STYLD_TARGET_URL=https://<preview>.vercel.app STYLD_PREVIEW_BYPASS=<secret> node
tests/browser/live-hosted-acceptance.cjs`. With protection off for previews the same command runs
without the second variable.

## Pillar 4: Glass, signature loader, motion and performance

All numbers come from `docs/readiness/beta/STYLD_DESIGN_REFINEMENT_RECEIPTS.md` and the receipts it
names. Baseline build `BytOM8_wtHs94bCDE53Qw` at `e41a60d` (no loader), refined build
`yqwyYPWjOIB73R6FF_Irt` at `2fa521d`.

Glass:

- Layer counts per route after the refinement: landing 1, discover 3, look 2, creator 2, book 2.
  The baseline counted 1, 4, 3, 3 and 3, so four routes lost a blurred layer. Every blurred layer is
  10px on mobile, inside the 12px phone ceiling and the 18px desktop ceiling.
- 0 controls under 44px on any of the five mobile routes, 3 safe area CSS rules per route, and a
  10 stop keyboard trail per route with a drawn focus ring at every stop.
- Solid fallbacks are in the stylesheet for browsers without backdrop filter support, for reduced
  transparency and for forced colors, and reduced motion gets no overlay at all from the loader,
  proved in the browser suite rather than read from the CSS.

Signature loader:

- Unchanged Logo Book artwork (`StyldMark` and `StyldWordmark`), a CSS only reveal, no animation
  package, no WebGL, no particles, no counter, no spinning mark.
- Total 1700ms, with the mark still and fully visible for 620ms before the veil leaves, measured from
  live animation timings. Hard fail-safe at 2000ms. `app/loading.tsx` stays removed, pinned by test.
- One gesture per cold tab, guarded by `sessionStorage`, with seven skip reasons: seen, storage
  denied, reduced motion, reduced data, save data, hidden tab, and hydration later than 4000ms. Never
  on client navigation or re-entry, no hydration mismatch, reduced motion gets the page with no
  overlay at all.
- Browser evidence: 5 of 5 scenarios in `tests/browser/signature-loader.cjs` and 8 static tests in
  `tests/signature-loader.cjs`. Measured: 33 of 45 navigations reached the show path (21 observed
  mid animation, 12 already finished) and all 12 skips were Fast 3G late hydration.

Performance:

- 15 cells of ready time, LCP and CLS before and after. 12 of 15 ready cells are equal or lower.
  Three are higher and the receipt states them: `/looks` desktop 316ms, `/book` desktop 152ms,
  `/book` Fast 3G 1374ms inside a cell whose baseline spread was 1779 to 3762ms. CLS stays 0 except
  the creator page at 0.0308 desktop and 0.0842 mobile, unchanged from the baseline.
- Bundle delta: +2KB JavaScript (738KB over 169 files) and +1KB CSS (27KB).
- The stated tradeoff: on a cold desktop tab the veil covers content for roughly 600 to 700ms after
  first paint. On Fast 3G the load arrives after the 4000ms hydration guard, so the gesture mostly
  skips itself rather than delaying a slow visitor. No-loader baseline numbers exist for comparison.
- Accessibility sweep, `docs/readiness/beta/live-accessibility-audit.json` at `733b065`, 44 scans on
  8 routes and 8 viewports: 0 violations, 0 rule tally, no horizontal overflow at 200 percent text
  scaling across four routes, 409 elements declaring a duration with 0 over 50ms and 0 animations
  running under reduced motion, and a slow link whose feed reaches a terminal state with the wait
  announced (FCP 1948ms, terminal at 5984ms).
- First-render gate: 0 of 69 routes ship a loader-only shell, `gateExit 0`.

Not measured, and not claimed: iOS Safari (no device on this machine), real Kenyan hardware,
Lighthouse scores or threshold, and any hand decision on the 62 contrast incompletes.

## Gates run on the final tree

| Gate | Result | Receipt |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 errors | run at `ee52e8c` |
| `npm run lint` | 0 errors, 30 pre-existing image warnings | run at `ee52e8c` |
| `npm test` | 814 of 814 | run at `ee52e8c` |
| `npm run build` | exit 0, build `yqwyYPWjOIB73R6FF_Irt` | `.next` on this tree |
| First-render audit | 69 routes, 0 loader-only, exit 0 | `first-render-audit.json` |
| Disposable PostgreSQL | 28 of 28, 40 tables, cluster dropped | `docs/readiness/sprint4/postgres-result.json` |
| Browser suite board | 14 of 14 clean, 255 PASS lines | `mock-browser-suites.json` |
| Accessibility | 0 violations across 44 scans | `live-accessibility-audit.json` |
| Live authenticated journey | 14 of 14 steps | `live-auth-journey.json` |
| Visual and performance | 45 of 45 navigations usable | `visual-refined.json` |
| Hosted acceptance, local mode | 13 of 13, 1 skipped | `live-hosted-acceptance.json` |
| Hosted acceptance, deployed preview | 0 of 1, protection redirect | `live-hosted-acceptance-preview-ee52e8c.json` |

## What is deliberately off

Shop, Delivery, live payments, `PAYMENTS_LIVE`, `BOOKING_COMMITMENTS`, and IDEA-009 salon team
invitations and the Chair Model. None is enabled, each has a test that keeps it off, and no document
here promises any of them. A request to discuss is not a booking and is proved not to create one.

## Founder gates

Full detail, exact variable names and the smallest action for each are in
`docs/readiness/beta/STYLD_FOUNDER_ACTIONS_MINIMAL.md`. In order of what they unblock:

1. Open the preview to a tester: turn Standard Protection off for previews on the `sty-ld` project,
   or send a Protection Bypass for Shareable Links secret as `STYLD_PREVIEW_BYPASS`. Until then every
   anonymous request, including `/api/health`, answers 302 to Vercel SSO.
2. A disposable preview Postgres, not production, with migrations 014, 015 and 016 applied in order,
   and one line saying which database by name. Without it no account can be created, no post
   persisted, nothing read back.
3. A live email sender past the testing restriction (`RESEND_API_KEY`, verified `RESEND_FROM_EMAIL`)
   and one test inbox that may receive OTP mail. Without it a hosted sign-in cannot complete.
4. Cloudinary restricted delivery: a pending upload folder or tag made non-public and proved
   unreachable without a signature, plus `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `CLOUDINARY_SIGN_KEY`, `STYLD_RESTRICTED_MEDIA_ENABLED=true` and one
   `STYLD_MEDIA_ALLOWED_ORIGINS` HTTPS origin. Until then the route refuses rather than serving a
   public URL by accident.
5. The terms effective date and last updated date at `app/terms/page.tsx:29-31`. No date is invented.

## Nairobi market test

`docs/readiness/beta/STYLD_HOSTED_BETA_TEST_PLAN.md` is the runbook: 6 to 8 testers, device mix,
10 scripted journeys with pass sentences, stop conditions for any claim that a server record does not
back, the findings table, exit criteria, and the data policy. Items 1, 2 and 3 above must be closed
before the first session. After that the only new engineering work is whatever the sessions find.

## What this closeout does not say

It does not say the beta is 100 percent ready. A stranger cannot reach the deployment, no request to
it has reached the application, no hosted database exists, and no hosted OTP has been delivered.
Those are the founder gates, and they are the reason this reads READY EXCEPT FOR FOUNDER GATES rather
than ready.

## Documents in this closeout

- `docs/readiness/beta/STYLD_FINAL_4_PILLAR_CLOSEOUT.md`, this file.
- `docs/readiness/beta/STYLD_JOURNEY_ACCEPTANCE.md`, the six journeys with receipts.
- `docs/readiness/beta/STYLD_DESIGN_REFINEMENT_RECEIPTS.md`, glass, loader and performance numbers.
- `docs/readiness/beta/STYLD_HOSTED_BETA_TEST_PLAN.md`, the market test runbook.
- `docs/readiness/beta/STYLD_FOUNDER_ACTIONS_MINIMAL.md`, the five founder actions.
- `docs/readiness/beta/FOUNDER_ACTIONS.md`, the longer record including the closed `better-auth`
  decision.
- `docs/readiness/beta/DEPARTMENT_LEDGER.md`, one row per department finding.
