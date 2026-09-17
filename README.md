# Styld

Next.js beauty marketplace deployed on Vercel. The Gradle and app/src files are
an Android prototype; the web application uses Next.js.

## Run locally

1. Install Node.js 20+ and run npm install.
2. Copy .env.example to .env.local and configure POSTGRES_URL and CRON_SECRET.
3. Run npm run dev.
4. Apply schema upgrades with POST /api/init and an x-cron-secret header matching
   CRON_SECRET. Use a development database locally.

Cloudinary uploads require NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
and CLOUDINARY_API_SECRET. Firebase settings accept NEXT_PUBLIC_FIREBASE_* overrides.
Adding SMS or payment credentials alone does not activate those workflows.

## Checks

- npm test
- npm run typecheck
- npm run build

Tests use controlled database substitutes. Live integration verification still
requires configured services. The primary sign-in/signup flow uses WhatsApp Verify;
see [WhatsApp setup](docs/WHATSAPP_SETUP.md). Existing password endpoints remain for
legacy access. New accounts require verified WhatsApp access.

Preview the new screens locally at `/auth/preview`. This development-only UI demo
does not send messages or create accounts. The real flow remains unavailable until
its provider and database are configured.

See [the source map](docs/STYLD_SOURCE_MAP.md) for decisions reconciling historical
Mobile Salon documentation with current Styld requirements.

See [INTEGRATION_AUDIT.md](INTEGRATION_AUDIT.md) for implemented fixes, external
blockers and unfinished workflows. Older setup summaries are not completion evidence.
