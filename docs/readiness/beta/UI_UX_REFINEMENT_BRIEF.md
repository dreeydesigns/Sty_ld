# STYLD UI/UX refinement brief (prepared, not implemented)

Written during the private-beta push so the next phase can start the day the beta gate is
declared met. Nothing in this file has been built. Directive section 12 says plainly not to begin
a cosmetic redesign while material beta blockers remain, and the material blockers in
`DEPARTMENT_LEDGER.md` are still open: preview provisioning, provider-side media restriction, and
the deferred scope items. This is a plan, not a diff.

## What is already true, so refinement does not repeat it

- Accessibility has a measured floor, not a hope. The live audit on the current build reports zero
  axe violation nodes across the swept routes and viewports, keyboard tab stops reach real content
  (first tab stop at 954ms on `/auth/sign-in`, 1723ms on `/discover?tab=looks`), and touch-target
  counts are recorded per route.
- Reduced motion is honoured: `app/globals.css` carries `prefers-reduced-motion` blocks and the
  tour and atmosphere components read `matchMedia` before animating.
- The wait is said by the route, not by a shell. The root `app/loading.tsx` was removed once it was
  measured as the defect (a segment fallback that replaced the page instead of describing the wait),
  so every route paints its own words: `/discover` a labelled "Loading looks" skeleton, `/book`
  "Loading the plan builder.", `/dashboard` "Taking you to your workspace." with a link for a visitor
  without JavaScript, and the session-gated pages their own announced spinner. `npm run
  verify:first-render` fails a build where a content route paints no words, and a guard test fails if
  a route-level `loading.tsx` is added back. What this leaves traded: App Router has no spinner during
  a client-side navigation, so the previous screen stays until the next one is ready.
- Contrast has already been tuned for text: `--color-clay-text` is documented in the token file as
  the darkened clay that reaches 4.7:1 on a light background.
- The brand is not being changed. Logo, Logo Book v2.0 and the existing palette stay as they are;
  the only brand observation is a question, recorded in the handover limitations: the shipped
  tokens are `--color-ink #1D1D1B`, `--color-clay #C0A090` and `--color-sage #909888`, while the
  brief lists Deep Ink `#1A1A2E`, Clay `#C4A495` and Sage `#939B8A`, and no `#C2707A` rose appears
  in `app/globals.css`. Whichever set is canonical is a founder decision, not a design preference.

## The one item that is not cosmetic

Forty-eight of seventy routes ship first-paint HTML containing only the loading shell, about
forty characters of visible text, because the page is a client component that reads search params
with no Suspense boundary. On a throttled Kenyan link the feed then reaches content in roughly
4.3 seconds, and the wait is bundle download rather than API latency. Per-route skeletons, branded
loading and motion polish all sit behind this, because a skeleton inside a client component that
has not hydrated yet is invisible. Scope it as engineering, decide the pattern once, and let the
cosmetic layer ride on top.

## Proposed sequence, smallest first

1. Loading language. One branded loader treatment, defined once as a token set and one component,
   used by the route shell, feed surfaces and image placeholders. Today a bloom in `loader-bloom`
   and per-component spinners do the same job differently. Constraint: keep the announced status
   semantics that already exist, and keep the decorative layer `aria-hidden`.
2. Skeleton system, once the Suspense decision is made. Feed cards, provider profiles and the
   compare table each get a shape that matches the real layout, so a card appearing does not move
   the page. A skeleton must never look like content: no placeholder names, no fake ratings, no
   invented prices. This is the rule that limits how much can be faked here.
3. Motion consistency. The same interaction repeated should feel the same way each time: tab
   switches, sheet open and close, card press. Proposed as a small set of named durations and easings in
   `app/globals.css`, then applied by removing ad-hoc transitions rather than adding new ones.
   Every addition keeps the existing reduced-motion escape.
4. Restrained glassmorphism. Applied only where a surface genuinely floats above content, the
   bottom navigation and the two overlay sheets, and only with the existing Warm White and Deep
   Ink tokens. Explicitly not applied to cards, forms or article surfaces: a marketplace of real
   photographs loses legibility when everything is translucent, and translucency costs contrast
   the audit currently passes.
5. Responsive navigation. The nav already survives keyboard and touch-target measurement; this is
   a hierarchy question, not a defect list. Decide the three destinations a signed-in client needs
   with one hand on a phone, and let the rest live in the account sheet.
6. Hierarchy and contrast pass. Headings, body and metadata at each of the three viewports the
   audit already sweeps, measured against the same axe run so the result is comparable to the
   floor above rather than a new opinion.

## What must not be lost while doing any of it

- The zero-violation axe result, the announced loading status, and the honest offline notice.
- Every copy-truthfulness test in `tests/booking-trust-copy.cjs`,
  `tests/provider-dashboard-trust-copy.cjs`, `tests/trust-copy-public.cjs` and
  `tests/counter-trust-integrity.cjs`. A prettier surface that reclaims a payment, a verification
  or a delivery is a regression, not a polish.
- The touch-target and keyboard numbers the live audit records, which are the only reason the
  claims above are evidence rather than intent.
