# Review email activation and rollback

This is a proposal only. Sprint 3 does not change DNS, create keys, send email or redeploy.

## Before activation

1. Founder identifies an owned sending domain and approves its DNS administrator. Prefer a dedicated sending subdomain. Do not buy a domain automatically.
2. Add that exact subdomain in the existing Resend team. Copy the exact DKIM, SPF and return-path records Resend supplies. Do not invent record values or replace website, root MX or unrelated TXT records. Check for conflicting SPF records at the same host before adding one.
3. Wait for Resend to report the domain verified and sending enabled. Record domain identifier, region and verification status without credentials. A DNS lookup alone does not prove Resend readiness.
4. Create an approved review-only, sending-only key restricted to that verified domain. Store it directly in the isolated Vercel target. Rotate the previously chat-exposed trial key through a separately authorized action. Never put a key in Git, a command argument, screenshot or report.
5. Reconfirm project prj_W7UjUPQkUItT6LDjwqwWOoquTDUQ, the actual staging/Preview target and its stable HTTPS alias. Record the current deployment identifier for rollback. Do not alter the main STYLD project.

## Proposed isolated settings

- RESEND_API_KEY: approved sending-only key for the verified domain.
- RESEND_FROM_EMAIL: STYLD-branded mailbox at that exact verified domain, such as STYLD <login@approved-sending-subdomain>. The example is not a provisioned sender.
- BETTER_AUTH_URL: exact stable protected review origin, without a sharing token.
- BETTER_AUTH_SECRET and POSTGRES_URL: existing review-only secret and isolated runtime connection, never copied from production.

Settings apply only to the actual review target, not all environments. Keep Vercel Authentication and protected sharing enabled. Redeploy only the separately accepted source SHA after founder approval.

## Bounded acceptance, separate authorization required

Obtain two explicit tester addresses belonging to consenting testers, from different providers. Verify Resend no longer imposes the test-recipient restriction. Request one OTP per tester, allow normal cooldowns, and let each tester enter the actual received code privately. Record delivery status and error classification, never codes or session cookies. Confirm signup, subsequent login, session expiry and cross-account Saves/Plan isolation against the isolated backend. Test attempts create real account and verification records and are outside this sprint.

The onboarding@resend.dev test sender supports only the account's authorized test recipient. It cannot establish arbitrary-recipient readiness or a two-provider test. No recipient allowlist or fake session should be added to compensate.

## Rollback

If delivery fails, pause further attempts and retain sanitized provider status/error identifiers. Do not disable OTP, rate limits or MFA. With founder approval, remove only the new review email settings or restore their prior review values and redeploy the previously accepted unchanged review source. A deployment rollback alone might not revert project environment settings. Revoke only the new review key after verifying it has no other consumer. Preserve database records for an explicitly approved cleanup operation. DNS cleanup must remove only records created for this sending subdomain, and only after confirming no other consumer relies on them.

No live domain, key scope, sender or current dashboard state is newly attested by these local instructions.
