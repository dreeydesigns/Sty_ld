# Sprint 3 engineering report

26 October 2026. Verdict: **NOT READY for controlled live QA**. Local engineering improvements do not activate email delivery, prove live persistence or make public pending-media delivery private.

## 1. Executive summary

Sprint 3 removes unused vulnerable dependency chains, patches Next within 15.x, fails closed when the upload quota database is unavailable, adds actual Better Auth and moderation SQL integration coverage, and introduces an experimental Plan-backed Compare journey. Pure media policies, original Demo graphics and deterministic fixture dry runs prepare future operations without changing remote systems.

The final full local unit result is 651 passed, zero failed and zero skipped. This replaces neither a live Neon test nor a real email delivery test. Rendered browser verification passed 204 functional scenarios and 8 measurement/accessibility scenarios (212 total), using intercepted APIs and synthetic records. No actual screen-reader, live email or deployed-account verification is claimed.

## 2. Git state and review boundaries

Accepted Build 1 is work/pre-mvp-closeout-20261016 at 5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12. It remains unchanged. IDEA.md remains untracked and untouched in that checkout.

Sprint 2 started clean on work/overnight-trial-readiness-20261025 at e515853cd2588618e3576931fd434f99a80bd23f. Its report, three commits and Compare prototype were inspected. Fresh baseline gates passed: TypeScript, lint (31 warnings), 630 unit tests, build. Baseline audit had 19 affected package entries.

The old worktree shared its node_modules via a junction. Automatic review rejected removing that junction, so no removal occurred. A new worktree was created safely from the verified Sprint 2 commit at C:/Users/Muti/Documents/GitHub/styld-sprint3-20261026, branch codex/styld-sprint3-20261026. Its independent installation does not mutate the accepted checkout's dependency tree.

Ten focused Sprint 3 implementation commits are recorded with full SHAs and per-commit files in commit-mapping.json. Experimental Compare is baa4da4ee06435c5428bd59825b9ac423c544648. release-candidates.md groups the exact commits and dependencies. The eleventh commit contains this documentation and evidence only.

file-inventory.json accounts for changed files. The final documentation commit is the branch tip; the final response supplies its exact SHA and unpushed count. No merge, rebase, cherry-pick, push or deployment occurred.

## 3. Workstreams A through H

| Stream | Starting condition | Changes and evidence | Remaining boundary |
| --- | --- | --- | --- |
| A, authentication | Sprint 2 already classified Resend errors and corrected return handling | Actual Better Auth handler and generated OTPs against restored local SQL; separate clients, workspace creation, wrong/expired/reused OTP, cooldown, path limiter, enumeration response and session expiry | Email transport is stubbed; no real inbox or live sign-in test |
| B, persistence | Existing Plan revisions, scope-bound ETags, Saves authorization and local SQL suites | New eligible provider facts and role/status/privacy regression; real moderation route rolls SQL publication back if audit insertion fails | PGlite is single-connection, not independent PostgreSQL locking or Neon runtime grant proof |
| C, security/dependencies | 19 affected package entries, including critical Next advisory and unused chains | Removed PWA and dormant Firebase after source and compiled-output searches; compatible patches, clean npm ci, installed graph and build checks; audit zero | Older deployed review source is not patched by this local work |
| D, media privacy | Pending Cloudinary delivery remained public; upload quota failure continued processing | Tested pure access/publication/revocation model; behavioral red/green upload regression now stops before body parsing or storage | Policy is not connected to live Cloudinary or a durable asset manifest |
| E, fixtures | Existing reserved Demo and moderation contracts, no authorized remote seed | Deterministic builder, strict target/ownership guards, pending records, integrity checks, partial rollback and receipt-bound reverse cleanup; writes zero | No remote executor, real onboarding binding, uploaded assets or remote cleanup |
| F, Compare | Standalone Sprint 2 layout study; existing Version 2 shortlist storage | Shared Plan client, quiet canonical card/profile controls, compact tray, replacement dialog, ordered table, leading choice, revision-safe Undo and profile return | Exact service matching only; no provider equivalence inference or Request activation |
| G, browser/performance | Build 1 mocked browser suites available | 212 passing mocked production-mode browser scenarios, six Beauty Worlds, five widths, keyboard/reduced-motion checks and measured layout/navigation behavior | Real screen-reader interaction and human usability remain unverified |
| H, release handover | Published DevOps snapshot predates both sprints | Focused release mapping, full local evidence, environment and rollback addenda, unchanged accepted branch audit | All integration and publication remain founder decisions |

## 4. Security findings by reachability and impact

- P0 gate before genuine portfolio uploads: the existing public pending-media delivery path does not provide the required privacy boundary. The new pure policy cannot fix a public URL already served by the provider. No customer data breach is claimed; do not enable real uploads before implementation and provider verification.
- P1: the older protected review source does not receive these local dependency fixes. Baseline Next 15.5.27 was affected by GHSA-2464-fhr4-w9xw (critical SVG image-optimization RCE) and GHSA-p3m5-59mp-jv5r (Server Actions denial of service). The application uses image optimization and allows remote image hosts. No exploit was attempted. Deployment protection reduces exposure but is not a package patch. Local Next 15.5.28 resolves the audit findings.
- P1: the previously chat-exposed trial sending credential needs separately approved rotation. Its value is not reproduced here. Owned-domain activation and actual key scope remain unverified.
- P1: live runtime grants, two independent account persistence and cleanup rights remain unverified. The earlier workspace_applications SELECT issue and unused privileged review role require founder review. No role was deleted or changed.
- P2: CSP retains unsafe-inline, unsafe-eval and legacy integration origins; removing them safely requires nonce/integration regression work. Audit zero is not a proof of complete application security. The targeted changed-file credential-pattern scan found no matches, excluded environment files and IDEA.md, and does not replace a comprehensive secret scanner or security assessment.

## 5. Dependency report

Audit entries count affected packages, not distinct vulnerability bulletins. Baseline: critical 1, high 17, moderate 1, total 19. After PWA removal: 11. After Firebase removal: 7. After Next patch: 7 with zero critical. After targeted transitive patches: 2. After the scoped override: zero across all severities.

Next and eslint-config-next move 15.5.27 to 15.5.28 together. brace-expansion moves 1.1.16 to 1.1.21 and 5.0.7 to 5.0.12; js-yaml 4.3.0 to 4.3.2; nanoid 3.3.16 to 3.3.20; PostCSS 8.5.20 to 8.5.31 and Next's nested 8.4.31 to 8.5.31; source-map-js 1.2.1 to 1.2.2; zod 4.6.5 to 4.6.7. Companion Next packages move with Next. dependency-changes.json records exact lock paths and 364 removed entries. Firebase's unused helper is removed; no live Firebase configuration is changed.

The Next-scoped override is explicit in package.json. npm initially did not reconcile its nested lock entry; that one entry was reconciled to verified registry artifact metadata, then a clean npm ci and npm ls validated the installed graph. No broad audit fix or major framework upgrade was used. Production builds and the full suite verify compatibility within the tested Windows runtime. Linux deployment behavior is not newly attested.

## 6. Authentication report

Tests exercise the unchanged real Better Auth configuration and plugin, actual generated codes and actual SQL records. Only email delivery is replaced with an in-memory transport. Independent subcases advance disposable rate-window fixture timestamps after explicitly proving the library limiter boundary. No runtime limiter is disabled and no test session is invented.

Retained Sprint 2 regressions cover missing sender, provider 403/429, timeout/network, safe return destinations, normalization and configuration diagnostics. New tests add actual handler-level wrong/replay/expiry behavior, interrupted send with no created user, two client workspaces, identical existing/unknown send responses and expired sessions. Browser mocking does not attest real cookie or inbox behavior across deployed origins.

email-activation-runbook.md contains the exact approval sequence and rollback. The test sender cannot send to arbitrary recipients. No email was sent or API key changed.

## 7. Persistence report

Mock coverage tests account generations, stale responses, concurrent revision conflicts, cross-tab restoration, network retry and scope-bound If-Match. PGlite executes the restored sanitized schema, existing Saves and Plan SQL, two users/workspaces, inactive/deleted services, changed provider roles, profile JSON preservation and ordered shortlist constraints. New provider facts exclude private profile fields. Unauthorized guests and forged role/user/workspace inputs continue to fail server-side.

The actual moderation SQL transaction test injects audit insertion failure, checks pending status and zero audits, then retries and verifies one publication/audit and replay rejection. Admin identity authorization is stubbed for that route transaction test; existing authorization tests cover MFA/roles separately.

No independent local PostgreSQL server was found through PATH tools, Docker or the standard installation directory (local-database-tools.json). No server was provisioned. A single-connection PGlite result must not be described as independent row-lock contention. No live Neon write, real cross-device restore or runtime role change occurred.

## 8. Media privacy and fixtures

The pure media policy, fixture and asset suites add nine tests, included in the full run. Media policy checks guest/workspace/MFA boundaries, expiry, provider restrictions, publication version, revocation and cleanup ordering. It is a policy model only. The upload quota fix is actual application enforcement, but does not secure public pending assets.

fixture-dry-run.json contains a locally generated example with two provider workspaces, two clients, three Demo services and six pending Looks, canonical ownership and explicit Demo labels. It contains no customer data. Creation planning follows workspace, service, post order; receipts limit reverse cleanup to actually created manifest IDs. Checksums are integrity checks, not authentication. fixture-and-media-approval.md explains real identity binding, original geometric PNG provenance and checksums, normal MFA moderation and exact remote approval needs.

## 9. Compare implementation and limits

Shortlist and leading choice belong to the current saved Plan, not an account-wide collection. Maximum three ordered IDs, duplicate protection, explicit fourth replacement, leading-choice subset and removal clearing are preserved. Rapid taps cannot overlap while saving. Undo requires the same identity generation, exactly the expected confirmed revision and matching current fields; dirty, failed or stale state cannot be undone over newer changes.

The existing Plan GET supplies allowlisted eligible provider facts. Inactive, removed or role-changed providers retain their position with honest unavailable labels. A bulk removal action avoids getting stuck between multiple invalid provider references. Undo cannot restore an ineligible provider through server validation. Reloading does not silently erase unrelated Plan preferences.

The tray appears above mobile navigation and preserves selections across Discover, real canonical creator profiles and Plan. It uses no independent persistent shortlist cache. Compare rows are in the same order for every provider. Only exact selected service IDs belonging to a candidate can produce a known listed subtotal. Equivalent services at another provider cannot be inferred from names, so those prices remain Not provided. Fees, appointment availability, hours, reviews, verification, distance and terms are not fabricated. Provider-specific estimates are therefore not activated. The one filled action opens the leading provider's actual profile or returns to Plan.

At 360px the three columns each measure 109px, at 375px 114px, at 390px 119px, and at 1440px 341px. All 30 World/width cases pass with no horizontal overflow. Names wrap; each action has a minimum 44px target. The Compare summary is in normal page flow, 62px high (6.9% of the tested 900px viewport); the profile tray is 106px (11.8%). Actual keyboard focus shows a solid 2px outline. Native replacement dialog cancellation and replacement restore focus; browser Back restores numeric tab-local scroll. All six current 360px screenshots were visually inspected and retained under screenshots/. The three-column approach is retained for founder usability review, not replaced with a different model.

Requests, appointment commitments, messages and payments remain unavailable. No Compare feature entered accepted Build 1 or the published review snapshot.

## 10. Quality and performance results

Fresh baseline: TypeScript PASS; lint PASS with 31 warnings; unit 630/630, zero skips; production build PASS; audit 19 affected entries. Corrected current tree: TypeScript PASS; lint PASS with the same 31 warnings, zero new warnings; unit 651/651, zero failures/skips; production build PASS; npm audit zero; npm ls exits zero. Windows Node v22.23.2, npm 10.9.8.

The build logs include expected missing local Better Auth secret/base URL diagnostics because no live credentials are supplied to the credential-free build. Build completion is not live authentication readiness.

Browser results: Build 1 journey 33, Private Saves 32, Plan 49, email diagnostics 10, Save/shortlist coexistence 30, Compare behavior 19, Compare World/viewport matrix 30, and actual two-tab BroadcastChannel/Undo 1. Total functional scenarios: 204. Six retained Look/Plan/Estimate measurement scenarios and two Compare measurement scenarios add 8, for 212 total passing. The matrix uses 360, 375, 390, 768 and 1440px and Default/Pure, Feminine, Natural, Spiritual, Cultural and African Nude. Final named logs and exit JSON files distinguish passing runs from earlier failed attempts.

Compare local measurements at 360/1440px: usable render 4518/4018ms, profile transition 2193/2588ms, return 1078/3097ms, sampled layout shift 0.06968/0.01679, five observed long tasks each, decoded script resources 931727 bytes each and Plan GETs 1/2. No browser page errors occurred. The console assertion explicitly permits only blocked external resources and the exact shared fixture's deliberately unauthorized /api/auth/session probe. Six such mock probes are retained per run, not described as a live authentication success or zero console messages.

Retained measurements at 360/1440px: Look usable render 6539/6001ms; Plan 4562/5100ms; Estimate 2863/4331ms. Their TTFBs were 238/60ms, 15/24ms and 26/28ms respectively. Full transfer, layout-shift and long-task records are in readiness-measurements.json. compare-performance.json contains the complete Compare conditions and records. These are Windows headless Chrome against the local production server, mocked accounts/APIs and synthetic media, without network/CPU throttling. The host had about 0.5GB free RAM before the founder closed unused apps, and remained constrained during portions of verification. No Core Web Vitals certification or field-performance claim is made. Build output reports Compare 3.28kB route code and 237kB First Load JS, Discover 248kB First Load JS, shared 103kB. No performance thresholds were invented.

Re-measured on 2026-10-29, and read this paragraph together with the file dates below it. The beta
branch now has `scripts/run-browser-qa-mock.cjs`, which serves the production build on the one origin
these suites accept and runs all thirteen interception suites against a disposable cluster; the run
recorded here used artifact `otbrYvVDnDV2k8aqvw4ui` at commit `3512424`. Compare usable render went
from 4518/4018ms at 360/1440px to 1560/1296ms, the profile transition from 2193/2588ms to 388/436ms
and the return from 1078/3097ms to 105/176ms, and `compare-performance.json` above now holds those
numbers. Sampled layout shift on Compare moved the other way at 360px, 0.06968 to 0.08695, still
under the 0.1 the live suites fail on, and it is recorded rather than smoothed over. The direction
matches the one change these pages went through since sprint 3: the root `app/loading.tsx` was
removed, so a route no longer ships a spinner in place of its own words while a slow part of it
finishes. Two things about the evidence, stated because they are the kind of thing a reader would
otherwise assume. `readiness-measurements.cjs` writes its report to the operating system's temp
directory, so `readiness-measurements.json` in this folder is still the 2026-10-27 file, and the
current figures live in the run's own stdout, recorded in
`docs/readiness/beta/mock-browser-suites.json`. Those current figures are Look/Plan/Estimate usable
render at 360px of 2365/723/719ms and at 1440px of 1181/735/781ms, against sprint 3's
6539/4562/2863ms and 6001/5100/4331ms. And they moved between the two runs the same artifact was
given that day: the same batch reported Look at 360px as 1795ms an hour earlier, so a difference of a
few hundred ms here is the machine, not the product. Same conditions as the paragraphs above, with
one addition worth stating: that run executed its own thirteen suites back to back, so the host was
busier than a visitor's phone will be, and no field-performance or Core Web Vitals certification is
made from any of it.

Failed intermediate runs are retained honestly: upload's red test processed the body instead of returning 503; the first moderation fixture omitted a required service field, then used a self-review actor and lacked a VM process stub; those harness issues were corrected. An early auth run overlapped dependency replacement and another hit the real rate boundary. They are not counted as passing results. See execution-ledger.md and named intermediate logs.

## 11. Live-readiness classification

| System | Classification |
| --- | --- |
| TypeScript, unit suite, build, dependency graph | Locally verified |
| Rendered customer journey and Compare | Mock verified, see browser results |
| Better Auth generated OTP verification, SQL Plan/Saves, moderation rollback | Disposable-local verified |
| General-recipient Resend delivery | Blocked on owned verified domain and approved configuration/test |
| Live two-client sessions and Neon persistence | Not verified by this sprint |
| Restricted Cloudinary pending media | Blocked, policy only |
| Authorized remote Demo seed and cleanup | Blocked, dry-run only |
| Published review dependency/security state | Unchanged older snapshot, release approval required |

## 12. Founder approvals actually required

1. Review and select focused unpublished security/stability commits for an isolated protected release. Do not merge Compare automatically.
2. Confirm an owned sending subdomain and approved DNS administrator, authorize restricted key rotation/configuration, and approve two consenting tester inboxes from different providers.
3. Approve bounded two-client live auth/Saves/Plan tests and any specific missing runtime grant in the isolated backend. Keep unused-role cleanup founder-owned.
4. Approve the durable media manifest/private-delivery implementation and provider configuration before genuine uploads; approve a separate manifest-bound seed/cleanup operation afterward.
5. Review the Compare mobile layout and service-equivalence limits with a human usability check before publication. No change to the three-provider contract is proposed automatically.

## 13. Five highest-priority next actions

1. Review and release compatible dependency/security fixes to the isolated protected review environment.
2. Activate owned-domain OTP delivery with restricted credentials, then run a consented two-provider delivery test.
3. Verify two-client live sessions, authorization and persistence, including actual runtime grants and conflict handling.
4. Implement and independently verify private pending-media delivery before genuine professional content.
5. Approve controlled synthetic fixtures and human-test the complete journey, including Compare, before customer trials.

## 14. Final verdict

**NOT READY.** Safe local engineering work has advanced, but owned-domain delivery, live authenticated persistence, actual media privacy and approved fixture operations remain separate gates. Mocked UI and disposable SQL evidence do not prove live readiness. No push, deployment, merge, real email, remote fixture, customer-data copy or production modification was performed. Stop after this report.
