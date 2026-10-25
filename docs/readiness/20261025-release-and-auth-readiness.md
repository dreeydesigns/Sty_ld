# Review environment and release readiness

## Confirmed current infrastructure

Read-only Vercel inspection confirmed project `prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ`, name `styld-build1-review`, deployment `dpl_Dg9JUrHrjScHDvFLNWJ5mLarCRo8`, target `staging`, state READY, Node 22.x, SSO protection for all deployments. Source remains review commit `702783b427e28980f18d19bea5d3b7d71ccf2f6b`, derived from accepted Build 1 `5f42b1c2fedbd7e0f7a96e4341508a8a346a1e12`.

Existing protected browser access was reused. Feed body is `{ok:true,posts:[],limit:1,offset:0}`. Plan and Saves each returned `Please sign in.` No new sharing token was created and no remote setting changed. The browser observation confirms the response bodies, not an independently captured HTTP status. The prior recovery recorded 200 for feed and 401 for these protected APIs. Session readiness previously returned 200/null; that is resolved infrastructure evidence, not a proof of real signup. The session readiness GET was not repeated because Better Auth's limiter can write an operational counter.

Neon inspection was limited to catalog columns and privilege functions in project `broad-morning-34625938`, branch `br-steep-violet-b78kgp17`, database `styld_review`. No existing QA or production connection was used. Runtime tables for email signup, sessions, workspace hooks, Saves and Plan exist. No new database or role was created. `styld_review_app` is explicitly excluded and left for founder cleanup.

## Authentication and privilege findings

Better Auth configuration maps users to snake_case fields and auth tables to their existing camelCase columns. Email OTPs are six digits, expire after ten minutes, are stored hashed and allow five attempts. Email cooldown/shared quotas are awaited; delivery failures are reported. Session cookie is httpOnly, sameSite lax, secure in production; cookie caching is disabled. New users receive a Client workspace and user_roles record through server hooks. Suspended/deleted users cannot create sessions. MFA remains required for administrative authorization.

Runtime grants were freshly inspected:

| Journey operation | Tables/privileges | Assessment |
| --- | --- | --- |
| OTP/session/signup | users, auth_accounts, auth_sessions, auth_verifications, auth_limits, auth_rate_limits CRUD | Present |
| Signup hooks | identity_workspaces and user_roles INSERT/SELECT | Present |
| Session context/security | auth_session_context, auth_totp, auth_browsers, security_events CRUD | Present |
| Saved/Plan | owned identity_workspaces SELECT/UPDATE with row locks | Present |
| Look/services/Estimate | services/social_posts/identity_workspaces SELECT | Present |
| Workspace chooser GET | workspace_applications SELECT | Missing, route will fail for an authenticated request |
| Professional applications | workspace_applications INSERT/UPDATE | Missing, intentionally not broadened |
| Provider fixture services/posts and moderation | services/social_posts mutations | Missing, no fixture/publication authority granted |
| Analytics, reports and blocks | analytics_events, user_reports, user_blocks mutations | Missing, outside core persistence and not silently granted |

Smallest next grant proposal is SELECT on workspace_applications for the runtime role if the live Client journey needs the workspace chooser. Review whether additional normal safety/settings routes are required before approving any broader grants. An owner/admin role is not the answer. No grant was changed here.

The local auth-schema regression invokes the actual user-create and session-before callbacks against the restored in-memory schema. It checks empty baseline, idempotent workspace/role hooks and suspended-user rejection. Better Auth itself is stubbed as a configuration collector in this test. It does not prove OTP delivery, cookie issuance, transport, full framework initialization or Neon role enforcement.

## Flow in words

Protected Vercel access permits a reviewer to reach the app. Email OTP routes check application readiness, same-origin/security checks and shared quotas before Better Auth stores a hashed challenge and awaits Resend. Verification creates the normal user/session and Client workspace through hooks. The server resolver validates the session and derives owned active workspaces and MFA state. API routes derive identity server-side. Saves and versioned Plans update workspace profile JSONB in Neon. Estimate reads the authorized Plan and service catalogue and keeps unknown prices unknown. Media currently goes to Cloudinary public delivery, which remains a separate privacy blocker. Vercel protection is an outer review gate, not customer authentication.

## Deployment checklist, execution requires separate approval

- Verify exact review project/team IDs, accepted source SHA and root directory `source` for the packaged review repository.
- Use explicit `staging` API target for Preview. Do not omit target merely because the repo branch is main. Verify environment and aliases before and after deployment.
- Confirm Next patch/security review, lockfile and native Sharp resolution. Keep secrets server-only and all-deployment SSO protection enabled.
- Confirm stable HTTPS review auth origin, cookie policy and same-origin behavior on the intended alias. Do not use a token-bearing or expiring deployment URL as auth base.
- Confirm only review `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `POSTGRES_URL`; approve Resend sender/key separately. Never pull or print secrets for a report.
- Run TypeScript, lint, tests, production build and mocked browser acceptance. Treat audit findings and build auth diagnostics as explicit evidence, not hidden log noise.
- Verify READY, correct source/environment, health liveness, database-backed empty feed and authorized/unauthorized route behavior. `/api/health` is liveness only; its 200 does not prove database or email readiness. `/api/health/auth` requires a health token and checks configuration presence, not successful delivery.
- Create real test accounts and fixtures only after separate approval. No smoke command may silently seed content or apply migrations.

No GitHub Actions workflow exists in this checkout. The package has separate quality commands but no enforced remote CI gate. Before a release, approve a CI workflow with isolated test secrets, no deployment/write tokens for pull requests, pinned action versions and explicit deployment approval. The current `test:db` script loads `.env.local`; the hardened suites ignore its application connection variables, but replacing this command with a clearly named local-only runner is a useful later cleanup.

## Recovery and production risk checklist

Record the prior READY deployment, source and environment scope before any later rollout. An application rollback does not roll back profile JSONB writes. Preserve versioned Plan compatibility and take an approved review snapshot/backup before write-based QA. Check actual Neon restore retention and rehearse recovery in a disposable environment before promising an RPO/RTO. No restore, snapshot or recovery write was performed here. Never restore existing QA or production to repair review tests.

Production promotion requires an independently approved project/domain mapping, secrets and sender-domain review, least-privilege grants, retained audit logs, media privacy implementation, real two-client persistence evidence and rollback rehearsal. Do not copy the review database or review credentials to production. Booking commitments, live payments, Shop and Delivery must remain disabled at route and server layers. Comparison and request submission remain future work. No sprint commit is automatically approved for publication.

## Updated five-blocker status

| Area | Status |
| --- | --- |
| Better Auth/database infrastructure | Connectivity/schema/default-secret prerequisites resolved in review; fresh metadata confirms core grants. Email and workspace-chooser grant remain readiness gaps |
| Real persistence | Not verified through genuine accounts/devices; mock and in-memory coverage strengthened |
| Two skipped integration suites | Resolved locally with real in-memory PostgreSQL execution, zero skipped in focused run; network/Neon enforcement still untested |
| Cloudinary media privacy | Unresolved; technical design prepared, no uploads/config changes |
| Demo workflow | Pure dry-run validator and cleanup/approval contract prepared; no live fixtures or publication |
