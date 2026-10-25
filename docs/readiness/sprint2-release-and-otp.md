# Sprint 2 release and OTP decisions

## Email readiness

The isolated review currently uses Resend's test sender. A fresh earlier diagnostic in this conversation observed a real 403 recipient restriction, not an invalid key. Resend displayed no registered domains. This sprint does not change live configuration or repeat that request. Local classification now distinguishes recipient restrictions, domain verification, generic 403 rejection, invalid credentials, throttling and upstream/network failures. User messages for provider rejections do not claim missing credentials or disclose the permitted inbox. Provider diagnostics retain HTTP status and reasonCode while omitting raw upstream payloads.

The new unit tests execute the actual configured Better Auth notification callbacks using stubbed transport/counters. Failure rejects the awaited callback and records otp_delivery_failed, not otp_sent. Cooldown normalizes addresses and enforces the existing 30 seconds. Address quota remains 3/600 seconds, daily 90/86400 and monthly 2700/2678400. Email OTP remains six digits, hashed, 600-second expiry and five attempts. Database rate limits, account/session hooks and authentication configuration were not changed. These tests do not exercise Better Auth's full HTTP plugin, delivery network, cookies, server-role permissions or two real clients.

Before general-recipient email testing:

1. Founder names an owned domain and authoritative DNS provider and authorizes the specific DNS access. No ownership is established by a source-code mailto address.
2. Add a dedicated sending subdomain to Resend, select the region and retrieve its generated DNS records. Actual DKIM/SPF/Return-Path hostnames and values must come from this domain's Resend record, never examples or guesses.
3. Inventory existing DNS first. Add only required records at the chosen subdomain, preserve website/MX/nameserver records, avoid duplicate SPF at one hostname and preserve any inherited DMARC policy. Do not enable inbound receiving unless separately requested.
4. Wait for Resend verification. Review a branded sender and sending-only, domain-restricted key. The previously chat-exposed trial key should be rotated before broader use, without logging either value. Credential actions require separate authorization under the sprint restrictions.
5. Approve only RESEND_API_KEY and RESEND_FROM_EMAIL in the review Preview target, then an unchanged-source protected staging redeployment. No Production target or production credentials.
6. Founder confirms two controlled inboxes from independent providers and explicitly approves bounded OTP signup/login tests. Never use arbitrary inboxes, fake OTPs, allowlists or verification bypasses. Capture delivery outcome and real authenticated sessions without exposing codes.

Primary DNS procedure: https://resend.com/docs/add-a-domain. A verified domain removes the test-sender restriction; quotas, abuse controls, mailbox delivery and suppression rules still apply. No arbitrary-recipient delivery is claimed from local tests.

## Security reassessment

Fresh non-mutating audit still reports 19 affected package entries, one critical, 17 high, one moderate. Lockfile/manifests are unchanged. Local Next is 15.5.27 and the Sharp resolved from its module context is 0.35.5. The image optimizer is an active runtime surface. The critical advisory's documented Sharp workaround is met locally; the Linux deployed binary/resolution is not independently verified here. Do not call the critical audit fixed. Both documented patched Next lines and compatibility need founder review before an upgrade.

The final local Server Action registry has zero Node and zero Edge entries. `app/auth/actions.ts` still contains dormant source. The separate Server Action denial-of-service advisory requires an action to be used. Current compiled evidence does not establish that exposure; recheck after any route changes. Primary advisories: https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw and https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r.

Firebase remains imported only by `lib/firebase.ts`, with no active app/component consumer found. next-pwa remains installed but not wrapped/imported in Next configuration. Their affected transport/build chains remain candidates for separately approved removal, not silently fixed findings. Better Auth's Zod path requires runtime validation review; tooling vulnerabilities must not be dismissed merely because they are build-only. See the earlier detailed dependency inventory and fresh sprint2-dependency-audit.json. No audit fix, install, dependency removal or lockfile change occurred.

Same-origin/ownership regressions from Sprint 1 remain in the reused branch. Private Saves resolves its actor on the server, requires a Client workspace, verifies saveable content and stores under workspace/user ownership. Plan reads and writes bind workspace, identity, role and active status, lock the profile row, compare revision and preserve unrelated profile keys. Moderation filters require public, published, visible, nondeleted content, and create paths remain pending. New coverage checks a deleted linked service cannot be newly selected by another account, while existing preferences remain recoverable. No newly demonstrated additional authorization defect justified an application mutation beyond email diagnostics.

Security headers include CSP, HSTS, frame protection and nosniff. The existing broad third-party CSP remains a separate report-only tightening proposal. Health liveness does not prove auth/database readiness; auth diagnostics are token-gated and return configuration booleans. Neither endpoint justifies customer-readiness claims.

## Release checklist

| Gate | Evidence and status |
| --- | --- |
| Local functionality | Build 1 accepted; Sprint 1 and Sprint 2 remain separate local patches pending review |
| Mock verification | Unit/PGlite and browser artifacts are local only. Browser APIs/accounts/images are intercepted |
| Live auth | Blocked by verified sender domain and authorized two-inbox test |
| Live persistence | Requires real sessions, authorized writes, cross-device restoration and isolation tests |
| Database permissions | Previous catalog inspection found missing workspace_applications SELECT. No new role query or grant in Sprint 2. Founder must authorize minimum reviewed grant |
| Media privacy | Pending public delivery and fail-open upload quota remain unresolved. No real portfolio upload until approved privacy fix |
| Dependency safety | Critical/high findings remain, clean Linux artifact and patched dependency approval required |
| CI/reproducibility | No tracked GitHub workflow found. Clean isolated install and enforced gates need a separately approved CI slice. Current node_modules is reused, no clean install proof |
| Review deployment | Fresh read-only project check: prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ, dpl_DxhxM3YCg26pWbwuvgxdBgJrVmLD, READY, staging, Node 22.x, SSO enabled/all. No deployment performed |
| Production | Not authorized or ready. No push, merge, promotion, credentials or production operation |

Rollback proposal: record the exact approved source tree, previous READY deployment and environment scope, verify schema compatibility and rehearse disposable database recovery before promising restore objectives. Application rollback alone does not revert JSONB plans or moderation records. No backup, restore or schema operation was performed.

`styld_review_app` remains untouched for founder cleanup. It is not the runtime role. Prior role/grant findings are historical evidence, not a fresh remote privilege attestation.

## Fixtures and cleanup

Sprint 1's pure validator already enforces two labelled Demo professionals, two or three owned services, four to six pending Looks, opaque approved identity references, exact review target, synthetic media references and no live URLs/secrets/publication. It is deterministic and read-only. Do not duplicate it or portray it as an execution adapter. Current model supports two Professionals; Salon variation requires a separately reviewed validator extension and normal workspace onboarding.

Actual cleanup remains blocked by an authorized executor, confirmed test identities, execution receipts mapping manifest keys to real IDs, dependency-safe deletion order, review-only database authorization, media/audit retention policy and moderation audit preservation. A valid manifest alone must never authorize deletion. Keep normal signup and moderation, verify exact project/database before each operation, and require an explicit run receipt plus ownership checks. No account, post, service, media asset or database record was created here.
