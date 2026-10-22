# STYLD Release Candidate Decision Review

Date: 2026-10-22
Branch: work/pre-mvp-closeout-20261016
Review HEAD: a9e88b767d1187a0bada2a7333848cc875c7d567 (plus this report commit)
Mode: local only, read first, one approved metadata fix

## 1. Verified Git baseline

| Item | Value |
| --- | --- |
| Branch | work/pre-mvp-closeout-20261016 |
| HEAD at review start | a9e88b767d1187a0bada2a7333848cc875c7d567 |
| Working tree | Clean before this report |
| Ahead of origin | 25 commits (origin at 65e0b81) |
| Ancestry | origin tip is an ancestor of HEAD. No divergence |
| Discrepancy check | Confirmed: c11cbc6 is the overnight report commit and a9e88b7 is the Terms fix on top of it. The overnight total of 24 plus this review's 1 new commit equals 25 |

Nothing was pushed, deployed, merged, rebased, or migrated during this review.

## 2. PostgreSQL integration results (Task 1)

Identity check before running: the connection string comes from POSTGRES_URL (same resolution order as lib/auth-database.ts), protocol postgresql, database neondb, sslmode require, direct Neon endpoint (ep prefix, no pooler label), credentials present. The two suites and the app pool therefore read the same QA database configuration.

Result of npm run test:db:

| Suite | Tests | Pass | Fail | Skipped |
| --- | --- | --- | --- | --- |
| tests/social-db-integration.cjs | 7 | 7 | 0 | 0 |
| tests/database-compat-integration.cjs | 10 | 10 | 0 | 0 |
| Combined command | 17 | 17 | 0 | 0 |

Exit code 0. The suites created tagged fixture rows and removed them again as designed. This closes the verification gap where the overnight report listed these suites as skipped under the plain npm test command. No migrations were run. No user-owned records were written.

## 3. Neon direct versus pooler findings (Task 2)

### Architecture, read only

- One pg.Pool per server process (lib/auth-database.ts): max 4, connection timeout 30000 ms, idle timeout 20000 ms, sanitized idle error handler.
- Protected page loads pay two database touches: the middleware internal fetch to /api/me (session lookup) and the client SessionHydrator fetch to /api/me. Pool reuse hides most of the connect cost during active traffic. Idle gaps beyond 20 seconds return the process to paying the full cold connect.

### Measured connection phases, direct endpoint, 10 bounded probes

| Phase | min | p50 | max | avg |
| --- | --- | --- | --- | --- |
| DNS | 0 | 2 | 244 | 30 |
| TCP connect | 258 | 799 | 881 | 758 |
| TLS handshake including TCP | 1047 | 1099 | 1189 | 1102 |
| pg connect (TCP, TLS, SCRAM, startup) | 2152 | 2204 | 4075 | 2430 |
| SELECT 1 on an open connection | 270 | 292 | 12666 | 1522 |
| Full fresh connect plus query | 2423 | 2488 | 16741 | 3952 |

All 10 probes succeeded. One probe (n=5) degraded sharply (connect 4075 ms, query 12666 ms), which is direct evidence that the intermittent slowness seen on earlier nights still occurs occasionally, even when nothing fails outright.

### Interpretation

- Cold connect cost is about 2.2 seconds and is dominated by TCP and TLS network round trips (about 1.1 seconds) plus protocol startup and SCRAM authentication (about 1.1 seconds).
- A pooled connection then answers SELECT 1 in about 0.3 seconds, which is roughly one network round trip.
- A Neon pooler (PgBouncer, transaction mode) would primarily remove the per-client backend startup and SCRAM cost and eliminate connection storms when many serverless instances wake at once. It would not remove the TCP and TLS handshake cost to the pooler and would not change query round trips. A realistic expectation is saving roughly 0.5 to 1.2 seconds on cold connects, not a transformation of the full request path.
- Code compatibility with transaction mode pooling looks good: no advisory locks, no LISTEN or NOTIFY, no session-level SET, node-postgres uses default statement handling, and every FOR UPDATE sits inside an explicit BEGIN and COMMIT (social saves, session selection, TOTP, admin security).

### Comparison plan, ready to run

1. Phase timing (the connect-phases script already prepared outside the repository) against the pooler endpoint, 10 probes, same statistics.
2. Run both database suites with the pooler string injected as a shell variable only (no .env.local edit) to prove transaction mode compatibility end to end.
3. Timed page loads (services and home) with direct versus pooler environment variables on a local production server, measuring time to content.
4. A bounded 60 minute sampler on the pooler, mirroring the earlier direct sampler.

Success criteria: pooler median cold connect under 1 second, page time to content improved by at least 1 second, and no new error classes.

### Requirement, subtask stopped here

The QA project's pooler connection string (host contains pooler) with a database user allowed to connect and run SELECT is required. It was not available in the local environment and no credential was obtained, printed, or changed. Once provided, the four steps above can run without any application configuration change.

## 4. Full npm advisory triage (Task 3)

Production tree (npm audit omit dev): 21 packages, 0 critical, 19 high, 2 moderate. Full tree adds 3 dev only packages (eslint config plugins and js yarnaml). No audit fix was run. No lockfile was touched.

### Cluster A, install surface only, dormant firebase tree

| Package | Installed | Severity | Chain | Fixed by |
| --- | --- | --- | --- | --- |
| firebase | 12.16.0 | high (inherited) | direct dependency, never imported | removal or override of grpc |
| @firebase/firestore | 4.16.0 | high (inherited) | via @grpc/grpc-js | same |
| @firebase/firestore-compat | 0.4.11 | high (inherited) | via firestore | same |
| @grpc/grpc-js | 1.9.16 | high | GHSA-m9gg-hp2v-232j certificate validation, GHSA-f596-whhp-79r4 low | version 1.13.6 or newer |

Reachability evidence: the firebase package has zero importers in app, components, lib, or scripts. lib/firebase.ts itself has zero importers. firebase-applet-config.json is read only by that dormant module. No firebase string appears in any of the 162 browser bundle files under .next/static. Not executed at runtime, not bundled, not run at build.

### Cluster B, unused dependency, next-pwa tree

| Package | Installed | Severity | Note |
| --- | --- | --- | --- |
| next-pwa | 5.6.0 | high (inherited) | direct dependency, NOT referenced in next.config.mjs |
| workbox-webpack-plugin, workbox-build | 6.6.1 | high (inherited) | build generators, only reached via next-pwa |
| rollup-plugin-terser | 7.0.2 | high (inherited) | same |
| serialize-javascript | 4.0.0 | high | GHSA-5c6j-r48x-rmvq RCE, vulnerable range is 7.0.2 and below, no fixed release exists, removal is the only clear |
| globby, fast-glob, micromatch, braces | 11.1.0, 3.3.1, 4.0.8, 3.0.3 | high (inherited) | same chain |
| fast-uri | 3.1.4 | high | via ajv via terser webpack plugin via next-pwa |
| browserslist | 4.28.6 | high | also used by next build tooling, two advisories GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g |

Reachability evidence: next.config.mjs contains no next-pwa import and no workbox configuration. No sw.js and no workbox strings exist in the production browser build. The tree is installed into node_modules but the flagged packages are never executed, even at build time, except browserslist which next build does use with trusted repository inputs.

### Cluster C, build time toolchain (next and tailwind)

| Package | Installed | Active advisory | Note |
| --- | --- | --- | --- |
| postcss | 8.5.20 | moderate GHSA-fxqj-rqcc-2cmp incomplete source map fix, fixed in 8.5.23 | the two high postcss advisories are already cleared by 8.5.20 |
| nanoid | 3.3.16 | high GHSA-2v37-7h3g-55p8, fixed in 3.3.18 | build time, code controlled inputs |
| source-map-js | 1.2.1 | high GHSA-68fv-2mgg-jv7q, fixed in 1.2.2 | build time |
| baseline-browser-mapping | 2.10.43 | moderate GHSA-w5vr-8v7q-w6rv, fixed in 2.11.0 | build time |
| brace-expansion | 5.0.7 and 2.1.2 copies | high and moderate DoS family | reached via minimatch chains |
| next | 15.5.27 | moderate, inherited only from postcss | no direct next advisory |

Reachability evidence: these run inside next build and tailwind postcss processing on the build machine with repository owned inputs. None appear as runtime server imports. None of the flagged packages are part of the deployed request handling path (pg, better auth, react, next runtime are clean).

### Cluster D, dev only (not in production tree)

@next/eslint-plugin-next, eslint-config-next, js-yaml. Development machine lint surface only.

### Prioritized remediation plan, awaiting approval

| Priority | Action | Clears | Risk |
| --- | --- | --- | --- |
| P1 | Targeted npm update of brace-expansion, browserslist, fast-uri, nanoid, source-map-js, baseline-browser-mapping | 6 packages including 4 highs | Low, semver compatible transitive bumps, requires full gate re-run |
| P2 | Remove the unused next-pwa dependency from package.json | up to 10 packages including serialize-javascript which has no fixed release | Low, nothing imports it, requires build verification |
| P3 | npm overrides pin for @grpc/grpc-js to 1.13.6 or newer, or remove the dormant firebase dependency entirely | firebase cluster | Low to medium, removal also requires retiring lib/firebase.ts and the config json |
| P4 | npm overrides pin for postcss to 8.5.23 or newer | next moderate advisory | Low, transitive within postcss 8 |
| P5 | Later, consider replacing next-pwa with the maintained successor only if offline PWA support becomes a product requirement | n/a | Out of scope for release candidate |

None of these were applied in this review.

## 5. Firebase findings (Task 4)

- Configuration lives in firebase-applet-config.json. It is a Google AI Studio generated side project (project id pattern gen-lang-client, firestore database id pattern ai-studio-styld), not the STYLD production identity. The web API key is present in the file (masked here as AIza****is7k). Better Auth on PostgreSQL remains the only authentication system.
- The only consumer, lib/firebase.ts, is dormant (zero importers, zero bundle presence). The module also contains a pre activation cleanup item: its error handler logs full user identifiers including email. That must be redesigned before any future Firebase activation.
- CSP in next.config.mjs still lists firebaseio, firebaseapp, and googleapis connect or frame allowances. They are inert while Firebase is unused and are tightening candidates later.
- No key rotation or configuration change was made.

Founder console checklist, cannot be verified locally:

1. Firebase console, project settings, general: confirm whether the web API key has HTTP referrer restrictions.
2. Firestore, rules: confirm rules are locked or the product is disabled.
3. Cloud console, APIs: confirm Firestore and Identity Toolkit usage or disable them if the side project stays unused.
4. App Check: note it is not configured.
5. Decide removal versus retention. Removal of the firebase dependency, lib/firebase.ts, and the config json is the cleanest release path since nothing imports them.

## 6. Terms metadata fix (Task 5)

- app/terms/page.tsx title changed from Terms and Conditions to Terms and Conditions | Styld. Description and legal body untouched.
- New regression test in tests/route-link-integrity.cjs asserts the exact approved title.
- Commit a9e88b767d1187a0bada2a7333848cc875c7d567.

## 7. Final test results

| Gate | Result |
| --- | --- |
| tests/route-link-integrity.cjs focused | 5 pass, 0 fail |
| npx tsc --noEmit | PASS |
| npm run lint | PASS, 0 errors, 31 pre-existing warnings |
| npm test | 524 tests, 522 pass, 0 fail, 2 skipped (the DB suites, which pass separately as shown in section 2) |
| npm run build | PASS |
| npm run test:db | 17 pass, 0 fail (run earlier in this review) |

## 8. Remaining issues ranked by severity

| Rank | Issue | Severity |
| --- | --- | --- |
| 1 | Cold database connect median about 2.2 seconds with occasional degraded probes near 16 seconds. Needs the pooler comparison once the pooler string is provided | High, user visible latency |
| 2 | 21 production tree npm advisories. All are install surface or build time by the evidence above, none are runtime request path, but the unused next-pwa and firebase trees are avoidable attack surface | Medium |
| 3 | Published post Save and Unsave in a real browser remains unverified end to end. Preserved intentionally, no public seeding | Medium, verification gap |
| 4 | Firebase console checks unverified locally (section 5 checklist) | Medium |
| 5 | Dormant lib/firebase.ts would log user emails if ever activated | Low today, block on any future activation |
| 6 | CSP still allows inert Firebase and Pusher origins | Low |
| 7 | 185 pre existing em dashes in body copy | Low, deferred by founder decision |
| 8 | pg driver SSL mode deprecation warning for a future pg major | Low, track upstream |

## 9. Decisions requiring founder approval

1. Supply the QA pooler connection string to authorize the four step direct versus pooler measurement. No application change accompanies it.
2. Approve remediation priorities P1 through P4 from section 4, in any order, each with a full gate re-run.
3. Choose firebase removal or key restriction plus locked Firestore rules per section 5 checklist.
4. Decide whether to seed an isolated published post for the live Save and Unsave browser verification, or keep the mocked coverage only.
5. Confirm the deferred items stay deferred: body copy dashes, PWA product decision, Pusher and Firebase CSP cleanup.

## 10. Release readiness recommendation

Not release approved yet, but the gap list is now short, measured, and decidable.

The application code that ships is in good shape: all local gates green including the previously skipped database suites, 522 tests passing with 0 failures, protected auth files untouched against origin, no secrets tracked, public UGC restrictions intact, bookings and payments still disabled, world gallery still development only, and the browser audit clean across four viewports.

The two real remaining risks are infrastructure latency and dependency hygiene, and both have concrete next actions rather than open questions. Neither requires new features. Once the pooler comparison runs and the P1 through P4 dependency actions are applied and reverified, this branch is a reasonable isolated preview candidate for founder smoke testing. Public launch remains gated on the founder decisions above and on a real published post verification of the Save experience.

Stop. No push, no deploy, no merge, no migration, no secret change.
