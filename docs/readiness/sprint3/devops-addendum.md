# DevOps review addendum, Sprint 3

This branch is unpublished local work. The DevOps review repository contains sanitized root commit 702783b427e28980f18d19bea5d3b7d71ccf2f6b, derived from accepted Build 1 commit 5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12. It does not contain Sprint 2 or Sprint 3. Passing local checks do not update that protected review deployment.

## Runtime and release boundaries

The application is Next.js App Router with React, Better Auth email OTP and PostgreSQL. One identity has multiple authorized workspaces. Private Saves use the existing saves API. The client Plan and its ordered shortlist use identity_workspaces.profile.activePlan, authorized by the existing Plan API with revisions and scope-bound ETags. No shortlist table or browser-persistent shortlist collection was added.

Use the lockfile with npm ci, then npm run build and npm run start. Node 22 is the previously verified review runtime. Local checks use the installed Windows runtime, with exact versions recorded in the final report. Do not configure live database credentials merely to run mocked browser tests. npm test includes real disposable in-process PGlite SQL; it does not require a Neon connection. Tests use synthetic identities only.

No .github directory exists in this source tree, so there is no repository Actions workflow to attest here. vercel.json disables Git deployment for two specifically named older branches; it is not a blanket guard for a new Sprint 3 branch. No push is authorized. Existing Vercel project integration must be inspected separately before a future approved release. No Node-version pin file or engines field was found in this source. The public /api/health reports application process health only. /api/health/auth requires HEALTH_CHECK_TOKEN and reports configuration names/status; neither proves successful email delivery or database authorization.

Required review variables are BETTER_AUTH_SECRET, BETTER_AUTH_URL, POSTGRES_URL, RESEND_API_KEY and RESEND_FROM_EMAIL. MFA_SECRET_KEY and HEALTH_CHECK_TOKEN support their existing protected operations. Never copy production values. Keep payment variables disabled and unrelated integrations unconfigured. Removing dormant Firebase code does not authorize changing any remote Firebase account or existing Clerk configuration.

The intended remote boundary remains project prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ, its actual staging/Preview target and isolated Neon review database. Do not infer the target from a dashboard label or apply settings to all environments. Maintain protected sharing and Vercel Authentication. No current remote configuration or deployment status is newly attested by local tests.

## Security and operational gaps

Next and eslint-config-next were patched together within 15.x. Unused PWA/Workbox and Firebase SDK dependencies were removed after source and compiled-output inspection. Targeted transitive patches and a Next-scoped PostCSS override were checked against the installed dependency graph. Consult audit-final.json and the final build result rather than assuming an older deployment has these fixes.

Existing security headers include CSP, HSTS, frame restrictions, nosniff and referrer controls. CSP still permits unsafe-inline, unsafe-eval and legacy integration origins. Those allowances are not removed blindly because nonce integration and embedded tools need separate regression work. npm audit does not prove application-level security.

The upload route now fails closed if its SQL-backed quota check is unavailable. The pending-media policy is a tested pure model, not a deployed access-control layer. Existing public Cloudinary delivery still blocks real pending portfolio uploads. Provider restriction, private delivery, signed/proxied access, derivative publication, cache invalidation and revoked/orphan cleanup require an independently approved implementation and live provider verification.

Resend has not been activated for general recipients by this sprint. An owned verified domain, restricted review key, approved sender, exact target configuration and bounded two-provider OTP test remain separate founder actions. A previously chat-exposed trial credential should be rotated through an approved secure operation. Never reproduce it in a report.

PGlite proves SQL behavior against the restored sanitized schema, including actual Better Auth records and moderation rollback. It is one in-process connection. It does not prove independent PostgreSQL lock contention, Neon networking, runtime-role grants, Resend delivery or real cross-device persistence. The earlier missing workspace_applications SELECT grant and unused styld_review_app privileged role remain founder review items. No role was deleted or changed here.

Demo tooling builds deterministic pending manifests and receipt-bound cleanup plans with writes fixed to zero. Six original geometric PNGs visibly labelled DEMO have a provenance/checksum manifest and deterministic validator. No third-party photo is used. A checksum is integrity evidence, not authorization. Real onboarding IDs, approval of those graphics for restricted QA upload, authorized marker assignment and normal MFA moderation must precede any approved seed. There is deliberately no remote seed or cleanup executor.

Compare is experimental and local. It does not enter the accepted Build 1 branch or published snapshot. Other providers' similar service names do not prove equivalent offers. Prices require exact selected owned service IDs. Unknown hours, appointment availability, reviews, verification, distance, fees and cancellation terms remain explicitly missing. Its only filled action returns to Plan or opens the leading provider's real profile. Requests and booking remain unavailable.

## Smallest safe release sequence

1. Review the focused security/dependency and upload fail-closed diffs with their regression evidence. Use exact commit mapping in the final report, not an automatic branch merge.
2. Approve an isolated review release candidate, preserving protection and a known rollback deployment. Verify installed dependencies and actual runtime-role access on that candidate.
3. Approve owned-domain activation and a bounded two-client OTP/Saves/Plan persistence test against the isolated backend. Do not seed content automatically.
4. Implement and verify the media privacy boundary before any genuine professional portfolio upload. Approve a manifest-scoped fixture operation only after normal moderation and cleanup are ready.
5. Review Compare independently, including the 360px screenshots and provider-service equivalence limitations. Do not publish it as part of a stability-only release.

A future rollback must account for both source deployment and project environment settings. No new schema migration exists here. Local branches and commits remain available for review; this document does not authorize any merge, push, configuration change or deployment.
