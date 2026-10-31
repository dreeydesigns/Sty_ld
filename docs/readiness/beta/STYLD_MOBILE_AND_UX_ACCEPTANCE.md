# STYLD mobile and UX acceptance

Date: 2026-10-30
Branch: `qoder/styld-beta-20261027`
Every measured figure below names the build it was measured on. Two of those builds are older than the
code in this branch, and the last section says exactly which numbers have not been re-taken.

Statuses: VERIFIED COMPLETE, IMPLEMENTED BUT UNVERIFIED, IN PROGRESS, BLOCKED, DEFERRED, SUPERSEDED,
FAILED ACCEPTANCE.

## The honest headline

The mobile experience is designed, built and measured on Chrome for Windows at phone viewports. It has
never been run on an iPhone, on Safari, or on a Kenyan handset, and no device in this workspace could
have done it. Anyone who reads the numbers below as "tested on mobile" is reading more than this
evidence supports.

## Accepted (measured, receipt named)

| Area | Status | Measurement |
| --- | --- | --- |
| First render ships words | VERIFIED COMPLETE | `first-render-audit.json`, 69 prerendered routes, 0 ship a loader-only shell, `gateExit 0`, written against build `xsIdSgdtr9XptiCR2L-t4` at `5bd494a`. 18 routes answer with a redirect by design, 5 paint a declared wait, 21 paint a thin but real body, 1 answers 404 (`/auth/preview`). |
| Touch targets | VERIFIED COMPLETE | 0 controls under 44px on any of the five mobile routes; the footer links, the landing marks and the Discover filters button were raised to 44px in both directions after the baseline found five 28px logo links and 16 to 20px footer links (`STYLD_DESIGN_REFINEMENT_RECEIPTS.md`). |
| Glass discipline | VERIFIED COMPLETE | Mobile blur is 10px on every audited route, inside the 12px phone ceiling; layer counts after refinement are landing 1, discover 3, look 2, creator 2, book 2, and the baseline counted 1, 4, 3, 3, 3. Solid fallbacks exist for no `backdrop-filter`, `prefers-reduced-transparency`, `forced-colors` and save-data, and `tests/signature-loader.cjs` pins the rules. |
| Safe area and keyboard trail | VERIFIED COMPLETE | Three safe-area CSS rules per route and a 10-stop keyboard trail per route with a drawn focus ring at every stop. |
| Accessibility, the decidable half | VERIFIED COMPLETE | `live-accessibility-audit.json`, 44 axe scans over 8 routes and 8 viewports: 0 violations and an empty rule tally; 0 horizontal overflow at 200 percent text scaling across four routes; 409 elements declaring a duration, 0 over 50ms, and 0 animations running under reduced motion. |
| The signature gesture | VERIFIED COMPLETE | 1700ms total with the lockup still and fully visible for 620ms before the veil leaves, a 2000ms fail-safe, one gesture per cold tab and seven skip reasons. `tests/browser/signature-loader.cjs` proves the cold paint, the reload skip, the reduced-motion skip and that the screen centre still resolves to the page behind the veil. |
| Perceived load on a slow connection | VERIFIED COMPLETE | The feed reaches a terminal state on a throttled link with the wait announced (FCP 1948ms, terminal at 5984ms in `live-accessibility-audit.json`), and the offline notice states a negative rather than a delivery claim. |
| Compare waiting behaviour | VERIFIED COMPLETE | `compare-wait-stress.json`: rows p50 3078ms and p95 3993ms at 3G with 4x CPU while the same server answered `GET /api/plan` in 52ms p50. The gap is browser-side, and the fix is a slower-connection sentence plus a retry that appears only after a measured 6s threshold, asserted by `tests/browser/compare.cjs`. No locator timeout was relaxed. |

## Not accepted, and what is missing

| Item | Status | What a reader must not conclude |
| --- | --- | --- |
| iOS Safari | IN PROGRESS, and NOT RUN to date | No iPhone, no iOS simulator, no Safari on this machine. Nothing about WebKit's `backdrop-filter`, safe-area or scroll behaviour has been observed. |
| Real Kenyan handsets (Tecno, Infinix, mid-range Android) | IN PROGRESS, and NOT RUN to date | The phone viewports here are Chrome at 390x844 and 360px, which is a size, not a device. CPU throttling was simulated at 4x; a low-end Android is not that. |
| 63 axe `color-contrast` nodes (62 on the 2026-10-30 build) | BLOCKED on a human decision | They came back *incomplete*, which means axe did not decide them, because the harness aborts third-party asset hosts and text over a webfont is graded against fallback metrics. The pairs axe did decide pass (0 violations). No run hand-checked them, and this file does not claim they are fine. |
| Lighthouse | DEFERRED, never quoted | No run in this work produced a Lighthouse score, so the "about 3 points" target in the directive cannot be accepted or rejected. The lab equivalents that were measured (ready time, LCP, CLS, bundle bytes) are in `STYLD_DESIGN_REFINEMENT_RECEIPTS.md`. |
| Tour behaviour on a second workspace | DEFERRED, with the residual stated | The tour key is `workspace:<id>:<role>`. If the signup hook that creates the client workspace ever failed, the key would flip to `role:client` and a dismissed tour would return. Not reproducible today, so no fix was invented. |
| Motion preference | VERIFIED COMPLETE | Reduced motion gets the page with no overlay at all, and no animation runs under it; proved in the browser suite rather than read from CSS. |

## Performance figures, with the tradeoff stated

Refined build `yqwyYPWjOIB73R6FF_Irt` against baseline `BytOM8_wtHs94bCDE53Qw`: 12 of 15 ready-time
cells equal or lower, three higher (`/looks` desktop 316ms, `/book` desktop 152ms, `/book` Fast 3G
1374ms inside a cell whose own baseline spread was 1779 to 3762ms). CLS stays 0 except the creator page
at 0.0308 desktop and 0.0842 mobile, unchanged from the baseline. Bundle delta +2KB JavaScript (738KB
over 169 files) and +1KB CSS (27KB).

The trade is stated in the receipts and repeated here: on a cold desktop tab the veil covers content for
roughly 600 to 700ms after first paint, because a client component can only mount after hydration. On
Fast 3G the gesture skips itself on 12 of 15 navigations, which is the constrained-device behaviour the
brief asked for rather than a further delay for the slowest visitor.

## Re-measured on the current build, 2026-10-31

The browser receipts that describe build `yqwyYPWjOIB73R6FF_Irt` were re-run on the 2026-10-31 artifact,
`YHmKlFY-FAfZVz0NcHCHD`, at `cb9d34b`, one harness at a time with nothing else on the machine. The
earlier note that this could not be done was wrong: PostgreSQL 17.11 is installed at
`C:\Users\Muti\AppData\Local\STYLD-Sprint4-PostgreSQL-17.11\pgsql\bin`.

- `mock-browser-suites.json`: 14 of 14 suites clean, 255 PASS lines.
- `live-auth-journey.json`: 14 of 14 steps.
- `live-accessibility-audit.json`: 44 scans, 0 content violations.
- `live-first-render.json`: 8 first paints, 2 throttled journeys, `failures []`.
- `live-hosted-acceptance.json`: 13 pass, 1 skipped by design, local mode.
- `docs/readiness/sprint4/postgres-result.json`: 28 of 28, 0 initial rows, cluster dropped.

Two readings are kept rather than smoothed. One combined board run returned 13 of 14 because
`plan-v2.cjs` timed out 30s on a click mid-suite; run alone it printed 50 of 50, and the next full
board was clean, so it is recorded as a transient stall. The first accessibility run reported one
`color-contrast` violation, and the node was the `aria-hidden` signature splash while it faded (1.17:1
from a partially transparent wordmark); the scan now waits for the splash to leave the document, and
the finding is recorded in `DEPARTMENT_LEDGER.md` rather than deleted.

`visual-baseline.json` and `visual-refined.json` were not re-run in this round. They are a two-build
comparison (baseline `BytOM8_wtHs94bCDE53Qw` against refined `yqwyYPWjOIB73R6FF_Irt`), and re-running
one side alone would produce a delta between two builds neither of which is the other's counterpart.
The figures in the performance section below therefore still name those two builds, and that is
stated rather than carried over silently.

## What a tester will actually notice on a phone

Short and plain, from the accepted rows: pages show words immediately, the glass is light, buttons are
big enough for a thumb, the brand gesture plays once and never on a return, a slow connection is
announced rather than silently waited on, and nothing in the interface says a thing is saved, sent,
booked or paid unless the server recorded it.
