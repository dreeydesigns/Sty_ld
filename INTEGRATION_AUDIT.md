# Integration audit — 12 September 2026

## Implemented locally

- Correct first-row handling in session, credential and user-creation helpers.
- Password-verified phone sign-in; public registration cannot assign admin roles.
- Duplicate client sign-up no longer authenticates the existing account.
- Real password changes with current-password verification and other-session revocation.
- Real device-session listing, revocation and server-backed logout.
- Profile editors wait for server success before updating local caches.
- Session hydration restores server profiles and clears expired local authentication.
- Booking creation, cancellation and rescheduling no longer silently ignore API failure.
- Rolling booking dates, input validation and ownership-scoped booking lookup.
- Authenticated service creation and image uploads with configuration/input checks.
- Firebase environment overrides and CSP permissions for configured resources.
- Shared migrations upgrade existing profile, role and booking schemas.
- Removed destructive OTP-table recreation and silent migration-error suppression.
- Removed the legacy server action that wrote a fake session cookie.
- Authentication regression tests.

## External blockers

The Vercel connector returned `UNAUTHORIZED / oauth_token_invalid_grant`.
Deployment settings, environment variables and runtime logs remain uninspected.
This checkout has `.env.example`, but no configured `.env.local` or Vercel link.
Initial browser connection attempts timed out; the local signup preview was later
opened and checked successfully in Codex. No production migration or deployment
has been performed, and live integrations are not verified.

## Remaining unfinished workflows

| Area | Current evidence | Required completion |
| --- | --- | --- |
| Legacy phone-only accounts | WhatsApp adapter implemented; provider absent | Configure WhatsApp delivery and verify existing-account access |
| SMS | `lib/sms.ts` bypasses delivery | Provider implementation and confirmed live delivery |
| Social feed, follows, comments, DMs | `lib/social-store.ts` uses localStorage | Authenticated persistence and cross-account/cross-device tests |
| Teams and service sessions | Local stores/status transitions | Server-backed invitations, membership and service lifecycle |
| Provider bookings | Provider dashboards use local stores | Durable provider identities, authorized transitions, synchronized dashboards |
| Shop/rider onboarding | Drafts and fake upload booleans | Private document storage, durable applications, review and notifications |
| Shop inventory/orders/delivery | Browser-side prototypes | Inventory checks, persistent orders, dispatch and delivery ownership |
| M-Pesa/Stripe | Environment names exist | Confirm payment scope, sandbox callbacks, reconciliation and activation |
| Deletion/export | Local pending request records | Durable requests, authenticated exports and scheduled deletion processing |
| Notifications/2FA | Local preference switches | Delivery subscriptions and verified enrollment |
| Admin setup | Development credentials in old docs | Controlled setup and replacement of development credentials |

Old summaries describing missing OTP routes are not completion evidence.
These remaining workflows are explicitly **not complete**.

## Local verification

The 24 authentication and booking regression checks pass, including WhatsApp
failure, binding, attempt-limit, privilege and consent/session transaction checks.
TypeScript and a production build passed; lint reports warnings but no errors.
The public deployed homepage returned HTTP 200 with the expected Styld title.

Run `npm test`, `npm run typecheck` and `npm run build`.
Regression tests substitute database responses; they do not verify a real database,
SMS delivery, image-hosting credentials or the deployed application.

## Chapter 2 additions

The new primary authentication flow uses WhatsApp Verify, followed by a first name
and consent for new users. Optional setup no longer blocks access. Old unverified
signup endpoints return 410. Provider configuration is absent, so the real flow
fails closed without sending a message or issuing a session. Existing password
sign-in endpoints remain for legacy access and require a separate hardening review.

Removed unsupported headline ratings/counts, password persistence in signup drafts,
and automatic guest inactivity interruptions. The settings screen no longer claims
that local-only switches enable real 2FA or login alerts. Duplicate session pages
redirect to the real session manager.

See `docs/STYLD_SOURCE_MAP.md` for historical-document decisions and
`docs/WHATSAPP_SETUP.md` for the remaining setup and real integration tests.

### Browser and local HTTP verification

The development preview rendered correctly after fixing a global dark-mode input
contrast conflict. Browser interactions reached the code screen, name screen and
optional business-role choices. The preview was left open for review.

Local HTTP checks returned the expected results: WhatsApp without configuration
503; cross-origin authentication 403; anonymous `/api/me` 401; legacy client signup
410; protected sessions page 307 with its `returnTo` preserved. No live WhatsApp
messages, accounts, payments or production data were created by these checks.

## Deployment prerequisites

Configure `POSTGRES_URL`, `CRON_SECRET` and Cloudinary credentials in the target
environment. Apply the idempotent migration using `POST /api/init` with the
`x-cron-secret` header. Verify a preview against that environment's database before
production promotion. Do not use the development admin seed for production.
