# STYLD official domain activation and MVP closure

Date: 2026-10-31 (UTC readings taken 10:53 to 10:55 on the same day)
Branch: `qoder/styld-beta-20261027`
Remote tip: whatever commit carries this file. It was pushed in this order on 2026-11-01: `38f3f02`,
`1470313`, `bb515f4`, `dbb3f50`, `e7a89dc`, `5929bb0`, `24d276c` and the register commits after them,
each on the test branch only, no merge and no force. Correction on 2026-11-02: the mobile work described
below was pushed as a fast-forward, `ba0254b..1415978` (28 commits), and Vercel built `14159781fefb63194da66c197609f5a60ac8b8f6`
in both projects, `7484320927` on `Preview - sty-ld` at `sty-5tjryp19r-dreeydesigns-3368s-projects.vercel.app`
and `7484337083` on `Preview - styld-auth-test` at `styld-auth-test-g7mq5u9sm-dreeydesigns-3368s-projects.vercel.app`,
both `success`. The remote was re-read with `git ls-remote` after the push and answers that same SHA.
Application code changed again after `ba06ae6`. The mobile defect work
runs `8e47412` through `b047e1a`, one defect per commit, and every receipt in this file was regenerated
on that chain rather than carried forward from `ba06ae6`. The media history half came after that chain, as `e58023b`, and the plan-catalogue browser evidence after that as `8fd4ca1`, which adds no application source.
Build under test: `Xg8lckpQBCbH4LvP5wTSg` from `ba06ae6`, `VJvJJr4XQg3wYvhDKkpFS` from `e7a89dc`, and
`Ne9t7nk5KQx6HeqgmiNKz` from `b047e1a`. The last is the build the three mobile live receipts and the
re-stamped `first-render-audit.json` were measured on. The media pair is measured on two further builds of this revision: `41t8UHDuh7D3jawj8QNfV`, which is
the tree with the render guard taken back out, and `719HSBuL1_GqupwzldDfL`, which is the same tree with
it in. Neither is a build of a different commit, and the first is a build of a deliberately unfinished
tree, which is why it was run. The plan pair is the same shape on the tip: `fwsyNYY7AWf74vpRmR_CJ` is
this source with `ba06ae6` and `29f54bd` reverse-applied, `992QQqwQDsYw08XEzfhkw` is the same source with
them in, and `6tvuLvFl-XNsLb7knB7xA` is the build the first-render receipt was stamped on before this round.
The PROFILE-02 pair is three builds again: `Jv407xgOj_kKFTzFDn-yA` is the tree with `77d5eac` reverse-applied,
which is the before run, `DCTX5ZnnINh7B-Dho2wF1` is the fixed tree as it stood at `4a8edb8`, and
`89uYhSWNruPtg6unJtTbH` is the tree after the review answers in `09b7e9f`, which is the build the receipt
first carried. The two review gaps that `09b7e9f` left unpinned are closed in `db8a98a`, whose build
`mCRuNUUgm2-ieOa9QKfUI` is the one the current after receipt, the re-stamped `first-render-audit.json` and
the live database inventory smoke all name. The before receipt for the profile card names `88b73a4`, the
commit the reverse-applied tree was hung on, and its build `Jv407xgOj_kKFTzFDn-yA` is not a build of any
commit on this branch. The live inventory smoke needs no build because it drives `scripts/db-inventory.mjs`
against a disposable cluster and never starts the app.

Corrected on 2026-11-02 for the first-paint bar residual: the profile card now carries a second
before/after pair, taken on the same instrument with the same thirteen steps. The pair was taken twice.
The first half (`-LdXHmLLY32gD-ZYwIgvc` before, `ipLOKATwojH5Oy2iJTOI6` after) stood on an instrument that
probed the touch target of two controls only and pushed its measurements after the asserts, so a failing
width left no geometry behind. Both receipt files were re-taken in place, so the copies on disk hold the
pair below and nothing else in this file quotes these two identifiers as evidence; the `55f10f1` row of the
commit table names them once, as the run that was replaced. The
pair now on record is `-DzA_b2Hdnd3l0yd857Bj` before against `HQfsOyA6t1NjDUlaW0pLZ` after, both runs made
by the instrument committed as `4f1ecec`, the before half on the deliberate reverse-applied tree (the three
profile source files read as they stood at `d8264e0`, everything else fixed) and the after half on the tree
as committed, 11/13 against 13/13. `first-render-audit.json` is stamped on the same build as the after half.
The earlier pair above still describes the gutter, the radii and the world save; this pair describes the
floating bar and the touch targets, and the two are not the same measurement.
Deployed preview at first writing: sha `683f8c3`, deployment `7436081921`, environment `Preview - sty-ld`,
three successful statuses, hostnames `sty-8199odmu9-`, `sty-kooa18rsx-`, `sty-avxpyxv3n-` on
`dreeydesigns-3368s-projects.vercel.app`. This line is superseded by the 2026-11-01 correction below it.
Official domain claimed by the founder: `https://wearestyld.com`
Beta hostname proposed: `https://beta.wearestyld.com`

Correction made on 2026-11-01, after the push described below: the branch tip `dbb3f50` is now itself
deployed. The GitHub Deployments API records deployment `7470405819` (environment `Preview - sty-ld`,
status success, host `sty-oodcf6py6-dreeydesigns-3368s-projects.vercel.app`) and deployment
`7470419924` (environment `Preview - styld-auth-test`, status success, host
`styld-auth-test-2q1tkkqun-dreeydesigns-3368s-projects.vercel.app`). Both hosts answer anonymous
requests with a `302` to `vercel.com/sso-api`, carry `Strict-Transport-Security` and `X-Robots-Tag:
noindex`, and serve nothing else. The second project, `styld-auth-test`, building the same branch is a
new fact this workspace had not recorded before, and DOMAIN-03 has to reconcile it: two Vercel projects
now produce builds of one beta branch.

The pattern repeated on the later pushes and is the reason this file stops claiming a current deployed
SHA. `e7a89dc` produced deployments `7470842616` and `7470855838` in the same two environments four
minutes apart, and every register commit after it retriggers the same pair; the tip `aafbba79` is deployed
as `7471237035` and `7471250580`. Each deployment also gets its own hostname, `sty-8ysjlo5al-` for
`aafbba79` where `dbb3f50` served `sty-oodcf6py6-`, so a per-deployment URL is a receipt for one build and
never the address a tester should be given. A deployed SHA read from this branch is a moment, not a state,
and the durable claims in the matrices are the ones about source.

The loop was measured once more on 2026-11-02 and this file stops chasing it. The reviewed profile range
`d8264e0..c1cff8b` went up after the independent review of the bar receipt was answered and the whole gate
set re-ran green on that tree, and both projects built it: `7488417152` in `Preview - sty-ld`
(`sty-d7xs9ro41-`, status `success`, 09:17:56Z) and `7488392809` in `Preview - styld-auth-test`
(`styld-auth-test-aic3ly66q-`, status `success`, 09:16:34Z). `c1cff8b` is the last SHA this file quotes as
a tip. The register commit that carries this sentence sits on top of it and moves no byte a build
consumes, and by the pattern above it retriggers the pair anyway: the docs-only commit before it,
`03d2f41`, was read arriving as `7488603696` (`sty-5qava7maf-`, 09:27:38Z) and `7488578952`
(`styld-auth-test-1lkgxpbxi-`, 09:26:20Z), both `success`, both building source identical to `c1cff8b`.
Read every SHA in this file as the moment it was read, and read none of these hosts as a tester address.

## Verdict

The directive offers three verdicts and this delivery takes the third one: **NOT READY**, blocking
actions remain. The directive prints that verdict with a long dash between the two halves; `tests/copy-typography.cjs`
refuses that character in any markdown file in this repository, so the verdict is written here without
it and means the same thing.

That is the honest verdict, not a partial one. Six of the six founder-reported mobile defects (TOUR-01,
TYPE-06, A11Y-05, MEDIA-04, PLAN-03, PROFILE-02) are fixed in code and measured in a real browser against
a signed-in session on a disposable cluster, each with a before run that fails the way the defect does.
Three of those six are measured end to end in the browser; MEDIA-04 is measured in the browser for the two
halves that had only ever rested on unit cases, the legacy record and the refused upload, while the black
preview and the size claim stay covered by executed unit tests rather than a hand-held run. PLAN-03 is now
measured in the browser for the controls the founder could not use, and its run says plainly which half it
cannot measure: a served payload that has already turned an unlistable price into nothing leaves the pre-fix
card and the fixed card printing the same words. PROFILE-02 moved from implemented but unverified to
browser-verified on 2026-11-02: thirteen steps over five phone widths, the three text sizes, all six worlds
and the provider card, 13/13 against a before run of 3/13 on the same instrument. Driving six themes is
what exposed a second defect behind it, and that one was functional rather than visual: a signed-in client
could not change world at all, because the server profile carried no tribes list and the save threw
`profile.tribes is not iterable` on every attempt. That is fixed, the projection is now server-side, and the
world save is executed in tests rather than grep'd. None of the six has been run on a phone the founder held.
The first-paint overlap between the floating bottom bar and the avatar row, which this file carried for a
day as a measured finding the freeze did not let me fix, is fixed and re-measured on 2026-11-02: the layout
and hit areas land in `55f10f1`, and the before/after pair now on record was taken by the instrument
committed as `4f1ecec`, 13/13 against 11/13 on the same thirteen steps, with the bar clearance, the 44pt
hit areas and the provider action clipping now asserted at all five phone widths. The founder's six
DB-ISO-01 aggregates have been
reconciled against the chain in the section below, and the founder's follow-up read-only pass went further:
its three column, index and constraint digests are identical to the same query run against a disposable
cluster built only from these 16 migration files, which is structural agreement rather than counting. What
the digests cannot see, mostly grants and ownership, is listed beside them, and the repository's own
per-table inventory of `styld_beta` still needs the founder's credential. The whole local gate set passes
on the current commits, and the domain record is now measured rather than assumed. What is missing cannot be
produced from this workspace: no deployment is attached to any `wearestyld.com` hostname, no certificate
exists for any of them, the hosted database structure now matches the chain's own at digest level while the
repository's per-table inventory of `styld_beta` is still unrun, no mail sender has been reconciled, and no real phone has run
any of this.

Two things moved since this file was first written, and they move the verdict by nothing. The branch
tip was pushed and Vercel deployed it, so the SHA in DOMAIN-06 is now real rather than assumed, and the
hosted acceptance suite ran against that deployment and stopped at Deployment Protection. The public
surface is unchanged: an investor opening `https://wearestyld.com` still gets a `404`, and a tester with
an invite still has nowhere to sign in.

Corrected on 2026-11-01 after review: this verdict was too neat about who owns the remaining work. Six of
the open items are engineering, not platform access, and they stay open here: the fixed pixel text
utilities that the text setting does not reach, the High Contrast surfaces that stay translucent in the
mode meant to make them readable, the image editor that still describes a size instead of refusing an
oversized file and still renders a legacy `data:` URL as saved, the filter fallback that is computed in
the wrong colour space, the Plan sort that disagrees with the card it sorts, and a settings test that
matches source text instead of running anything. The tour defect is being reproduced from behaviour at
three phone viewports rather than left blocked on the missing screenshots. The founder-owned list is
shorter than this file implied and is stated separately.

Closed again on 2026-11-01, item by item, in the order the founder set: all six are now done with
executed evidence. The pixel text utilities
are converted and guarded against returning (TYPE-06, 17/17 live), the High Contrast surfaces
are solidified and the white-text selector is scoped (A11Y-05, 8/8 live), the filter fallback is
recomputed against the browser and measured over 14 combinations, the Plan sort now reads the price the
card prints, and the grep-only settings test was replaced by three instruments that run. The last item,
the media editor's own history, was the one this file kept describing as unreachable from here: the code
refused an unuploadable file and no longer handed a legacy value to the editor, but no record had ever
been seeded with one and read back through a page. That case exists now, it failed on the unfixed build
and passes on the fixed one, and the detail is in the MOBILE matrix above and in finding 1 below. What is
left of the media item is not a code path: a hand-held upload on the founder's own phone, a provider
session through the same guard, and the rows the old code already wrote, which this change hides rather
than deletes.

## Stage 0, read-only domain evidence

Every line below is a probe this agent ran and recorded. Nothing here changed a setting, a record or a
deployment.

| Reading | Result |
| --- | --- |
| Nameservers for `wearestyld.com` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com`, so DNS is delegated to Vercel |
| Apex `A` records | `216.198.79.1`, `64.29.17.1`, read as one resolver's view of the edge pool; the 13:49 re-probe under DOMAIN-01 answers both names from `216.198.79.1` and `64.29.17.65` |
| `www.wearestyld.com` | answers from the Vercel edge, same zone |
| `beta.wearestyld.com` | resolves to `64.29.17.1`, `216.198.79.65` |
| `http://wearestyld.com/` | `404`, `Server: Vercel`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `http://www.wearestyld.com/` | `404`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `http://beta.wearestyld.com/` | `404`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` |
| `https://` on all three | TLS handshake fails before any HTTP response (curl error 35), so no certificate is issued |

Re-read on 2026-11-01, after the `e7a89dc` deployments appear in the API listing above:
`http://wearestyld.com/`, `http://www.wearestyld.com/` and `http://beta.wearestyld.com/` each answer
`404` and each HTTPS attempt answers `000`, meaning the connection died before a response. Pushing and
building a branch changes no DNS record and attaches no domain, so the domain state is exactly as the
table describes it.

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
| `900d60a` | MOBILE-TOUR-01 | `components/onboarding-tour.tsx`, `lib/onboarding-tour-layout.ts`, `tests/browser/tour-mobile.cjs` | `tests/onboarding-tour-regressions.cjs` (28), live `live-tour-mobile.json` (11/11) |
| `2447016` | MOBILE-TYPE-06, MOBILE-A11Y-05 | every fixed pixel text size in the touched surfaces rewritten in rem, `app/globals.css` (High Contrast surfaces solidified, white-text selector scoped to a token boundary) | live `live-text-scale.json`, live `live-high-contrast.json` |
| `fa0a472` | MOBILE-TYPE-06, MOBILE-A11Y-05 | `tests/browser/text-scale.cjs`, `tests/browser/high-contrast.cjs`, `tests/text-scale.cjs` (788 lines) | the three instruments that replaced source-text matching; `tests/text-scale.cjs` (5 when written, 6 after `7fc8336`) |
| `80fcb34` | MOBILE-MEDIA-04 (review findings 1 and 2) | `lib/image-prep.ts`, `components/image-upload-editor.tsx` | `tests/image-editor-truthfulness.cjs` (+4), live `live-filter-parity.json` (14 filter combinations measured in Chromium against the gate: worst per-channel delta 2 steps, no more than 4 channels a step out, mean under half a step) |
| `29f54bd` | MOBILE-PLAN-03 (review finding 5) | `components/appointment-planning.tsx`, `lib/plan-catalogue.ts` | `tests/plan-catalogue-controls.cjs` (+3) |
| `2def837` | DB-ISO-01 tooling | `scripts/db-inventory.mjs` (read-only schema inventory and diff) | `tests/db-inventory-tool.cjs`; the run itself is still BLOCKED on the founder's read-only credential |
| `7fc8336` (with the locator fix in `2e9e4d2`) | MOBILE-TYPE-06 | `components/settings-no-flash.tsx` (new), `app/layout.tsx`, `lib/settings-store.ts`, `components/theme-applicator.tsx`, `tests/browser/text-scale.cjs` | `tests/text-scale.cjs` (5), `tests/a11y-settings-enforcement.cjs`, live `live-text-scale.json` (17/17) |
| `b047e1a` | MOBILE-A11Y-05 | `app/globals.css` (one rule), `tests/browser/high-contrast.cjs` | `tests/a11y-settings-enforcement.cjs` (3), live `live-high-contrast.json` (8/8) |
| `e58023b` | MOBILE-MEDIA-04 (review finding 1, the history half) | `lib/image-prep.ts` (`pickStorableImageUrl`), `components/role-profile-workspace.tsx` (both profile cards read the guarded value, and the provider checklist counts a dead address as no photo) | `tests/image-editor-truthfulness.cjs` (+2), live `live-media-legacy-profile.json` (7/7) against `live-media-legacy-profile-before.json` (6/7) |
| `8fd4ca1` | MOBILE-PLAN-03, browser evidence for `ba06ae6` and `29f54bd`, no application source | `tests/browser/plan-catalogue-order.cjs` (new), `docs/readiness/beta/live-plan-catalogue.json`, `docs/readiness/beta/live-plan-catalogue-before.json` | live 8/8 against live 3/8 with both plan commits reverse-applied; the unit cases for those two commits landed with them |
| `c98d89b` | MOBILE-PROFILE-02, the half `77d5eac` left | `components/role-profile-workspace.tsx` (the Professional/Salon card took the client card's gutter: `p-0 rounded-t-[28px]` to `p-5 rounded-[28px]`) | `tests/beauty-worlds.cjs` card-pair guard, live `live-profile-card-layout.json` |
| `4a8edb8` | the world save PROFILE-02's six-theme check exposed | `lib/client-session.ts` (two spreads that assumed a tribes list) | `tests/beauty-worlds.cjs` (+3 executed through `vm.runInNewContext`, and the same three fail on the unfixed source with the production message `profile.tribes is not iterable`) |
| `6c4d610` | MOBILE-PROFILE-02, browser evidence, no application source | `tests/browser/profile-card-layout.cjs` (new), `docs/readiness/beta/live-profile-card-layout.json`, `...-before.json` | live 13/13 against live 3/13, 17 screenshots, 0 client-side errors |
| `47a1dc5` | DB-ISO-01 tooling, second pass | `scripts/db-inventory.mjs` (the index names PostgreSQL builds for its own PRIMARY KEY and UNIQUE, including the ones guarded inside a DO block; `text[]` and `TIME` read against what information_schema actually returns), `tests/browser/live-db-inventory.cjs` (new) | `tests/db-inventory-tool.cjs` (13), live `live-db-inventory-smoke.json` (12/12): a schema built from nothing but the 16 migration files reads as a match with 0 drift, where the previous tool read 70 differences it had invented |
| `09b7e9f` | the four review findings on `c98d89b`, `4a8edb8`, `6c4d610` and `47a1dc5` | `lib/workspace-policy.ts` (the workspace profile now carries the tribes list the type already promised), `scripts/db-inventory.mjs` (`declaredType` keeps `[]` through ALTER, and the printed scope names the constraint blind spot), `tests/browser/profile-card-layout.cjs` (badge size at every width, honest step name), `tests/db-inventory-tool.cjs` | `tests/beauty-worlds.cjs` (49), `tests/db-inventory-tool.cjs` (13), live 13/13 and 12/12 re-taken on this commit and on `db8a98a` after it |
| `db8a98a` | the two gaps the independent review of `09b7e9f` named as non-blocking | `scripts/db-inventory.mjs` (`varchar(24)[]` kept its brackets: the length is now allowed between the type word and the `[]`, so an array declared with a length reads as the array it is), `tests/db-inventory-tool.cjs` (the fixture now converts `labels` through `ALTER COLUMN TYPE varchar(24)[]`, the path only ADD COLUMN had covered), `tests/browser/profile-card-layout.cjs` (the bottom-bar step asserts the tap unconditionally after scrolling and records whether the bar was beside it, so it can no longer pass by the overlap turning out false at that viewport) | `tests/db-inventory-tool.cjs` 13/13 with the new conversion, live `live-profile-card-layout.json` 13/13 on build `mCRuNUUgm2-ieOa9QKfUI`, live `live-db-inventory-smoke.json` 12/12 |
| `1412d8d` | receipts for `db8a98a`, no application source | `live-profile-card-layout.json`, `live-db-inventory-smoke.json`, `db-inventory-smoke/baseline.json`, `first-render-audit.json` | the gate set above, 876 of 876 |
| `1415978` and the commit carrying this row | register, plus the hosted run against the SHA this branch was pushed as | this file, `live-hosted-acceptance-preview-1415978.json` | `git ls-remote` and the GitHub Deployments API readings named in DOMAIN-06; `live-hosted-acceptance.json` read back unchanged (local production build, 13 checks plus 1 skipped) after the hosted run |
| `55f10f1` | PROFILE-02 residual: the first-paint bar overlap and the touch targets, authorised by the founder under the freeze | `app/globals.css` (the short-phone cover and nudge step-down, `.touch-44` and `.touch-44-y` extended hit areas, the provider identity-row wrap and the sub-360 label rule), `components/role-profile-workspace.tsx`, `components/wow-ux.tsx`, `tests/browser/profile-card-layout.cjs` (bar clearance at rest, 44pt hit tests in four directions and action clipping, asserted at all five phone widths on both cards) | live `live-profile-card-layout-bar-before.json` and `live-profile-card-layout.json` were first written against this tree, 11/13 on a clean `d8264e0` (build `-LdXHmLLY32gD-ZYwIgvc`) against 13/13 on `55f10f1` (build `ipLOKATwojH5Oy2iJTOI6`), 0 client-side errors; independent review found that run claiming more touch-target coverage than it measured, so both files were re-taken in place on the corrected instrument of `4f1ecec` and the copies on disk name the pair in the row below, not this one |
| the commit carrying this row | DB-ISO-01 aggregate reconciliation, no application source | `tests/browser/live-db-inventory.cjs` (a fifth question: the six aggregates a live PostgreSQL reports for a database the chain built from nothing are read off that server and set against what the migration files claim and against the founder's hosted reading) | live `live-db-inventory-smoke.json` 13/13, snapshot `db-inventory-smoke/baseline.json`, `first-render-audit.json` re-stamped `--built-at 55f10f1` on `4tW75U2B2IsZOFibCU5im` with all three provenance lists empty, and `live-profile-card-layout.json` re-taken on `55f10f1` |
| `4f1ecec` | the PROFILE-02 bar receipt, corrected after independent review | `tests/browser/profile-card-layout.cjs` (the 44pt probe now runs over every button, label and link the card paints on the screen at rest, controls whose probe cross leaves the viewport are listed as off-screen instead of counted as passes, each width keeps a floor so an empty probe list cannot pass, and every sample is pushed before its assertions so a failing width keeps its measurements), `app/globals.css` (the `.touch-44` comment now states the separation as the measurement it was: 8px let a neighbour steal the tap, 12px does not) | both halves of the bar pair re-taken on this instrument: 11/13 before on the reverse-applied tree (build `-DzA_b2Hdnd3l0yd857Bj`) and 13/13 after (build `HQfsOyA6t1NjDUlaW0pLZ`), `first-render-audit.json` stamped on the same build |
| `bab77dd` | DB-ISO-01b, the founder's digests compared, no application source | `tests/browser/live-db-inventory.cjs` (the founder's canonicalising query carried verbatim as `DIGEST_SQL` beside `HOSTED_DIGESTS`, a step asserting the chain-built cluster answers it with all three hosted hashes, a `digestLimits` step that names what a hash cannot see and checks the constraint-kind arithmetic, and a closing step that proves the comparison is sensitive by re-asking the same query after the seeded drift), `docs/readiness/beta/NEON_READ_ONLY_SCHEMA_CHECK_2026-11-02.md` (the founder's read-only report, copied as received with the one dash the suite forbids spelled out) | live `live-db-inventory-smoke.json` 15/15 on the `358c642` source: PG 17.11 and 379/106/148 identical, columns/indexes/constraints digests identical, 42 primary + 18 unique + 55 foreign key + 33 check = 148, 0 invalid indexes, 0 views, and all three digests moved once a column was added, a table created and a table dropped |
| `f924cef` | CFG-01: the probe gains the facts a hosted isolation read needs | `lib/environment-probe.cjs` (`pg_postmaster_start_time()` and `pg_control_system()::system_identifier`, the second through a path that costs one field rather than the readout, and the sender as a domain), `tests/hosted-environment-probe.cjs` (6 cases to 9), `tests/browser/live-env-probe.cjs` (new, the shipped module against a live 17.11), `docs/readiness/beta/live-env-probe.json` | live 7 steps as run at the time, unit 9 of 9, no route change: the endpoint stays a 404 without the token |
| `645a335` | register and receipt for CFG-01, no application source | this file (the new CFG-01 section, the probe gate row, founder actions 2 and 4), `first-render-audit.json` re-stamped on `f924cef` | the gate set above, 879 of 879 |
| `9ecdbd7` | the six findings from the independent read of `f924cef` | `lib/environment-probe.cjs` (the postmaster read made genuinely optional, `EMAIL_PROVIDER` allowlisted instead of echoed, the sender split before it is truncated), `tests/hosted-environment-probe.cjs` (9 cases to 11), `tests/browser/live-env-probe.cjs` (7 steps to 8: both sides of the twin comparison must hold a number, and the role that may read the statistic is measured against a role with no grants) | 881 of 881, live 8 of 8, receipt `live-env-probe.json` naming `9ecdbd7` |
| `bb515f4` | register and receipts | this file, `STYLD_FINAL_MVP_COMPLETION_MATRIX.md`, `live-accessibility-audit.json`, `live-a11y-cleanup.json`, `live-hosted-acceptance-preview-dbb3f50.json`, `first-render-audit.json` | `tests/copy-typography.cjs`, `tests/first-render-receipt-provenance.cjs` |
| every commit from `8e47412` to `e58023b` | the six mobile defects and the review findings that came out of them | see the rows above; source really did move in this range, which is why `first-render-audit.json` is re-stamped on the final build rather than carried forward | the stamp is always taken one commit behind the build it names, because a receipt cannot quote a SHA that does not exist yet: the copy committed with `cc91357` ran `--built-at b047e1a` on build `Ne9t7nk5KQx6HeqgmiNKz`, the one after it ran `--built-at e58023b` on `992QQqwQDsYw08XEzfhkw`, `8fd4ca1` ran it on `6tvuLvFl-XNsLb7knB7xA`, `09b7e9f` on `89uYhSWNruPtg6unJtTbH`, `db8a98a` on `mCRuNUUgm2-ieOa9QKfUI`, and the current copy ran `--built-at 4f1ecec` on `HQfsOyA6t1NjDUlaW0pLZ`, each recording `buildInputChangesSinceArtifact: []`, `modifiedSourcePaths: []` and `untrackedSourcePaths: []`, so the receipts above describe the application source at the tip and not an older one |

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

## Working method, as the founder directed on 2026-11-01

The founder's instruction was to stop multi-track parallel development, integrate serially, freeze new
functionality, and refuse a blanket readiness claim. What that changed in practice:

1. **One track at a time.** The mobile defects were taken in order, `TOUR-01`, `TYPE-06`, `A11Y-05`, and
   no two of them were in flight together. Each became exactly one code commit, and each commit carries
   the tests that justify it. There is no merge commit in this range and no branch other than
   `qoder/styld-beta-20261027`.
2. **Before and after, as artifacts.** Every fix in this range is a pair of runs, not a claim. Where a
   suite produced a failing before state it is kept on disk instead of being overwritten:
   `live-text-scale-before-no-flash.json` (1 of 17) sits next to `live-text-scale.json` (17 of 17), and
   the tour receipt was rewritten only after the 9-of-11 run was diagnosed from its own traces. Where the
   before state did not exist yet, it was made by taking the fix back out: the media guard was reverse-applied
   with `git apply -R`, rebuilt, and measured, so `live-media-legacy-profile-before.json` (6 of 7, the avatar
   box holding a dead `blob:` address) sits next to `live-media-legacy-profile.json` (7 of 7) on the same
   revision. That before run is also how the first version of that instrument was found to be wrong: it
   seeded a column the signed-in page never reads, so it passed on the unfixed build, which is a defect in
   the test and not a pass. The plan catalogue was reverse-applied the same way, both of its commits, so
   `live-plan-catalogue-before.json` (3 of 8, the search field never rendering) sits next to
   `live-plan-catalogue.json` (8 of 8) on the same revision; its row also names the one claim that pair
   cannot make, because the served payload normalises an unlistable price before the page sees it. A fix
   without a measured before state is recorded as IMPLEMENTED BUT UNVERIFIED,
   not as fixed.
3. **Full gate set before each commit.** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`,
   then the affected live suite, then the receipt re-stamp. The numbers for the current tip are in the
   next section.
4. **No feature work.** Nothing in this range adds a capability. It fixes the six reported defects, the
   review findings that came out of them, and the registers and receipts that describe both. The
   functionality freeze the founder dated at 2026-11-02 is accepted: after that date only critical
   defect work, and 2026-11-03 is the integration regression day.
5. **No blanket percentage.** Module status is in the closure matrix above, item by item, and a blocked
   item is written as BLOCKED with the missing prerequisite named. Three gates are BLOCKED on the
   founder's read-only test credential (`DB-ISO-01`, `CFG-01`, `SAFETY-01`), and by the founder's own
   standing rule no public hostname is attached until all three pass. Security verification is not
   claimed as done: it is the prerequisite that is outstanding.
6. **Real data only for anything an investor sees.** The local live suites run against a disposable
   loopback PostgreSQL cluster with a schema-only fixture and, for the audit, one seeded professional
   workspace with one published post. That is test scaffolding on this machine and it must never be
   presented as product content. The hosted beta (`styld_beta`) holds 42 tables and one user record and
   nothing has been written to it from here, so a demo on the hosted environment shows real records or
   shows an empty state, and the register does not offer a third option.
7. **Domain material without code.** The attach steps, the DNS readings and the rollback path live in
   this register: the Stage 0 evidence section records what was measured from here, founder actions 1,
   3 and 4 state the order the hostname has to be attached in, and the Rollback section states how to
   take it off again. `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md` covers the environment and migration
   sequence, not the domain. Preparing this material changes no application byte, and attaching a
   hostname is a founder account action that this agent cannot perform from here.

## The gate set on these commits

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0, no output |
| `npm run lint` | PASS, exit 0, 0 errors, 30 pre-existing `no-img-element` warnings |
| `npm test` | PASS, 881 of 881, 0 failures, 0 cancelled, exit 0 on the tree committed as `9ecdbd7` with `first-render-audit.json` re-stamped on that commit and the run taken against `eJKJDIbDZSmHl0Ag8N5EG`. The two additions in `9ecdbd7` are the review findings turned into cases (a postmaster read that answers no rows or is refused degrades one field rather than the readout, and the provider is an allowed name while the sender domain survives a display name longer than the field limit); the three before them came with `f924cef` (the cluster and postmaster identity, the refused-statistic degradation and the sender domain), and the count was 876 of 876 on `4f1ecec` with `first-render-audit.json` re-stamped on it, the on-disk build being the same `HQfsOyA6t1NjDUlaW0pLZ` the profile after receipt names. `4f1ecec` adds no test name to this file: it moves the live browser instrument `tests/browser/profile-card-layout.cjs`, which this suite does not execute, and a stylesheet comment, and the count held at 876 through both. Earlier in this range, before the fix commit `55f10f1`, the same file reported 874 with two failures, both in `tests/first-render-receipt-provenance.cjs`: `the working tree holds no source file the receipt does not name`, naming the two profile components still uncommitted, and `the build on disk is the build the receipt describes`, expected `ipLOKATwojH5Oy2iJTOI6` against actual `mCRuNUUgm2-ieOa9QKfUI`. Both are the stale-receipt state that file exists to catch, not product defects: the source was committed, the profile suite was re-run against a clean tree, and the receipt was re-stamped, after which the count is 876. It was 870 at `8fd4ca1`; the additions are the three executed world cases in `4a8edb8`, the constraint-name and array-spelling cases that came with the inventory tool in `47a1dc5`, and the tribes projection case in `09b7e9f`. `db8a98a` adds no new test name: it pins two claims that were already being made, one inside the migration-parsing case and one inside the live profile instrument. Mid-task the same file reported 875 passing with one failure, the provenance check `the build on disk is the build the receipt describes` naming expected `89uYhSWNruPtg6unJtTbH` and actual `mCRuNUUgm2-ieOa9QKfUI`: the rebuild this round needed left the receipt naming the build that was on disk before it, which is the stale-receipt state the provenance file exists to catch rather than a product defect. An earlier mid-task run in the same range reported 868 and 869 with the same class of failure, and both are recorded because the runs were made |
| `npm run build` | PASS, exit 0, middleware 35 kB, the route table printed in full. The identifier for the run on the current tip is `eJKJDIbDZSmHl0Ag8N5EG` (`9ecdbd7`), `aaEKkuLMYyOLxRRtVYHZt` is the `f924cef` build and `HQfsOyA6t1NjDUlaW0pLZ` the `4f1ecec` build the profile, probe and first-render receipts before it were taken on; `-DzA_b2Hdnd3l0yd857Bj` is the deliberately reverse-applied tree the bar before run needed, `4tW75U2B2IsZOFibCU5im` and `ipLOKATwojH5Oy2iJTOI6` are builds of the `55f10f1` source taken between them, `mCRuNUUgm2-ieOa9QKfUI` the tree at `db8a98a`, `89uYhSWNruPtg6unJtTbH` is the same application source with the two review gaps still open (`09b7e9f`), `DCTX5ZnnINh7B-Dho2wF1` the fixed tree as it stood at `4a8edb8`, `Jv407xgOj_kKFTzFDn-yA` the deliberately reverse-applied tree the gutter before run needed, `992QQqwQDsYw08XEzfhkw` the build the after plan receipt names, `fwsyNYY7AWf74vpRmR_CJ` that source with the two plan commits taken back out, `ShXNfl_yDWI3xr6t0SUzg` the same application source at `cc91357`, and `Xg8lckpQBCbH4LvP5wTSg` (`ba06ae6`) and `VJvJJr4XQg3wYvhDKkpFS` (`e7a89dc`) earlier builds of different source. Next.js 15.5.28 has no `generateBuildId`, so every `next build` mints a fresh random identifier; the identifier is not a revision and each receipt is read with the commit SHA it also carries |
| First render | PASS, 69 audited routes, 0 loader-only, `gateExit 0`, 5 announced waits, 21 thin, 18 redirects, 1 error answer. `first-render-audit.json` is re-stamped with `artifactCommit 9ecdbd7` on `eJKJDIbDZSmHl0Ag8N5EG` and records `buildInputChangesSinceArtifact: []`, `modifiedSourcePaths: []`, `untrackedSourcePaths: []`; `tests/first-render-receipt-provenance.cjs` 6/6. The route figures are identical across the last four stamps because nothing in this range adds a route: `8fd4ca1` added a browser instrument and two receipts, `09b7e9f` changed a server projection and read-only tooling, `db8a98a` changes read-only tooling and two test files, and `55f10f1` does move a build input (`app/globals.css`), which is why its stamp was taken by re-running the audit against a fresh build of that tree rather than by carrying an old figure forward. Each stamp records the empty `buildInputChangesSinceArtifact` that proves the comparison is against the tree it names |
| Profile card, live browser instrument (MOBILE-PROFILE-02) | PASS, 13/13 on `4f1ecec` build `HQfsOyA6t1NjDUlaW0pLZ`, 0 client-side errors. Two pairs are on record for this one instrument. The first is the gutter pair: 3/13 on `live-profile-card-layout-before.json` (build `Jv407xgOj_kKFTzFDn-yA`, the tree with `77d5eac` reverse-applied, five of its failures being the `pageerror: a.tribes is not iterable` that is the world-save defect this range fixed) against 13/13 on `db8a98a` build `mCRuNUUgm2-ieOa9QKfUI`, measuring 20 px gutter on all five phone widths, 28 px on all four corners, the card overlapping the cover by 48 px, the avatar 21 px inside the card edge, the name 37 px inside it, root sizes 14.4/16/18.4 px and name sizes 21.6/24/27.6 px under Small/Medium/Large, the same gutter and rounding on the Professional and Salon card, and all six worlds. The second is the bar pair, taken on the same thirteen steps, and it was taken twice because an independent review found the first version claiming more than it measured: the touch-target probe covered two controls while the prose said every one. The pair on record is 11/13 on `live-profile-card-layout-bar-before.json` (build `-DzA_b2Hdnd3l0yd857Bj`, the tree with the three profile source files read back to `d8264e0` and everything else fixed) against 13/13 on `4f1ecec`. What the before half holds, width by width, since a failing width now records its own geometry: the client card reaches under the floating bar at three of the five widths, which is exactly the three the founder named (at 320x568 the badge and the name, at 360x640 the name and the Edit profile action, at 375x667 the bottom of the action); the provider card is clipped at five of five (Share and Preview past the card edge at 320 and 360, Preview alone at 375, 390 and 430, ending at 449px on a card that ends at 359, 374 and 414px); and no control on either card carries a 44pt area, because the camera badge fails its off-centre taps at all five client widths, the Edit profile pill fails at four, the fifth (320) failing to be probeable at all because the bar had already pushed its own probe cross off the screen, and one of those failures names the thief as the `nav.world-glass mobile-bottom-nav` itself. What the after half proves: at rest on 320x568, 360x640 and 375x667 neither the badge, the name nor the action sits inside the bar band (the client name bottom answers 444 against a bar top of 490, 562 and 589, the provider name 476, 548 and 548); every control either card paints on the screen at rest answers a tap placed 21px out from its centre in all four directions, two on the client card and four on the provider card, with an empty off-screen list at all five widths on both, which is Apple's 44pt proven by hit test rather than by reading a stylesheet, and no provider action box crosses its card edge at any of the five widths. Two limits are stated with it: a 44pt box reaches 22px from the centre, so these probes prove a 42px span, the box measured 1px inside each edge, and the sweep covers the controls that are on the screen at rest, which is where the founder's defect lives, not every control further down the page. Receipt `live-profile-card-layout.json` |
| Database inventory, live server smoke (DB-ISO-01 preparation) | PASS, 15/15, receipt naming `358c642` (the suite stamps HEAD when it launches, so it names the commit whose source it read; the digest steps themselves are in `bab77dd`). A disposable PostgreSQL 17.11 cluster is reset to an empty schema, the 16 migration files are applied by the founder-facing route only, and `scripts/db-inventory.mjs` then reads it as an exact match: 42 live tables against 42 expected, 0 drift, 0 missing, 0 extra, 6 statements sent and every one a read. The steps this row adds read the six aggregates off that live server and set them against what the migration files claim and against the founder's hosted reading of `styld_beta`; all three agree at 42 tables, 379 columns, 42 primary keys, 18 unique constraints, 106 indexes and zero row-level security policies. The founder's second pass then supplied three canonicalising digests, and running that query unchanged against this cluster returns the same PostgreSQL version, the same 379/106/148 counts and all three hashes byte-identical, which the next step proves is a live check rather than an instrument that cannot see anything: after the seeded drift (an added column, an extra table, a dropped table, all three named exactly by the inventory) every one of the three digests moves. The schema fingerprint is identical before and after the run, the credential appears in nothing written or printed, and the owner-role and out-of-`docs` report paths are refused. Receipt `live-db-inventory-smoke.json`, snapshot `db-inventory-smoke/baseline.json`, and the founder's report preserved as `NEON_READ_ONLY_SCHEMA_CHECK_2026-11-02.md`. The per-table inventory of `styld_beta` stays BLOCKED on the founder's read-only credential; the command it is waiting for is in founder action 2, and nothing in this row is a hosted request |
| Environment probe, live server smoke (CFG-01 preparation) | PASS, 8/8, receipt naming `9ecdbd7` and living in `live-env-probe.json`. The shipped `lib/environment-probe.cjs` is run against the chain-built disposable cluster as the app-shaped non-superuser role: it answers `styld_disposable_test`, `styld_local_runtime`, the port the server actually listened on, 42 public tables and 0 accounts, all of it server-reported rather than read from the environment. The two fields `f924cef` adds are proved rather than asserted: `pg_postmaster_start_time()` comes back as an ISO instant, and `pg_control_system()` answers `7703529456252627940` for the owner role, the runtime role and a role created with no grants behind it, identical for a second empty database created inside the same cluster while `current_database()` changes, which is the distinction the hosted isolation read turns on in one direction (a differing identifier says the process is elsewhere; a matching one is not proof on its own). `9ecdbd7` adds the privilege measurement that made the last clause a reading instead of an assumption: `styld_local_runtime` is `NOSUPERUSER` and not a member of `pg_read_all_stats` and still answers, on 17.11. A role refused either statistic still returns every other fact with one field null, five statements reach the server and every one is a bare SELECT with nothing after it, the `schema_migrations` query is skipped in a schema that has no such table, the sender is reported as `wearestyld.com` and nothing more, and the 64-character disposable password appears nowhere in the answer |
| Live accessibility audit on the current source | PASS, exit 0: 44 axe scans over 52 recorded findings, 0 violation nodes, 0 rule failures, `200% text scaling across 4 routes: 0 pages overflow horizontally`, and under reduced motion 410 declared durations with 0 over 50ms and 0 animations running. Receipt `live-accessibility-audit.json` was re-run rather than carried forward: it names build `ShXNfl_yDWI3xr6t0SUzg` and commit `b047e1a`, because application source really did move after the previous run at `1470313` on `Xg8lckpQBCbH4LvP5wTSg` and the old justification (every later path sat under `docs/`) stopped being true in that range. It also records the three mobile fixes in the same sweep it audits, so TYPE-06 and A11Y-05 are covered by an axe pass and by their own instruments, not by one receipt standing in for the other. The media commit after it is not covered by that receipt and this row does not claim it is: `e58023b` changes how a stored preview address renders, and the audit's fixture holds no such value, so the sweep would return the same 52 findings and the media guard has its own instrument instead |
| Hosted acceptance against the deployed branch tip | FAIL, correctly, on the SHA this register now names. `live-hosted-acceptance-preview-1415978.json` names target `sty-5tjryp19r-dreeydesigns-3368s-projects.vercel.app` (GitHub deployment `7484320927`, the `sty-ld` preview environment, status `success`, `2026-11-02T04:31:56Z`), harness `commit 14159781fefb63194da66c197609f5a60ac8b8f6`, `workingTree.dirty: false`, and records the one executed check, `deployment reachable: false`, with `GET /discover redirected to vercel.com; this is Deployment Protection`, `servedBuildId: null` and the grade line `identification never reached, so this run has no grade to report`. The same stop was recorded at `dbb3f50` (`live-hosted-acceptance-preview-dbb3f50.json`) and it is still the stop: no check behind that redirect can be run from here, so MVP-04, MVP-05, MVP-08 hosted and DOMAIN-06 stay blocked  Re-read by hand against the two builds of `c1cff8b` on 2026-11-02 at 09:22Z, the same stop answers: `GET /discover` on `sty-d7xs9ro41-` and on `styld-auth-test-aic3ly66q-` each returns `302` with a `Location` on `vercel.com/sso-api`, `Cache-Control: no-store`, `Strict-Transport-Security` and `X-Robots-Tag: noindex`, and no body. That is an observation of the two hosts, not a new receipt, and it changes no grade: the application behind the protection is still unread from here. |

The hosted receipt is filed the way the activation plan demands. `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md`
section H step 2 says a hosted run writes to a SHA-named file so that the local-mode receipt survives,
"as happened once already", and the first hosted run on this branch overwrote it anyway. That receipt
has been restored from `cb9d34b` (local production build, 13 checks plus 1 skipped by design, pass) and
the hosted stop now lives in its own file, `live-hosted-acceptance-preview-dbb3f50.json`. The local
receipt is evidence about the checks, not about Vercel, and the two must not replace each other. The
2026-11-02 run was filed the other way round on purpose: it wrote the same single check to
`live-hosted-acceptance-preview-1415978.json` and `live-hosted-acceptance.json` was then read back and
confirmed unchanged (local production build, `commit cb9d34b`, 13 checks plus 1 skipped by design).

Why two build identifiers appear above: `next.config` sets no `generateBuildId`, so Next.js mints a new
random identifier on every `next build` even when the input is unchanged. The identifier alone therefore
proves nothing about a revision, and each receipt is read together with the full commit SHA it also
carries (`first-render-audit.json` names `e7a89dc...`, `live-accessibility-audit.json` names
`1470313...`). Pinning the identifier to the git commit would be a one-line config change and would make
a served build self-identifying; it is not done here because changing build config invalidates every
receipt on this branch at once, and re-running the two instrumented audits belongs with a source change
rather than a register edit.

The audit did raise one number that must not be read as a pass: axe left 128 `color-contrast`
incomplete nodes across the sweep, against 63 in the receipt before that. Incomplete is not a violation
and not a pass, it is axe saying it could not compute the answer, mostly because third-party asset hosts
are aborted in these runs. The run re-taken on this range's source (`b047e1a`, build
`ShXNfl_yDWI3xr6t0SUzg`) leaves the same 128, so neither the rem conversion nor the High Contrast
solidification changed what axe cannot decide. Nobody has hand-checked the 128, so they stay an open item
under DESIGN-06 rather than a closed one, and they are founder-eye work, not a code path.

The first full run of `npm test` on this tree failed three cases: both onboarding-tour harnesses could
not resolve the settings store the tour now imports, and the MFA replay case pinned `last_step` to the
current 30 second window, which a boundary crossing mid-assertion could overtake. All three were
harness or case defects, fixed in `1470313`; the product code was not changed to make them pass.

## DB-ISO-01: the six aggregates, reconciled

The founder read `styld_beta` directly, read-only, on an independent Neon inspection, and reported six
numbers plus two facts. Those are the third column below. The first is a live PostgreSQL 17.11 server on
this machine that has only ever held the 16 migration files applied in order, and the second is what the
migration files themselves claim when parsed, which is a separate code path from the apply path:
`expectedFromMigrations` in `scripts/db-inventory.mjs` reads the SQL text and builds the expected set,
while `scripts/apply-migrations.mjs` is what executes it, so the first two columns cannot agree by sharing
a bug in one parser. The step that produced column one reads the live server.

| Aggregate | Live server, chain-built | Expected from the 16 migration files | Reported on `styld_beta` |
| --- | --- | --- | --- |
| public tables | 42 | 42 | 42 |
| columns | 379 | 379 | 379 |
| primary keys | 42 | 42 | 42 |
| unique constraints | 18 | 18 | 18 |
| indexes | 106 | 106 | 106 |
| tables with row-level security | 0 | 0 | 0 |
| row-level security policies | 0 | 0 | 0 |
| user records | (not counted locally) | (not counted locally) | 1 |
| `schema_migrations` table | present, created by the apply script | not a migration artifact | absent |

Six for six agree, and the instruction that came with the finding is honoured exactly: nothing was
migrated against `styld_beta`, no row was deleted, no data was modified, and matching counts are not
treated as matching structure.

What this pair of columns does prove: the chain in this repository, applied in order by the route the
founder uses, produces a database whose headline shape is the shape that is live. There is no missing
table, no surplus table and no index drift hiding behind a count, so the migration set is a plausible
source for what the hosted branch holds rather than a divergent local invention. It also proves the
inventory tool reads the same numbers off a real server that the parser claims, which is what makes the
hosted reading comparable at all.

What it does not prove, stated plainly because six matching numbers invite the opposite reading:

- Column counts matching does not mean the columns are the same columns. That gap is now closed one level
  down by the digests in the section below, which hash every column, index and constraint definition rather
  than counting them. What has still never been run against `styld_beta` is this repository's own per-table
  inventory (42 live against 42 expected, 0 drift, 0 missing, 0 extra), and it has only ever been run
  against a disposable local cluster.
- The absent `schema_migrations` table on the hosted database means the chain was not applied there
  through `scripts/apply-migrations.mjs`, because that script is the only thing in this repository that
  creates the table. It does not mean the migrations were never applied. They could have been applied by
  the Neon console, by a different runner, or by hand, and this repository has no evidence either way.
- Zero RLS policies on both sides is a fact about the schema, not a security verdict. It says the
  chain never asked for policies, so an application-level authorization review is the only thing standing
  between a signed-in client and another tenant's rows. That review is #76 / SAFETY-01 and stays open.
- The one user record is consistent with a branch that was never given real traffic, but it is the
  founder's reading of one instant, not a live assertion this agent can re-take without a credential.

The command that turns the third column into the second one, from the founder's side. It needs no code
change and puts no credential on a command line, because the connection string is read from the same
env file Vercel already mirrors:

```
node --env-file=.env.local scripts/db-inventory.mjs \
  --out docs/readiness/beta/db-inventory-styld-beta.json
```

`scripts/db-inventory.mjs` sends `SELECT` and `WITH` statements only, plus one session pragma that can
only restrict and never widen, sets the transaction read-only at the server before it asks anything,
refuses a report path outside `docs`, prints no connection string, and never reads row contents. Exit 0
means the live schema equals the expected schema; exit 1 means they differ, which is an answer rather
than a crash; exit 2 means the tool could not run. Against a Neon role that owns the schema it also
needs `--allow-owner`, and if you would rather not pass it, create a read-only role and point the tool
at that instead. The result is a per-table diff against the chain, not just the six aggregates above,
and it is the fastest path from BLOCKED to a structural answer for #74.

## DB-ISO-01b: the digests, compared

The founder's second read-only pass on `styld_beta` returned more than six numbers. It carried three
canonicalising digests, computed by a query that hashes every column definition, every index definition and
every constraint definition in `public`, and the query itself was included. That file is preserved as
`docs/readiness/beta/NEON_READ_ONLY_SCHEMA_CHECK_2026-11-02.md`, copied rather than rewritten, with one
character changed and that change named in a reproduction note at its top: the repository's own copy rule
(`tests/copy-typography.cjs`, executed by `npm test`) fails the build on an en dash anywhere in the tree, and
a quoted report is not an exception to a rule the suite enforces.

The question asked was whether those digests match a database built only from this repository's migration
files. They do. `DIGEST_SQL` in `tests/browser/live-db-inventory.cjs` is the founder's query with no change
to its canonicalisation, run against a fresh disposable PostgreSQL 17.11 cluster created by
`tests/helpers/live-postgres-cluster.cjs` with `sql/migrations` 001 through 016 applied in order and nothing
else ever written to it. No hosted database was contacted from this machine, and no hosted migration was run.

| Digest | `styld_beta` (founder's report) | Chain-built cluster (this run) | Agree |
| --- | --- | --- | --- |
| PostgreSQL version | 17.11 | 17.11 | yes |
| columns | 379 | 379 | yes |
| indexes | 106 | 106 | yes |
| constraints | 148 | 148 | yes |
| primary keys | 42 | 42 | yes |
| unique constraints | 18 | 18 | yes |
| column digest | `19a67766a938dbede735671df433a4d0` | `19a67766a938dbede735671df433a4d0` | yes |
| index digest | `1c283b9d34896130b75e0ef697d6f910` | `1c283b9d34896130b75e0ef697d6f910` | yes |
| constraint digest | `51363f8304841872270e74556afc59c7` | `51363f8304841872270e74556afc59c7` | yes |

A matching hash pair is a stronger statement than a matching count, because the hashed lines carry the
column name, data type, nullability and default, the index name and its definition, and the constraint name
and its clause. This is the first time the hosted branch's structure, and not just its size, has been
compared against the chain.

That comparison would also be satisfied by a broken instrument, so the same suite proves it is not one. The
last step re-runs the identical query after the drift that suite seeds by hand (one `text` column added to
`users`, one table created that no migration file knows, one table the chain requires dropped) and asserts
that all three digests move, from `379/106/148` to `365/100/144`. Three digests agreeing is therefore a
result of a check that can see a difference, not a check that cannot.

The same run also records what the digests do not touch, because three matching hashes invite the same
over-reading six matching counts did:

| Fact about the chain-built cluster | Value |
| --- | --- |
| constraints by kind | 42 primary, 18 unique, 55 foreign key, 33 check (148 total) |
| invalid indexes | 0 |
| views | 0 |
| sequences | 2 |
| functions | 0 |
| extensions installed in `public` | 0 |

Ten things a digest match says nothing about, from the receipt's own `notCoveredByDigests`: row data; table
or column ownership; grants and ACLs; collation and locale; index build state; tablespaces; storage
parameters; extension versions; sequence current values; and what created the schema, since
`schema_migrations` is absent on both sides. The security fact the founder's report added, zero tables with
row level security and zero policies, is now measured rather than assumed, and it is why #76 / SAFETY-01 is
the more urgent half of the remaining work: the tenant wall, if it exists, is entirely in application code.

This is recorded inside the live inventory smoke, so it is repeatable rather than a one-off calculation:
`node tests/browser/live-db-inventory.cjs --bin "…/pgsql/bin"` now runs 15 steps and passes 15 of 15
(`docs/readiness/beta/live-db-inventory-smoke.json`), the same 15 also holding the read-only statement audit,
the credential-never-appears assertion and the both-directions drift detection.

## CFG-01: what the environment probe answers, and what it still cannot

`/api/health/environment` exists for one reason: a Vercel screen shows what was configured and only the
running process can show what it resolved to after branch precedence. The route and its module were
already in the tree, locked behind `HEALTH_CHECK_TOKEN`, answering 404 for a wrong or absent token and
already refusing to echo a connection string, but two things kept it from being a CFG-01 receipt. It had
only ever been exercised against an injected fake pool, and the identity it returned could not separate a
beta endpoint from a production endpoint that happened to share a database name.

`f924cef` closes both. The probe now also reports `pg_postmaster_start_time()` and the
`system_identifier` from `pg_control_system()`, taken through a path that sets one field to null rather
than blanking the whole readout if a role is refused the statistic or the query answers no rows, and it
reports the mail sender as a domain, which is the half that has to match a verified sender without
publishing a mailbox. Then `tests/browser/live-env-probe.cjs` runs the shipped module against the
disposable cluster the chain builds, as the app-shaped non-superuser role, and passes 8 of 8:

| Field the live server answered | Value on the disposable cluster |
| --- | --- |
| `current_database()` | `styld_disposable_test` |
| `current_user()` | `styld_local_runtime` (NOSUPERUSER, the shape a hosted app role has) |
| `inet_server_port()` | 61221, the port this run actually listened on |
| `host(inet_server_addr())` | `127.0.0.1`, loopback only |
| public base tables | 42, `information_schema` seen through the runtime role's grants |
| account rows | 0 |
| `schema_migrations` | absent, so `migrationCount: 0` and no query sent for it |
| `pg_postmaster_start_time()` | `2026-11-02T11:08:54.129Z` |
| `system_identifier` | `7703529456252627940`, the same for owner, runtime and a role with no grants |
| second database in the same cluster | `qa_probe_twin`, 0 tables, `system_identifier` unchanged |

That last pair is the point, with one direction stated. The identifier is a fact about the cluster, not
about the database, so two databases in one cluster answer it identically while their names differ, which
is what makes it the field that can tell a beta endpoint from a production endpoint sharing a name. Read
it one way: a value that differs from the beta project's shows the process is somewhere else, while a value
that matches is not proof by itself, because a branch made from a project copies its parent's control file
and a role refused the statistic answers null. The match that counts is database name, role, port and
identifier together, taken from the deployment that is being judged.

Whether the application's own role is even allowed to answer it is now measured rather than taken from
documentation, because an independent read of this commit claimed a non-superuser would be refused. On this
server, PostgreSQL 17.11, the app-shaped role `styld_local_runtime` is `NOSUPERUSER`, is not a member of
`pg_read_all_stats` (`pg_has_role` answers false) and still returns the identifier, and a role created with
no grants behind it at all returns the same value, so on this version the statistic is not the privilege
that was assumed. What a hosted compute does is still unknown until the founder's read comes back: the
probe is written so that a refusal costs one null field rather than the whole answer, and the suite proves
that path on both the cluster statistic and the postmaster time.

What the probe still cannot do, stated so nobody reads it as more than it is:

- It answers only when the caller already holds `HEALTH_CHECK_TOKEN`; a wrong token, a short token and no
  token all produce the same 404 a missing route would, so the endpoint cannot be used to discover itself.
- Deployment Protection sits in front of it. The route runs on the branch today, but an anonymous
  `curl` never reaches it, which is why the hosted read is a founder action and not an agent action.
- It reports what the process resolved to, so it proves isolation for whichever deployment answered. A
  preview URL is per-build, so the read has to name the deployment it came from in its receipt.
- It cannot say anything about the *other* environment's values. The comparison is made after the fact,
  by reading the beta answer and the production answer and checking that `system_identifier` differs.
- Nothing in it prints a credential: the live run asserts that the 64-character disposable password, any
  `address@target` form and any connection parameter appear nowhere in the answer.

The same commit extended the probe's unit suite, and an independent read of it on `f924cef` found six
things, three of them real enough to change the shipped module. It read `pg_postmaster_start_time()` as a
mandatory query while the commit message claimed optional degradation, so a refused or empty postmaster
read 503s the entire answer; `EMAIL_PROVIDER` was echoed into a published field verbatim; and the sender
was truncated to 120 characters *before* the domain was split, so a long display name could leave a
local-part fragment in a field documented as a domain. `9ecdbd7` fixes all three, tightens the
"everything is a read" assertion from "begins with SELECT or WITH" to "one bare SELECT with nothing after
it", makes both sides of the twin-database comparison prove they hold a number before comparing them, and
adds the privilege measurement above, because the read's own claim (that a non-superuser is refused
`pg_control_system()`) turned out not to hold on this server and the register should not repeat either
version as an assumption. `npm test` runs 11 cases against the real route and the real module rather than
6, the live smoke 8 rather than 7, and the review found no path by which a connection string, a host, a
mailbox or the driver's own error text reaches the answer.
The remaining half of CFG-01 is the founder's, and it is two commands rather than a decision: take the
hosted answer and run the read-only inventory, and #74 and #75 both become receipts.

## Closure matrix

Statuses are the seven the directive allows. VERIFIED COMPLETE always names its environment, and
"local" here means a production `next start` build on this machine against an owned disposable
PostgreSQL 17.11 cluster with loopback mail. Nothing is VERIFIED COMPLETE on hosted infrastructure,
because no hosted request has yet reached the application.

### MVP

| Item | Status | Environment and evidence |
| --- | --- | --- |
| MVP-01 Migration 015 validation and gates | VERIFIED COMPLETE | local disposable cluster, 28 of 28 at `cb9d34b`, migrations `001` to `016` unchanged since; gates re-proven above |
| MVP-02 Shell-only content routes | VERIFIED COMPLETE | local, `first-render-audit.json` on `VJvJJr4XQg3wYvhDKkpFS` (re-stamped from the `Xg8lckpQBCbH4LvP5wTSg` run on the same source): 69 routes, 0 loader-only |
| MVP-03 Non-production preview database | BLOCKED (verification pending) | 2026-11-01 update: a beta database does exist (`styld_beta` in Neon project `styld-qoder-private-beta-20261030`, 42 tables, one user row), so the old wording that no isolated database could be named is withdrawn. What is still missing is the proof that the beta branch reads that host and not the production host, which is CFG-01 and not a new database. The 2026-11-02 digest comparison in DB-ISO-01b says the hosted structure matches the chain; it says nothing about which host a running deployment connects to, so it does not move this row |
| MVP-04 Controlled tester access | BLOCKED (founder) | Deployment Protection answers anonymous requests with its own login redirect |
| MVP-05 Hosted Better Auth and real OTP | BLOCKED (founder) | 2026-11-01 update: `RESEND_FROM_EMAIL` and `BETTER_AUTH_URL` are reported present as Qoder-specific Preview entries, which is progress over the older matrix, but `lib/auth-readiness.ts` still answers not configured from this workspace and no code has ever been delivered to a tester. A sender entry is not a verified sender, and a configured URL is not a working sign-in until it is exercised on the hosted origin |
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
| DOMAIN-02 Attach apex, `www` canonical redirect | BLOCKED (founder) | all three hostnames answer `DEPLOYMENT_NOT_FOUND`; attaching a domain is a Vercel account action. This branch is deployed, but only to preview environments, and the directive forbids pointing the apex at a preview. Production attachment needs founder approval plus the beta database from action 2. Update from the 2026-11-02 P0: the cause is now read from the edge rather than inferred, and the target changed. The apex and `www` resolve into Vercel and the zone is Vercel's, so the missing piece is the project-to-hostname assignment and nothing else, which is also why no certificate exists. It must be assigned to the new public-only project, not to `sty-ld`, because that project's own `sty-ld.vercel.app` answers 200 anonymously on a Clerk-era build. The eleven clicks are in the section above, and the fourth of them is the one that makes a custom domain
serve anything at all |
| DOMAIN-03 Isolation and auth on custom hosts | BLOCKED (verification pending) | 2026-11-01 update: the Qoder-specific Preview entries for `POSTGRES_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `RESEND_FROM_EMAIL` are now reported visible in Vercel, which supersedes the older matrix that could only list names. Names existing is still not values applying: CFG-01 has to read the effective configuration off the running deployment, prove the beta database host differs from the production host, and never print a value. Until that receipt exists this row is not closed |
| DOMAIN-04 Branded sender, SPF, DKIM, DMARC, real OTP | BLOCKED (founder) | a registered domain is not a mail subscription; no sender is verified and no OTP has been delivered to an allowed inbox |
| DOMAIN-05 Propagation, TLS, HSTS, redirects, metadata, robots | BLOCKED (founder) | propagation is measured; TLS is absent (handshake fails), so HSTS, redirects, canonical URLs and social previews cannot be validated on a host. Locally: `app/robots.ts` disallows every crawler on every deployment, which is safe but not yet split into public and beta rules, `app/favicon.ico` exists, and the root layout sets no `metadataBase`, so absolute OG URLs cannot be produced |
| DOMAIN-06 Invite-only beta on a stable hostname with exact SHA | BLOCKED (founder) | the SHA half is now measured rather than inferred. This branch was pushed on 2026-11-02 as a fast-forward, `ba0254b..1415978`, 28 commits, test branch only, no merge, no force, and `git ls-remote` answers `14159781fefb63194da66c197609f5a60ac8b8f6` for `refs/heads/qoder/styld-beta-20261027`, which is the last commit in that range and the SHA this sentence was measured against; a register commit after it moves the tip again, so the SHA that matters here is the deployed one and not the pointer. Measured the same way after that follow-up: the branch tip at that reading was `a131478e6a0b0562c4d7f7496ba2d58014470cd3`, a docs-only commit on top of `1415978`, and Vercel built it as `7484421041` at `sty-jj9cg9wbc-dreeydesigns-3368s-projects.vercel.app`, status `success`, 04:40:20Z. The application source in both is the same, so neither build is a different product, and every later push retriggers the same shape. The GitHub Deployments API then holds two records for exactly that SHA, both `success`: `7484320927` (`Preview - sty-ld`, `https://sty-5tjryp19r-dreeydesigns-3368s-projects.vercel.app`, 04:31:56Z) and `7484337083` (`Preview - styld-auth-test`, `https://styld-auth-test-g7mq5u9sm-dreeydesigns-3368s-projects.vercel.app`, 04:33:14Z). So a deployed build of the current source does exist and is named. What is still missing is the hostname and any reading of that deployment: `GET /discover` on the `sty-ld` preview answers `302` to `https://vercel.com/sso-api?...`, which is Deployment Protection, and the hosted receipt above records that stop against this SHA. A deployed SHA that nobody can reach is not an invite-only beta, and the two projects both building the same branch is PROJ-01, not a second environment. One thing makes the attach sharper than it was: the project is reported to exclude custom domains from its standard protection, so the first custom domain attached becomes anonymously reachable. That is why SAFETY-01 has to prove the application holds authorization on its own before the attach, not after  Read once more on the same date, after the reviewed profile fix: `git ls-remote` answers `c1cff8b85101f3bc983e9d160d8e0deb0e0fca54`, and Vercel built that SHA in both projects as `7488417152` (`sty-d7xs9ro41-`, 09:17:56Z) and `7488392809` (`styld-auth-test-aic3ly66q-`, 09:16:34Z), both `success`. Unlike the two readings above, that SHA does move product bytes, so the deployed preview now differs from `d8264e0` in the short-phone profile layout. The reach half is unchanged. |

### PUBLIC

| Item | Status | Detail |
| --- | --- | --- |
| PUBLIC-01 A public-only artifact that can be its own project | BUILT, not deployed | `public-site/` is two static pages, `robots.txt`, `sitemap.xml`, `vercel.json`, brand assets and four product frames, with no executable script (one inert JSON-LD block is the only script element, and `tests/public-site.cjs` allows that one and no other), no cookie, no analytics, no environment variable and no database. `public-site/package.json` declares no dependency and its build script prints one line, so the no-op build under the runbook's `Other` preset has nothing of its own to fail on. Nothing that is not meant for a visitor sits in the folder: the note about how to run it lives at `docs/readiness/beta/STYLD_PUBLIC_SITE.md`, and `tests/public-site.cjs` fails if a Markdown or text file other than `robots.txt` appears there. See the section above |
| PUBLIC-02 Real product frames, nothing invented in them | DONE with a receipt and a gate | `tests/browser/live-public-screenshots.cjs` runs `next start` against an owned disposable cluster, signs one fresh identity in through a real emailed OTP and seeds nothing: 4 of 4 frames, `users 1`, `social_posts 0`, `services 0`, `bookings 0`, commit `5a827ca8`, build `ItEdrZoLDWysxjsW3-C6b`. `tests/public-site.cjs` hash-matches each published PNG to that receipt and fails if any provider, post, service or booking row existed at capture time |
| PUBLIC-03 Headers, metadata, links and mobile measured in a browser | DONE with a receipt and a gate | `tests/browser/live-public-site-check.cjs` at 1440x900 and 390x844: 15 controls per viewport and none under 44px, 6 images per viewport and all 6 arriving, 10 path-absolute references plus `/robots.txt` and `/sitemap.xml` fetched as 12 links and all 12 returning 200, 0px sideways scroll, 0 console errors, 0 failed requests, canonical and share image on the apex, and the only off-origin hosts being the two Google Fonts hosts. Full-page evidence at `docs/readiness/beta/public-site-desktop.png` and `public-site-mobile.png` |
| PUBLIC-04 The domain attach | BLOCKED (founder) | the eleven clicks are written out above. The folder is now on the remote for the account owner to import: pushed 2026-11-02 as a fast-forward `5a827ca..c743b0c` on `qoder/styld-beta-20261027`, and `GET /repos/dreeydesigns/Sty_ld/git/trees/c743b0c...?recursive=1` lists 17 entries under `public-site/`, none of them Markdown, with `git ls-remote` answering `c743b0cbef41d0af5ccf40ae7f34342d82de6f62` for the branch tip, which is the same SHA the local `git rev-parse HEAD` reports. Vercel's bot had posted one deployment for that SHA at 14:07:26Z (`Preview - styld-auth-test`). `wearestyld.com` and `www` still answer `DEPLOYMENT_NOT_FOUND` at 14:08:21 GMT and both HTTPS attempts still die at the handshake, so the domain is not fixed and no claim is made that it is |

### MOBILE

| Item | Status | Detail |
| --- | --- | --- |
| MOBILE-TOUR-01 Eight-step walkthrough positioning | FIXED IN CODE, awaiting the founder's real-device sign-off | the founder's evidence ZIP arrived and is extracted at `C:\Users\Muti\Documents\styld-mvp-pre-closeout\mobile-evidence-2026-11-01` (25 iPhone captures, IMG_5461 to IMG_5486). The defect it shows is reproduced from behaviour, not guessed: the guide card sized itself to a fixed height, so on short phones no readable band remained and the step fell back to a centred overlay sitting on the listing it describes; the reveal then accepted the first frame that looked seated, which is a smooth scroll passing through the seat rather than arriving in it. `900d60a` sizes the card to the band it is given and waits for the page to be at rest before placing it. Live cluster sweep `node tests/browser/tour-mobile.cjs`: 11/11, all eight client steps spotlighted across 320x568, 360x640, 375x667, 390x844 and 430x932 with the card 14px clear of the target (`docs/readiness/beta/live-tour-mobile.json`). Simulated viewports only: the founder's own iPhone and Android run is FND-01 and this receipt does not close it |
| MOBILE-PROFILE-02 Avatar padding and overlap | FIXED IN CODE and measured in a browser; real-device sign-off pending | the founder's report was that the profile picture sat wrong against the cover, and the earlier entry here rested on a source assertion plus an audit route that only proved nothing had broken. `77d5eac` had restored `p-5` and full rounding on the client card; `c98d89b` gives the Professional/Salon card the same gutter, because it was still `rounded-t-[28px] p-0`, square at the bottom and flush to the screen edge on mobile, which is the half the first fix left behind. `tests/browser/profile-card-layout.cjs` then measured both cards in a real browser: sign a real client in on a disposable cluster, drive the text-size pills on /settings, change world through the Profile personalization dialog, seed a professional workspace and switch to it through /settings/workspaces. Before: 3/13 (`docs/readiness/beta/live-profile-card-layout-before.json`, build `Jv407xgOj_kKFTzFDn-yA`, the tree with `77d5eac` reverse-applied), and five of its failures are the page error `a.tribes is not iterable`. After: 13/13 on commit `db8a98a`, build `mCRuNUUgm2-ieOa9QKfUI` (`docs/readiness/beta/live-profile-card-layout.json`, 17 screenshots, 0 client-side errors; the same 13/13 was first taken on `09b7e9f` build `89uYhSWNruPtg6unJtTbH` and re-taken after `db8a98a` made the bottom-bar step assert its tap unconditionally): gutter 20px on all five phone widths (320x568, 360x640, 375x667, 390x844, 430x932), radii 28/28/28/28, the card overlapping the cover by 48px on purpose, the avatar inset 21px from both card edges and never clipped, the name 37px from the card edge, no collision between name, badge and action at any width, and the avatar edit control hit-testable at 24px or more at every width. Text sizes were not read from a stylesheet: the S, M and L pills were clicked, `styld_settings` re-read, and the root measured at 14.4 / 16 / 18.4px with the name at 21.6 / 24 / 27.6px and the gutter holding at 18 / 20 / 23px. All six worlds were selected through the app and each one paints the card at the same 20px gutter with the same four corners. The provider card was measured after the workspace switch, at the same gutter and radii, with `data-world` correctly absent for a professional session. Two things this row does not hide. The first is a defect the six-theme requirement exposed rather than the founder's list: a signed-in client could not change world at all, because `lib/workspace-policy.ts` projected a profile with no tribes list while `ClientUserProfile` declares one, so every save threw `profile.tribes is not iterable` and the picker wedged. `4a8edb8` stops the throw, `09b7e9f` fixes the contract at the server by projecting the stored world the way the non-workspace branch of `/api/me` already did, and `tests/beauty-worlds.cjs` now executes `lib/client-session.ts` in a browser-shaped context instead of grep'ing it, with the pair run against the unfixed source to show the production error message. The second was a measurement that was not a pass, and it is now a fix. The floating bottom bar is fixed to the viewport, so at first paint on 320x568 it covered the camera badge and the name, on 360x640 the name and the Edit profile action, and on 375x667 the bottom of the action; the founder read that entry and authorised the smallest responsive and touch-target correction under the freeze. `55f10f1` takes 138px out of the stack above the hero on a phone under 700px tall, measured as the client name bottom moving from 582px to 444px at all three of those widths (the cover band steps from 176px to 96px, the completion nudge drops its missing-field chips and tightens its padding, and the client identity row stops wrapping its action onto a line of its own), and the same run then proved the provider card had a second, older defect: below `lg` it packs a 96px avatar beside Edit Profile, Share and Preview, which together need 435px, so at 320 and 360 Share was cut and Preview sat past the card edge, and at 375, 390 and 430 Preview alone ran to 449px on a card ending at 359, 374 and 414px. The row keeps a 12px gap, the action group may wrap below `lg`, from 360 up the group drops onto its own line, and under 360 the labels step into the accessible name and the icons stay. Before: 11/13 on the reverse-applied tree, build `-DzA_b2Hdnd3l0yd857Bj`, three of five client widths reaching under the bar (the other two failed on the touch targets, not on the band), five of five provider widths clipped, and no control on either card holding a 44pt area. After: 13/13 on `4f1ecec`, build `HQfsOyA6t1NjDUlaW0pLZ`, with the bar clearance at rest, the clipping and the touch targets asserted at every phone width on both cards. Target sizes are stated as measured: the badge still paints 28x28 and the pills 38px tall, and each now answers a tap 21px out from its centre in four directions through an invisible extended hit area, so Apple's 44pt is met by the clickable region while the design keeps its painted size; 24px WCAG 2.2 AA was already met. The probe is not limited to the two controls the founder named: every button, label and link the card paints on the screen at rest is probed, two on the client card and four on the provider card, and a control whose probe cross leaves the viewport is listed as off-screen rather than counted as a pass. A 44pt box reaches 22px from its centre, so what the probes prove is a 42px span, the box measured 1px inside each edge. 390x844 in installed Chrome is a simulated phone, so FND-01 still owns the hand-held run |
| MOBILE-PLAN-03 Long Plan catalogue | FIXED IN CODE and measured in a browser for the controls, with the one half the browser cannot reach named below; real-device sign-off pending | `ba06ae6` adds search, category chips with counts, name and price sorting, an honest status line that the selection is kept, and a second Back link; `29f54bd` makes the price sort use the same rule the card uses to decide whether a figure may be printed at all. Nothing had driven those controls in a browser: `tests/browser/plan-v2.cjs` intercepts mock responses and never opens `#plan-service-sort`. `tests/browser/plan-catalogue-order.cjs` now signs a real client in on a disposable cluster and seeds a professional with three real `services` rows, so the list arrives through the same join the app uses (`lib/plan-repository.ts` `options()`) rather than a mock. Before: 3 of 8 on build `fwsyNYY7AWf74vpRmR_CJ`, both commits reverse-applied with `git apply -R`, and every failure is a control that does not exist, starting with `#plan-service-search` never appearing, which is the founder's report of one long block you cannot narrow. After: 8 of 8 on build `992QQqwQDsYw08XEzfhkw` (`docs/readiness/beta/live-plan-catalogue.json`; both receipts carry `commit: 986f0ba`, which is HEAD when each launches): 47 services paint, the `QA Plan Sort (3)` chip takes the count line to "3 of 47 services shown", the cards print `From Ksh 45.50`, `From Ksh 1,200` and `Service interest. Price not provided.`, the card with no listed price sorts last under all three sorts, the name and price orders are the orders actually painted, a search for `QAorder Zeta` leaves exactly that card, a search matching nothing shows `No service matched that search. Try a shorter word or another category.`, and a chosen package survives being filtered out of view and coming back, with the Remove button then clearing it. What this pair does not do, and the receipt says so: the divergence `29f54bd` removed is not reachable in a browser at all, because the repository turns any price it will not list into `null` before the component sees it (the seeded `-5.00` row is asserted to arrive as `price: null`), so pre-fix and fixed cards print the same words from the same payload; that half stays at contract level in `tests/plan-catalogue-controls.cjs`, while the live run re-derives the label/order agreement from the served payload instead of claiming to have reproduced the bug. The first run of this instrument failed five steps for a harness bug, a page-side probe reading Node constants, not for a product defect; the pair above was taken only after it was fixed. 390x844 in installed Chrome is a simulated phone, so FND-01 still owns the hand-held run |
| MOBILE-MEDIA-04 Black preview, crop, size claim | FIXED IN CODE; the legacy-record and refused-upload halves measured in a browser, the black preview and size claim on executed unit cases, real-device sign-off pending | four causes, and the last of them is history rather than code. `7a4a514` made the editor open on the real source, upload the file `prepareImage` produced, revoke its blob URL and report the true size delta; `80fcb34` added `isStorableImageUrl` and the pre-upload cap check, so an oversized or unprepared file is refused before a byte leaves the phone and a legacy value is not carried into the editor. What was left was a record already written by the old code, and until `e58023b` nothing had ever seeded one. `tests/browser/media-legacy-profile.cjs` now signs a real client in on a disposable cluster, writes a dead preview address into the record the server actually serves, proves `/api/me` carries it, reloads and measures the two image slots. Before: 6/7 on build `41t8UHDuh7D3jawj8QNfV`, and the failure is the defect itself, printed from the page: the avatar circle holds `blob:http://127.0.0.1:59991/0000dead-…` at `complete: true, naturalWidth: 0`, an empty box the account page presents as the user's photo. After: 7/7 on build `719HSBuL1_GqupwzldDfL` (`docs/readiness/beta/live-media-legacy-profile.json`), the same step shows the initials, 0 elements anywhere on the page point at a `blob:` or `data:` address, the cover keeps its gradient, and nothing claims a saved image. Two controls keep that from being a passing test that proves nothing: a real same-origin address written into the same record paints and decodes at 1024px wide, so the guard is a decision about the address and not a way of hiding every photo, and the picker is driven with a real PNG while uploads are switched off server-side, where the sheet's own alert says "Image uploads are not available in this environment yet." and the shown photo, the served record and the checklist are all unchanged. One correction of method belongs in the record: the first version of this instrument seeded `users.profile_image_url`, a column `/api/me` only reads when the session has no active workspace, so nothing it wrote could reach the page and the guard looked satisfied on the unfixed build too. The row stayed IMPLEMENTED BUT UNVERIFIED until the seed was moved to `identity_workspaces.profile`, which is what the signed-in card is served from. Still open, and no receipt here closes them: the provider card uses the same helper and has not been driven by a provider session, the `128` axe incompletes and the hand-held phone upload are FND-01, and rows already holding a dead address are hidden, not deleted, which is a data decision |
| MOBILE-A11Y-05 Reduce Motion and High Contrast | FIXED IN CODE, measured in a browser, real-device sign-off pending | `bd118ad` wired the two in-app switches, `2447016` and `b047e1a` closed the two review defects below, and `fa0a472` replaced the source-text matching that used to count as coverage with `tests/browser/high-contrast.cjs`, which turns the real toggle on a signed-in page and measures the result. Live `docs/readiness/beta/live-high-contrast.json`: 8/8 on build `Ne9t7nk5KQx6HeqgmiNKz` (the receipt
names the run's parent `ffa9157` because the suite stamps HEAD when it launches, and the tree it measured
is the one committed as `b047e1a`), recorded on 390x844. The switch reaches `html[data-high-contrast]`, is stored in `styld_settings` and is applied again after a reload; every translucent surface the mode claims to solidify computes alpha 1 (3 surfaces per route on `/discover?tab=looks` and `/settings`, 0 left translucent); 0 white labels sit on a surface this mode made solid white, and white text inside one turns to Deep Ink `#1A1A2E` instead of vanishing; a `hover:`, `placeholder:` or `disabled:` token keeps its resting colour, which is the second half of review finding 4; under Reduce Motion the computed animation and transition durations both hold at 0.01ms and the only live animation is a single-iteration spin. What is still open is a human eye, not a code path: the 128 axe `color-contrast` incompletes named in DESIGN-06 have not been hand-checked, and the mode on a real handset in daylight is FND-01 |
| MOBILE-TYPE-06 Large text breaks layouts | FIXED IN CODE, measured in a browser, real-device sign-off pending | three separate causes, each with a before and after run. The mechanism moved from CSS `zoom` to the root font size, so viewport units stopped scaling with the text (`bd118ad`). The fixed pixel text utilities (the review put the figure near 420) meant the setting grew headings over unchanged body copy, and review finding 3 below recorded that as an accepted limit; it is no longer a limit, every arbitrary text size in application source is written in rem (527 of them, and `grep` for `text-[Npx]` under `app/`, `components/`, `lib/` now returns 0), converted at `2447016` and held by the standing guard in `tests/text-scale.cjs`, which plants an offender before it is allowed to report a clean tree. The third cause was found by the browser suite, not by reading: a stored preference was applied only after mount, so the page painted at the default size first; `7fc8336` reads `styld_settings` before the first paint. Live `docs/readiness/beta/live-text-scale.json`: 17/17 on build `Ne9t7nk5KQx6HeqgmiNKz` (commit `b047e1a`) at 320x568, 360x640 and 390x844 over `/discover?tab=looks`, `/book`, `/service-comparison`, `/home` and `/settings`, root 16px to 18.4px at Large and 32px at 200 percent, with 2,760 element comparisons across 30 route/viewport/scale cases, 0 elements keeping a size the root scale did not reach, 0px horizontal overflow at either setting and 0 nodes React rebuilt between the two readings. The before state is kept as an artifact: `live-text-scale-before-no-flash.json` scored 1/17 on `2e9e4d2`, failing the reload case, which is the defect the pre-paint script closed. Simulated viewports only: the founder's own Large-text run on an iPhone is FND-01 and this receipt does not close it |

## Independent review of the four fixes

A second agent reviewed the four commits without being told what was fixed, reading each diff and then
the surrounding source. All 13 new tests pass. Its findings are recorded here because they narrow what
the rows above are allowed to mean.

1. Photo editor, low. No path can now write a blob URL where a data URL is expected, and a failed
   upload cannot present a local URL as saved. What it cannot repair is history: profile rows written
   by the old code can still hold a `data:` URL, and the editor renders whatever `value` it is given as
   "Image saved". Clearing those rows is a data decision, not a code path.
2. Filter fallback, low. `adjustImagePixels` works in gamma-encoded bytes with a 128 pivot, while CSS
   brightness, contrast and saturate are defined in linear light around 127.5, and the fallback does not
   clamp between the contrast and saturation steps. On a device without canvas `filter` the saved photo
   can differ subtly from the preview, worst at slider extremes. It is a faithful-enough approximation,
   not an identical one, and the register does not claim identical.
3. Text scaling, medium. This is the real limit of MOBILE-TYPE-06, described in its row above. Fixing it
   properly means converting the pixel-sized text utilities to rem across roughly 420 call sites, which
   is a task of its own and is not done here.
4. High contrast, medium and low. Removing `backdrop-filter` leaves the surfaces that leaned on the
   frosted look still translucent, so a white/12 search bar or a white/12 button over a photo gets less
   contrast, not more, in that mode. And `[class*="text-white/"]` also matches `hover:`, `placeholder:`
   and `disabled:` tokens, so it forces the base colour to solid white wholesale. Neither is a
   violation the audit can see, and both need a human eye in that mode before the defect is called
   closed.
5. Plan catalogue, no issue. Filters are display-only, the selection lives in the draft, the ten-service
   cap and the proposal and conflict flows are untouched, and a selected service that the filter hides
   still appears in the selected list. One nit: the sort reads the raw price while the display uses the
   listed-price cents check, so a price that fails validation sorts numerically and still shows "Price
   not provided".
6. Test strength, honest grading. `tests/plan-catalogue-controls.cjs` really executes the filter and the
   non-mutation rule; `tests/image-editor-truthfulness.cjs` really executes the size description and the
   pixel adjustment. `tests/a11y-settings-enforcement.cjs` is entirely source-text matching and proves
   nothing about runtime, and the editor guards prove presence, not coverage. None of the three renders
   a React component, so the runtime wiring still needs a browser or a hand.

All six were engineering work, not founder work, and none of them was closed by an account action. They
were taken one at a time, in the order below, each as its own commit with its own before and after
evidence, per the founder's 2026-11-01 instruction to stop parallel tracks and integrate serially. The
state of each is now: finding 1 is closed in code and now closed in a browser as well. `7a4a514` made a
failed upload return
no URL at all, so `uploadPreparedImage` cannot hand a local value to `onSave`, and `80fcb34` added
`isStorableImageUrl`, which screens a legacy `data:` or `blob:` row on the way into the editor so it
renders as not uploaded instead of "Image saved"; `tests/image-editor-truthfulness.cjs` covers both,
including the protocol-relative case, and covers the two new halves as well: a stored value that is not a
real address is dropped from the profile field, and an upload response that is not a real address is
reported as a failed upload rather than a saved picture. The browser then measures the same decision on a
signed-in page, with the record seeded and the served value proved first: 6/7 with the guard taken out,
the avatar box holding the dead `blob:` address at zero decoded width, and 7/7 with it in
(`live-media-legacy-profile.json`). Both receipts carry `commit: cc91357`, which is what a suite stamps when it launches: the tree either was this revision with the guard taken out or is the guard itself, and the tree that became `e58023b` had no SHA to name yet. What the reviewer correctly says code cannot repair is still true and
still the only remainder: rows
already written with a `data:` URL are a data decision. This change hides them; it does not delete them,
and deleting them needs a decision about whether anything in the hosted database is worth keeping.
Finding 2 is closed by measurement: `live-filter-parity.json`
puts the canvas preview and the saved pixels through 14 filter combinations in the same engine and holds
the worst per-channel delta to 2 steps, no more than 4 channels a step out and a mean under half a step;
the note in that receipt keeps the honest limit, that the reference is this Chromium and Safari's own
rendering is FND-01. Finding 3 is closed and no longer a limit, see MOBILE-TYPE-06 above: the pixel
utilities were converted at `2447016`, and `tests/text-scale.cjs` refuses a new one. Finding 4 is closed
at `2447016` and `b047e1a`, and the browser proves it in `live-high-contrast.json` rather than a grep.
Finding 5's sort nit is closed at `29f54bd`, and the controls the nit sits inside are now driven in a
browser at `live-plan-catalogue.json` (8 of 8) against `live-plan-catalogue-before.json` (3 of 8 with
both plan commits reverse-applied). What that pair cannot show is named in the same row: the repository
hands the page `price: null` for any figure it will not list, which the run asserts from the served
payload, so no browser state separates the pre-fix card from the fixed one and the divergence itself
stays closed by `tests/plan-catalogue-controls.cjs`. Finding 6 is closed at `fa0a472`, which is the commit that
replaced source-text matching with three executed instruments; `tests/a11y-settings-enforcement.cjs`
still exists but no longer carries the claim on its own.

A second review round ran against the PROFILE-02 bar residual after `55f10f1`, and two of its findings were
blocking, both about what my prose claimed rather than what the code did. First, the register said every
control on the card held a 44pt target while the instrument probed the two controls the founder named, so
`4f1ecec` made the probe sweep every button, label and link the card paints on the screen at rest, list a
control whose probe cross leaves the viewport as off-screen instead of as a pass, and keep a per-width floor
so an empty list cannot pass vacuously. Second, the instrument pushed each sample after its assertions, so
the failing widths in the before run recorded no geometry and I had written "five client widths under the
bar" from a run that only measured two of them; the samples now go in before the asserts, and both halves of
the pair were re-taken on that instrument so they remain matched step for step. Three non-blocking items
went in the same pass: the stylesheet comment stated the control separation as arithmetic instead of as the
measurement it was, a note said the cover band steps to 112px when it steps to 96px, and a height reduction
was written as "~122px" before anything was measured, so it now reads 138px against the 582px to 444px name
bottom the receipts actually hold. The review did not find a defect in the fix itself.

## DOMAIN-01: why `wearestyld.com` answers `DEPLOYMENT_NOT_FOUND`, measured a second time

The founder's P0 asks for the precise cause read from the live platform rather than a theory, and for the
domain not to be called fixed until it is actually fixed. Every line below is a probe this agent ran from
this machine at 12:30 GMT on 2026-11-02, four hours after the Stage 0 table above, with no credential and no
change to any setting.

| Probe | Answer |
| --- | --- |
| `nslookup -type=NS wearestyld.com` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com`, so the zone is still delegated to Vercel |
| `nslookup -type=A wearestyld.com` | `216.198.79.1`, the Vercel edge address |
| `nslookup -type=A www.wearestyld.com` | `64.29.17.1`, also Vercel |
| `http://wearestyld.com/` | `HTTP/1.1 404 Not Found`, `Server: Vercel`, `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`, `X-Vercel-Id: cpt1::6wmb9-1793622641612-8a4de3318f6c`, `Date: Mon, 02 Nov 2026 12:30:41 GMT` |
| `http://www.wearestyld.com/` | the same 404 and the same `X-Vercel-Error`, `Date: 12:30:42 GMT` |
| `https://wearestyld.com/` | `curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed`, so no certificate is being served |
| `https://www.wearestyld.com/` | the same handshake failure |

Re-probed from this machine at 13:49 GMT the same day. Both HTTP readings and both handshake failures repeat
exactly: the apex answers `404` with `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` and `X-Vercel-Id:
cpt1::j4g75-1793627387054-e94d0a45fedb` at 13:49:47, `www` answers the same at 13:49:48 with `X-Vercel-Id:
cpt1::wh95t-1793627388336-d16d4c8400b6`, and `https://wearestyld.com/` still dies at
`curl: (35) schannel: failed to receive handshake`.

One 12:30 line needs correcting, because it is the kind of detail that makes someone edit a record they
should not touch. The addresses are not split one per name. `nslookup -type=A` at 13:49 answers
`64.29.17.65` and `216.198.79.1` for both `wearestyld.com` and `www.wearestyld.com`, so the single address
listed against each name above was one resolver's view of Vercel's edge pool rather than two different
targets, and the Stage 0 table's `64.29.17.1` for the apex was that same pool read at another minute. This
does not move the diagnosis: both names land on Vercel and Vercel says it has no deployment. It is exactly
why the clicks below tell the account owner to let Vercel keep the records, because which edge address that
pool returns is Vercel's to assign and not ours to type.

The cause is now narrowed to one thing, and the two candidates the Stage 0 reading left open are closed.
DNS is not the problem: the nameservers are Vercel's, the apex and `www` both resolve into Vercel's edge,
and the edge answers with its own error header rather than a timeout or a registrar page. The release is not
the problem either, in the sense that a build exists: the branch has built repeatedly, and the GitHub
Deployments API lists those builds under per-deployment hostnames. What is missing is the assignment that
connects a project and one of its deployments to these two hostnames. Vercel resolves an incoming request by
looking the `Host` up in its domain table; a verified domain that belongs to the account but is attached to
no project has no row to land on, so the edge returns `DEPLOYMENT_NOT_FOUND` before any application code
runs. The certificate follows the same rule. Vercel issues and renews a certificate for a hostname once that
hostname is attached to a project, which is why both HTTPS attempts die at the handshake instead of
returning an invalid-certificate warning: there is nothing to present. That is also the whole reason the
browser reports the HTTP address as "not secure", and it is why a successful build status is not evidence
about the domain, exactly as the P0 says.

Two consequences follow for the order of work. First, no repository change can fix this: there is no Vercel
CLI on this machine, no token in any readable environment, and domain attachment is an account-owner action
inside the Vercel dashboard. Second, the fix must not be "point the apex at the beta". The next section is
why.

## A second finding, and it changes the DOMAIN-03 recommendation

`https://sty-ld.vercel.app/`, the default deployment hostname of the project named `sty-ld`, answers
`HTTP/1.1 200 OK` to an anonymous request from this machine at 12:30:46 GMT, with no `Set-Cookie`, no
`Vercel-Machine-Auth` challenge and no redirect to a login wall. Three details in that response matter more
than the 200.

- The security policy is a Clerk-era policy: `script-src` allows `https://*.clerk.accounts.dev`,
  `https://*.clerk.com` and `https://api.clerk.com`, and the response carries `X-Clerk-Auth-Reason:
  dev-browser-missing` and `X-Clerk-Auth-Status: signed-out`. The branch this agent works on has no Clerk
  dependency at all (`tests/clerk-auth-regressions.cjs` fails the suite if `@clerk/nextjs` returns). So what
  is publicly reachable on the canonical project's own hostname is not the current Better Auth beta. It is an
  older production release from before the auth migration.
- Its guards are its own, and they hold on the two routes probed: `/admin` answers
  `307 Temporary Redirect` to `/auth/sign-in?returnTo=%2Fadmin`, and `/api/auth/sign-in` answers 404. So this
  is not an open administrative surface. It is a stale, unprotected, publicly indexable build of the product.
- It is the reason the P0's fallback is now the recommendation rather than a fallback. The apex cannot be
  attached to `sty-ld` as that project currently stands, because attaching a custom domain to it would not
  replace what is already served on `sty-ld.vercel.app`, and the founder's own instruction is that
  `all_except_custom_domains` currently lets a custom domain through Vercel's SSO. The safe shape is the one
  the P0 authorises: a separate, minimal, public-only project for the investor site, and the beta left
  exactly where it is until #74, #75 and #76 close.

This belongs to PROJ-01 and SAFETY-01, not to a domain task: either the stale production deployment on
`sty-ld.vercel.app` is replaced by the reviewed branch or it is removed, and either way the project's
protection setting has to be read and recorded rather than assumed.

## PUBLIC-01 to PUBLIC-04: the public-only investor site, built and gated

`public-site/` is a static folder with two pages, no analytics, no cookies, no third-party script and no
reference to any application route. It is importable as its own Vercel project with Root Directory
`public-site`; `public-site/package.json` declares no dependency and its build script only echoes one line,
so the no-op build that the runbook's `Other` preset runs has nothing of its own that can fail. It carries
no environment variable and reaches no
database, which is what makes it safe to put on the apex while the beta's gates are still open.

| Piece | What it is | Where the proof is |
| --- | --- | --- |
| The page | `public-site/index.html`: what STYLD is, the gap it closes, the four-step client flow, the six worlds, where professionals and salons fit, what works today versus what is still being tested, Nairobi, and one investor call to action | `public-site/index.html`, `public-site/privacy.html`, `public-site/styles.css` |
| The frames | four real screens from the production build: the plan surface, the world chooser at desktop, the same chooser at phone width, the discovery feed | `public-site/assets/screens/`, receipt `docs/readiness/beta/live-public-screenshots.json` |
| The capture | `tests/browser/live-public-screenshots.cjs`: `next start` against an owned loopback PostgreSQL 17.11 cluster, one fresh identity created by a real emailed OTP, no seed rows of any kind | `users 1`, `identity_workspaces 1`, `social_posts 0`, `services 0`, `bookings 0`, `syntheticDataSeeded: "none"`, commit `5a827ca8`, build `ItEdrZoLDWysxjsW3-C6b`, cluster `styld-local-5450769d-e7ff-4ba0-9824-1820ff1aa61b` on port 63444, 4 of 4 frames |
| The browser pass | `tests/browser/live-public-site-check.cjs`: the folder served over loopback and met in Chrome at 1440x900 and 390x844 | receipt `docs/readiness/beta/public-site-static.json`, plus `public-site-desktop.png` and `public-site-mobile.png` |
| The gate | `tests/public-site.cjs`, 11 tests, part of `npm test` | world names, copy and colours matched to `lib/beauty-world.ts`; capability claims matched to `lib/feature-flags.ts`; each published PNG hash-matched to the capture receipt; zero seeded rows required and the capture receipt's own `failures` required to be empty; no beta origin, no internal route, no executable script, no dash; no Markdown or narrative text inside the deployable folder; no sentence that calls a bookable thing verified; and the last browser pass required to be clean on every axis it measures and digest-tied to the exact bytes of `index.html`, `privacy.html` and `styles.css` it measured, so a stale receipt fails rather than passing quietly |

What the browser pass actually measured, in a real browser rather than by reading the markup: 15 controls per
viewport and none of them under 44px in either direction, 6 images per viewport and all 6 arriving with their
natural width, 10 path-absolute references across the two pages plus `/robots.txt` and `/sitemap.xml`, so 12
links fetched in total and all 12 answering 200, zero sideways pixels at either width, zero console errors,
zero failed requests, canonical `https://wearestyld.com/`, share image `https://wearestyld.com/assets/og.png`,
and the only off-origin hosts touched being `fonts.googleapis.com` and `fonts.gstatic.com`.

A second review pass over the same folder found three more sentences the build does not support, and they are
corrected here rather than left for the next reader. The page description called the services a client
discovers "verified", which is the word the same page's own "Not enabled yet" list says is not issued, so the
adjective is gone and `tests/public-site.cjs` now fails on any sentence that calls a bookable thing verified.
That list also said sign-up was not open, which the code does not do: `app/sign-up/page.tsx` and
`app/auth/sign-up/page.tsx` both render the live auth flow, and no registration allowlist exists anywhere in
`components/auth/` or `lib/better-auth.ts`. The bullet now states it in both directions, that the screen is
reachable today and that opening this beta one person at a time is how the team works, not something the
software enforces while the gates close. The discovery bullet claimed services and public creator profiles with
no qualifier, so it now names the shipped sample catalogue the product discloses in its own banner at
`components/app-shell.tsx:48`. The same pass found one gate gap: the browser receipt was read for its findings
but tied to nothing, so a run made against an older copy of the folder would keep passing. The check now writes
a SHA-256 over `index.html`, `privacy.html` and `styles.css` and the gate recomputes it, so the receipt in this
commit is a digest of the bytes it actually measured. Nothing else from that pass was blocking.

Two honesty rules in the frames are worth stating because an investor will look. The plan surface shows the
shipped sample catalogue, 44 services, and the product's own banner above it saying listings include sample
data and that bookings, purchases and payments are unavailable; the caption repeats that rather than
cleaning it up. The discovery feed is empty, "No published looks yet" and "0 visual looks", because the
database behind the capture held one QA account and nothing published. No provider profile, post, review,
badge or price anywhere on the page is invented, and no traction number appears at all.

One product observation from the capture, recorded rather than fixed because it is outside this P0: the
discovery frame's ranking pill reads "Feminine world" while the six worlds are named Pure, The Romantic, The
Earth Woman, The Seeker, The Daughter of the Soil and The Muse. That is the shipped UI, so it is what the
frame shows; the naming mismatch is a beta copy item, not a public-site item.

### The exact clicks that attach the domain (account owner only)

Nothing below can be done from this workspace, and the domain is not fixed until they are done. They are
written so that the beta project, its database, its user records, its auth secrets and its payment controls
are never touched.

1. Vercel dashboard, choose the account that owns `wearestyld.com`. Add New, Project. Import the existing Git
   repository `dreeydesigns/Sty_ld`, whose test branch tip is `c743b0c` as of 2026-11-02 and carries this
   folder at `public-site/`.
2. In the import form, set Branch to `qoder/styld-beta-20261027` and Root Directory to `public-site`. Set
   Framework Preset to Other. Leave Build Command and Output Directory at their defaults; the folder's own
   `package.json` makes the default build a no-op. Do not add any environment variable.
3. Deploy. The new project should list a build that succeeds with no functions and no server output.
4. Before any hostname is attached, make that build the project's Production deployment: in this new
   project's Settings, Git, set Production Branch to `qoder/styld-beta-20261027`, or promote the build from
   step 3 to Production from its Deployments list. This step decides whether the rest can work at all,
   because Vercel answers a custom domain from the project's production deployment, so a domain attached to
   a project whose only builds are preview deployments still returns `DEPLOYMENT_NOT_FOUND`. That is the
   symptom this file was opened for, and it is why the earlier DOMAIN-02 note says this branch is deployed
   but only to previews. Confirm the deployment is labelled Production before step 6.
5. Open that project's Settings, Deployment Protection, and set it to Disabled (or at minimum leave
   Production unprotected). This is the project an investor opens, so a Vercel login wall on it is the exact
   failure the P0 forbids. Do not change this setting on the beta project.
6. Still in the new project, Settings, Domains, add `wearestyld.com`. Vercel recognises the zone because the
   nameservers are already its own, so it should attach without asking for a new record. If it offers an
   `ALIAS`/`A` target, it names the Vercel edge pool the apex already resolves to, which from this machine
   answers `216.198.79.1` and `64.29.17.65`, so no DNS edit is needed; do not add, remove or repoint anything
   by hand, and do not type an address in either, because which edge answers that pool is Vercel's to assign.
7. Add `www.wearestyld.com` to the same project and choose the redirect to `wearestyld.com` that Vercel
   offers for the apex pair. `public-site/vercel.json` already carries a permanent host-conditioned redirect
   from `www` to the apex as a second layer, so both layers agree.
8. On each of the two domains, turn on Enforce HTTPS once the certificate check goes green. The certificate
   appears only after steps 6 and 7, which is the whole cause recorded above.
9. Do not attach `beta.wearestyld.com` to anything yet. It stays a name without a deployment until DB-ISO-01,
   CFG-01 and SAFETY-01 have their independent evidence, per the founder's instruction.
10. Then verify as an investor, in this order, and send the answers back: a fresh private browser window at
   `https://wearestyld.com` (expect 200, padlock, no Vercel login prompt); `http://wearestyld.com` (expect a
   redirect to HTTPS, not an error page); `https://www.wearestyld.com` (expect a permanent redirect to the
   apex); the same page on a real phone; every nav link, both call-to-action buttons and the Privacy link;
   the share preview from a link unfurler or the Open Graph debugger; and in the same browser, an
   unauthenticated try of `https://sty-ld.vercel.app/admin` and of the beta's own preview host, which must
   still refuse.
11. Separately, and as the PROJ-01 decision it already is: the stale Clerk-era production deployment
    reachable at `https://sty-ld.vercel.app/` should be either replaced by the reviewed branch or deleted, and
    the project's Deployment Protection reading recorded, before any hostname is attached to that project.

### What this section does not claim

`wearestyld.com` still answers `DEPLOYMENT_NOT_FOUND` at the last probe recorded here, 14:08:21 GMT on
2026-11-02. The investor site is built, captured, measured and gated inside the repository and is now on the
test branch on GitHub at `c743b0c`; it is not deployed, because deploying it and
attaching the apex are the account-owner steps above. No hosted database was read or written in this work, no
migration was applied, no secret was printed, and the beta project's configuration was not modified.

## Founder actions, in the order that matters

1. Attach the domain inside the Vercel account, following the eleven steps in the section above: the public-only
   project gets `wearestyld.com` and `www.wearestyld.com`, with Deployment Protection off on that project and
   the beta project untouched. This supersedes the earlier form of this item, which asked for the apex to be
   pointed at "the reviewed release" of the application; the `sty-ld.vercel.app` reading above is why it must
   not be. Nothing else in DOMAIN-02, DOMAIN-05 or DOMAIN-06 can be verified until this happens, and no
   automated reading from this machine can do it.
2. Reconcile the beta database that already exists, do not create another one. Correction on 2026-11-01:
   the founder reports Neon project `styld-qoder-private-beta-20261030`, database `styld_beta`, 42 tables,
   one user record and no `schema_migrations` table. That last detail matters: `scripts/apply-migrations.mjs`
   creates and reads that table, so the 42 tables did not come from the tracked path and the beta database
   is not the empty target this action used to ask for. Correction on 2026-11-02, and the earlier figure in
   this item was wrong: the chain creates 42 tables, not 38. The 38 was a case-sensitive count of the lines
   reading `CREATE TABLE`; `013_better_auth_qa_schema.sql` writes its four tables in lowercase (`auth_sessions`,
   `auth_accounts`, `auth_verifications`, `auth_limits`) and that count missed them. Counted as table names and
   cross-checked by `tests/browser/live-db-inventory.cjs`, which applies the 16 files to a disposable cluster
   and counts what the server actually has, the chain produces 42. So the founder's 42 is consistent with the
   tracked chain and the "4 unexplained tables" concern this item used to raise is closed. A count agreeing
   is still not a schema agreeing, and that is the whole reason the digest comparison in the section above
   was asked for and run. Nothing in the tracked set destroys
   data: 0 `DROP TABLE`, 0 `DELETE FROM`, 0 `TRUNCATE` (the only match for that word is a column comment in
   `009`), and every `CREATE TABLE`, `ADD COLUMN` and `CREATE INDEX` is `IF NOT EXISTS`, which makes a re-run
   additive. What it does contain is two `ALTER COLUMN phone DROP NOT NULL` (`005` and `010`, the same change
   twice) and three `UPDATE` backfills (`011` twice, `014` once), which are constraint relaxations and row
   writes on tables that hold real records, so the apply run is still the founder's to make and not this
   agent's. The order is now: read-only inventory first, diff against the 42 tables the chain expects, then
   the apply run, then the isolation proof. A public hostname that reads the production database is still
   the one state that can hurt a real customer. This agent has applied nothing to any hosted database and
   will not. What changed on 2026-11-02 is that the six aggregates the founder reported, and then the three
   canonicalising digests from the founder's second read-only pass, have been reconciled against the chain in
   the sections above: tables, columns, primary keys, unique constraints, indexes and row level security
   agree, and the column, index and constraint hashes are byte-identical to the same query run against a
   disposable cluster built from nothing but these 16 files. What is still unread on `styld_beta` is what a
   hash does not cover, namely grants, ownership, collation, index build state and the one user record, plus
   what this repository's own tool would report table by table. The command is
   ready and the credential is the only thing it lacks:
   `node --env-file=.env.local scripts/db-inventory.mjs --out docs/readiness/beta/db-inventory-styld-beta.json`.
   It refuses a user whose name is not a read-only role unless `--allow-owner` is passed, refuses a report
   path outside `docs/`, sends only SELECT and WITH plus one session pragma that can only restrict, and
   prints host, database, role name, table counts and differences, never the credential. The same tool
   against a cluster built from the migration files alone reads 42 tables as an exact match
   with 0 drift and reports the six aggregates beside the chain's own, which is the 15/15 live smoke in
   the gate table; that smoke is evidence about the tool, not about `styld_beta`. What it changes now that
   the digests agree is the prediction: the expected answer from the hosted run is a match, exit 0, and a
   diff would be a finding about grants, ownership or something else a digest cannot see rather than about
   the migration set. One thing it will still not answer: the chain declares no row level security anywhere
   in `sql/`, and the cluster built from it measured 0 tables with RLS and 0 policies, so the RLS position
   on the hosted database is already known and the open question is what the application enforces instead,
   which is #76.
   This item has a second half, the isolation proof its own ordering asks for. `f924cef` extends the shipped
   environment probe with the one fact that tells two same-named databases apart, the cluster identifier from
   `pg_control_system()`, beside the server start time from `pg_postmaster_start_time()` and the sender domain
   read out of `RESEND_FROM_EMAIL`, and `tests/browser/live-env-probe.cjs` runs that extended probe against a
   live server 8 of 8 with the receipt at `docs/readiness/beta/live-env-probe.json`. The hosted read is a founder
   action, because the token lives on the deployment and the preview host answers anonymous requests with a
   login wall: set `HEALTH_CHECK_TOKEN` on the branch if it is unset, then
   `curl -sS -H "x-health-check-token: <the token set on the branch>" https://<the preview host of the build>/api/health/environment`
   and send the JSON back. The answer states which database the running process reached by name, connected
   role, server port and address, postmaster start time, cluster identifier, public table count, account row
   count and applied migration names, and it states none of the credential: no connection string, no host
   embedded in it, no token. A cluster identifier that is not the one for Neon project
   `styld-qoder-private-beta-20261030`, or a database name that is not `styld_beta`, or an account count that
   is not the one user record, is the finding #75 is looking for, and none of those three can be read from
   this machine. Read the identifier in that same direction: a value that matches the beta project's is not
   proof by itself, because a branch made from a project copies its parent's control file and a role refused
   the statistic answers null, so the isolation answer is name plus role plus port plus identifier taken
   together, beside the Neon project listing that says which compute each endpoint belongs to.
3. Bind `beta.wearestyld.com` to the same reviewed release with Deployment Protection left on, set
   `BETTER_AUTH_URL` to that exact hostname, add it to the allowed origins and cookies, and turn
   `all_except_custom_domains` off or accept that a custom domain bypasses Vercel's SSO. The
   application enforces its own authorization either way, which is why the middleware prefix list and
   the per-route guards are the load-bearing part, not the platform switch.
4. Verify a Resend sender on `wearestyld.com`, publish SPF, DKIM and DMARC, set `RESEND_API_KEY` and
   `RESEND_FROM_EMAIL` for the branch, and name one inbox allowed to receive a code. Domain ownership
   alone is not mail service. The probe now reads part of this back instead of asking: `email.senderDomain`
   is the domain taken from `RESEND_FROM_EMAIL` inside the running process, so the same hosted read in item 2
   proves which sender that environment actually uses, with no mailbox published and no key touched.
5. Push authorisation: DONE by this agent, on 2026-11-01 and twice on 2026-11-02, because the mission
   explicitly instructs "Push reviewed changes and docs to GitHub". The first 2026-11-02 push is the one that
   carries the mobile work: `ba0254b..1415978`, 28 commits, a fast-forward on
   `qoder/styld-beta-20261027` only, no merge, no force, no production deploy, and `git ls-remote`
   re-read after it answers `14159781fefb63194da66c197609f5a60ac8b8f6`. Vercel built that SHA in both
   projects within two minutes (`7484320927` and `7484337083`), which is how the deployed half of
   DOMAIN-06 could be measured, and each later push retriggers that same preview build, so a deployed
   SHA is only ever true at the moment it is read. The second 2026-11-02 push, made after the independent
   review of the PROFILE-02 residual had been answered and the whole gate set re-run green on the final
   tree, is `d8264e0..c1cff8b` (4 commits: the bar and touch-target fix `55f10f1`, the DB-ISO-01 aggregate
   reconciliation `266f6a7`, the widened instrument `4f1ecec`, and the receipts and register you are
   reading), again a fast-forward on that branch only, and `git ls-remote` after it answers
   `c1cff8b85101f3bc983e9d160d8e0deb0e0fca54`. Both projects built it, both statuses read `success`:
   `7488417152` in `Preview - sty-ld` on `sty-d7xs9ro41-dreeydesigns-3368s-projects.vercel.app`, and
   `7488392809` in `Preview - styld-auth-test` on
   `styld-auth-test-aic3ly66q-dreeydesigns-3368s-projects.vercel.app`. One of the four commits changes
   product bytes (`55f10f1`: `app/globals.css`, `components/role-profile-workspace.tsx`, `components/wow-ux.tsx`),
   and `4f1ecec` touches the stylesheet only inside a comment, so the deployed build now carries
   the short-phone profile layout; no hostname,
   database or production release moved, and the two hosts remain behind Deployment Protection for
   anonymous requests.
6. ~~Send the missing handover ZIP and the iPhone screenshots~~ Received 2026-11-01 and used: the
   25 captures reproduce MOBILE-TOUR-01, which is now fixed at `900d60a` and swept 11/11 on
   simulated viewports. What remains is the device run in item 7.
7. Run the four fixed flows on a real iPhone (Safari) and one low-end Android handset: photo crop and
   upload, the Plan catalogue with large text, Reduce Motion and High Contrast, and the profile card.
   This workspace has no phone and no iOS.
8. Give the Terms page its effective date and last-updated date, and rule on the privacy page's
   published 1 January 2025, which no record in this branch supports.
9. Attest that the Cloudinary pending folder is private, which is the last half of MVP-06.
10. Decide the 128 `color-contrast` nodes axe left incomplete on the current build. A machine cannot
    finish that rule when the asset hosts are aborted; a person looking at the four routes can.
11. Say which Vercel project is the beta. This push produced builds in two of them, `sty-ld` and
    `styld-auth-test`, and the measured evidence for DOMAIN-03 is that both now compile the same branch.
    One project should own `beta.wearestyld.com` and the other should stop building it, or the tester's
    origin will not be predictable and neither will its environment variables. The 2026-11-02 push that
    carried the profile fix repeated the fact exactly: one SHA `c1cff8b`, two successful builds, hosts
    `sty-d7xs9ro41-` and `styld-auth-test-aic3ly66q-`, so the decision has now been forced twice.
12. Optionally, and only with the next source change: set `generateBuildId` to the commit SHA in
    `next.config`. That is what would let a served page prove which revision it is, and it invalidates
    every build-dependent receipt on this branch when it lands, which is why it is not done inside a
    docs commit.

## Rollback

Nothing in this phase is irreversible. The branch is pushed and Vercel auto-builds previews from it, but
no hostname, database or production release was touched, so every step below returns the repo to where
it was.

- Code: `git revert dbb3f50 bb515f4 1470313 38f3f02 ba06ae6 77d5eac bd118ad 7a4a514` on
  `qoder/styld-beta-20261027`. The four product commits are `7a4a514`, `bd118ad`, `77d5eac`, `ba06ae6`;
  `38f3f02`, `1470313`, `bb515f4`, `dbb3f50` and the register commits after them are receipts,
  determinism and docs, so a revert of only the product four leaves the evidence trail intact.
- The mobile range, if that is what has to come back out: `git revert` newest first, from `e58023b`, the media render guard, down through `b047e1a 7fc8336 2447016 80fcb34
  29f54bd 8e47412 900d60a`, which is every commit in this range that changed application
  source. `8fd4ca1` sits above that range and changed none of it, only a browser instrument and two
  receipts, so a revert of the range leaves that evidence pointing at code that no longer exists; it is
  the honest state of an evidence file, not a second defect. Take `fa0a472` and `2e9e4d2` with them if the point is a green suite rather than an old build:
  those two add the instruments that now fail on the reverted code (the pixel-size guard, the two live
  suites' locators), and `2def837` is read-only tooling under `scripts/` that no revert of product code
  needs. `ceb752d`, `ffa9157` and `bf0ff2a` are receipts and prose and do not need to be reverted to
  take the code out. This path is written down, not exercised: no revert has been run on this branch,
  and if one is ever wanted it should be run and gated rather than assumed to be clean.
- The profile range, if that is the half to come back out: `git revert 55f10f1 09b7e9f 4a8edb8 c98d89b`,
  newest first. Those four are the only application-source commits after `e58023b`
  (`lib/workspace-policy.ts`, `lib/client-session.ts`, `components/role-profile-workspace.tsx`,
  `components/wow-ux.tsx`, `app/globals.css`); `db8a98a` takes out read-only tooling
  and two test files and no product byte, and `6c4d610`, `47a1dc5`, `86201e6`, `1412d8d`, `50f6717` are
  instruments and receipts. Reverting the three orphans the profile and inventory receipts, which then
  describe code that no longer exists; that is the honest state of an evidence file, not a second defect.
  `55f10f1` reverts on its own if only the short-phone layout is in question: it touches no shared
  component contract, and taking it back out returns the bar overlap and the clipped provider actions
  rather than breaking anything else. `4f1ecec` changed no product byte, only the instrument and a
  stylesheet comment, but the instrument it leaves behind is the wider one, so reverting `55f10f1` alone
  makes the profile suite fail on the reverted code the way a correct guard should. Take `4f1ecec` with it
  if the point is a green suite rather than an honest trail.
- Domain: this agent made no DNS or Vercel change, so there is nothing to undo. If a deployment is
  attached later and the release is wrong, remove the hostname under Project Settings, Domains in
  Vercel; the nameserver delegation stays and the apex returns to answering `DEPLOYMENT_NOT_FOUND`,
  which is its state today.
- Database: no hosted database was touched. The disposable cluster used for the receipts is created and
  dropped by the harnesses.
- Public site: take the folder and its three instruments back out with
  `git rm -r public-site tests/public-site.cjs tests/browser/live-public-screenshots.cjs tests/browser/live-public-site-check.cjs scripts/public-site-assets`
  plus the four receipts they write, and `npm test` returns to exactly the suite it was. Nothing in
  `app/`, `components/`, `lib/`, `sql/` or `middleware.ts` changed for this work, and nothing was deployed,
  so there is no platform state to undo. If the project is created and the release turns out to be wrong,
  remove `wearestyld.com` and `www` under that project's Settings, Domains; the apex goes back to answering
  `DEPLOYMENT_NOT_FOUND` and the beta is unaffected, because it was never attached to anything.

## What this file does not claim

It does not claim `wearestyld.com` is live, that an investor can open anything, that a tester has
received an email, that a phone has been used, or that the mobile fixes are accepted. It claims six of
the six founder-reported mobile defects are repaired in code and measured in a browser on a signed-in
session (TOUR-01, TYPE-06, A11Y-05, MEDIA-04 for the legacy-record and refused-upload halves, the black
preview and size claim of that same defect resting on executed unit cases, PLAN-03 for the search, chips,
sort, counts and selection survival, with the label/order divergence it fixed resting on executed unit
cases because the served payload removes the value that would show it, and PROFILE-02 for the card gutter,
corners, avatar inset, cover overlap, name box, the two edit controls, the three text sizes and all six
worlds), that the local gates pass on the commits named here, and that the domain is pointed at Vercel
with nothing attached to receive it. It claims the public investor site exists in this repository, is measured in
a real browser at two widths and is held by a gate in `npm test`; it does not claim that site is deployed or
reachable, because the eleven clicks in the section above have not been made and no Vercel project has been
created for it. A browser at a simulated viewport size is not a handset, and no
receipt in this register says otherwise. What the browser found on a short viewport, the first paint
putting part of the avatar row under the floating bottom bar, is now recorded as fixed and re-measured
under the founder's 2026-11-02 authorisation, in the product CSS committed as `55f10f1`, with the before
half of that pair showing three of five client widths reaching under the bar, five of five provider widths
running actions off the card, and no control on either card holding a 44pt target. On the database side this
file claims the schemas agree where the founder's digests can see, and no further: the column, index and
constraint hashes from `styld_beta` are identical to the same query run against a cluster built from these
migration files, so per-table columns, types, nullability, defaults and index definitions are no longer
unread. What stays unclaimed is everything a hash does not cover, which is grants, ownership, collation,
index build state, row data and how the schema got there, along with this repository's own per-table
inventory of `styld_beta`, which is still waiting on the founder's credential.
