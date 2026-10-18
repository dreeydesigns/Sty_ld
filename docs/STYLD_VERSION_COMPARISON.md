# STYLD version comparison

Audit: 12 October 2026. Implementation continued 13 October 2026. This report distinguishes repository evidence from live verification.

## Evidence matrix

Scores: 0 absent or unsafe, 1 partial, 2 implemented with material gaps, 3 validated in the target environment. These are audit judgments, not completion percentages.

| Candidate | Product breadth | Authentication | Release evidence | Evidence |
|---|---:|---:|---:|---|
| main and release/styld-production-readiness, 82791863e5f79624035f052ab7630d0f535cc0d0 | 2 | 1 | 1 | 312 tracked files, 102 page/route files, 18 test files, nine migrations. Clerk render and hosted completion remain. |
| remediation/p0a-security, d17eebecddda09dfa7e5535ceb476fdf0de7a833 | 1 | 1 | 1 | 231 files, 76 routes, three test files, no versioned migrations. Diverges from main at bab1f1818361ac76a5710c4f098cf4e8cdb43425. |
| codex/passwordless-mvp, 925d0fc789431d68b9352493192e15005b5d2f87 | 2 | 2 | 1 | 334 files, 109 routes, 19 test files, ten migrations. Preserves main product and adds Better Auth. Guest modal and workspace isolation need repair. |
| Live sty-ld.vercel.app, SHA unknown | 1 | 1 | 0 | HTTP responses show Clerk resources and old auth options. Vercel deployment metadata and mobile browser reproduction are blocked. |
| Local recovery candidate, source commit 57a1e3e | 2 | 2 | 2 | Isolated tests, typecheck and build pass; live delivery, deployed preview and browser acceptance remain blocked. See test report. |

## Recommendation and integration plan

Founder approved 925d0fc as the strongest overall baseline. It combines product breadth with a single passwordless authority. Do not merge remediation wholesale: its main comparison removes many newer product files and migrations. Review individual security rules and tests instead.

Commands used: git fetch --all --prune; git status --short; git branch -avv; git worktree list; git log --all --oneline --graph; git merge-base; git diff --name-status; git ls-tree -r --name-only. Remote tips were unchanged when refreshed.

Original checkout initially had no uncommitted changes. Recovery edits accumulated before the newer stop gate and were subsequently preserved as tracked.patch plus untracked files and manifest in ../styld-recovery-backup-20261012. The original checkout retains those files at detached 925d0fc. Only ../styld-auth-recovery owns codex/auth-mvp-recovery now. No reset, stash or destructive move was used.

Ignored original assets include .env.local, dependencies, build output, browser profiles, screenshots and logs. They were not copied as source or committed. The new worktree has no production environment file.

Confidence: high in branch ancestry and source comparison; medium in live root-cause attribution; low in production readiness until deployment metadata, browser journeys, real sender delivery and migrations are verified.
## Candidate reconciliation, 17 October 2026

The current review target is design/openai-styld-ui-v1. Its previous remote revision was 7c151e3; local product work through 9c00d72 had not yet been pushed. The pending repairs were preserved in da54e47 before integrating the newer security work.

Reviewed local branches fix/styld-phase8b-a-critical-containment and work/pre-mvp-closeout-20261016 both pointed to d8b1f3e. The two containment commits, cbbde42 and d8b1f3e, were cherry-picked as 4750e82 and 0358554. Conflicts were resolved by keeping the canonical sign-in completion without interests and the later endpoint that returns 503 without storage access.

local/mvp-sprint1-planning-integrity at d681ba9 also contains provider/service planning validation. The pure context resolver, planning component and fixture tests were reused selectively. Its alternative application-status page and workspace route were not copied over the current server-owned status implementation. TypeScript checks caught missing narrowing in the reused component; explicit catalog types were added before final verification.

That planning checkout also has an uncommitted one-line change to sanitizePlanContext that clears targetId when targetType is invalid. It was not copied: it would convert the invalid-provider fixture into general browsing and contradict the existing rejection test. The checkout and its unsaved edit remain untouched. The published review branch is the consolidation target; this report does not claim every separate worktree is clean.

publish/styld-mvp-review-20261016 at ab87439 includes a branch-specific Vercel build exclusion. It is a publication branch, not evidence of verified email delivery or full MVP readiness. No branch was merged wholesale and no authentication authority was added. The newer containment is a stronger security baseline than 9c00d72 alone; the combined candidate must still pass the recorded final checks and external release gates.
