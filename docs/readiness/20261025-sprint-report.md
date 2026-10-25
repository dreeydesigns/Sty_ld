# STYLD overnight engineering report

Verdict: NOT READY for a genuine controlled customer-journey trial. Safe local engineering work is complete and required local gates pass. Review infrastructure remains operational; email delivery, approved live identities/fixtures, real persistence evidence and media privacy are separate remaining gates.

## Executive result

The sprint fixes missing same-origin checks on service creation, block/unblock and reporting. It replaces two skipped integration placeholders with 17 executable PostgreSQL integration cases using the restored schema in memory. It adds signup-hook schema coverage, safe database-destination guards, a pure fixture dry-run validator and local browser measurement automation. No remote configuration, credentials, permissions, data, source publication or deployment was changed.

Baseline unit evidence was 595 passing, zero failed, two skipped (597 total). Final evidence is 623 passing, zero failed, zero skipped. There are 150 passing actual-browser scenarios against a local production build with mocked APIs/accounts, plus four passing smoke executions against the final rebuilt application. These results do not establish real OTP delivery or live customer persistence.

## Workstream results

| Workstream | Findings and actual work | Verification and outstanding limits |
| --- | --- | --- |
| 1. Security | Added the existing same-origin check to four mutation methods across services, blocks and reports. Server-derived ownership, auth configuration, MFA, moderation and commercial gates preserved. Pending-media design prepared | Red tests reproduced unauthorized-origin acceptance before fixes; four origin/ownership tests and existing auth/security/moderation tests pass. Cloudinary upload behavior deliberately unchanged |
| 2. Dependencies | Reran non-mutating audit and traced direct/transitive exposure. Prepared precise removal/update sequence; no packages or lockfile changed | 19 affected package entries remain: one critical, 17 high, one moderate. Sharp 0.35.5 meets the documented image workaround; this is not a patch or blanket clearance |
| 3. Auth/database | Fresh read-only schema/grant inspection. Added in-memory restored-schema execution and actual hook callback tests. Found workspace_applications SELECT absent | Core auth, workspace/profile and catalogue grants exist. Signup hooks, repeat hooks and suspended-user rejection pass in memory. OTP transport, cookies and remote grant enforcement are not proven by those tests |
| 4. Journey | Reran existing complete journey, Save and Plan/Estimate suites and primary hierarchy matrix | 33 full journey + 49 Plan/Estimate + 32 Saves + 30 hierarchy browser scenarios pass. Mocked accounts/APIs only, all six worlds and all five widths. No product features added |
| 5. Performance/accessibility | Added repeatable six-scenario local measurements and accessible-control/landmark checks; inspected mobile Plan screenshot | 6/6 measurement scenarios pass. Existing browser checks cover keyboard, focus, contrast, reduced motion, image space and overflow. No performance/UI refactor justified from one synthetic sample; no human usability or assistive-technology certification |
| 6. Pilot fixtures | Implemented pure dry-run manifest validator and documented legitimate signup, ownership, moderation, idempotent execution receipts and exact-ID cleanup design | Four validator regressions pass. Wrong environment, cross-provider associations, live media URLs, publication and unexpected sensitive fields rejected. No live execution/cleanup adapter or fixtures created |
| 7. DevOps/release | Fresh read-only deployment/protection inspection and small protected browser checks. Added release, recovery, environment and approval checklists | Existing deployment remains READY/staging/SSO-protected. Empty public feed and unauthenticated Plan/Saves bodies verified. No CI workflow exists; no remote settings changed |

Detailed designs: [dependency review](20261025-dependencies.md), [media privacy](20261025-media-privacy-design.md), [controlled QA and fixtures](20261025-controlled-qa-and-fixtures.md), [release/auth readiness](20261025-release-and-auth-readiness.md).

## Before and after evidence

| Area | Before | After |
| --- | --- | --- |
| Service creation, foreign/missing Origin | Regression observed 200 instead of 403 with mocked valid actor | 403 before actor resolution or database write |
| Block/unblock/report, foreign/missing Origin | Block reproduced 200; source inspection found the same missing check on unblock/report | All three methods reject with 403 and zero database calls |
| Database suite destination | Inherited POSTGRES_URL or DATABASE_URL could direct writes to a remote database | Application variables ignored; memory default, explicit loopback-only disposable opt-in |
| Integration evidence | Two skipped placeholder tests | 17 integration cases execute against the restored in-memory schema |
| Signup schema | Core schema existed but no new-account execution against its exact snapshot | Actual callback SQL creates exactly one active Client workspace/role and rejects suspended session creation |

These are protection and test improvements. No latency, bundle-size or layout-shift improvement is claimed because production UI behavior was not changed.

## Performance and accessibility record

Local production build, synthetic image, mocked accounts and API responses, concurrent machine load. These are diagnostic snapshots, not field Core Web Vitals or targets guaranteed on Kenyan mobile connections.

| Screen | Width | Observed ready ms | TTFB ms | Observed CLS | Long tasks |
| --- | --- | --- | --- | --- | --- |
| Look | 360 | 4573 | 383 | 0.00061 | 4 |
| Plan | 360 | 1722 | 8 | 0.04077 | 1 |
| Estimate | 360 | 4014 | 236 | 0.00061 | 1 |
| Look | 1440 | 2132 | 93 | 0.00097 | 3 |
| Plan | 1440 | 2739 | 18 | 0.01211 | 3 |
| Estimate | 1440 | 2147 | 6 | 0.00097 | 0 |

Observation ends when content is ready; these CLS values are not full-session measurements. External fonts/media are blocked by the browser fixtures, so fallback-font layout does not validate real font delivery. The app imports Google Fonts through CSS with display=swap. A later performance slice should measure real font/image loading, then evaluate self-hosting/preload and route splitting without redesigning the brand.

Build-reported first-load JavaScript before the final route-only security rebuild: Discover 245 kB, Book 241 kB, Look 235 kB, shared 103 kB. Large `social-home.tsx` and shared marketplace UI remain candidates for profiling, not an excuse for an unmeasured refactor. Existing 31 lint warnings remain; no new warnings introduced. No Lighthouse, axe package, real screen reader or human usability session was installed or run.

## Ranked security and reliability backlog

P0 are release gates, not assertions that an exploit was executed.

| Priority | Finding | Reachability/user impact | Smallest next step |
| --- | --- | --- | --- |
| P0 | Pending Cloudinary uploads use public delivery | A URL obtained before moderation can bypass feed publication filtering | Approve authenticated-media/proxy design and synthetic-media acceptance slice |
| P0 | Critical dependency audit remains on Next 15.5.27 | Image optimizer exists; local Sharp workaround meets advisory. Separate Server Action source exists but current compiled registry is empty | Approve reviewed Next patch and Linux artifact verification |
| P1 | Review workspace chooser lacks SELECT on workspace_applications | Authenticated GET uses this table and will fail under current role | Approve only required read grant after reviewing the route |
| P1 | Email delivery unavailable | Real signup and independent clients cannot authenticate yet | Approve sender/key/recipients; verified controlled domain for multiple inboxes |
| P1 | Live persistence/isolation and network contention untested | In-memory/mocked evidence does not prove cross-device durability or full role enforcement | Approve controlled two-client test after prerequisites |
| P1 | Missing-origin mutation protection | Services, block/unblock and report routes lacked the existing check | Fixed locally, not deployed; separately review/publish commits |
| P1 | Upload quota fails open on database errors | Configured upload path may continue after limiter failure | Include fail-closed quota behavior in approved upload slice; unchanged here |
| P1 | Dormant vulnerable dependencies and runtime Zod | Exposure varies across Firebase/PWA/tooling/auth validation | Follow dependency plan, re-audit after each approved update |
| P1 | No enforced CI and ambiguous deployment target defaults | Wrong target can publish the review to its Production target; gate failures could be missed | Approve protected CI and exact-target release process |
| P2 | Broad CSP and legacy third-party origins | Larger browser trust surface; no exploit established | Separate report-only CSP evaluation before tightening |
| P2 | Large client bundles, CSS font import and remaining image lint warnings | Potential slower mobile journey; no causal before/after measurement | Measure on representative devices/network, then focused changes |
| P2 | Recovery/retention unexercised | Rollback cannot be promised from application redeploy alone | Approve disposable restore rehearsal and audit/media retention rules |

`styld_review_app` remains explicitly excluded from this sprint and unchanged for founder cleanup. It is not used by the deployment. No administrative-role cleanup was attempted.

## Quality evidence and limits

Executed from the isolated worktree: `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`. Refer to `verification.json` for the final gate receipt and to `browser-results.txt`/`browser-measurements.json` for executed browser evidence. An intermediate unit rerun failed because the old service route loader did not stub the new api-security import; that harness was updated and the full suite rerun. Reproduction failures are not counted as passing tests.

Build emits Better Auth base-URL/default-secret diagnostics in this worktree without an environment file; the build exits successfully. This is not a new live infrastructure failure. No `.env` file was read or copied. An attempted command to supply process-only test settings was rejected by automatic approval review without a detailed reason. It was abandoned. The local production server ran unconfigured with all APIs intercepted, then was stopped. No auth bypass or credential workaround was introduced.

## Git and boundaries

Starting accepted HEAD: `5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12`.

Isolated branch: `work/overnight-trial-readiness-20261025`.

Worktree: `C:\Users\Muti\Documents\GitHub\styld-overnight-readiness-20261025`.

The accepted `work/pre-mvp-closeout-20261016` branch remains at that SHA, with 33 original unpushed commits. Its tracked tree remains clean and `IDEA.md` is still untracked/untouched. Sprint commits are local only. Exact commits and file inventory are included in the final handover and can be obtained with `git log --format=fuller 5f42b1c..HEAD` and `git diff --name-status 5f42b1c..HEAD` inside this worktree.

Implementation commits:

- `a5f20b7d5634a696cffe844914bf8599f2d71bbc`, same-origin checks and regression tests (6 files).
- `7087b26294e501b02ba7d5696a52dd76d1ddd8b0`, isolated database harness, restored schema and auth-hook coverage (6 files).
- `ebe3761b9af9a6e4da7e73622c8e9dafd8976153`, dry-run fixture contract and tests (2 files).

One final documentation/measurement commit contains this report, supporting designs, audit, receipts and browser evidence. Its SHA is supplied in the chat handover to avoid a self-referential commit hash in this file.

Changed files are limited to three mutation route files; the service-origin, database-adapter and trust-and-safety tests; two database integration suites; disposable database helper/safety tests; auth-schema test; schema-only test fixture; pilot dry-run script/test; local browser measurement script; and the readiness documents/evidence in this directory. No files are omitted from the final Git inventory.

No Better Auth configuration, middleware, auth policy/resolver, schema/migration, dependency manifest/lockfile, environment file, Cloudinary behavior, production resource, remote GitHub setting, Vercel setting or Neon record/role/grant was changed. Test schema restoration and synthetic data existed only in process memory. The ignored node_modules junction reuses existing installed packages without installation; reproducible clean-install evidence remains separate.

## Founder decisions and next five actions

1. Approve a narrow dependency remediation slice starting with the Next security patch and Linux Sharp verification. No automatic audit fix or major upgrade.
2. Approve minimum review grants after reviewing the missing workspace chooser SELECT; keep provider/publication writes separate.
3. Approve email sender, sending-only key and exact single-client recipient, or verify a controlled domain for independent-client testing. No OTP test begins automatically.
4. Approve the pending-media implementation and synthetic-media privacy tests before any portfolio upload.
5. Approve normal test account/workspace onboarding, fixture creation/moderation, two-client persistence/isolation checks and exact-manifest cleanup only after the preceding gates.

Review the local commits before authorizing a separate protected review deployment. There is no automatic push, deployment, live write, email or new product development after this report.
