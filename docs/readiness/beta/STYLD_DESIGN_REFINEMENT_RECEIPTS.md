# STYLD design refinement receipts

Date: 2026-10-29
Branch: `qoder/styld-beta-20261027`
Final build under test: `yqwyYPWjOIB73R6FF_Irt` at `2fa521d` (measurement at `ceddeb6`)
Baseline build: `BytOM8_wtHs94bCDE53Qw` at `e41a60d`

This file records what was measured, what was changed because of it, and what is still not proven.
Every number below comes from a receipt a harness wrote while a production `next start` build ran
against an owned, disposable PostgreSQL 17.11 cluster on loopback. No route was intercepted.

Receipts:

- `docs/readiness/beta/visual-baseline.json`, no-loader baseline, build `BytOM8_wtHs94bCDE53Qw`,
  commit `e41a60d`, clean tree, written by `tests/browser/visual-baseline.cjs`.
- `docs/readiness/beta/visual-refined.json`, the same harness after the refinements, build
  `yqwyYPWjOIB73R6FF_Irt`, measured at commit `ceddeb6`. The build output was produced at `2fa521d`
  and `ceddeb6` changes only documents under `docs/`, so the measured application is `2fa521d`. The
  receipt's `workingTree` field says 16 changed paths, which were the receipt files the browser runs
  had written at that moment.
- `docs/readiness/beta/live-accessibility-audit.json`, build `yqwyYPWjOIB73R6FF_Irt`, commit
  `733b065`, clean tree, written by `tests/browser/live-accessibility-audit.cjs`.
- `tests/browser/signature-loader.cjs` log at `docs/readiness/beta/mock-suite-logs/signature-loader.txt`
  from the 14-suite board, plus its static guard `tests/signature-loader.cjs` inside `npm test`.

## Method

`tests/browser/visual-baseline.cjs` walks five guest routes under three conditions: 1440x900
unthrottled, 390x844 unthrottled, and 390x844 with Lighthouse Fast 3G values (150ms RTT, 1.6 Mbps
down, 750 kbps up) plus 4x CPU slowdown. Three samples per cell, a fresh browser context per sample,
third-party hosts aborted. Per cell it records time to the route's ready selector, LCP and its
element, CLS, long tasks, blocking time, request count, transfer size by type, the loader state, and
a mobile audit of controls under 44px, glass layers with their computed blur, safe-area CSS rules,
the viewport meta and a ten-stop keyboard trail with a drawn focus ring.

`ready` is a usability mark, not a paint metric: the first thing a visitor must see to act on that
page (a heading on the landing, creator and book pages, a Look card on Discover).

## Before and after

Ready time in milliseconds, median of three, baseline then refined:

| Condition | Route | Ready before | Ready after | LCP before | LCP after | CLS before | CLS after |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | `/` | 2674 | 2637 | 1896 | 2204 | 0 | 0 |
| desktop | `/discover?tab=looks` | 5440 | 4727 | 1864 | 1760 | 0 | 0 |
| desktop | `/looks/:id` | 4303 | 4619 | 1088 | 1092 | 0 | 0 |
| desktop | `/creators/:id` | 3681 | 3323 | 1272 | 1276 | 0.0308 | 0.0308 |
| desktop | `/book` | 2003 | 2155 | 1268 | 960 | 0 | 0 |
| mobile | `/` | 3203 | 2434 | 1968 | 2016 | 0 | 0 |
| mobile | `/discover?tab=looks` | 4449 | 4418 | 1476 | 1688 | 0 | 0 |
| mobile | `/looks/:id` | 4013 | 3935 | 1404 | 1416 | 0 | 0 |
| mobile | `/creators/:id` | 4048 | 3458 | 1388 | 1376 | 0.0842 | 0.0842 |
| mobile | `/book` | 2099 | 2073 | 1144 | 1264 | 0 | 0 |
| Fast 3G | `/` | 5454 | 4332 | 3864 | 2976 | 0 | 0 |
| Fast 3G | `/discover?tab=looks` | 6607 | 6485 | 1864 | 2048 | 0 | 0 |
| Fast 3G | `/looks/:id` | 6823 | 5867 | 1640 | 1448 | 0 | 0 |
| Fast 3G | `/creators/:id` | 6530 | 6079 | 1572 | 1884 | 0.0842 | 0.0842 |
| Fast 3G | `/book` | 2843 | 4217 | 1612 | 1504 | 0 | 0 |

Twelve of fifteen ready cells are equal or lower. Three are higher: `/looks` on desktop by 316ms,
`/book` on desktop by 152ms, and `/book` under Fast 3G by 1374ms. That last cell had the widest
spread in the baseline of any cell (minimum 1779ms, maximum 3762ms), so the median move is inside the
run-to-run noise of one Windows host rather than a claimed cost of the change. The statement is made
here rather than dropped because a reader comparing the two receipts will find the number.

Bundle bytes, gzipped, measured from `.next/static` on each build:

| | Baseline | Refined | Delta |
| --- | --- | --- | --- |
| JavaScript | 736 KB over 169 files | 738 KB over 169 files | +2 KB |
| CSS | 26 KB | 27 KB | +1 KB |

No Lighthouse score is quoted anywhere in this work, so the directive's "about 3 points" target is
not claimed. The equivalent lab numbers are ready time, LCP, CLS and bytes, and they are above.

## Glass

The rules taken from the directive: only floating layers, at most one blurred layer per viewport
region, no glass on glass, solid fallback everywhere it can be missing, 12px or less on phones.

Baseline finding, from the mobile audit of the baseline receipt:

| Route | Blurred layers (blur each) | Undersized controls |
| --- | --- | --- |
| `/` | 1 (header, 12px) | 6 |
| `/discover?tab=looks` | 4 (header 40px, pill 16px, hero 16px, bottom nav 16px) | 5 |
| `/looks/:id` | 3 (header 40px, pill 16px, bottom nav 16px) | 0 |
| `/creators/:id` | 3 (header 40px, pill 16px, bottom nav 16px) | 4 |
| `/book` | 3 (header 40px, pill 16px, bottom nav 16px) | 0 |

Two blurred layers sat in one region on every signed-in page (the 40px header and the 16px pill inside
it), and phone blur was 16px, above the 12px ceiling. The landing header was 12px, at the ceiling
rather than under it.

Changes, all in the existing cascade and existing tokens:

- `components/marketplace-ui.tsx`: the sticky header no longer blurs. Its `--header-bg` is 94 percent
  opaque, so the blur bought nothing but cost a compositor layer. One blurred layer per region.
- `app/globals.css`: `.world-glass` is 10px on phones and uses the existing `--world-glass-blur` token
  (14 to 18px per world) only from 768px, so those values never reach a phone. `components/landing-client.tsx`
  moved from 12px to 10px.
- Solid fallbacks for `@supports not (backdrop-filter)`, `prefers-reduced-transparency: reduce`,
  `forced-colors: active` and `html[data-save-data="true"]`, all rendering `var(--world-panel)`.
- `components/theme-applicator.tsx` sets `data-save-data` from the connection hint, so a data-saver
  phone gets the solid panel rather than a blur it cannot afford.

Refined measurement, mobile audit:

| Route | Glass layers | Maximum blur | Undersized controls |
| --- | --- | --- | --- |
| `/` | 1 (header) | 10px | 0 |
| `/discover?tab=looks` | 3 (tab pill, hero search, bottom nav) | 10px | 0 |
| `/looks/:id` | 2 (header pill, bottom nav) | 10px | 0 |
| `/creators/:id` | 2 | 10px | 0 |
| `/book` | 2 | 10px | 0 |

Undersized controls went from 15 across the five routes to 0, by giving the landing marks, the footer
links (both directions, `min-w-11` as well as `min-h-11`) and the Discover filters button a 44px box.

`tests/signature-loader.cjs` pins the rules rather than describing them: the 10px phone rule, the
768px switch to the token, each of the four fallbacks, the absence of `backdrop-blur-2xl` in the
audited components, the `viewport-fit=cover` meta and the bottom-nav safe-area rule.

## Signature loader

The artwork is the shipped `StyldMark` and `StyldWordmark` from `components/styld-logo`, unchanged.
`components/signature-loader.tsx` renders them inside two clips that open by CSS keyframes, and a
veil that fades after 1380ms. No animation package is imported; the static guard fails the build if
one is, or if the logo module pulls anything beyond itself and React.

Timing, asserted from the live animations by `tests/browser/signature-loader.cjs`: wordmark reveal
starts at 240ms and ends at 760ms, the veil starts at 1380ms, so the lockup is still and fully
visible for 620ms, above the Logo Book's 600ms hold. The whole gesture is 1700ms, inside the
1.5 to 1.75s draft target, and the reveal runs once.

Guards, in the order the component applies them: a tab that has already seen the gesture
(`sessionStorage`), storage denied, reduced motion, reduced data, save-data, a hidden tab, and
hydration later than 4000ms. The last one is the "do not cover content the visitor is already using"
rule. A hard fail-safe removes the overlay at 2000ms whatever else happens. The overlay carries
`aria-hidden="true"` and `pointer-events: none`, so it is invisible to assistive technology and never
swallows a press. There is no `app/loading.tsx`, and the first-render gate still reports 0 of 69
routes that paint nothing.

What the measurement says about when it plays, from the 45 cold navigations in the refined receipt:

| Condition | Played (still up or already finished) | Skipped for late hydration |
| --- | --- | --- |
| Desktop, unthrottled | 15 | 0 |
| Mobile, unthrottled | 15 | 0 |
| Mobile, Fast 3G with 4x CPU | 3 | 12 |

So the gesture shows on every unthrottled navigation and skips itself on the constrained profile, which
is the behaviour the directive asked for on constrained devices. Three of the fifteen Fast 3G
navigations still played; the harness records the state, not the cause, so the honest statement is
that twelve skipped for late hydration and three did not, on the same throttled profile in the same
run.

A separate six-load measurement on the same build, on an otherwise idle host, put the mount between
3017ms and 4069ms in five of six loads and 5966ms in one. The document itself arrived in 55 to 312ms,
so that spread is client-side work and host scheduling, not network. Two statements follow, and both
belong in the handover:

- The loader can only mount after React hydrates, so on this application it appears about 600 to 700ms
  after first contentful paint rather than before it. It covers already painted content for 1.7s on a
  first visit. Input passes through it, but the visitor does see the veil over content they had begun
  to read. This is the trade the directive's veil sequence makes, and it is recorded rather than
  glossed.
- The 4000ms guard is doing real work. Without it, a phone on a slow network would get the veil over
  content it had waited seconds for.

The browser suite covers five scenarios against the shipped build: the cold tab paints the mark and
wordmark and clears inside 1.7s; the hold is at least 600ms and the reveal does not loop; a reload in
the same tab never replays it; reduced motion gets no overlay at all; and while the veil is up, the
centre of the screen resolves to the page behind it with no horizontal overflow and no page errors.
It retries the cold load up to four times because the product correctly skips when hydration lands
after 4000ms and this host spikes past that now and then; each attempt is printed with its mount time,
and no timeout was relaxed.

## Accessibility and interaction

`docs/readiness/beta/live-accessibility-audit.json`, build `yqwyYPWjOIB73R6FF_Irt`, clean tree:

- axe-core across eight viewports and the guest routes: 0 violation nodes. 62 nodes were reported
  `incomplete` for color contrast, which means axe could not grade them (gradients and images behind
  text), not that they pass. Contrast at the token level is enforced separately by
  `tests/theme-contrast-regressions.cjs`, which fails below 4.5:1 for body text and 3:1 for large
  text and interface edges across the light and dark palettes.
- The first violation this sweep found was `scrollable-region-focusable` on `/discover` at 375 and
  430px: the pending tab strip scrolled sideways with its tabs disabled, leaving no focusable child.
  Fixed in `components/discover-content.tsx` by making that strip a labelled, focusable group only
  while it is pending, which is exactly the state axe flagged. The re-run is the receipt above: 0.
- Keyboard trail: the first tab stop was reachable in 232 to 510ms, and one focus stop of fourteen
  was lost on `/auth/sign-in` and `/compare`. The audit records those as findings, not failures, with
  a failure threshold of more than three lost stops in fourteen.
- Reduced motion: 409 elements declare a duration and none exceeds 50ms with the preference on, no
  animations running.
- 200% text scaling across four routes: no horizontal overflow.
- Slow link (400ms RTT, 1.6 Mbps, 4x CPU): first paint 1948ms, the feed reached its terminal state as
  cards at 5984ms, and a status sentence was announced while it loaded.
- Offline: with a page open, the STYLD notice appears from the browser's offline event with the copy
  "You are offline right now. Nothing has been sent...". Offline reload shows the browser's own
  network error page, because nothing is cached by design.

## Not measured

- iOS Safari: NOT RUN. This host has Windows and the installed Chrome only. The mobile numbers come
  from Chrome device emulation with CDP network and CPU throttling, which is not an iPhone.
- Real hardware in Kenya: NOT RUN. No device on a Kenyan mobile network was used.
- Lighthouse: not run, so no score is claimed before or after.
- The 62 contrast nodes axe could not grade: not individually checked by hand.
