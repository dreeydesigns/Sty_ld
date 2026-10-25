# Dependency review, 25 October 2026

Non-mutating `npm audit --json` was rerun against the unchanged lockfile. Result: 19 affected package entries, one critical, 17 high, one moderate. These are package entries, not 19 independent exploits. Audit exits nonzero when findings exist. No install, audit fix, removal, override or lockfile update was performed.

Direct affected dependencies are Next.js, Firebase and next-pwa. Installed Next.js is 15.5.27. Sharp resolved from Next.js is 0.35.5, matching the lockfile. Next's image optimizer is part of the application; ordinary landing images use it, so it must not be classified unused. Remote patterns allow Pexels, Unsplash and Cloudinary. The prior protected review image probe demonstrated optimizer reachability; no exploit was sent in this sprint.

The critical advisory applies to image optimization on glibc Linux. Its documented workaround is Sharp >=0.35.5, which this resolution meets. That does not remove the audit finding or fix the separate Server Actions denial-of-service advisory. Source contains `app/auth/actions.ts` with an exported Server Action and a legacy signup form consumer. However, the current local production server-reference manifest has no registered Node or Edge actions. Runtime reachability of that separate advisory is not established in this build. Recheck compiled action registration after any signup changes rather than treating dormant source as proof of an exposed action. Vercel protection limits access; it does not patch dependencies.

Primary advisory references: [image optimizer](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r). Review proposed patched releases against these advisories again at approval time.

## Reachability inventory

This is source and dependency-graph assessment, not dynamic exploit testing. Build tooling can also be a security boundary when processing untrusted files.

| Affected package | Direct | Observed path and exposure | Priority |
| --- | --- | --- | --- |
| next | yes | App Router/image runtime; Server Action source exists but current compiled action registry is empty | P0 release gate |
| firebase | yes | Only `lib/firebase.ts` imports it; no active app/component importer found | P1 removal review |
| @firebase/firestore | no | Firebase SDK chain, dormant application integration | P1 with Firebase |
| @firebase/firestore-compat | no | Firebase compatibility SDK chain | P1 with Firebase |
| @grpc/grpc-js | no | Firestore Node transport; no application gRPC server or active Firestore call found | P1 with Firebase |
| next-pwa | yes | Installed but not imported or wrapped in `next.config.mjs` | P1 removal review |
| workbox-webpack-plugin | no | next-pwa build chain, not enabled in config | P1 with next-pwa |
| workbox-build | no | Same dormant PWA build chain | P1 with next-pwa |
| rollup-plugin-terser | no | Workbox minification chain | P1 with next-pwa |
| serialize-javascript | no | Minifier/build serialization path; not an active app serializer | P1 with next-pwa |
| brace-expansion | no | Glob/minimatch tooling chains, build/lint; no user-supplied glob API found | P1 tooling |
| browserslist | no | CSS/browser-target tooling; no runtime user-query surface found | P1 tooling |
| baseline-browser-mapping | no | Browser-target data/tooling, not customer input processing | P2 tooling |
| fast-uri | no | AJV/schema tooling, no direct app URI authorization use found | P1 tooling |
| js-yaml | no | Configuration/lint tooling, no customer YAML parser found | P1 tooling |
| nanoid | no | Transitive tooling; no app custom generator found | P1 tooling |
| postcss | no | Next/Tailwind build CSS and source-map processing | P1 tooling |
| source-map-js | no | CSS source-map toolchain; do not feed untrusted source maps | P1 tooling |
| zod | no | Better Auth dependency and its request-validation surface, potentially runtime | P1 runtime review |

`npm ls` reports extra hoisted entries in the reused existing node_modules tree. The audit is lockfile-based; a reproducible clean install was not run because dependency installation was not authorized. The local worktree uses an ignored junction to the existing installation, without changing packages. Review the audit's exact `nodes`, `range` and `via` fields in `dependency-audit.json`, rather than assuming every installed copy has the same version.

## Smallest proposed remediation sequence

1. Approve a focused Next patch update to at least the advisory-fixed 15.5.28 release, retaining current React compatibility and verifying Sharp resolution. Pin/review the exact resolved version and run all gates, image delivery and middleware/auth regressions. Do not jump major versions to silence the audit.
2. Approve removal of unused next-pwa and its orphaned Workbox/minifier chain. Verify no offline service-worker contract or built service worker remains before removal. `next.config.mjs` currently has no PWA wrapper. Re-audit after removal.
3. Approve removal of dormant Firebase code/config/dependency after checking imports, historical consumers and any externally relied-on export. Keep Better Auth as sole identity provider. This is removal planning, not permission to reconfigure authentication.
4. Refresh vulnerable transitive tooling with a reviewed lockfile change and compatible parent updates. Trace every remaining copy of PostCSS, brace-expansion, source-map-js and serializers. Never follow an audit-proposed major downgrade blindly; current audit suggestions for Firebase and next-pwa are not a safe automatic plan.
5. Review Zod's exact Better Auth dependency resolution and patched compatible release. Test oversized-input rejection with bounded local inputs; do not send resource-exhaustion probes to the hosted review.

Re-run audit, TypeScript, lint, full tests, production build and mocked browser journeys after each approved dependency slice. Confirm the Linux deployment's resolved native Sharp artifacts before declaring the critical workaround effective there. No vulnerability is marked fixed by this sprint.
