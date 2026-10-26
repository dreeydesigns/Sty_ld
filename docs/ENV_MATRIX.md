# STYLD environment variable matrix

Governs configuration for Local Development, the isolated Preview and Production.
Sign-in is Better Auth email OTP only. No phone OTP provider, no WhatsApp
authentication and no payment collection is active; those variables are listed as
retired so nobody re-adds them to a live environment.

## Required for a working sign-in

| Variable | Scope | Notes |
| :--- | :--- | :--- |
| `BETTER_AUTH_SECRET` | Server | Random private secret. A missing value makes `lib/auth-readiness.ts` answer `AUTH_NOT_CONFIGURED` at the auth route. |
| `BETTER_AUTH_URL` | Server | The exact origin the browser uses. On a preview this must be the stable branch origin, or OTP cookies will not match. |
| `POSTGRES_URL` | Server | Pooled or direct connection. `lib/auth-database.ts` uses `pg`, so a direct host is accepted. `DATABASE_URL` is an accepted fallback. |
| `EMAIL_PROVIDER` | Server | `resend` (default when unset) or `gmail`. Any other value fails closed: no provider is selected and no success is reported. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Server | Needed when the selection is `resend`. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Server | Needed when the selection is `gmail`. See [Gmail code delivery](GMAIL_OTP_SETUP.md). The App Password is entered only in deployment secrets. |

Presence, never values, is what the health endpoint reports (`lib/email-diagnostics.ts`).

## Optional, feature scoped

| Variable | Enables |
| :--- | :--- |
| `HEALTH_CHECK_TOKEN` | The email/auth health check. Empty disables the route with a 404. |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_URL` | Image upload. All three required or `/api/upload` answers 503. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_AUTH_VERIFIED` | Google sign-in. Stays unset and `false` until browser validation passes. |
| `CRON_SECRET` | Scheduled maintenance routes. |
| `VERCEL` | Set by the platform. The contact limiter trusts `x-vercel-forwarded-for` only when this is present; a non-Vercel production host without a trusted ingress value answers 503 rather than trusting a spoofable header. |

## Retired, must stay absent from live environments

`TWILIO_*`, `AFRICASTALKING_*`, `WHATSAPP_AUTH_ENABLED`, `WHATSAPP_DEV_MODE`,
`PHONE_OTP_PROVIDER`, `MPESA_*`, `STRIPE_API_*`, `ENABLE_STRIPE_PAYMENTS`,
`NEXT_PUBLIC_FIREBASE_*`. The code paths that read them are dormant or disabled by
feature flags. Setting them does not activate a feature: `lib/feature-flags.ts` does,
and `SHOP`, `DELIVERY`, `PAYMENTS_LIVE` and `BOOKING_COMMITMENTS` are all `false`.

## Environment separation

- Local Development: `.env.local` only, never committed. Fixture connection strings in
  test scripts never inherit a live shell database URL.
- Preview: one branch-scoped set of overrides pointed at the isolated QA database.
  Production variables are not inherited. Redeploy after any change.
- Production: untouched by this project phase. No migration is applied to it.

## Secret policy

- Never print, log or commit a value. Errors are classified by `name (code)` only.
- Rate limit keys are hashed with `BETTER_AUTH_SECRET` before they reach the database.
- Rotate in the provider dashboard if a value is exposed, then redeploy.
