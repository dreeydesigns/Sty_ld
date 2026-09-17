# WhatsApp authentication setup

The implementation uses Twilio Verify's WhatsApp channel. No WhatsApp provider
account was created, paid for, or configured by this change.

1. Set up a Styld WhatsApp sender and a Twilio Verify service configured for
   six-digit codes. Complete the sender and authentication-template approval
   requirements in Twilio/Meta. A generic default sender is not assumed.
2. Set server-only `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and
   `TWILIO_VERIFY_SERVICE_SID` in the target environment. Never use NEXT_PUBLIC
   names for credentials. Configure provider geographic restrictions and spend
   alerts appropriate to the rollout.
3. Apply `initializeDatabase` through the protected `/api/init` endpoint with
   `POSTGRES_URL` and `CRON_SECRET` configured. It creates the challenge/rate-limit
   tables and adds consent columns. Review changes against a database backup and
   exercise them in preview before production.
4. Enable `WHATSAPP_AUTH_ENABLED=true` in the test environment and validate with
   an authorized recipient. Verify provider failure does not create a session;
   test new and existing accounts, expired/replayed codes, resend limits and
   concurrent submissions. Only then enable production.

Local limits: 5 starts per phone/hour, 20 per IP/hour, 60-second cooldown, 5 code
attempts per challenge and 10-minute expiry. On Vercel the server uses its
platform-overwritten IP header; other hosts share a conservative local bucket
until a trusted proxy integration is supplied. Rate limits are database-backed.
Provider retries do not silently switch channels to SMS.

The development-only `/auth/preview` page is a UI demonstration. Its navigation
does not contact the authentication API and never authenticates a user. The real
sign-in page reports unavailable delivery while configuration is absent.

References: [WhatsApp Verify](https://www.twilio.com/docs/verify/whatsapp),
[start verification](https://www.twilio.com/docs/verify/api/verification), and
[check verification](https://www.twilio.com/docs/verify/api/verification-check).
