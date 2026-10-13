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
