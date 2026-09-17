# STYLD — Environment Variable Matrix

This matrix governs all environment configuration across Local Development, Preview (Vercel), and Production deployments.

---

## Variable Reference Table

| Variable Name | Scope | Required | Environments | Service | Purpose | Rotation & Security Policy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POSTGRES_URL` | Server | **Yes** | Dev, Preview, Prod | Neon / Vercel | Primary PostgreSQL database connection string | Rotate via Neon/Vercel dashboard if exposed. Never commit or log. |
| `TWILIO_ACCOUNT_SID` | Server | **Yes** | Dev, Preview, Prod | Twilio | Twilio Account SID (`AC...`) | Public identifier within Twilio account. |
| `TWILIO_API_KEY_SID` | Server | **Yes** | Dev, Preview, Prod | Twilio | Twilio API Key identifier (`SK...`) | Paired with API Secret. Rotate in Twilio Console. |
| `TWILIO_API_KEY_SECRET` | Server | **Yes** | Dev, Preview, Prod | Twilio | Twilio API Key Secret | Sensitive secret. Rotate immediately upon exposure. |
| `TWILIO_VERIFY_SERVICE_SID`| Server | Prod | Preview, Prod | Twilio | Twilio Verify Service SID (`VA...`) | Service identifier for WhatsApp OTP. Required for live auth. |
| `WHATSAPP_AUTH_ENABLED` | Server | Optional | Dev, Preview, Prod | Styld | Toggle for live WhatsApp OTP (`true` or `false`) | Set `false` during local and CI testing to prevent carrier charges. |
| `WHATSAPP_DEV_MODE` | Server | Optional | Dev, Preview | Styld | Mock OTP sandbox mode (`true` or `false`) | Code `123456` or `000000` is accepted for rapid testing. |
| `CRON_SECRET` | Server | **Yes** | Preview, Prod | Vercel / Cron | Secret protecting `/api/init` and background sync jobs | Random 32+ character string. Required in `x-cron-secret` header. |
| `CLOUDINARY_URL` | Server | Optional | Dev, Preview, Prod | Cloudinary | Cloudinary API access for media transforms | Server-only. Do not expose API Secret to client. |
| `NEXT_PUBLIC_APP_URL` | Client | Optional | Dev, Preview, Prod | Next.js | Public origin URL (e.g. `https://sty-ld.vercel.app`) | Safe for browser consumption. Used for canonical URLs. |

---

## Environment Separation

- **Development (`.env.local`)**:
  - `WHATSAPP_AUTH_ENABLED=false`
  - `WHATSAPP_DEV_MODE=true`
  - Uses local or dev Neon database branch.
- **Preview (Vercel Pull Requests)**:
  - Sandboxed testing environment.
  - Mock WhatsApp verification enabled for automated E2E testing without incurring Twilio charges.
- **Production (`sty-ld.vercel.app` / domain)**:
  - `WHATSAPP_AUTH_ENABLED=true`
  - `WHATSAPP_DEV_MODE=false`
  - Valid `TWILIO_VERIFY_SERVICE_SID` (`VA...`) and rotated API credentials required.
