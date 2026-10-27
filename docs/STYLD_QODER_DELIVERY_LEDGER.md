# STYLD Qoder delivery ledger, private-beta branch

Branch `qoder/styld-beta-20261027`, built from the founder's sprint4 tip `e696551`.
Owner: Qoder (single accountable delivery owner under the autonomous MVP directive of
27 October 2026). Every row uses the directive handoff form: Problem, Evidence, Change,
Tests, Risk, Reviewer verdict, Next dependent task.

Reviewer verdict wording matters: "second-pass agent review" means another Qoder agent
context reviewed the diff. It is not a human independent review and is never called one.

---

## L1 Reconcile the founder's newest code without repeating implementation

Problem: work existed in three places (founder sprint4, an earlier Qoder delivery branch, and
design-branch slices), and the directive forbids re-implementing what already shipped.
Evidence: `git log` comparison showed sprint4 already carried the Compare and shortlist fixes,
while three additive fixes existed only on the Qoder branch. Commit `06e6924` was superseded by
sprint4 and skipped; `91c7e1b` (docs) was not ported because these docs are being rewritten here.
Change: new branch `qoder/styld-beta-20261027` from `e696551`, then cherry-picked the additive
commits one at a time: `bb022e8` server-response fail-closed limiter, `4df6877` guest answer on
application status plus the session-states suite, `47976d6` Gmail OTP transport, `04a76a9` booking
ownership blueprint and environment matrix, `ea66403` truthful contact copy.
Tests: full gate set on the reconciled branch, see L6.
Risk: a batched cherry-pick left picked content in the working tree and blocked later picks.
Resolved by moving the six untracked picked files to a temp backup, restoring the twelve tracked
paths, then picking each commit individually. No founder file was deleted.
Reviewer verdict: second-pass agent review, no defect in the port itself.
Next dependent task: L2 onward.

## L2 Guest state on the workspace application screen

Problem: a signed-out visitor to `/workspace/application` saw an error where the honest answer is
"you need to sign in", because a 401 response was treated as a load failure.
Evidence: `app/workspace/application/page.tsx` returned an error state whenever the fetch did not
produce data, including 401 and 403.
Change: the page returns null for 401 and 403 and only reports a failure when a genuine load error
occurred; `if (!cancelled && data)` guards the stale-response race.
Tests: `tests/browser/session-states.cjs` asserts the guest, signed-in and failure states.
Risk: a silent null can hide a real failure. Mitigated by only nulling 401 and 403.
Reviewer verdict: second-pass agent review, accepted.
Next dependent task: none.

## L3 OTP transport that cannot silently deliver nothing

Problem: the product could not prove a code was ever sent, and an unknown provider fell through to
a no-op that looked like success.
Evidence: `lib/email-provider.ts` selected a provider by `EMAIL_PROVIDER`, and the unconfigured
branch returned a no-op provider.
Change: Gmail SMTP transport added with an explicit sender, and provider selection is fail-closed:
an unusable configuration refuses to send rather than pretending.
Tests: `tests/browser/email-delivery.cjs` and the unit suite (`npm test`, 675 assertions).
Risk: SMTP credentials in a preview environment belong to the founder; documented in
`docs/GMAIL_OTP_SETUP.md` and `docs/ENV_MATRIX.md`.
Reviewer verdict: second-pass agent review, accepted.
Next dependent task: L7 needs a code that a test can actually read, so the live harness redirects
the Resend transport to a loopback stand-in instead of inventing codes.

## L4 Operations truth: booking ownership and the environment matrix

Problem: the roadmap needed a written ownership model before any booking surface is authorised, and
the environment matrix was stale.
Evidence: `docs/STYLD_BOOKING_OWNERSHIP_BLUEPRINT.md` and `docs/ENV_MATRIX.md` on this branch.
Change: documentation only, no behaviour change, `BOOKING_COMMITMENTS` remains false in
`lib/feature-flags.ts`.
Tests: `tests/feature-gates.cjs`, `tests/shop-delivery-containment.cjs`.
Risk: none to runtime behaviour.
Reviewer verdict: second-pass agent review, accepted.
Next dependent task: none.

## L5 Copy that promised an unlock no server record grants

Problem: a contact affordance implied the visitor had unlocked professional contact details.
Evidence: the shipped string promised access that `app/api/creators/[workspaceId]/route.ts` never
authorised; that route only returns an allowlisted public projection.
Change: `ea66403` rewrote the copy to state what is actually available.
Tests: `tests/trust-copy-public.cjs` forbids escrow, refund and blanket verification claims.
Risk: low.
Reviewer verdict: second-pass agent review, accepted.
Next dependent task: none.

## L6 Full quality gate on the reconciled branch

Problem: the directive requires evidence, not claims.
Evidence and results on `qoder/styld-beta-20261027`:
- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors, 30 warnings, all of them the pre-existing `@next/next/no-img-element`
  rule in media components.
- `npm test`: 675 pass, 0 fail.
- `npm audit`: found 0 vulnerabilities against the committed lockfile.
- `npm run build`: exit 0, 115 static pages produced.
- `npm run test:db`: the founder's real disposable PostgreSQL 17.11 suites, 19 pass, 0 fail,
  database dropped and server stopped by the runner.
Change: none, verification only.
Risk: the disposable suites need a local PostgreSQL binary directory; the path is passed explicitly
with `--bin` and the harness refuses to run if any external database URL is present.
Reviewer verdict: gates reproduced by the second-pass review session.
Next dependent task: L7.

## L7 Real authenticated browser journeys, not mocked ones

Problem: every prior claim about sign-in, saves, shortlist and moderation rested on mocked or
synthetic-SQL tests. The directive explicitly requires real authenticated integration and browser
tests, and an earlier audit recorded "no live authenticated proof possible".
Evidence for the blocker: no owned database, no way to read a delivered OTP, and no browser harness
that was allowed to intercept nothing.
Change: three new pieces.
- `tests/helpers/live-postgres-cluster.cjs` initialises and starts an owned, loopback-only,
  disposable PostgreSQL 17.11 cluster, loads `tests/fixtures/review-schema.sql` only after proving
  the fixture contains no data, no roles and no passwords, and refuses to start if any external
  database URL exists in the environment. Teardown drops the database with force, stops the
  server, and deliberately leaves the directory for the founder to remove.
- `tests/helpers/live-mail-capture.cjs` is a loopback stand-in for the email vendor. The
  application's own Resend provider is pointed at it with `RESEND_API_URL`, so a real Better Auth
  OTP is generated, hashed and stored by the product and delivered to the test, never invented.
- `tests/browser/live-auth-journey.cjs` runs `next start` against that cluster in production mode,
  seeds only synthetic creators and disposable Looks, and drives installed Chrome with no API
  interception of any application route.
Tests: the journey list and the machine-readable receipt are in
`docs/readiness/beta/live-auth-journey.json`. The run finished 13 steps, 13 passed, 0 failed, exit 0,
with `apiInterception: none`, 11 captured OTP messages, one verification row, 40 tables, 13 gated
controls all activated by a real pointer with `click: direct` and a longest enable wait of 316 ms, and
an empty `browserErrors` list. It was re-run from the start after `components/super-admin-panel.tsx`
changed, because the journeys click through `/admin`, and the second run is the receipt now committed.
Both live suites report the same build id `8hIdL-c0nsxYelIR7Yhig`, so the journeys and the
accessibility audit proved one artifact rather than two adjacent ones.
Risk: the harness writes to a disposable cluster only. The grants it gives the runtime role are
broad and would be unacceptable anywhere but a throwaway database, which the helper states in
comments and enforces by the environment guard.
Reviewer verdict: second-pass agent review, accepted with three corrections carried in L16. The
review read the launcher, the routing handler, the cluster guard, the fixture proof, the mail stand-in
and the receipt, and confirmed every journey claim against the code that produced it, including that
loopback requests get `route.fallback()` and only non-local hosts are aborted. Its caveats: the
non-admin refusal on `/api/admin/moderation` answers 403 "Administrator MFA required." from a combined
admin-or-MFA test in `lib/auth-resolver.ts`, so the receipt proves a refusal, not which half of the
condition caused it; the page-level refusal for that same client is the `/unauthorized` redirect, which
is asserted separately. The fixture guard's INSERT pattern would miss a statement split across lines,
and the per-table zero-row assertion added after it is the guard that actually holds. And the receipt
names HEAD `3bc54ca` while the tree it ran from carried uncommitted harness instrumentation, which is
why the receipts and the code that produced them are committed together now.
Next dependent task: L8 was created directly by what this harness exposed.

## L8 The admin console could not actually moderate anything

Problem: a reviewer opened `/admin` and saw counts from browser localStorage while the real pending
queue sat in the database. The page also claimed the reviewer "can view and override any booking,
post, message thread, user, and verification record in the platform", which no server record
supports.
Evidence: `components/super-admin-panel.tsx` read `readBookings`, `readPosts` and `readThreads` from
`lib/social-store.ts`, and returned null unless a locally resolved role said `super_admin`.
Meanwhile `app/api/admin/moderation/route.ts` already implemented a correct, MFA-gated, transactional
queue with an audit row, proven by `tests/postgres/moderation.cjs`.
Change: `components/admin-review-queue.tsx` added and mounted first on `/admin`. It reads and
decides server rows only, reports loading, empty and server-refusal states, carries the server's 409
through as "that decision was already recorded" rather than inventing a fourth outcome, and disables
approval when the server reports the attached service is ineligible. The control room header now says
which numbers are server truth and which are a walkthrough.
Tests: the live harness signs a reviewer in with a real OTP, completes real authenticator setup and
verification through `/auth/mfa`, then approves one pending Look and rejects another through this UI
and asserts the resulting `social_posts` statuses and the `security_events` rows that name the
reviewer. A client without an admin grant is asserted to be refused.
Risk: the panel's overview, bookings, posts and messages tabs remain browser-store demonstrations.
They are labelled in the header and, after the second-pass review, on each tab. Removing them is a
founder product decision, not a silent refactor.
Reviewer verdict: second-pass agent review, accepted with two corrections carried in L16. The review
confirmed the queue component, its mount order on `app/admin/page.tsx`, the server-only reads and the
decision assertions in the receipt. It found that the panel's own file docstring still asserted the
old cross-account override power and that the header sentence was the only labelling on the demo
tabs.
Next dependent task: L9, same class of problem.

## L9 Deferred IDEA-009 scope was presented as a live feature

Problem: salon team membership, invites, commission splits and a "join this salon" page are
explicitly deferred behind a six-person paper test, yet the surfaces were reachable and worded as if
they worked. `lib/team-store.ts` even asserts an ownership rule for portfolio work that the server
does not implement.
Evidence: `lib/team-store.ts` keeps everything in the localStorage key `ms_team_members.v1`;
`components/salon-team-ui.tsx` renders invites and slots; `app/join-team/page.tsx` accepts a token
and creates a browser-local team member session with `createTeamMemberSession` and `writeAppSession`.
No feature flag covers any of it.
Change: `6ed6341` adds a visible prototype notice on both surfaces stating that nothing is stored on
a STYLD server, an invitation here grants no access, and uploads here create no published record.
Tests: the notice text was read in the rendered component, at `components/salon-team-ui.tsx:105` and
`app/join-team/page.tsx:318`, and carries no banned dash characters.
Risk: the notice labels the demo, it does not remove it. The founder still has to decide whether a
private beta should show the tab at all.
Reviewer verdict: second-pass agent review, accepted with two corrections carried in L16. The review
confirmed the localStorage key, the invite and slot rendering and the browser-local join flow, and it
found one thing this entry had wrong: the accessibility audit does not reach either surface, because
`components/role-profile-workspace.tsx` mounts the panel on `/profile`, which requires a session, and
`/join-team` is not in the audit's route list. It also found that `writeAppSession` in
`lib/client-session.ts` is memory-only and silently rejects a profile whose id or role does not match
a verified session, so the join flow may not even apply its own fake session. That is a weaker claim
than "creates a team member session", and it strengthens the notice rather than weakening it: nothing
here grants access.
Next dependent task: founder decision recorded in the closeout report.

## L10 Wave C: accessibility, resilience and performance on the real build

Problem: prior readiness docs recorded "Browser QA is NOT RUN", and the directive requires the
listed viewports, keyboard, reduced motion, contrast, hit targets, 200 percent text and Kenyan
low-bandwidth behaviour.
Change: `tests/browser/live-accessibility-audit.cjs` boots the same live stack and injects axe-core
4.12.1 into the page at eight viewports (360, 375, 390, 428, 768, 1024, 1366, 1440), walks 14 Tab stops
per page to detect lost focus and undersized targets, repeats the run with
`prefers-reduced-motion: reduce`, scales root text to 200 percent and measures horizontal overflow,
then measures first contentful paint on an emulated 400 ms, about 1.6 Mbps link and finally reloads
with the network hard offline.
Coverage is a decision, not a claim, so the receipt states it. The full eight-route guest sweep (`/`,
`/discover?tab=looks`, a Look detail, a creator detail, `/compare`, `/auth/sign-in`, `/account`,
`/help`) runs at 360, 375, 390 and 1440. At 428, 768, 1024 and 1366 the audit runs the three route
shapes that change layout most: `/`, `/discover?tab=looks` and `/auth/sign-in`. `/profile` and
`/join-team` are in neither set.
Tests: receipt `docs/readiness/beta/live-accessibility-audit.json`, results summarised in the
closeout report.
Risk: Playwright and axe-core are installed with `npm install --no-save`, so `package.json` and the
lockfile are unchanged. axe-core is not a declared dependency at all: the second-pass review found it
resolving as a hoisted transitive copy pulled in by `eslint-plugin-jsx-a11y`, which works today and is
not a guarantee. The harness now refuses to start without it, prints the install command, and the
receipt records the resolved path plus a `declaredInPackageJson` flag so nobody mistakes hoisting for
a dependency.
Reviewer verdict: second-pass agent review, accepted with corrections carried in L16. This entry
previously claimed axe-core was a committed project dependency, which the review refuted, and claimed
six viewports across guest routes when the route set is thinner at half the widths. The review also
fixed the measurement boundary honestly: every context aborts non-loopback requests, so Google Fonts
and Pexels imagery never load, and paint timing, transfer size and any axe rule that grades text
against a webfont are measured on first-party assets only.
Next dependent task: the private-beta accessibility fix list.

## L11 Backlog classification

Problem: the directive requires every backlog line to carry DONE with evidence, DEFERRED with
reason, BLOCKED with the exact prerequisite, or NOT APPLICABLE with rationale.
Evidence and change: `docs/STYLD_BACKLOG_CLASSIFICATION.md`, written from the founder's four backlog
files and a repo-wide evidence pass over this branch.
Tests: the classification cites only files that exist on this branch.
Risk: three rows are DONE for an authorized slice only, not for the whole idea, and say so.
Reviewer verdict: second-pass agent review, accepted. The review confirmed every repo path cited in
the classification exists on this branch, including the admission in
`lib/pending-media-policy.cjs` that the upload route does not yet use restricted delivery, the
statement at `components/landing-client.tsx:115` that verified badges are not available, and that the
removed admin overclaim now appears only in documents that describe removing it.
Next dependent task: none.

## L12 Preview deployment and access

Problem: the directive's final objective names a verified preview URL.
Evidence: the branch is pushed to `qoder/styld-beta-20261027` on `github.com/dreeydesigns/Sty_ld`.
Production was never touched and nothing was merged, as the project rules require.
Change: none beyond the push.
Tests: preview verification is recorded in `docs/STYLD_PREVIEW_HANDOVER.md`. The GitHub Deployments
API for the public repo names deployment `7352192689`, the Preview environment for `sty-ld`, commit
`3bc54ca`, state `success`, description "Deployment has completed", at 2026-10-27T06:47:08Z, with
`environment_url` `https://sty-dfz9xx234-dreeydesigns-3368s-projects.vercel.app`. Anonymous requests
to that host answer `302` to `https://vercel.com/sso-api?...`. In a browser that already holds a
Vercel session the same host serves the application, including the server-side redirect of `/admin` to
`/auth/sign-in?returnTo=%2Fadmin`, and reports `GET /api/social/posts?limit=50` as HTTP 500 because no
database is bound.
Risk: earlier previews of this application sit behind Vercel Deployment Protection, which returns an
SSO redirect to an anonymous client, so "the URL loads" cannot be proven from a terminal.
Reviewer verdict: PREVIEW ACCESS BLOCKED for anonymous verification, PARTLY VERIFIED for a signed-in
client. The handover was reviewed and accepted as the careful document it is, with one phrase
corrected: it called its evidence "all of it reproducible", which is true of the API records and the
anonymous `302` and not true of the signed-in browser observations, which have no receipt, screenshot
or log committed to the tree. The hosted observation is a sighting, and it is now labelled as one.
Next dependent task: founder action to grant access or provide a bypass.

## L13 The first Wave C receipt named four real accessibility defects

Problem: the L10 receipt was machine-readable but not actionable. It named a selector and a failure
summary, so a fixer had to guess which element and which colours were involved.
Evidence: `docs/readiness/beta/live-accessibility-audit.json` at commit `3bc54ca` reported 33
violation nodes across three rules: `color-contrast` (21 nodes), `scrollable-region-focusable` (6)
and `aria-valid-attr-value` (6). The distinct targets were the category scroller
`.scroll-row.gap-4.pb-2.5`, the discovery tab `#tab-looks`, and text in `.text-[#C0A090]`.
Change, in two parts.
- The harness now keeps the offending `node.html` and axe's own `colorContrastData` (foreground,
  background, measured ratio, required ratio, font size and weight) in the receipt, so a contrast
  finding names its two colours instead of its CSS class.
- Four product fixes, all brand-preserving. `--logo-subtitle-text` is a new alias token, not a value:
  in the base scope it resolves to `--color-clay-text` `#875945` and in every world theme block it
  resolves to that world's `--world-accent-strong`. It replaces the hardcoded Clay `#C0A090` on the
  logo subtitle, which measured 2.28:1 on Warm White `#FAF8F5`. Measured against that same surface,
  all six world values clear AA for small text: `#875945` 5.59, `#8E4F60` 5.76, `#3F5A46` 7.17,
  `#51477E` 7.76, `#7A3F25` 7.72, `#6E5544` 6.50. The logo's `aria-label` now reads
  "Styld, {subtitle}" instead of a dash-joined string. The category scroller is a labelled,
  keyboard-focusable region. The discovery tabs gained a real `role="tabpanel"` with matching
  `aria-controls`, which is what `aria-valid-attr-value` was complaining about. Price and card
  eyebrows that sat on photographs moved to an ink chip at 90 percent opacity with white text, which
  is what `color-contrast` was complaining about. That chip is 12.66:1 where it sits on the Warm White
  page and higher where it sits on a photograph, so the label and the chip are two different fixes with
  two different ratios and only the first one is 2.28 to 5.59.
Tests: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` and a full re-run of
`tests/browser/live-accessibility-audit.cjs` on the fixed build; the receipt is the evidence.
Risk: contrast tokens are the kind of change a brand owner may want to review. The palette, logo and
editorial layout are untouched; only the text colour of one small uppercase label and three overlay
chips changed, and both new values are already tokens in this design system. One evidence limit has to
be stated: the re-run overwrites `docs/readiness/beta/live-accessibility-audit.json` in place, so the
33-node baseline survives only in this entry and the colour evidence the harness now captures is
exercised only when a contrast violation exists.
Reviewer verdict: second-pass agent review, accepted with two corrections carried in L16. The review
confirmed the base and theme token values, that the label sits at
`components/styld-logo.tsx:126` and that no invented colour literal was introduced. It caught that
this entry attributed one ratio to two different fixes and that `--logo-subtitle-text` is a new alias,
not a pre-existing token, which is why the numbers above are now measured per world and per surface.
Next dependent task: the private-beta accessibility fix list in the closeout report.

## L14 A journey step that timed out at 240 seconds was the test's own wait

Problem: the workspace-switch journey step never finished, and the honest options were "the product
hangs after a switch" or "the harness waits forever". Those need different fixes and the difference
was not observable.
Evidence: the stage list in the receipt stopped after `switch: reading /api/me as professional`, and
the step then reported `did not finish within 240000ms`.
Change: made the harness show its own work instead of guessing.
- `pg_stat_activity` is sampled every 15 seconds and again at any step timeout, recording role, state,
  wait event, seconds in state, `pg_blocking_pids` and the statement, so an idle-in-transaction
  lock-holder would be visible with a name and a pid.
- Every page-side request in the switch step now goes through `fetchInPage`, which bounds the fetch in
  the page and bounds `page.evaluate` itself, because Playwright gives `page.evaluate` no timeout. A
  stall reports as a stall, with a responsiveness probe that separates a slow server from a dead page.
- The switch loop was wrong and is now right: choosing a workspace calls `location.assign`, so the
  page reloads and the switcher button is gone. The harness returns to `/settings/workspaces` before
  each switch, which is what a person does.
Tests: with only the timing instrumentation the step proved the product was never the problem:
`/api/me` answered HTTP 200 in 801 ms after the switch. The remaining failure was the harness's own
unbounded `page.evaluate` waiting on a button that no longer existed. The full re-run is the evidence.
Risk: bounded waits can turn a slow-but-working product path into a reported failure. That is the
intent. The budgets are generous (45 seconds for a page fetch, 240 seconds per step) and every failure
now carries the measurement that produced it.
Reviewer verdict: second-pass agent review, accepted. The review read the sampler, `fetchInPage`, the
per-role reload and confirmed `location.assign` in `components/workspace-management.tsx`, which is the
fact the whole explanation rests on. The re-run that was in flight finished 13 steps, 13 passed, exit
0, with `/api/me` answering HTTP 200 in 137 ms as professional and 607 ms as salon and 17
`pg_stat_activity` samples showing no idle-in-transaction session and no blocked pid anywhere in the
run.
Next dependent task: none. The transaction guards described here were added as hardening, and the
receipt shows they were not what fixed the step, so they are recorded as defensive bounds and not as a
proven defect fix.

## L15 Three transactions could hold a row lock forever, and the review queue sent too much

Problem: two things found while reading the code around the failing journey, both worth fixing on
their own terms.
Evidence: `app/api/auth/session/route.ts`, `app/api/admin/security/route.ts` and
`app/api/admin/moderation/route.ts` each run `BEGIN` then a `SELECT ... FOR UPDATE` with no
`lock_timeout` and no `idle_in_transaction_session_timeout`, so a client that is released while the
transaction is still open can keep its row locks indefinitely on a pooled connection of `max: 4`.
Separately, the admin review queue spread the whole `social_posts` row into its JSON payload with
`...row`, so every pending post carried its author's user id, its media URLs, its visibility and its
moderation status to the browser, none of which the panel displays.
Change: `SET LOCAL lock_timeout = '5s'` and `SET LOCAL idle_in_transaction_session_timeout = '5s'`
immediately after each `BEGIN`, so both bounds die with the transaction and cannot leak into the next
request on a reused connection. The queue now selects and maps an explicit projection: id,
author name and role, post type, caption, publication status, created date and the service check.
Tests: `tests/moderation-workflow.cjs` is the founder's contract for this route. It asserts
`publication_status` is present, so that field was kept while the rest were dropped, and two new
assertions state that `media_urls` and `author_user_id` are absent. The mock database deliberately
refuses unknown SQL, so it was taught the two guard statements and nothing else, and the approve test
now asserts both guards are issued inside the transaction and before the locking read.
Risk: a lock timeout turns a wait into an error, which is a fail-closed change in an admin path. That
is the right direction for a queue with a human at the other end, and the panel already distinguishes
"that decision was not recorded" from success.
Reviewer verdict: second-pass agent review, accepted with two additions. The review confirmed both
guards sit after `BEGIN` and before the `FOR UPDATE` in all three routes, that the projection is
explicit and the four private fields are gone, and that `lib/auth-database.ts:8` really is `max: 4`
shared with Better Auth through `lib/better-auth.ts:21`. It also proved the mock does not parse the
column list, so the old assertions only tested the mapping function. That is now closed from both
sides: the test asserts the exact eight-key shape of a queue row, asserts the four fields are absent,
and asserts no statement in the transaction reads `SELECT *`. The file runs 14 tests, 14 pass.
Next dependent task: none.

## L16 What the second-pass review caught in my own claims

Problem: entries L7 to L15 were written by the agent that made the changes. The directive forbids
calling that independent, so a second reviewer agent was told to try to refute every claim, read-only,
with no instruction to be agreeable.
Evidence: nine claims about the journeys and the admin and team surfaces, nine about Wave C, the
transaction guards and the two handover documents. Seven held. Five did not hold as written.
Change, all of it now in the tree:
- L10 claimed axe-core was a committed project dependency. It is not: it resolves as a hoisted
  transitive copy pulled in by `eslint-plugin-jsx-a11y`. `tests/browser/live-accessibility-audit.cjs`
  now stops with the install command if it is missing, and the receipt carries `axeCoreSource` with the
  resolved path and `declaredInPackageJson: false`.
- The same entry claimed six viewports across guest routes. The full route set ran at only three
  widths, and the directive names eight widths. The sweep is now 360, 375, 390, 428, 768, 1024, 1366
  and 1440, the full guest set runs at four of them, and the receipt states the matrix in `sweep`.
- L13 gave one contrast figure to two different fixes. The label is 2.28 to 5.59 on Warm White and the
  overlay chips are white on ink at 12.66:1 on that same surface, and `--logo-subtitle-text` is a new
  alias rather than an existing token. Per-world ratios are now measured, not assumed.
- L9 said the accessibility audit scans the salon team surfaces. It cannot: the panel mounts on
  `/profile`, which requires a session, and `/join-team` is not in the route list. Corrected, and the
  review's finding that `writeAppSession` is memory-only and silently rejects an unmatched profile is
  recorded, because it makes the prototype notice more true, not less.
- `docs/STYLD_PREVIEW_HANDOVER.md` called its evidence "all of it reproducible". The deployment record
  and the anonymous `302` are. The signed-in browser observations are one sighting with no committed
  artifact, and the document now says so.
Two defects the review found in product code, both fixed: the docstring at
`components/super-admin-panel.tsx` still asserted Super Admin "can view cross-account private data and
take override actions", which is the exact claim `6c72165` removed from the rendered page, and the
demo tabs leaned on one header sentence for labelling. The docstring now names the panel as the
walkthrough half of `/admin`, each demo tab carries its own notice, and the messages tab states plainly
that STYLD has no server-side admin read of private conversations.
Tests: after these changes, the full live journey suite was re-run against the final tree rather than
trusted from the earlier receipt, because the admin panel is rendered on a route the journeys click
through. `tests/moderation-workflow.cjs` runs 14 tests, 14 pass.
Risk: a reviewer that agrees with you is worse than no reviewer. These five corrections cost a
rebuild and two full suite re-runs, which is the correct price for receipts that say what they
actually measured.
Reviewer verdict: this entry is the review. Its findings are recorded against the entries they
correct, and the one thing it found that this branch will not fix, the unguarded `FOR UPDATE` in
`app/api/auth/mfa/totp/route.ts:22`, is named in the closeout report as a founder trade rather than
quietly dropped.
Next dependent task: commit the code and its receipts together, so `workingTree.dirty` in the next
receipt reads false.
