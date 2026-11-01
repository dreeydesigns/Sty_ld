# STYLD official domain activation and MVP closure

Date: 2026-10-31 (UTC readings taken 10:53 to 10:55 on the same day)
Branch: `qoder/styld-beta-20261027`
Local HEAD at the time of writing: `1470313`
Build under test: `Xg8lckpQBCbH4LvP5wTSg`, produced from `ba06ae6`
Deployed preview: sha `683f8c3`, deployment `7436081921`, environment `Preview - sty-ld`, three
successful statuses, hostnames `sty-8199odmu9-`, `sty-kooa18rsx-`, `sty-avxpyxv3n-` on
`dreeydesigns-3368s-projects.vercel.app`
Official domain claimed by the founder: `https://wearestyld.com`
Beta hostname proposed: `https://beta.wearestyld.com`

## Verdict

`NOT READY — BLOCKING ACTIONS REMAIN`

The wording is the directive's literal, dashes included; it is the only place in this file that carries
one.

That is the honest verdict, not a partial one. Four of the six founder-reported mobile defects are
fixed in code with tests, the whole local gate set passes on the current commits, and the domain
record is now measured rather than assumed. What is missing cannot be produced from this workspace:
no deployment is attached to any `wearestyld.com` hostname, no certificate exists for any of them, no
hosted database or mail sender has been reconciled, and no real phone has run any of this.

## Stage 0, read-only domain evidence

Every line below is a probe this agent ran and recorded. Nothing here changed a setting, a record or a
deployment.

| Reading | Result |
| --- | --- |
| Nameservers for `wearestyld.com` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com`, so DNS is delegated to Vercel |
| Apex `A` records | `216.198.79.1`, `64.29.17.1` |
| `www.wearestyld.com` | answers from the Vercel edge, same zone |
| `beta.wearestyld.com` | resolves to `64.29.17.1`, `216.198.79.65` |
| `http://wearestyld.com/` | `404`, `Server: Vercel`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `http://www.wearestyld.com/` | `404`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `http://beta.wearestyld.com/` | `404`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `https://` on all three | TLS handshake fails before any HTTP response (curl error 35), so no certificate is issued |

What follows from that, stated plainly: the zone is pointed at Vercel and Vercel answers, but no
release is attached to any of the three hostnames. `wearestyld.com` is not live, `www` cannot redirect
because nothing answers on it, and `beta` is a name without a deployment. A Vercel certificate is only
issued once a deployment is attached, which is why all three HTTPS attempts die at the handshake.

The handover package this mission was told to read first is not on disk. Only
`STYLD_Qoder_Domain_Investor_Readiness_and_Final_Backlog_2026-10-31.md` and
`STYLD_Active_MVP_and_Visual_Refinement_Backlog_2026-10-28 (1).md` are present in
`C:\Users\Muti\Downloads`; the ZIP and the iPhone screenshots referenced in the mission are absent. The
tour defect in particular cannot be reproduced without them.

## What this phase actually changed

| Commit | Defect | Change | Test |
| --- | --- | --- | --- |
| `7a4a514` | MOBILE-MEDIA-04 | `components/image-upload-editor.tsx`, `lib/image-prep.ts` | `tests/image-editor-truthfulness.cjs` (6) |
| `bd118ad` | MOBILE-A11Y-05, MOBILE-TYPE-06 | `components/signature-loader.tsx`, `components/onboarding-tour.tsx`, `components/scroll-to-top.tsx`, `components/theme-applicator.tsx`, `app/globals.css` | `tests/a11y-settings-enforcement.cjs` (3), `tests/signature-loader.cjs` (9) |
| `77d5eac` | MOBILE-PROFILE-02 | `components/role-profile-workspace.tsx` | live audit route `/account`, plus the board |
| `ba06ae6` | MOBILE-PLAN-03 | `components/appointment-planning.tsx`, `lib/plan-catalogue.ts` | `tests/plan-catalogue-controls.cjs` (4) |
| `38f3f02` | MVP-02 evidence | `docs/readiness/beta/first-render-audit.json` | `tests/first-render-receipt-provenance.cjs` |
| `1470313` | suite determinism | the two tour harnesses and the MFA replay case | the full suite |

The media defect had four separate causes, all of them real rather than cosmetic: the advanced editor
opened with `rawUrl` never assigned, so the preview was black and Save was a no-op; the confirm path
handed a blob URL to a function that only decodes data URLs, producing a zero-byte upload; every photo
printed a percentage saved that had not been computed; and a failed upload fell back to storing a local
data URL as though it were a hosted asset. The editor now uploads the file `prepareImage` produced,
revokes its blob URL, redraws filters in pixels where the canvas `filter` property is unavailable
(which is the old-iOS case), and reports the true size delta in both directions.

The text-size setting used CSS `zoom` on the root element. `zoom` also scales `100vw` and the viewport
units the mobile shell is built on, which is how large text pushed fixed-width layouts off the screen.
It now scales the root font size, which is what rem-based type and spacing follow.

## The gate set on these commits

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0, no output |
| `npm run lint` | PASS, exit 0, 0 errors, 30 pre-existing `no-img-element` warnings |
| `npm test` | PASS, 840 of 840, 0 failures, exit 0, 6.6 min |
| `npm run build` | PASS, exit 0, 117 routes generated, build `Xg8lckpQBCbH4LvP5wTSg` |
| First render | PASS, 69 audited routes, 0 loader-only, `gateExit 0` |
| Live accessibility audit on the new build | PASS, exit 0: 44 axe scans, 0 violation nodes, 0 rule failures, `200% text scaling across 4 routes: 0 pages overflow horizontally`, and under reduced motion 409 declared durations with 0 over 50ms and 0 animations running. Receipt `live-accessibility-audit.json` names build `Xg8lckpQBCbH4LvP5wTSg` and commit `1470313` |

The audit did raise one number that must not be read as a pass: axe left 128 `color-contrast`
incomplete nodes across the sweep, against 63 in the previous receipt. Incomplete is not a violation
and not a pass, it is axe saying it could not compute the answer, mostly because third-party asset
hosts are aborted in these runs. Nobody has hand-checked the 128, so they stay an open item under
DESIGN-06 rather than a closed one.

The first full run of `npm test` on this tree failed three cases: both onboarding-tour harnesses could
not resolve the settings store the tour now imports, and the MFA replay case pinned `last_step` to the
current 30 second window, which a boundary crossing mid-assertion could overtake. All three were
harness or case defects, fixed in `1470313`; the product code was not changed to make them pass.

## Closure matrix

Statuses are the seven the directive allows. VERIFIED COMPLETE always names its environment, and
"local" here means a production `next start` build on this machine against an owned disposable
PostgreSQL 17.11 cluster with loopback mail. Nothing is VERIFIED COMPLETE on hosted infrastructure,
because no hosted request has yet reached the application.

### MVP

| Item | Status | Environment and evidence |
| --- | --- | --- |
| MVP-01 Migration 015 validation and gates | VERIFIED COMPLETE | local disposable cluster, 28 of 28 at `cb9d34b`, migrations `001` to `016` unchanged since; gates re-proven above |
| MVP-02 Shell-only content routes | VERIFIED COMPLETE | local, `first-render-audit.json` on `Xg8lckpQBCbH4LvP5wTSg`: 69 routes, 0 loader-only |
| MVP-03 Non-production preview database | BLOCKED (founder) | no isolated hosted database exists that this agent can name or read; `POSTGRES_URL` is reported as shared between Production and Preview |
| MVP-04 Controlled tester access | BLOCKED (founder) | Deployment Protection answers anonymous requests with its own login redirect |
| MVP-05 Hosted Better Auth and real OTP | BLOCKED (founder) | `RESEND_FROM_EMAIL` reported absent; `lib/auth-readiness.ts` answers not configured; no code has ever been delivered to a tester |
| MVP-06 Pending media restricted server-side | VERIFIED COMPLETE for the application; BLOCKED for the provider | local: `tests/media-restricted-delivery.cjs` (10), `tests/media-upload-gate.cjs` (7); the provider-side attestation is a founder reading of Cloudinary |
| MVP-07 Mobile UX defects | BLOCKED | four of six defects fixed in code with tests, one has no reproduction evidence, and none has been run on a phone; see the MOBILE rows |
| MVP-08 Deployed role journeys and authorization | VERIFIED COMPLETE local, BLOCKED hosted | local live journey 14 of 14; hosted runs record the stop at the SSO redirect |
| MVP-09 Backlog and evidence reconciliation | VERIFIED COMPLETE local | this file, `STYLD_FINAL_MVP_COMPLETION_MATRIX.md`, `DEPARTMENT_LEDGER.md` |

### JOURNEY

| Item | Status | Environment and evidence |
| --- | --- | --- |
| JOURNEY-01 Look to plan service handoff | VERIFIED COMPLETE | local, live journey step 4 and `tests/look-contract.cjs` |
| JOURNEY-02 Plan v2 persistence and conflict | VERIFIED COMPLETE | local, live journey steps 4 and 6, `tests/browser/plan-v2.cjs` |
| JOURNEY-03 Truthful estimate | VERIFIED COMPLETE | local, `components/plan-estimate.tsx`, live journey step 5, plan truthfulness cases |
| JOURNEY-04 Two to three provider compare | VERIFIED COMPLETE | local, `compare-wait-stress.json`, `tests/browser/compare.cjs` |
| JOURNEY-05 Non-binding request and consent | VERIFIED COMPLETE | local, live journey step 6, `tests/discussion-requests.cjs` (13), `tests/postgres/discussion-requests.cjs` (4), migration `016` |
| JOURNEY-06 Moderation and fixtures | VERIFIED COMPLETE for the code and live path; BLOCKED for provider media | local, live journey step 10, `tests/postgres/moderation.cjs` |

### DESIGN

| Item | Status | Environment and evidence |
| --- | --- | --- |
| DESIGN-01 Six-world glass audit | VERIFIED COMPLETE | local, `STYLD_DESIGN_REFINEMENT_RECEIPTS.md` |
| DESIGN-02 Restrained floating glass | VERIFIED COMPLETE | local, 10px mobile blur on every audited route, one layer per region |
| DESIGN-03 Semantic tokens and fallbacks | VERIFIED COMPLETE | local, token overrides plus forced-colors, reduced-transparency and no-blur fallbacks in `app/globals.css` |
| DESIGN-04 Signature loader | VERIFIED COMPLETE | local, `tests/browser/signature-loader.cjs` (5 scenarios) plus the settings skip now wired to the in-app Reduce Motion switch |
| DESIGN-05 Contextual loading and recovery | VERIFIED COMPLETE | local, first-render audit plus the offline and network cases |
| DESIGN-06 Performance and accessibility specimen | VERIFIED COMPLETE local, device rows NOT RUN | `visual-baseline.json`, `visual-refined.json` and the re-run `live-accessibility-audit.json` on `Xg8lckpQBCbH4LvP5wTSg`: 0 violations, 0 overflow at 200 percent. Two things are not closed: 128 `color-contrast` incompletes nobody has hand-checked, and iOS Safari plus low-end Android remain unrun |
| DESIGN-07 Reference audit and founder approval | BLOCKED (founder) | no Stage A selection or approval artifact exists in this repository, and design work is gated on it |
| DESIGN-08 Journey aesthetic polish | BLOCKED | its own gate is a working private beta, which does not exist yet |

### DOMAIN

| Item | Status | What is missing |
| --- | --- | --- |
| DOMAIN-01 Purchase, renewal, DNS, ownership | BLOCKED (founder evidence) | DNS delegation to Vercel is measured above; registrar receipt, renewal date and account ownership cannot be read from this workspace, and the directive requires provider evidence |
| DOMAIN-02 Attach apex, `www` canonical redirect | BLOCKED (founder) | all three hostnames answer `DEPLOYMENT_NOT_FOUND`; attaching a domain is a Vercel account action, and the reviewed release is not even deployed from these commits yet |
| DOMAIN-03 Isolation and auth on custom hosts | BLOCKED (founder) | branch-scoped `POSTGRES_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_FROM_EMAIL` and `EMAIL_PROVIDER` values cannot be read from here; a variable-name listing proves names exist, not values, and this agent refuses to treat that as isolation |
| DOMAIN-04 Branded sender, SPF, DKIM, DMARC, real OTP | BLOCKED (founder) | a registered domain is not a mail subscription; no sender is verified and no OTP has been delivered to an allowed inbox |
| DOMAIN-05 Propagation, TLS, HSTS, redirects, metadata, robots | BLOCKED (founder) | propagation is measured; TLS is absent (handshake fails), so HSTS, redirects, canonical URLs and social previews cannot be validated on a host. Locally: `app/robots.ts` disallows every crawler on every deployment, which is safe but not yet split into public and beta rules, `app/favicon.ico` exists, and the root layout sets no `metadataBase`, so absolute OG URLs cannot be produced |
| DOMAIN-06 Invite-only beta on a stable hostname with exact SHA | BLOCKED (founder) | no stable custom hostname serves any build, and the deployed preview still runs `683f8c3` while this work sits on `1470313` |

### MOBILE

| Item | Status | Detail |
| --- | --- | --- |
| MOBILE-TOUR-01 Eight-step walkthrough positioning | BLOCKED, no evidence | the promised screenshots and the handover ZIP are not on disk. The eight client steps, the mobile bottom-sheet layout and the spotlight rules are pinned by `tests/onboarding-tour-regressions.cjs` and
`tests/onboarding-tour-persistence.cjs`, and the stored Reduce Motion setting now silences tour
scrolling. No positioning change was made on a guess |
| MOBILE-PROFILE-02 Avatar padding and overlap | IMPLEMENTED BUT UNVERIFIED | `77d5eac` restores `p-5` and full rounding on the mobile card; `/account` renders with no overflow and no violations in the live audit, which is a regression check, not a verdict on the founder's screenshot |
| MOBILE-PLAN-03 Long Plan catalogue | IMPLEMENTED BUT UNVERIFIED | `ba06ae6` adds search, category chips with counts, name and price sorting, an honest status line that the selection is kept, and a second Back link; `lib/plan-catalogue.ts` is covered by four unit cases. No browser suite drives the new controls yet |
| MOBILE-MEDIA-04 Black preview, crop, size claim | IMPLEMENTED BUT UNVERIFIED | `7a4a514`; six unit cases plus source guards. Needs one hand-held upload on a phone to be called fixed |
| MOBILE-A11Y-05 Reduce Motion and High Contrast | IMPLEMENTED, behaviour partly verified locally | `bd118ad`. The audit re-run proves the platform-level cases on this build: 0 animations running under reduced motion and no axe violations. The in-app switches are what changed, and the audit drives the browser preference, not `styld_settings`, so the stored Reduce Motion and High Contrast toggles are covered by `tests/a11y-settings-enforcement.cjs` and `tests/signature-loader.cjs` only, and still need one hand on a phone |
| MOBILE-TYPE-06 Large text breaks layouts | VERIFIED COMPLETE for the overflow mechanism, local build | the mechanism moved from CSS `zoom` to root font size, and `live-accessibility-audit.json` on `Xg8lckpQBCbH4LvP5wTSg` records `200% text scaling across 4 routes: 0 pages overflow horizontally`. The in-app large setting is 1.15, a looser test than the 200 percent the audit applies, and no device rendering of it has been observed |

## Founder actions, in the order that matters

1. Attach the domain inside the Vercel account: point `wearestyld.com` and `www.wearestyld.com` at the
   reviewed release, set `www` to redirect to the apex, and let Vercel issue the certificate. Nothing
   else in DOMAIN-02, DOMAIN-05 or DOMAIN-06 can be verified until this happens, and no automated
   reading from this machine can do it.
2. Before or at the same moment, give the beta its own database. A public hostname that reads the
   production database is the one state that can hurt a real customer. Create an empty Neon database,
   set it as `POSTGRES_URL` for branch `qoder/styld-beta-20261027` only, then apply `sql/migrations/001`
   through `016` to it with `node --env-file=<source of the beta connection string> scripts/apply-migrations.mjs`.
   This agent has applied nothing to any hosted database and will not.
3. Bind `beta.wearestyld.com` to the same reviewed release with Deployment Protection left on, set
   `BETTER_AUTH_URL` to that exact hostname, add it to the allowed origins and cookies, and turn
   `all_except_custom_domains` off or accept that a custom domain bypasses Vercel's SSO. The
   application enforces its own authorization either way, which is why the middleware prefix list and
   the per-route guards are the load-bearing part, not the platform switch.
4. Verify a Resend sender on `wearestyld.com`, publish SPF, DKIM and DMARC, set `RESEND_API_KEY` and
   `RESEND_FROM_EMAIL` for the branch, and name one inbox allowed to receive a code. Domain ownership
   alone is not mail service.
5. Push authorisation: `1470313` is six commits ahead of the deployed `683f8c3`. The standing rule is
   that this agent does not push without being told, and the mission says to push reviewed changes. Say
   the word and the branch moves; no merge, no production deploy, no force.
6. Send the missing handover ZIP and the iPhone screenshots, or state the tour defect in words, so
   MOBILE-TOUR-01 can be reproduced instead of guessed at.
7. Run the four fixed flows on a real iPhone (Safari) and one low-end Android handset: photo crop and
   upload, the Plan catalogue with large text, Reduce Motion and High Contrast, and the profile card.
   This workspace has no phone and no iOS.
8. Give the Terms page its effective date and last-updated date, and rule on the privacy page's
   published 1 January 2025, which no record in this branch supports.
9. Attest that the Cloudinary pending folder is private, which is the last half of MVP-06.
10. Decide the 128 `color-contrast` nodes axe left incomplete on the current build. A machine cannot
    finish that rule when the asset hosts are aborted; a person looking at the four routes can.

## Rollback

Nothing in this phase is irreversible, because nothing was published.

- Code: `git revert 1470313 38f3f02 ba06ae6 77d5eac bd118ad 7a4a514` on
  `qoder/styld-beta-20261027`, or simply stop merging. No production branch, migration or data changed.
- Domain: this agent made no DNS or Vercel change, so there is nothing to undo. If a deployment is
  attached later and the release is wrong, remove the hostname under Project Settings, Domains in
  Vercel; the nameserver delegation stays and the apex returns to answering `DEPLOYMENT_NOT_FOUND`,
  which is its state today.
- Database: no hosted database was touched. The disposable cluster used for the receipts is created and
  dropped by the harnesses.

## What this file does not claim

It does not claim `wearestyld.com` is live, that an investor can open anything, that a tester has
received an email, that a phone has been used, or that the mobile fixes are accepted. It claims four
defects are repaired in code with tests, that the local gates pass on the commits named here, and that
the domain is pointed at Vercel with nothing attached to receive it.
