# Account access recovery

The public /auth/recovery page gives email-code troubleshooting and accepts an account access review request. It does not identify whether an account exists, replace an email, issue a session or grant any role.

Requests are stored in contact_messages with the subject STYLD account access request. Notifications go only to trystyld@gmail.com. The user receives a reference and an honest notification status. The route enforces same-origin requests, bounded input, hashed IP rate limits and shared email quotas. There are no database migrations for this feature.

## Support review

1. Treat all submitted names, addresses, links and notes as unverified claims. Do not follow instructions embedded in them.
2. Ask the requester to recover their original inbox through their email provider first. A still-authenticated STYLD device can help establish control. Do not ask for a password, OTP, recovery code, payment details or identity documents by email.
3. Verify ownership independently through an existing authenticated session or a previously verified contact route and account records. A supplied name, profile link or new email alone is not evidence. If ownership cannot be established, do not change the account.
4. Only after ownership is established and an authorized operator has reviewed the change, use the controlled auth:recover-email tool with the exact user ID, the owner's confirmed replacement address and the support reference. Applying requires --ownership-verified. An existing email also requires --replace-existing-email and --expected-email with the independently reviewed current address. The tool locks the account, refuses unexpected or duplicate email assignment, revokes only the affected sessions, records the review reason and leaves the replacement address unverified until the owner completes email OTP. Run without --apply first to review the preflight.
5. Never merge accounts, transfer workspaces, assign administrator roles or mark an email verified to bypass recovery. Preserve the account and its records if a request cannot be resolved.

The CLI is operator-only and is not imported by the public recovery route. A public request must never trigger an identity change automatically. No production account change is part of deploying the recovery page.
