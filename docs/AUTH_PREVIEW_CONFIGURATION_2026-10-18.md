# Preview authentication configuration repair, 18 October 2026

## Verified cause

The screenshot at sty-7r9zarf2s-dreeydesigns-3368s-projects.vercel.app shows the explicit AUTH_NOT_CONFIGURED guard from app/api/auth/[...all]/route.ts. lib/auth-readiness.ts requires an auth secret, base URL and database URL. The UI branch had no BETTER_AUTH_SECRET or BETTER_AUTH_URL. It also inherited shared database settings and had no RESEND_FROM_EMAIL.

This failure required environment setup rather than bypassing authentication or changing the sign-in form.

## Approved QA initialization

The founder explicitly approved initialization of this isolated QA database only through the in-chat approval question.

- Neon project: styld-qa-auth-isolated, falling-band-35175280.
- Branch: br-bold-hall-b7piakwv, named main within this isolated QA project.
- Database: styld_qa, owner styld_qa_owner.
- Initial read-only inspection: zero public tables. The provider's generic neondb default did not exist; the database inventory established the actual name.
- Plan: docs/QA_AUTH_BOOTSTRAP_REVIEW.sql. It assembles existing baseline 001, booking schema 003, auth migration 010, generated Better Auth tables and workspace migration 011.
- The plan was validated against embedded PGlite before remote application: 28 tables and zero users.
- A guard requires the exact QA database name and an empty public schema. The first remote attempt rejected multiple commands in a prepared statement and left zero tables. The reviewed plan was then split into 64 statements, retaining the guard, and applied in one transaction.
- Post-application verification: 28 tables, zero users, zero auth sessions and zero workspaces. No historic identities, bookings or production data were copied or changed.

The review SQL is an empty-QA bootstrap artifact, not a new production migration. Its guard deliberately refuses to run again on this initialized schema.

## Branch-only environment configuration

Vercel project sty-ld, team team_n7crISHJfdhYS6PsnRoIwGcn. Every change targets Preview and git branch design/openai-styld-ui-v1 only.

| Name | Configuration |
|---|---|
| POSTGRES_URL | Sensitive, isolated QA pooled connection |
| POSTGRES_PRISMA_URL | Sensitive, isolated QA pooled connection |
| POSTGRES_URL_NON_POOLING | Sensitive, isolated QA direct connection |
| BETTER_AUTH_SECRET | New cryptographically generated QA-only secret, stored as Sensitive |
| BETTER_AUTH_URL | Exact stable branch preview origin below |
| RESEND_API_URL | https://api.resend.com/emails |
| GOOGLE_AUTH_VERIFIED | false |

No secret values are included in this report or source. Existing RESEND_API_KEY is marked Sensitive and could not be read back through Vercel; its validity and delivery remain unverified. RESEND_FROM_EMAIL is still absent, pending the founder's verified sender address. No sender was guessed.

## Preview and evidence

Stable branch origin:
https://sty-ld-git-design-openai-sty-51dcac-dreeydesigns-3368s-projects.vercel.app

Use the stable branch origin for testing so browser requests match BETTER_AUTH_URL. The old immutable screenshot URL retains its old configuration.

Redeployed application source: 91bd9c5718856a07d7449ae32d97d201b1980058. Deployment dpl_J11pgtjCioRtciVHkGj5ZReJSS92 reached READY with the Preview target (the Vercel API calls this staging).

Read-only checks through the authenticated Vercel fetch connector:

- GET /api/auth/get-session: 200, null for a guest. Better Auth now initializes.
- GET /api/auth/options: 200, email method present and Google/phone disabled. This method listing does not prove email delivery configuration.
- GET /api/me: the connector reports 401 as an authentication boundary and does not expose the application response, so this check is inconclusive.
- Checked runtime logs contain no default-secret or schema-validation error. A node-postgres SSL compatibility notice remains. This is not a complete runtime acceptance test.

## Still required

1. Supply a verified Resend sender address, then set branch-scoped RESEND_FROM_EMAIL.
2. Rebuild the preview after that setting changes.
3. With the sender verified, exercise a real OTP send and successful verification in the QA environment, including refresh, logout and returning-user identity checks. Actual delivery and authenticated browser acceptance are not yet passed.

No real OTP email was sent during this repair. No paid service, production deployment, production migration or public admin account was created. Production configuration and Clerk settings were untouched.

## Rollback

The environment changes are branch-specific overrides. If rollback is needed, restore this branch's prior deployment and review the listed overrides individually; do not remove or alter shared Production variables. The QA database is isolated and newly initialized, so preserve it for inspection instead of deleting it automatically. New deployments use the currently saved environment configuration.
