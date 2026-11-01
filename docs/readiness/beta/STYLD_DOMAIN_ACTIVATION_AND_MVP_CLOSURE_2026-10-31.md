# STYLD official domain activation and MVP closure

Date: 2026-10-31 (UTC readings taken 10:53 to 10:55 on the same day)
Branch: `qoder/styld-beta-20261027`
Remote tip: whatever commit carries this file. It was pushed in this order on 2026-11-01: `38f3f02`,
`1470313`, `bb515f4`, `dbb3f50`, `e7a89dc`, `5929bb0`, `24d276c` and the register commits after them,
each on the test branch only, no merge and no force. Correction on 2026-11-01, and the earlier sentence
in this paragraph was overtaken: application code changed again after `ba06ae6`. The mobile defect work
runs `8e47412` through `b047e1a`, one defect per commit, and every receipt in this file was regenerated
on that chain rather than carried forward from `ba06ae6`. The media history half came after that chain, as `e58023b`.
Build under test: `Xg8lckpQBCbH4LvP5wTSg` from `ba06ae6`, `VJvJJr4XQg3wYvhDKkpFS` from `e7a89dc`, and
`Ne9t7nk5KQx6HeqgmiNKz` from `b047e1a`. The last is the build the three mobile live receipts and the
re-stamped `first-render-audit.json` were measured on. The media pair is measured on two further builds of this revision: `41t8UHDuh7D3jawj8QNfV`, which is
the tree with the render guard taken back out, and `719HSBuL1_GqupwzldDfL`, which is the same tree with
it in. Neither is a build of a different commit, and the first is a build of a deliberately unfinished
tree, which is why it was run.
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

## Verdict

The directive offers three verdicts and this delivery takes the third one: **NOT READY**, blocking
actions remain. The directive prints that verdict with a long dash between the two halves; `tests/copy-typography.cjs`
refuses that character in any markdown file in this repository, so the verdict is written here without
it and means the same thing.

That is the honest verdict, not a partial one. Four of the six founder-reported mobile defects (TOUR-01,
TYPE-06, A11Y-05, MEDIA-04) are fixed in code and measured in a real browser against a signed-in session
on a disposable cluster, each with a before run that fails the way the defect does. Three of those four
are measured end to end in the browser; MEDIA-04 is measured in the browser for the two halves that had
only ever rested on unit cases, the legacy record and the refused upload, while the black preview and the
size claim stay covered by executed unit tests rather than a hand-held run. PLAN-03 is fixed in code with
executed unit coverage and its browser half still open; PROFILE-02 is still implemented but unverified,
and none of the six has been run on a phone the founder held. The whole local gate set passes on the
current commits, and the domain record is now measured rather than assumed. What is missing cannot be
produced from this workspace: no deployment is attached to any `wearestyld.com` hostname, no certificate
exists for any of them, no hosted database or mail sender has been reconciled, and no real phone has run
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
| Apex `A` records | `216.198.79.1`, `64.29.17.1` |
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
| `bb515f4` | register and receipts | this file, `STYLD_FINAL_MVP_COMPLETION_MATRIX.md`, `live-accessibility-audit.json`, `live-a11y-cleanup.json`, `live-hosted-acceptance-preview-dbb3f50.json`, `first-render-audit.json` | `tests/copy-typography.cjs`, `tests/first-render-receipt-provenance.cjs` |
| every commit from `8e47412` to `e58023b` | the six mobile defects and the review findings that came out of them | see the rows above; source really did move in this range, which is why `first-render-audit.json` is re-stamped on the final build rather than carried forward | the stamp is always taken one commit behind the build it names, because a receipt cannot quote a SHA that does not exist yet: the copy committed with `cc91357` ran `--built-at b047e1a` on build `Ne9t7nk5KQx6HeqgmiNKz`, and the current copy ran `--built-at e58023b` on build `992QQqwQDsYw08XEzfhkw`, both recording `buildInputChangesSinceArtifact: []`, `modifiedSourcePaths: []` and `untrackedSourcePaths: []`, so the receipts above describe the application source at the tip and not an older one |

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
   the test and not a pass. A fix without a measured before state is recorded as IMPLEMENTED BUT UNVERIFIED,
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
| `npm test` | PASS, 870 of 870, 0 failures, 0 cancelled, exit 0 on the tree committed as `e58023b` with `first-render-audit.json` re-stamped on it. It was 840 at `1470313`; the additions are the tour regression cases, the pixel-size guard, the filter-parity and truthfulness cases and the plan-catalogue cases that came with this range's fixes. Mid-task the same file reports 868 passing and the two first-render provenance checks failing, which is the receipt being stale against a dirty tree rather than a product defect, and it is recorded here because the run was made |
| `npm run build` | PASS, exit 0, 117 routes generated, middleware 35 kB. The identifier for the run on the current tip is `992QQqwQDsYw08XEzfhkw`; `ShXNfl_yDWI3xr6t0SUzg` carried the same application source at `cc91357`, one docs-only commit behind this one, and `Xg8lckpQBCbH4LvP5wTSg` (from `ba06ae6`) and `VJvJJr4XQg3wYvhDKkpFS` (from `e7a89dc`) are earlier builds of different source. Next.js 15.5.28 has no `generateBuildId`, so every `next build` mints a fresh random identifier; the identifier is not a revision and each receipt is read with the commit SHA it also carries |
| First render | PASS, 69 audited routes, 0 loader-only, `gateExit 0`, 5 announced waits, 21 thin, 18 redirects, 1 error answer. `first-render-audit.json` is re-stamped with `artifactCommit e58023b` on `992QQqwQDsYw08XEzfhkw` and records `buildInputChangesSinceArtifact: []`, `modifiedSourcePaths: []`, `untrackedSourcePaths: []`; `tests/first-render-receipt-provenance.cjs` 6/6 |
| Live accessibility audit on the current source | PASS, exit 0: 44 axe scans over 52 recorded findings, 0 violation nodes, 0 rule failures, `200% text scaling across 4 routes: 0 pages overflow horizontally`, and under reduced motion 410 declared durations with 0 over 50ms and 0 animations running. Receipt `live-accessibility-audit.json` was re-run rather than carried forward: it names build `ShXNfl_yDWI3xr6t0SUzg` and commit `b047e1a`, because application source really did move after the previous run at `1470313` on `Xg8lckpQBCbH4LvP5wTSg` and the old justification (every later path sat under `docs/`) stopped being true in that range. It also records the three mobile fixes in the same sweep it audits, so TYPE-06 and A11Y-05 are covered by an axe pass and by their own instruments, not by one receipt standing in for the other. The media commit after it is not covered by that receipt and this row does not claim it is: `e58023b` changes how a stored preview address renders, and the audit's fixture holds no such value, so the sweep would return the same 52 findings and the media guard has its own instrument instead |
| Hosted acceptance against the deployed branch tip | FAIL, correctly. `live-hosted-acceptance-preview-dbb3f50.json` names target `sty-oodcf6py6-dreeydesigns-3368s-projects.vercel.app` and commit `dbb3f50` and records the one executed check, `deployment reachable: false`, with `GET /discover redirected to vercel.com; this is Deployment Protection`. No check behind that redirect could be run, so MVP-04, MVP-05, MVP-08 hosted and DOMAIN-06 stay blocked |

The hosted receipt is filed the way the activation plan demands. `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md`
section H step 2 says a hosted run writes to a SHA-named file so that the local-mode receipt survives,
"as happened once already", and the first hosted run on this branch overwrote it anyway. That receipt
has been restored from `cb9d34b` (local production build, 13 checks plus 1 skipped by design, pass) and
the hosted stop now lives in its own file, `live-hosted-acceptance-preview-dbb3f50.json`. The local
receipt is evidence about the checks, not about Vercel, and the two must not replace each other.

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
| MVP-03 Non-production preview database | BLOCKED (verification pending) | 2026-11-01 update: a beta database does exist (`styld_beta` in Neon project `styld-qoder-private-beta-20261030`, 42 tables, one user row), so the old wording that no isolated database could be named is withdrawn. What is still missing is the proof that the beta branch reads that host and not the production host, which is CFG-01 and DB-ISO-01, not a new database |
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
| DOMAIN-02 Attach apex, `www` canonical redirect | BLOCKED (founder) | all three hostnames answer `DEPLOYMENT_NOT_FOUND`; attaching a domain is a Vercel account action. This branch is deployed, but only to preview environments, and the directive forbids pointing the apex at a preview. Production attachment needs founder approval plus the beta database from action 2 |
| DOMAIN-03 Isolation and auth on custom hosts | BLOCKED (verification pending) | 2026-11-01 update: the Qoder-specific Preview entries for `POSTGRES_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `RESEND_FROM_EMAIL` are now reported visible in Vercel, which supersedes the older matrix that could only list names. Names existing is still not values applying: CFG-01 has to read the effective configuration off the running deployment, prove the beta database host differs from the production host, and never print a value. Until that receipt exists this row is not closed |
| DOMAIN-04 Branded sender, SPF, DKIM, DMARC, real OTP | BLOCKED (founder) | a registered domain is not a mail subscription; no sender is verified and no OTP has been delivered to an allowed inbox |
| DOMAIN-05 Propagation, TLS, HSTS, redirects, metadata, robots | BLOCKED (founder) | propagation is measured; TLS is absent (handshake fails), so HSTS, redirects, canonical URLs and social previews cannot be validated on a host. Locally: `app/robots.ts` disallows every crawler on every deployment, which is safe but not yet split into public and beta rules, `app/favicon.ico` exists, and the root layout sets no `metadataBase`, so absolute OG URLs cannot be produced |
| DOMAIN-06 Invite-only beta on a stable hostname with exact SHA | BLOCKED (founder) | the SHA half names a real deployed commit, and the tip has moved past it: measured on 2026-11-01 by `git ls-remote` is `ba0254ba8e6a55345c7db15a56541445afe0f0fd`, one docs commit ahead of the `aafbba79a064cf4f87dbdeedd2a45bd9208d7763` GitHub last recorded as deployed as `7471237035` (`Preview - sty-ld`, `https://sty-8ysjlo5al-dreeydesigns-3368s-projects.vercel.app`) and `7471250580` (`Preview - styld-auth-test`, `https://styld-auth-test-8goll3a56-...vercel.app`). That deployment record belongs to `aafbba7`, the remote has moved one docs-only commit since, and the two commits this round adds (`cc91357` and `e58023b`) are local only, because nothing was pushed and no `gh` CLI exists in this workspace to re-read the deployments API. So no receipt in this file describes a deployed build of the current source. What remains is the hostname. One thing now makes that sharper than it was: the project is reported to exclude custom domains from its standard protection, so the first custom domain attached becomes anonymously reachable. That is why SAFETY-01 has to prove the application holds authorization on its own before the attach, not after |

### MOBILE

| Item | Status | Detail |
| --- | --- | --- |
| MOBILE-TOUR-01 Eight-step walkthrough positioning | FIXED IN CODE, awaiting the founder's real-device sign-off | the founder's evidence ZIP arrived and is extracted at `C:\Users\Muti\Documents\styld-mvp-pre-closeout\mobile-evidence-2026-11-01` (25 iPhone captures, IMG_5461 to IMG_5486). The defect it shows is reproduced from behaviour, not guessed: the guide card sized itself to a fixed height, so on short phones no readable band remained and the step fell back to a centred overlay sitting on the listing it describes; the reveal then accepted the first frame that looked seated, which is a smooth scroll passing through the seat rather than arriving in it. `900d60a` sizes the card to the band it is given and waits for the page to be at rest before placing it. Live cluster sweep `node tests/browser/tour-mobile.cjs`: 11/11, all eight client steps spotlighted across 320x568, 360x640, 375x667, 390x844 and 430x932 with the card 14px clear of the target (`docs/readiness/beta/live-tour-mobile.json`). Simulated viewports only: the founder's own iPhone and Android run is FND-01 and this receipt does not close it |
| MOBILE-PROFILE-02 Avatar padding and overlap | IMPLEMENTED BUT UNVERIFIED | `77d5eac` restores `p-5` and full rounding on the mobile card; `/account` renders with no overflow and no violations in the live audit, which is a regression check, not a verdict on the founder's screenshot |
| MOBILE-PLAN-03 Long Plan catalogue | IMPLEMENTED BUT UNVERIFIED | `ba06ae6` adds search, category chips with counts, name and price sorting, an honest status line that the selection is kept, and a second Back link; `lib/plan-catalogue.ts` is covered by four unit cases. No browser suite drives the new controls yet |
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
Finding 5's sort nit is closed at `29f54bd`. Finding 6 is closed at `fa0a472`, which is the commit that
replaced source-text matching with three executed instruments; `tests/a11y-settings-enforcement.cjs`
still exists but no longer carries the claim on its own.

## Founder actions, in the order that matters

1. Attach the domain inside the Vercel account: point `wearestyld.com` and `www.wearestyld.com` at the
   reviewed release, set `www` to redirect to the apex, and let Vercel issue the certificate. Nothing
   else in DOMAIN-02, DOMAIN-05 or DOMAIN-06 can be verified until this happens, and no automated
   reading from this machine can do it.
2. Reconcile the beta database that already exists, do not create another one. Correction on 2026-11-01:
   the founder reports Neon project `styld-qoder-private-beta-20261030`, database `styld_beta`, 42 tables,
   one user record and no `schema_migrations` table. That last detail matters: `scripts/apply-migrations.mjs`
   creates and reads that table, so the 42 tables did not come from the tracked path and the beta database
   is not the empty target this action used to ask for. `sql/migrations/001` to `016` create 38 tables, so 4
   are unexplained, and nothing in the tracked set drops or deletes anything (0 `DROP`, 0 `DELETE` or
   `TRUNCATE`, and all `CREATE TABLE`, `ADD COLUMN` and `CREATE INDEX` statements are `IF NOT EXISTS`), which
   makes a re-run additive rather than destructive. The order is now: read-only inventory first, diff against
   the 38 expected tables, then the apply run, then the isolation proof. A public hostname that reads the
   production database is still the one state that can hurt a real customer. This agent has applied nothing
   to any hosted database and will not.
3. Bind `beta.wearestyld.com` to the same reviewed release with Deployment Protection left on, set
   `BETTER_AUTH_URL` to that exact hostname, add it to the allowed origins and cookies, and turn
   `all_except_custom_domains` off or accept that a custom domain bypasses Vercel's SSO. The
   application enforces its own authorization either way, which is why the middleware prefix list and
   the per-route guards are the load-bearing part, not the platform switch.
4. Verify a Resend sender on `wearestyld.com`, publish SPF, DKIM and DMARC, set `RESEND_API_KEY` and
   `RESEND_FROM_EMAIL` for the branch, and name one inbox allowed to receive a code. Domain ownership
   alone is not mail service.
5. Push authorisation: DONE by this agent on 2026-11-01, because the mission explicitly instructs
   "Push reviewed changes and docs to GitHub". Every commit listed in the header is on
   `qoder/styld-beta-20261027` and the remote tip equals local HEAD, verified with `git ls-remote`. No
   merge, no force, no production deploy. Vercel built previews from these SHAs, which is how the
   deployment correction at the top of this file was measured, and each later push retriggers that same
   preview build, so a deployed SHA is only ever true at the moment it is read.
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
    origin will not be predictable and neither will its environment variables.
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
  source. Take `fa0a472` and `2e9e4d2` with them if the point is a green suite rather than an old build:
  those two add the instruments that now fail on the reverted code (the pixel-size guard, the two live
  suites' locators), and `2def837` is read-only tooling under `scripts/` that no revert of product code
  needs. `ceb752d`, `ffa9157` and `bf0ff2a` are receipts and prose and do not need to be reverted to
  take the code out. This path is written down, not exercised: no revert has been run on this branch,
  and if one is ever wanted it should be run and gated rather than assumed to be clean.
- Domain: this agent made no DNS or Vercel change, so there is nothing to undo. If a deployment is
  attached later and the release is wrong, remove the hostname under Project Settings, Domains in
  Vercel; the nameserver delegation stays and the apex returns to answering `DEPLOYMENT_NOT_FOUND`,
  which is its state today.
- Database: no hosted database was touched. The disposable cluster used for the receipts is created and
  dropped by the harnesses.

## What this file does not claim

It does not claim `wearestyld.com` is live, that an investor can open anything, that a tester has
received an email, that a phone has been used, or that the mobile fixes are accepted. It claims four of
the six mobile defects are repaired in code and measured in a browser on a signed-in session (TOUR-01,
TYPE-06, A11Y-05, and MEDIA-04 for the legacy-record and refused-upload halves, the black preview and
size claim of that same defect resting on executed unit cases), one more is repaired with executed unit
coverage and no browser run (PLAN-03), one is
implemented and not yet verified against what the founder saw (PROFILE-02), that the local gates pass on
the commits named here, and that the domain is pointed at Vercel with nothing attached to receive it. A
browser at a simulated viewport size is not a handset, and no receipt in this register says otherwise.
