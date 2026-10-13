# STYLD authentication implementation

## Scope and checklist

- [x] Preserve uncommitted changes in an external patch backup and copy untracked files.
- [x] Separate worktree on codex/auth-mvp-recovery, baseline 925d0fc.
- [x] Replace guest-modal WhatsApp invocation with the canonical branded flow.
- [x] Remove provider-name authorization fallback and scope provider booking access by workspace.
- [x] Add separate identity workspace profiles and server-owned switching.
- [x] Keep Clerk deployment configuration untouched.
- [x] Complete isolated unit/integration checks, typecheck, lint, production build and local HTTP smoke.
- [x] Produce the five recovery reports and commit candidate source locally.
- [ ] Complete target-environment validation and founder release review.
- [ ] Verify real sender, delivery and Safari behavior.
- [ ] Obtain recovery decision for historic email-less identities.
- [ ] Approve and execute production migrations and cutover separately.

## Access and sessions

Better Auth is the sole session authority in the candidate. Email sign-in is unified for new and existing verified email identities. Codes have six digits, ten-minute expiry, hashed storage and five verification attempts. Shared request counters and delivery quotas protect dispatch. The adapter returns a delivery failure rather than claiming success. This implementation does not provide free WhatsApp OTP.

Google is hidden and disabled unless GOOGLE_AUTH_VERIFIED is true and credentials exist. That flag must not be enabled until callback and browser tests pass. Email sender setup is required before real delivery. Tests use a local FAKE provider only.

Session tokens use HttpOnly, SameSite=Lax cookies, Secure in production, 30-day expiry and daily renewal. Server lookup verifies the session and suspension state. Cookie cache is disabled. Logout/revocation removes server authority. No bearer token belongs in localStorage. The recovery keeps the display profile in memory, hydrates it from /api/me, and clears legacy profile/social caches on identity or workspace change. Display state never authorizes an API request.

Guests browse /home, /discover, collection profiles, /book and the Counter availability page. A guest is not a fabricated identity. Booking drafts retain service/provider/date/time selections for at most 24 hours in sessionStorage. Contact details and notes are excluded. Draft restoration validates shape and age. Mutations still require server authentication. Booking commitment is explicitly unavailable until authoritative catalog pricing and availability are connected.

## Separate accounts under one identity

Migration 011 adds identity_workspaces with an identity owner, role, status and independent JSON profile. Client is created by the trusted sign-up hook. Professional and Salon creation remains an intentional application plus approved admin action. Existing server-granted roles are backfilled without changing users.id. Public requests cannot grant Admin, Shop or Delivery.

Switching accepts a workspace identifier only as a selection, never as authority. The server resolves memberships, verifies an active owned row again under a database lock, persists the selection in auth_session_context and users.last_workspace_id, and returns a role destination. Profile updates target the authenticated workspace and owner. Provider booking and service ownership include workspace IDs. Ambiguous historic provider assignments remain unassigned instead of being guessed from names.

Shop and Delivery remain represented in the schema but feature-gated. Full tenant isolation across every legacy product subsystem is a release audit requirement, not a claim established by this schema alone. Salon teams, portfolios and marketplace transactions require further end-to-end validation.

## Historic email-less accounts: founder decision required

Read-only audit found seven of nine users without email. No recovery operation was run and no email or ID was invented.

| Option | Benefit | Risk / prerequisite |
|---|---|---|
| Assisted recovery with corroborated historical account evidence and verified new email | Can retain the exact original user ID and bookings | Requires a documented review process and protection against social engineering; a claimed phone number or booking fact alone is insufficient |
| Existing verified provider session proves ownership before attaching verified email during an approved transition | Less manual friction for users still signed in | Requires careful cross-provider proof validation; must not allow old provider sessions to bypass the new authority after cutover |
| Keep affected identities inaccessible until ownership can be established | Prevents unsafe reassignment | Users temporarily lose access; support and retention policy needed |

No option is selected. Existing recovery tooling is not approval to execute it. Do not auto-link by unverified phone, matching names or a newly supplied email.

## Migrations and rollback

Do not run auth:migrate --apply in production without founder approval, backup and preflight review. Migration 010 introduces passwordless support; generated Better Auth tables preserve the users mapping; 011 introduces workspaces. Review duplicate email normalization, nullable phone compatibility, foreign keys and ambiguous provider ownership before applying. No production migration has been applied in this recovery phase.

Named rollback: STYLD-AUTH-RECOVERY-ROLLBACK. Before approved cutover, record the current deployment ID/SHA, environment names and encrypted configuration backup, and take a recoverable database backup. If the candidate fails, restore the recorded deployment and its unchanged Clerk configuration under founder approval. Keep additive tables and new user records for reconciliation; do not drop them or restore an old database over new transactions blindly. Revoke candidate sessions if required. Reconcile new email-only users before restoring legacy login assumptions. A rollback to Clerk also restores its known username interruption and requires a restricted release posture.

No production deploy, merge, billing enablement or credential rotation is part of this branch handoff.

Security events identify accounts and sessions, with browser information and a keyed IP hash where trusted ingress supplies an IP. They do not prove who physically used a device. A website cannot obtain a visitor's remote MAC address. Browser recognition is a risk signal, never an authentication bypass.
