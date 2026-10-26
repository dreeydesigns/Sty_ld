# STYLD Email Delivery Setup

For the founder's Gmail sender choice, follow [Gmail code delivery](GMAIL_OTP_SETUP.md).
Set `EMAIL_PROVIDER=gmail`, `GMAIL_USER` and `GMAIL_APP_PASSWORD` in the isolated
Preview only. The Resend variables below apply when `EMAIL_PROVIDER=resend` or
the selection is unset. Unknown selections fail closed. Do not configure Gmail
as a Resend sender. The health endpoint also reports presence booleans for both
Gmail variables, with readiness calculated for the selected transport.

This document lists the exact environment variable names needed for email sign-in
(the passwordless email OTP flow) in each Vercel environment. Email sending is
fail closed: STYLD never reports that a code was sent unless the email provider
accepted it. If delivery fails the user sees a retry message, or a setup message
when the reason is a configuration issue.

## Required environment variables

Set these in Development (`.env.local`), Preview, and Production. In Vercel each
environment is scoped separately: a variable added to Production is not visible
to Preview.

| Variable Name | Environments | Purpose |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Dev, Preview, Prod | Resend API key used to send sign-in codes. Server only. Never expose to the client or logs. |
| `RESEND_FROM_EMAIL` | Dev, Preview, Prod | Verified sender address, for example `no-reply@styld.co.ke`. |
| `BETTER_AUTH_URL` | Dev, Preview, Prod | Exact origin of the deployment. Production is `https://sty-ld.vercel.app`. Preview must match the origin of that preview deployment. No trailing slash. |
| `BETTER_AUTH_SECRET` | Dev, Preview, Prod | Random secret shared by the auth library. Server only. |
| `POSTGRES_URL` | Dev, Preview, Prod | PostgreSQL connection string (also reads `DATABASE_URL` as a fallback). Server only. |
| `MFA_SECRET_KEY` | Dev, Preview, Prod | Optional. Encryption key for TOTP secrets and identifiers. |
| `HEALTH_CHECK_TOKEN` | Dev, Preview | Optional. Lets a token holder read the email setup status without signing in. Leave unset (recommended for Production) to keep the endpoint disabled. |
| `GOOGLE_CLIENT_ID` | Dev, Preview, Prod | Optional. Needed only if Google sign-in is enabled. Must be set alongside `GOOGLE_CLIENT_SECRET`. |
| `GOOGLE_CLIENT_SECRET` | Dev, Preview, Prod | Optional. Paired with the Google client id. Server only. |

### Typical local development values

Normal practice: `BETTER_AUTH_URL=http://localhost:3000`. These are names only,
never values. Do not paste secret values into chat, issues, commits, or logs.

## Verified sender domain

Resend only sends from a domain you have verified through DNS. You cannot verify
`sty-ld.vercel.app`, because STYLD does not control its DNS. You must use a domain
you own, such as `styld.co.ke`, add the DNS records Resend provides, then set
`RESEND_FROM_EMAIL` to an address on that domain such as `no-reply@styld.co.ke`.

For testing only, a pre-verified sender `onboarding@resend.dev` exists, but it
delivers only to the email address on your Resend account. Do not use
`onboarding@resend.dev` as the production sender.

## Vercel scoping and redeploys

1. Open Project Settings, then Environment Variables.
2. Add each name from the table for Production and for Preview.
3. Variable changes apply only to new deployments. After changing a variable,
   redeploy the preview before testing again.

## How to check status

The status endpoint is token-gated instead of sign-in-gated, because sign-in is
exactly what you are diagnosing.

1. Set `HEALTH_CHECK_TOKEN` in the environment you are testing. While it is unset
   the endpoint returns 404 in every environment, including Production.
2. Call `GET /api/health/auth` with the request header `x-health-check-token: <token>`.
   A missing or wrong header returns 404.
3. It returns booleans only (configured yes or no), never values. It reports:
   `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BETTER_AUTH_URL`,
   `BETTER_AUTH_SECRET`, `POSTGRES_URL` (or `DATABASE_URL`), and an
   `emailServiceConfigured` summary.

Example: `curl -H "x-health-check-token: $TOKEN" https://preview.example.com/api/health/auth`

For monitoring, also read the Vercel logs for the failing preview deployment. A
failed email send logs a short reason code server side. The UI tells the user a
generic retry message, or a distinct setup message for configuration failures.

## Reason codes

Server logs and the `otp_delivery_failed` security event carry one of these codes.

| Reason Code | Meaning | Likely Fix |
| :--- | :--- | :--- |
| `EMAIL_NOT_CONFIGURED` | `RESEND_API_KEY` is missing | Add the variable for the environment and redeploy |
| `EMAIL_NO_SENDER` | `RESEND_FROM_EMAIL` is missing | Add a verified sender address and redeploy |
| `RESEND_INVALID_KEY` | Resend rejected the API key | Replace the key in the environment settings |
| `RESEND_DOMAIN_NOT_VERIFIED` | Sender domain is not verified in Resend | Complete DNS verification on a domain you own |
| `RESEND_INVALID_SENDER` | Sender address is invalid or missing fields | Correct `RESEND_FROM_EMAIL` |
| `RESEND_RATE_LIMITED` | Too many emails in the window | Wait and retry; check Resend quota |
| `RESEND_UPSTREAM_ERROR` | Resend service error | Retry later |
| `EMAIL_NETWORK_ERROR` | Network or timeout reaching Resend | Retry later; check outbound connectivity |
| `SMTP_AUTH_FAILED` | Gmail rejected its App Password | Check the mailbox, Google 2-Step Verification and App Password in the Preview environment |

## Fail closed

OTP delivery is awaited in the request. If the provider rejects the email, or the
email and auth configuration is incomplete, the sign-in flow reports failure and
records an `otp_delivery_failed` event. It never fabricates a success.