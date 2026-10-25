# STYLD Sprint 2 engineering report

Verdict: NOT READY for controlled live customer QA. General-recipient email delivery, authorized live identities/persistence, media privacy and dependency remediation remain release gates. This is a local stabilization sprint, not a deployment or a new feature phase.

## Starting state and previous work

Accepted development worktree remained on `work/pre-mvp-closeout-20261016`, HEAD `5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12`, tracked clean with unrelated untracked IDEA.md. It has no configured upstream. Explicit comparison to `origin/work/pre-mvp-closeout-20261016` gives 33 unpublished commits. Read-only git ls-remote returned `65e0b816853ff2c9aa38c47e5fc4c21933325e1b`, matching the cached comparison ref. No fetch, reset or history rewrite was needed.

Reused clean existing worktree `C:/Users/Muti/Documents/GitHub/styld-overnight-readiness-20261025`, branch `work/overnight-trial-readiness-20261025`, starting HEAD `c151deba6e3217d3c5a4b69a31acca937c425412`. Commit 6 is its ancestor. Earlier work was inspected before editing:

- a5f20b7d5634a696cffe844914bf8599f2d71bbc: same-origin mutation protections and tests.
- 7087b26294e501b02ba7d5696a52dd76d1ddd8b0: PGlite database regressions, schema-only fixture, destination guards and actual signup-hook tests.
- ebe3761b9af9a6e4da7e73622c8e9dafd8976153: pure Demo manifest dry-run validation.
- c151deba6e3217d3c5a4b69a31acca937c425412: original audit/design/browser evidence.

Those fixes were not repeated. The earlier 623-test/150-browser results remain historical evidence, not Sprint 2 results.

## New work and evidence

| Workstream | Sprint 2 work | Limit |
| --- | --- | --- |
| A, unpublished history | Read-only script inventories all 33 full SHAs, paths, categories, heuristic secret candidates and integration disposition. Exact source blob comparison with the existing local one-commit review snapshot | This is not independent DevOps approval, whole-history secret clearance or permission to publish |
| B, OTP reliability | Red regressions reproduced blanket 403 invalid-key classification and raw provider payload logging. Added distinct recipient-restriction/generic-rejection codes, domain handling and safe delivery messages. Removed raw provider text from diagnostics | No auth configuration/provider/policy, transport, credentials or hosted settings changed. Domain restriction still exists remotely |
| C, security | Fresh non-mutating audit; rechecked Next/Sharp resolution, current compiled action registry, dormant dependencies, commercial flags, headers and ownership paths | 19 affected packages remain. No exploit probe, dependency update or clearance |
| D, test readiness | Actual notification callbacks now tested for awaited failure, sanitized events, normalized cooldown, all three quotas and preserved OTP settings. Added deleted-service/account-isolation regression against in-memory SQL | No real email, remote role enforcement, independent PostgreSQL connections or live sessions |
| E, fixtures | Reviewed existing dry-run contract and execution/cleanup dependencies; retained it unchanged | No fixtures/accounts/publication/cleanup adapter or database writes |
| F, journey | Fresh production build and mocked browser checks, including new email failure scenarios. Existing complete journey, Plan/Estimate and Saves suites rerun | Mock accounts, intercepted APIs and synthetic images only. No human usability or real assistive-technology test |
| G, next phase | Standalone mock Compare study and ranked file-specific six-commit specification, data gaps and acceptance criteria | No Compare UI in app, persistent schema change, request flow or marketplace activation |
| H, release | Fresh read-only review deployment metadata, source/snapshot reconciliation, release gates and rollback proposal | No independent DevOps duplication, CI installation or remote mutation |

## History and snapshot findings

Read `sprint2-history-review.md` for every commit and `sprint2-history-audit.json` for exact file inventories. The accepted combined tree is different from deployment approval for intermediate states. Schema-review migration e798172 must not run automatically. Earlier database fixtures and save behavior must be reviewed in their final combined state. Retain all history; no commit was discarded, squashed, rebased, cherry-picked or merged.

The existing publication repository is clean at `702783b427e28980f18d19bea5d3b7d71ccf2f6b`, one root commit, 482 source files. Exactly eight original files are excluded, and firebase-applet-config.json is sanitized. All other common source blobs match Commit 6; no extra application source exists. Exclusions match the recorded manifest, including .env.example, credential/setup documentation and firebase-blueprint.json. No tracked workflow was found. IDEA.md is outside both Git trees. The scanner's one credential-URL candidate is synthetic regression input in tests/error-disclosure-regression.cjs. gitleaks was unavailable; a complete redacted release secret scan remains required.

No production feature flag was enabled by these 33 commits. SHOP/DELIVERY/PAYMENTS_LIVE/BOOKING_COMMITMENTS are false. Inherited COUNTER/BOOKINGS are true and require explicit scope review; tests currently assert those settings. They are not permission to activate transactions. No flag changed this sprint.

## Verification record

Final executed results are recorded in `sprint2-verification.json` and the adjacent command logs. TypeScript, lint, unit and build status must be read from that receipt rather than inferred from this narrative. Lint retains 31 warnings. The unconfigured local build emits Better Auth base-URL/default-secret diagnostics but exits successfully. The local server is for mocked browser tests, not live sign-in. No .env file was read or copied.

Final results: TypeScript PASS, lint PASS (zero errors, 31 unchanged warnings), unit PASS (630 passed, zero failed, zero skipped), production build PASS. Focused OTP checks pass 17/17; focused Plan checks pass 9/9. The final mocked browser runs pass 131 scenarios: 33 full journey, 49 Plan/Estimate, 32 Saves, 10 email failure, six measurement/accessibility and one standalone Compare study. These counts are suite scenarios, not independent human trials. The dependency audit exits 1 because its 19 findings remain unresolved.

The initial journey, Plan and Saves browser attempts used 127.0.0.1, which their existing network guard deliberately blocks because only localhost:3107 is allowed. These failed runs are retained as first-attempt artifacts, not counted as passes. Reruns use the allowed local origin without weakening interception. Email browser tests have their own exact-origin guard. Browser success does not prove real persistence, email delivery, database role enforcement or an independent device.

The prior two skipped database suites already became executable in Sprint 1. They run locally in PGlite by default, with optional loopback-only disposable PostgreSQL. No local docker/psql executable was found in this session, so independent network-connection locking and PostgreSQL role grants were not tested. PGlite serializes transactions on one connection. Do not market its concurrent Promise tests as full multi-connection PostgreSQL contention evidence.

Six Beauty Worlds are exercised by the journey suites at 360, 375, 390, 768 and 1440px. Existing checks cover continuity, Save/Undo, loading/errors, attribution, restoration, unknown prices, overflow, image space, primary contrast, keyboard order/focus and normal/reduced motion. The isolated Compare study separately checks 360px, replacement/cancel, Undo, leading choice, missing prices and 44px controls. This is no substitute for a woman completing a human usability session or real font/image/network measurements.

## Remaining issues and founder decisions

| Priority | Issue | Required next action |
| --- | --- | --- |
| P0 | Pending media public delivery; upload quota fail-open remains | Approve focused media privacy/fail-closed implementation and synthetic media tests before portfolio uploads |
| P0 | Critical Next audit and other dependency findings | Approve exact reviewed patch/removal sequence and clean Linux verification. Local Sharp workaround is not blanket clearance |
| P1 | Resend has no verified sending domain | Supply owned domain/DNS access, verify generated records, approve domain-restricted key/Preview sender configuration and bounded authorized inbox tests |
| P1 | Real signup/session/persistence/isolation unverified | Approve minimum reviewed grants, two test identities and controlled database writes only after prerequisites |
| P1 | Fixture execution/cleanup has no authorized adapter/receipt policy | Approve normal onboarding, owned services, moderated Demo publication, synthetic media and manifest/receipt cleanup separately |
| P1 | Local fixes unpublished; Counter surface scope unresolved | Review local patch series and inherited flags before isolated release planning. No automatic integration or deployment |
| P1 | CI and reproducible clean artifact not established | Approve private CI with explicit protected Preview target and secret-safe gates |
| P2 | CSP/bundle/image/font warnings and human usability | Measure representative mobile network and assistive technology before focused changes |
| P2 | Recovery and retention rehearsal | Approve disposable restore exercise and audit/media retention policy |

Five recommended actions: approve dependency remediation; establish owned email domain; resolve minimum review grants and authorize two-client persistence testing; implement media privacy; then authorize Demo execution/cleanup and an exact reviewed release candidate. The DevOps reviewer should review the source and this evidence before any separate publication decision.

## Commit and boundary record

Exact new local SHAs and changed-file inventory are supplied in the final handover and Git history. OTP fixes/tests, the deleted-service regression, and audit/specification/evidence form three focused local commits after verification of the combined tree. No claim that these changes exist in the hosted review is made.

Verified implementation commits: `71a7263f913a79978dd5b7874ca880eaf0c9d097` (OTP handling and tests, five files), and `cbafb34d08e907d3d7f4c19b1ccb9548e3b6eea4` (deleted-service Plan regression, one file). The final audit/documentation commit SHA is supplied in the chat handover to avoid a self-referential hash. `sprint2-files.json` records the complete Sprint 2 file inventory.

No accepted-branch edit, IDEA.md access, GitHub push, deployment, merge, production change, dependency update, schema migration, Neon write, email send, credential change, Cloudinary configuration or unused administrative-role mutation occurred. No next-phase feature was enabled. Stop after the report.
