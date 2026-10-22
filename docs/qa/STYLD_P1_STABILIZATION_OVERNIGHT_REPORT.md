# STYLD Phase 1 Stabilization Overnight Report

Date: 2026-10-22
Branch: work/pre-mvp-closeout-20261016
Ends at commit: 6ff7a96 (plus this report commit)
Remote state: unchanged at 65e0b81. Nothing was pushed, merged, rebased, or deployed.

## What this night did

One unattended local stabilization pass across six areas: error handling, database connection resilience, route and metadata integrity, responsive and accessibility checks, Private Saves regression coverage, and a security review of every unpushed commit. All work is local, reversible, and committed on the test branch only. No migrations were run. No dependency versions were changed. No secrets were printed, logged, or committed.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| A | Error handling and sanitized logging | DONE |
| B | Database connection resilience with bounded sampler | DONE |
| C | Route, link, and metadata integrity | DONE |
| D | Responsive and accessibility audit at 4 viewports | DONE |
| E | Private Saves mocked regression coverage | DONE |
| F | Security and release readiness review | DONE |
| G | Extended gate pass | DONE |
| H | Focused local commits and this report | DONE |

## Phase A: error handling and sanitized logging (commit b631378)

What changed:

- 26 raw error log sites across 16 files now log only a classification in the form `Error (ENOTFOUND)` or `Error`. The classification pattern matches the accepted GET /api/me precedent. Error messages, stacks with message text, SQL fragments, and driver detail no longer reach console output.
- Files touched: the API routes for contact, upload, blocks, services, bookings, reviews, reports, analytics, account deletion, and social posts, plus lib/auth-server.ts, lib/cloudinary.ts, and lib/api-security.ts.
- lib/logger.ts sanitizeLogData now redacts database connection strings, masks the local part of email addresses as `a***@domain`, and for Error values keeps only name, driver code, and a message-free stack with the first line stripped in development.

Design note: a shared logging helper export was tried first and then removed. Any new import from lib/logger.ts breaks the existing vm based route tests because their stub maps do not include it. The inline pattern avoids that and follows the precedent the founder already accepted.

Response bodies were verified to stay static and generic. The only user facing error text returned by authError is intentional AuthError copy, such as "Sign in to continue." Unexpected failures return "Unable to complete this request." with status 500.

New test: tests/error-disclosure-regression.cjs (5 tests). It guards every reachable API route and active lib module against raw error logging, and behaviorally proves connection string, email, and driver message redaction.

Evidence: tsc PASS, lint PASS (0 errors, 31 pre-existing warnings), full suite 504 pass / 0 fail / 2 skipped at the time of commit, build PASS.

## Phase B: database connection resilience

### B1, lifecycle audit (read only)

- A single pg.Pool in lib/auth-database.ts is the sole live database path. Bounds: max 4 connections, connection timeout 30000 ms, idle timeout 20000 ms, plus a sanitized pool error handler that absorbs idle connection errors.
- better-auth shares this pool. The identity manager is imported for types only. No process signal handlers and no pool.end calls exist, which is normal for serverless style hosts and was not treated as a defect.
- The protected files (lib/better-auth.ts, middleware.ts, lib/auth-policy.ts, lib/auth-resolver.ts) were not modified.

### B2, bounded 60 minute sampler

- Method: a local script opened one fresh connection per probe and ran a read only `SELECT 1` against the isolated QA database (Neon project dawn-voice-62002961, database neondb, direct endpoint, port 5432, sslmode require). Interval 60 seconds. Duration 60 minutes. Output contains only sanitized timings, never the hostname.
- Window: 2026-10-22 06:55:07Z to 07:54:10Z (local 09:55 to 10:54, EAT).
- Result: 57 of 57 samples succeeded. Zero timeouts, resets, or DNS failures in this window. The intermittent Windows to Neon failures seen on earlier nights did not recur tonight.

### B3, latency statistics (milliseconds, 57 samples)

| Probe | min | p50 | p95 | max | avg |
| --- | --- | --- | --- | --- | --- |
| DNS resolve | 1 | 1 | 222 | 474 | 40 |
| TCP connect | 259 | 291 | 641 | 1319 | 333 |
| Fresh connection plus SELECT 1 | 1981 | 2540 | 4518 | 7561 | 2826 |

### B4, conclusions and founder decisions

- Connectivity was stable for the full window. The ~2.5 second median for a fresh connection is handshake bound (TCP plus TLS plus auth plus query against the direct endpoint). Because the sampler probes are 60 seconds apart and the pool idle timeout is 20 seconds, every probe paid the full connect cost.
- In the app, the pool reuses connections during active traffic. Cold page loads still pay roughly the same connect cost on the first request, which is visible in the services page taking about 6.8 seconds to reveal session gated content.
- No code change was made tonight on the database path. The remaining lever is an infrastructure choice reserved for the founder: switch the connection string to the Neon pooler endpoint, or keep the direct endpoint and accept cold connect latency. Connection string changes are explicitly outside tonight's authorization.
- The pool already logs driver failures in the sanitized classification form (commit 1e54fe0).

## Phase C: route, link, and metadata integrity (commit f12de72)

Audit results, from a full source scan of literal link and API targets:

- 84 page routes and 42 API routes exist.
- 50 unique literal internal links, 0 broken. Known aliases and gates: /explore to /discover, /settings/profile to /settings/active-sessions, /counter/* to /counter, and the feature gate redirects for shop, delivery, and their dashboard and onboarding paths to /discover.
- 22 literal API call targets, all with live handlers except two calls inside the dormant dev script lib/test-multi-role-scenarios.tsx.
- FEATURES: shop, delivery, payments live, and booking commitments are all off, as intended for launch scope.

Fixes applied:

- app/layout.tsx now publishes `title: "STYLD"`. Before this, roughly 70 pages inherited an empty document title.
- 11 metadata blocks had their punctuation normalized (em dashes removed, brand suffix set to the `| Styld` style used by most pages). Two remaining dashes sit in body data fields (discover world tagline, licenses intro line) and were left untouched as copy, not metadata.
- Terms and Conditions still carries no brand suffix. That is a copy decision left to the founder.

New test: tests/route-link-integrity.cjs (4 tests). It fails if any literal internal link stops resolving, if a literal API call target loses its handler outside the dormant allowlist, if the root layout loses its default title, or if em or en dashes reappear in any metadata block.

## Phase D: responsive and accessibility audit (commits f12de72, 4de87d9)

Method: production build served locally, clean headless Edge on its own debug port and profile, 4 viewports (1440x900 desktop, 1024x768 tablet landscape, 768x1024 tablet portrait, 375x812 mobile), 13 public routes per viewport, 52 probes total. Screenshots saved for the landing and discover pages at each viewport.

Results, 9 of 9 checks PASS:

- Every audited route returned 200 at every viewport.
- Every audited page published a non empty document title, which directly validates the Phase C fix. Pages without their own metadata now show the STYLD default.
- No horizontal overflow at any audited viewport.
- No missing alt text, no unlabelled form controls, no unnamed buttons or links, lang set to en.
- Keyboard tab focus moves through the landing page controls in order.
- A signed in visit to the /settings/profile alias lands on /settings/active-sessions.
- A guest hitting the same protected route is redirected to sign in with returnTo preserved.
- Zero console or page errors during the run.

Observations, not failures:

- The services page renders its h1 only after the client session gate resolves, which took about 6.8 seconds under current database latency. The heading exists in source; the earlier probe simply measured too early.
- The contact page had no main landmark. Fixed in commit 4de87d9 by promoting its outer wrapper to main. Verified in served HTML.

## Phase E: Private Saves mocked regression (commit 6ff7a96)

The QA database has 0 live social_posts rows. Publishing a post to enable the live save UI would activate public user generated content, which is out of scope. Instead the real route handlers and the real lib/social-saves.ts logic were driven against an in memory workspace store.

New test: tests/private-saves-mocked-regression.cjs (13 tests) covering:

- A client reads back only their own saved list, with a fixed response shape of ok plus savedPostIds and nothing else.
- Stored junk is normalized to unique valid post ids.
- Guests receive 401. Non client workspaces receive 403 with the copy "Private Saves are available for client workspaces only."
- Mutations without a same origin header are rejected before any storage access.
- Malformed post references answer 400 without touching storage.
- Unpublished or missing posts cannot be saved (404).
- Saving appends and reports the full new list. Saving the same post twice keeps one entry.
- Removing a saved post keeps every other id exactly. Removing a never saved post changes nothing.
- A malformed removal target answers 404 without touching storage.
- The 100 post cap fails closed with a generic error and a rolled back, released transaction.
- A storage failure rolls back, releases the pool client, answers generically, and logs only a classification.

Live UI save and unsave with a real published post stays blocked until the founder approves seeding published content, exactly as in previous sessions.

## Phase F: security and release readiness review

Scope: all 23 unpushed commits (19 from earlier sessions plus 4 tonight) against origin/work/pre-mvp-closeout-20261016 at 65e0b81.

Checks and results:

| Check | Result |
| --- | --- |
| Protected auth files modified (lib/better-auth.ts, middleware.ts, lib/auth-policy.ts, lib/auth-resolver.ts) | No changes in any unpushed commit |
| Secrets, keys, tokens, connection strings in 3951 added lines | None. Four scanner hits were deliberate test fixtures using fake values that assert redaction |
| .env or credential files committed | None. .gitignore covers .env and .env.* and whitelists .env.example |
| Auth bypass patterns added | None |
| console.log, console.info, or console.debug additions | None. Only the sanitized classification console.error lines from Phase A |
| Migrations applied or edited | No. sql/migrations/012_social_posts.sql and 013_better_auth_qa_schema.sql exist as new numbered files from earlier sessions and were not executed tonight |
| Binary or oversized files | None |
| package.json changes in the unpushed set | One line only: the test:db script added in an earlier session |
| firebase-applet-config.json | Unchanged in the unpushed set. The file contains a Firebase client apiKey that predates this branch. Firebase client keys are public by design; confirm the key has console restrictions. This is a founder checklist item, not an incident |
| npm audit, production tree | 21 advisories: 0 critical, 19 high, 2 moderate. Mostly the build time chain (next-pwa, workbox, rollup plugin terser, serialize javascript, postcss) plus the dormant firebase and grpc tree. Fixes exist via a lockfile update. No dependency changes were made tonight |
| pg SSL mode deprecation | The QA driver warns that sslmode require becomes verify-full semantics in a future pg major. Benign today, worth tracking |

## Phase G: extended gate pass (final, after all commits)

| Gate | Result |
| --- | --- |
| npx tsc --noEmit | PASS |
| npm run lint | PASS (0 errors, 31 pre-existing img warnings) |
| npm test | PASS, 523 tests: 521 pass, 0 fail, 2 skipped (the two founder-run database suites) |
| npm run build | PASS |
| npm run theme:audit | PASS |

New tests added tonight: 22 (5 error disclosure, 4 route link integrity, 13 private saves mocked).

## Phase H: commits made tonight

| Commit | Message |
| --- | --- |
| b631378 | Classify API and library failures in logs instead of logging raw error objects |
| f12de72 | Publish a default document title, normalize metadata punctuation, and add route link integrity tests |
| 4de87d9 | Add a main landmark to the contact page for screen reader navigation |
| 6ff7a96 | Cover Private Saves routes with mocked session and storage regression tests |

Plus this report. Working tree is clean. Nothing was pushed.

## Founder decision list

1. Database endpoint: switch to the Neon pooler or keep the direct endpoint and accept roughly 2.5 second cold connects. Evidence above (Phase B).
2. Run the two skipped database suites (npm run test:db) when convenient. They need the isolated QA database and are founder run by policy.
3. npm audit: approve a lockfile update to clear the 21 production tree advisories, mostly build time tooling.
4. Seed or do not seed published social posts. If seeded, the live save and unsave UI can be exercised end to end in the next session.
5. Terms and Conditions title: add the `| Styld` suffix or keep it as is.
6. Confirm the Firebase console key restrictions for the client apiKey that has been on the branch since before this work.
7. Copy sweep for the 185 pre existing em dashes in body text was intentionally not done. Approve a dedicated copy pass if wanted.

## Artifacts (local only, outside the repository)

- Sanitized sampler log and statistics: pw/sampler-overnight.log, pw/b2-stats.json
- Phase D report and screenshots: pw/phase-d-report.json, pw/shots/phase-d (8 PNGs)
- Phase D, sampler, and diff scan harnesses: pw/phase-d.cjs, pw/db-sampler.cjs, pw/diff-scan.cjs and related probes

## Stop

All phases complete. No push, no deploy, no merge, no migration, no dependency change, no brand change.
