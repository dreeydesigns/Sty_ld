# STYLD — External Services Integration Inventory

This document serves as the authoritative inventory for all third-party external services and integrations across the STYLD platform for the **Nairobi Beta** release.

> [!SECURITY]
> **Zero Credential Exposure Rule**: This document documents environment variable names, connection states, and architectural roles only. Actual API secrets, private keys, access tokens, and passwords must never be recorded here.

---

## Service Inventory Matrix

| Service | Product Purpose | Environment Variables | Configured | Code Connected | External Setup Required | Health Check Endpoint | Feature Dependency | Production Ready |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **Neon PostgreSQL** | Authoritative database for users, roles, bookings, payments, reviews, and platform data | `POSTGRES_URL`<br>`POSTGRES_PRISMA_URL`<br>`POSTGRES_URL_NON_POOLING` | ✅ Yes | ✅ Yes (`@vercel/postgres`) | Neon pooled DB cluster | `GET /api/health`<br>`GET /api/admin/integrations` | Core platform | **READY** |
| **Clerk** | Authoritative identity, sessions, and MFA provider (Google OAuth, Email OTP, WebAuthn Passkeys) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`<br>`CLERK_SECRET_KEY`<br>`NEXT_PUBLIC_CLERK_SIGN_IN_URL`<br>`NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ Yes | ✅ Yes (`@clerk/nextjs`, `clerkMiddleware`) | Clerk dashboard OAuth providers & JWKS | `GET /api/admin/integrations` | Core authentication | **READY** |
| **Cloudinary** | Secure media storage, image optimization, and portfolio uploads | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`<br>`CLOUDINARY_API_KEY`<br>`CLOUDINARY_API_SECRET` | ✅ Yes | ✅ Yes (`cloudinary` v2, user-scoped folder) | Cloudinary cloud account & upload preset | `GET /api/admin/integrations` | Portfolio, profile images | **READY** |
| **Resend** | Transactional email delivery for support/contact submissions and customer notifications | `RESEND_API_KEY`<br>`RESEND_FROM_EMAIL`<br>`RESEND_API_URL` | ✅ Yes | ✅ Yes (`lib/email-provider.ts`) | Verified sending domain (or sandbox `resend.dev`) | `GET /api/admin/integrations` | Contact form, notifications | **READY** |
| **Africa's Talking** | Direct regional SMS verification and transactional dispatch for Kenyan carriers | `AFRICASTALKING_USERNAME`<br>`AFRICASTALKING_API_KEY`<br>`AFRICASTALKING_SENDER_ID` | ✅ Yes | ✅ Yes (`lib/sms.ts`, `lib/otp-provider.ts`) | Africa's Talking balance & carrier sender ID | `GET /api/admin/integrations` | Fallback SMS delivery | **READY (Sandbox/Live)** |
| **Twilio Verify** | WhatsApp OTP channel verification (optional/secondary) | `TWILIO_ACCOUNT_SID`<br>`TWILIO_API_KEY_SID`<br>`TWILIO_API_KEY_SECRET`<br>`TWILIO_VERIFY_SERVICE_SID`<br>`WHATSAPP_AUTH_ENABLED` | ⚠️ Incomplete | ✅ Yes (`lib/otp-provider.ts`) | Twilio Verify Service SID (`VA...`) & WhatsApp sender | `GET /api/auth/whatsapp` | Secondary phone auth | **DISABLED (Optional)** |
| **M-Pesa Daraja** | Kenyan mobile payments (STK Push) | `MPESA_ENV`<br>`MPESA_CONSUMER_KEY`<br>`MPESA_CONSUMER_SECRET`<br>`MPESA_SHORTCODE`<br>`MPESA_PASSKEY`<br>`MPESA_CALLBACK_URL` | ⚠️ Incomplete | ✅ Yes (`lib/payment-provider.ts`) | Safaricom Developer Portal shortcode & passkey | `GET /api/admin/integrations` | Booking checkout | **SANDBOX ONLY** |
| **Stripe** | International card payments | `STRIPE_API_PUBLISHABLE_KEY`<br>`STRIPE_API_SECRET_KEY`<br>`ENABLE_STRIPE_PAYMENTS` | ⚠️ Keys only | ✅ Interface ready (`lib/payment-provider.ts`) | Stripe live account activation | `GET /api/admin/integrations` | International payments | **DISABLED (Gated)** |
| **Firebase** | Web Push Notifications via Firebase Cloud Messaging (FCM) | `NEXT_PUBLIC_FIREBASE_API_KEY`<br>`NEXT_PUBLIC_FIREBASE_PROJECT_ID`<br>`NEXT_PUBLIC_FIREBASE_APP_ID`<br>`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ Configured | ⚠️ Scoped | FCM VAPID web push key generation | `GET /api/admin/integrations` | Push notifications | **GATED (FCM Only)** |
| **Cron Jobs** | Authorized server maintenance triggers (e.g., account deletion, cleanup) | `CRON_SECRET` | ✅ Yes | ✅ Yes (Bearer / Header check) | Vercel Cron or external scheduler | `POST /api/init` (restricted) | Scheduled maintenance | **READY** |
| **Google reCAPTCHA** | Legacy bot protection | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ⚠️ Key only | ❌ Unneeded | None (superseded by Clerk bot protection & server rate limits) | — | None | **RETIRED** |

---

## Architectural Boundaries

### 1. Identity Authority
- **Authority**: Clerk is the sole identity authority. All user sessions are authenticated via Clerk tokens or the temporary legacy session bridge.
- **Data Boundary**: User identity is mapped to the canonical `users` record in PostgreSQL via `clerk_user_id`. Application permissions, marketplace roles (`client`, `professional`, `salon`), and business logic reside strictly in PostgreSQL.

### 2. Media Authority
- **Authority**: Cloudinary handles media asset storage and transformations.
- **Upload Boundary**: `app/api/upload/route.ts` requires a verified canonical Styld user session via `resolveCurrentStyldUser()`. Uploads are isolated to `styld/{user_id}` folders with MIME type verification and rate limiting.

### 3. Communications Authority
- **Email**: Resend delivers transactional emails.
- **SMS**: Africa's Talking handles regional Kenya SMS dispatch. Phone numbers and message bodies are never written to production application logs.

### 4. Payments Authority
- **Kenya Mobile Money**: M-Pesa Daraja STK Push v1 (`lib/payment-provider.ts`). Runs in Sandbox mode until explicit production sign-off.
- **Card Payments**: Stripe interface is prepared but feature-gated OFF for the initial Nairobi Beta.
