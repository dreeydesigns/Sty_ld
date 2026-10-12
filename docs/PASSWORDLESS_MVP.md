# STYLD passwordless MVP

## Authentication and cost

Better Auth owns all authentication and sessions. PostgreSQL `users.id` remains
the application identity, so existing bookings and profiles retain their owners.
Email OTP is the default. Google is shown only when both OAuth credentials exist.
Clerk and legacy password, phone, WhatsApp and passkey login endpoints are retired
(HTTP 410). Africa's Talking and Twilio are not called by the new login flow.

Resend Free is the intended sender: no paid plan is required. Its published free
allowance is 100 emails/day and 3,000/month. Authentication conservatively caps
codes plus security alerts at 90/day and 2,700 per 31-day window; other application
emails share the provider quota. This is a limited free MVP, not unlimited free
delivery. Do not enable provider overages or paid upgrades. Production customer
mail requires a verified domain, DNS access, and RESEND_FROM_EMAIL on that domain.
An API key alone does not prove delivery readiness.

## Deployment sequence

Use npm and the committed package-lock.json for reproducible installs. The stale
Bun lockfile was removed so deployments do not reinstall the retired Clerk stack.

1. Back up the database, and retain the current deployed revision for rollback.
2. Set POSTGRES_URL, a random BETTER_AUTH_SECRET of at least 32 characters,
   independent MFA_SECRET_KEY, BETTER_AUTH_URL (exact HTTPS site origin),
   RESEND_API_KEY and RESEND_FROM_EMAIL. Never commit these values.
3. Run `npm run auth:migrate` to inspect the additive SQL. Run
   `npm run auth:migrate -- --apply` to apply it. Run against the same database
   the deployment will use. Existing Clerk IDs and legacy sessions are retained
   as historical records; they do not authenticate in the new code.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. `npm run test:auth:integration` uses an isolated temporary schema and captures
   mail on localhost. It requires POSTGRES_URL_NON_POOLING on Neon. No real email
   or SMS is sent. It does not certify external email delivery.
6. Verify a real email OTP on the deployed origin, logout/relogin, profile save,
   booking, workspace switch, provider review, administrator MFA, suspension and
   session revocation before routing customers to the release.
7. Optional Google OAuth callback: `<BETTER_AUTH_URL>/api/auth/callback/google`.
   Account linking is disabled; use the existing email method for an already
   registered address rather than silently merging provider identities.

Deploy on a configured preview/branch before production cutover. A Git push is
not proof that DNS, hosting secrets, migrations, or mail delivery are configured.
Do not remove the Clerk account until migration/recovery has been verified.

## Existing phone-only accounts

Never invent emails or create replacement user IDs. The migration report shows
how many users have email. After reviewing ownership evidence, an authorised
operator can run:

```
npm run auth:recover-email -- --user-id <existing-uuid> --email <new-email> --reason <support-ticket>
```

Inspect the preflight and repeat with `--apply`. The tool refuses already-linked
or duplicate emails, records the recovery reason, revokes sessions, and leaves
email unverified until the owner completes an OTP. It cannot merge accounts.
For an already-linked or disputed identity, manually investigate before making
any database change. Do not use matching names as identity evidence.

## Workspaces and administration

Clients can browse before login. New accounts receive only client access.
`/settings/workspaces` submits a professional/salon application. Approval grants
a role; role switching changes only the authenticated session. Salon approval
also creates a business workspace and owner membership. Staff invitation and
granular salon operations are future work; do not share owner login credentials.

Existing administrator grants are preserved. `/auth/mfa` enrols a TOTP
authenticator using a locally displayed secret (no third-party QR service).
Store recovery codes privately. TOTP replays and reused recovery codes are
rejected. The current session must complete MFA; enrolment alone is insufficient.
There is no public admin signup or automatic promotion by matching an email.

`/admin/security` lists login events, accounts and pending provider applications.
Actions require a review reason and are logged. The dashboard cannot suspend or
modify privileged accounts, nor can an admin change their own access there.
Provider approval means the operator reviewed the application, not a guarantee
of identity or personal safety. No automated KYC or safety badge is claimed.

## Sessions, privacy and recovery

Cookies use HttpOnly, SameSite=Lax and Secure on HTTPS deployments. Better Auth
adds the `__Secure-` prefix on HTTPS; legacy application guards accept that cookie
name but verify it through Better Auth, never through old token hashes.
The first-party browser cookie is a random recognition hint, never a credential.
Cookie clearing can appear as a new browser. New-browser events produce an email
alert when the shared free-tier budget permits; failed notifications are logged.

Users can revoke sessions at `/settings/security`. Security events contain user
IDs, timestamps, truncated user agents and keyed hashes of trusted ingress IPs.
They do not reveal MAC addresses, precise location, OTPs, or usable session tokens.
Network information cannot conclusively identify a person.

Run `npx tsx scripts/prune-auth-data.ts` periodically through your existing
maintenance process: security events/browser recognition expire after 90 days,
expired sessions/challenges and orphaned session contexts are removed. No new
paid scheduler is required. Adjust and disclose retention before launch.

Rollback: redeploy the previous revision with its previous provider configuration.
Leave additive tables in place; never drop users or reassign booking ownership.
Reconcile users created after cutover before attempting a provider rollback.

## Validation and outstanding configuration

The isolated database integration test covers the real Better Auth route handler,
mail dispatch, invalid and replayed codes, burst limiting, first and returning
login, browser recognition, audit events, logout, revocation and mail-provider
failure. Mail is captured on localhost; no customer messages are sent by this test.

The connected database preflight found nine accounts, seven without email. No
production account identities were rewritten. The Resend account had no verified
sending domain at preflight. Configure and verify an owned domain before customer
cutover; a free-tier API key cannot remove this requirement. Production migration,
hosting secrets and a real delivered OTP remain deployment steps.
