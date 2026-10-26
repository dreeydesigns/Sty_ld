# Sprint 3 execution ledger, 26 October 2026

Starting accepted branch: work/pre-mvp-closeout-20261016 at 5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12, tracked clean, IDEA.md untracked and untouched. Sprint 2 branch was clean at e515853cd2588618e3576931fd434f99a80bd23f before baseline evidence. Its full report and prototype were inspected.

Fresh baseline gates ran from the existing overnight worktree: TypeScript 0, lint 0 (31 warnings), unit 0 (630 passed, zero skipped), build 0, audit 1 (findings). Evidence was moved to this worktree after baseline completion.

Automatic approval review rejected the proposed removal of the old worktree's shared node_modules junction with the generic reason blocked by policy. No part of that rejected command executed. The safe alternative was a new worktree at C:/Users/Muti/Documents/GitHub/styld-sprint3-20261026 on codex/styld-sprint3-20261026, based on the verified Sprint 2 SHA. It has its own npm installation. The old worktree and accepted checkout's dependency trees were not modified.

| Workstream | Implementation/evidence in progress | Boundary |
| --- | --- | --- |
| A | Real Better Auth handler with PGlite and generated OTPs, stubbed email transport; expanded independent identity, expiry and enumeration tests | No external email or session bypass. Tests advance disposable rate-window timestamps, never production policy |
| B | Ordered shortlist/leading constraints, role/inactive restoration and profile privacy tests against PGlite; actual moderation SQL rollback test | PGlite has one connection, not independent PostgreSQL locking |
| C | Removed unused PWA and Firebase after source/compiled baseline checks; patched Next/ESLint 15.5.28; compatible targeted transitive updates and scoped PostCSS override | No broad audit fix, major framework change or remote deployment |
| D | Pure media-access/transition policy and tests; upload limiter regression reproduced fail-open processing, corrected to 503 | Existing Cloudinary public delivery remains unchanged and blocked for real portfolios |
| E | Deterministic Demo package, target/ownership guards, partial-failure rollback and receipt-bound reverse cleanup plans, seven combined media/fixture tests passed | Dry-run only; no account or seed executor, no remote writes |
| F | Shared Plan client, authenticated allowlisted profile facts in existing Plan GET, shortlist actions, tray, profile/card controls, Compare table and return navigation | Exact service IDs only. Other-provider price equivalence is not inferred |
| G | New rendered Compare matrix and retained Build 1 suites prepared | Final browser run pending production build |
| H | This ledger and final addendum/release mapping to be completed after gates | No push, deployment, merge or remote settings |

Focused commits already made:

- 957b4016d290b78855502bbabbeaf6b45d305838, pure pending-media policy, four tests.
- e63d4034b18325b891ca2a0836a6066580bc6379, fixture package and cleanup dry runs, three tests.
- 96da0cd, unused PWA removal, no other package versions changed in that step, 276 lock entries pruned.
- b8464e6, dormant Firebase dependency/helper removal, no active consumer found.
- e631dc3, Next and ESLint-compatible patch 15.5.28.

The original 19 affected package entries became 11 after PWA removal, seven after Firebase removal, seven (zero critical) after Next patch, and two after targeted transitive updates. The last two are Next's PostCSS dependency and its parent advisory effect. A scoped override is being checked with a clean installation. No final clearance is claimed before the actual installed graph and build pass.

Retained failed/intermediate attempts:

- An early TypeScript process overlapped removal of the unused Firebase helper and reported TS6053. A later completed TypeScript milestone passed; this was not treated as a framework regression.
- A real-auth run overlapped package replacement and failed to import zod/index.js. Subsequent compatibility runs are scheduled only after dependency mutation settles.
- Expanded auth cases hit the real library's per-path 429 boundary. The harness now asserts that boundary and advances disposable auth_limits timestamps between independent cases. No limiter is disabled.
- npm install/update did not reconcile the nested PostCSS lock entry to the new override. That one entry was reconciled to the already installed registry artifact metadata/integrity, then a clean npm ci was required to validate the lock and installed tree.
- The upload red test returned 400 after reading the request body instead of expected 503. The green adapter suite passes 20/20 after fail-closed correction.

Final results, full commit SHAs, dependencies and file inventory will be recorded in the final report. This ledger is not a claim of live readiness.

## Completed verification and corrections after installation

The clean npm ci completed. Installed Next is 15.5.28 and nested PostCSS is 8.5.31. npm ls exits zero and audit-final.json reports zero findings. The corrected full suite passed 649 tests, zero skipped, and the integrated TypeScript/lint/build gates passed (31 unchanged warnings).

Browser checks exposed an empty Plan-error tray covering Save Undo at 768px. The guard now hides an empty tray without hiding the actual Plan error screen. A dedicated regression asserts absence and actual Save Undo interactions for empty failed Plans and active shortlists on Discover, Look Detail and creator profiles across five widths. Visual inspection also moved the Compare summary into the page flow so it cannot cover table rows. Other tray surfaces keep the approved floating placement. Profile links now have 44px targets. An obsolete Build 1 assertion that Compare had no link was replaced with an active Compare link and inactive Request assertion.

Original geometric PNG files now resolve all six fixture media references. Two focused tests verify their deterministic binary integrity, dimensions, provenance and traversal/tampering refusal. These tests are additional to the 649-test run and are included in final full gates. No upload occurred.


## Final browser verification

The final application source passed 651 unit tests, TypeScript and production build before browser completion. The host became memory constrained (about 0.5GB free of 8GB); no unrelated process was closed by the agent. The founder closed unused apps and authorized continuation. Browser startup and shutdown were slow, so World cases were run sequentially in fresh processes. The isolated actual two-tab scenario passed, as did 19 behavior cases and all six five-width World shards (exit zero).

An early bulk-removal assertion read mock server state before the optimistic save committed; the test now awaits the confirmed result. A prior native-input timeout under host pressure was isolated into a fresh two-tab browser test with explicit foreground focus. No authentication timing or security protections were changed. Initial Compare GET errors now show an actual Retry action; transient saving does not show a misleading Retry.

The first measurement console assertion failed on explicit fixture 401 responses. Diagnostic output identified the shared /api/auth/session stub, which deliberately returns 401, and blocked external font loading. The final assertion permits only those exact expected categories, preserves their messages/URLs and rejects other HTTP console errors. Both final measurements pass, followed by six retained measurement/accessibility cases (exit zero). Total final browser scenarios: 212, all mocked.

Compare committed as baa4da4ee06435c5428bd59825b9ac423c544648. Final report/evidence and inventory are a separate documentation commit. Exact-final-HEAD quality gates are rerun after that commit with logs outside Git, and the final response records their results.
