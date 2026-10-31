# STYLD founder actions, final list

Date: 2026-10-30
Branch: `qoder/styld-beta-20261027`. Local HEAD `cb9d34b`; remote tip and deployed preview `683f8c3`.

This is the complete set of things that need a person with account access. Everything else in the beta
gate is code, tests and receipts and has been done. Work the items in the order given: the database
before the open URL, because an open preview that points at the production database is the one state
that can hurt a real customer.

Detail, exact variable names and the read-back that proves each item closed are in
`STYLD_FOUNDER_ACTIONS_MINIMAL.md` and `STYLD_HOSTED_BETA_ACTIVATION_PLAN.md`. This file adds nothing
new; it is the list to act from.

## 1. A preview database that is not the production one

Create a fresh, empty Neon database on a project that holds no real user data. Set it as
`POSTGRES_URL` **for branch `qoder/styld-beta-20261027` only** and leave the shared Production and
Preview entry alone. Then apply the numbered chain in full, `sql/migrations/001` through `016`, in
order, to that database only:

```
node --env-file=<source of the beta connection string> scripts/apply-migrations.mjs
```

The runner is idempotent, records each file in `schema_migrations` and prints no connection string. Do
not reuse a database because its name says QA: `014` refuses to run over rows with a null
`created_at` or `updated_at`, and `013` carries its own "do not apply without founder approval"
warning. No migration has been run by this agent against any hosted database.

Read-back: one line naming the database by name (not by value), then `GET /api/health/environment` with
the `x-health-check-token` header, which answers `current_database()`, `current_user`, the public table
names, the row count of `users` and the applied migration names from inside the running deployment.

## 2. Let the harness and the testers reach the preview

Vercel Deployment Protection answers every anonymous preview request with a `302` to its own login, so
no automated check and no invited tester can open the page. Pick one:

- Turn Standard Protection off for Preview deployments on project `sty-ld` only.
- Or create a Protection Bypass for Shareable Links secret and send it as `STYLD_PREVIEW_BYPASS`. The
  suite sends it as a header and records only that a bypass was sent, never the value.
- Or say the preview is for human eyes only. Then the hosted gate stays unpassed and every report says
  so instead of quoting a link nobody can open.

One condition whichever you pick: the origin testers are given and `BETTER_AUTH_URL` must be the same
string, because `lib/api-security.ts:6` answers 403 for a write whose origin does not match it. Use the
branch alias, `sty-ld-git-qoder-styld-beta-1691f2-dreeydesigns-3368s-projects.vercel.app`, because a
per-deployment hostname changes on every rebuild (the current tip has three of them in the deployment
record).

## 3. A sender that can actually deliver the code

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender) for this branch only, and name one
inbox that may receive OTP mail. The reported state is the key present and no sender address, which is
exactly the state where `lib/auth-readiness.ts:12` says the service is not configured and the OTP route
refuses instead of pretending to send. The harness reads the code from the named inbox; it never
guesses one.

Read-back: `GET /api/health/auth` with the health token answering `emailServiceConfigured: true`
(booleans only, no key), and a hosted receipt recording a session created through a real emailed code.

## 4. Prove the pending media folder is private, or leave uploads closed

In the Cloudinary account: make the pending folder or tag require signed or authenticated access and
confirm the plain public URL of one pending asset stops working. Then provide
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`CLOUDINARY_SIGN_KEY`, `STYLD_RESTRICTED_MEDIA_ENABLED=true` and exactly one
`STYLD_MEDIA_ALLOWED_ORIGINS` HTTPS origin, and set `STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED=true`
only once you have actually looked, because configuration alone does not prove the folder is private and
the upload gate asks for both.

Until you do that, uploads stay refused by the server, not by instruction: `app/api/upload/route.ts:38`
answers `503 Image uploads are not available in this environment yet.` before the rate limiter, the
request body and the provider. That is the intended state for round one and it is a stated limitation,
not a leak. Do not clear it with `STYLD_MEDIA_UPLOADS_UNRESTRICTED=true` for a tester-facing beta; that
switch declares the environment holds no private images, and this one will hold images of real people.

Read-back: a signed delivery response from the application for an asset that answers 401 or 404 without
the signature, and `GET /api/health/environment` reporting `uploadsAllowed: true` with
`uploadBasis: "restricted-delivery-attested"`.

## 5. The two policy dates

`app/terms/page.tsx:29` and `:31` render "Effective Date: [To be inserted by Styld]" and the matching
"Last Updated". `app/privacy/page.tsx:27` and `:29` already publish "Effective Date: 1 January 2025"
and "Last Updated: 12 October 2026", and both files first appear in this repository's history on
2026-07-20. Your requested effective date of 1 January 2020 is recorded and not published: neither 2020
nor 2025 is supported by a record in this branch, and a date that reads as a legal fact is the one place
where an invented value would be worse than a placeholder.

Say whether either policy was genuinely in effect on the date you asked for or on the date the privacy
page claims; give the terms its effective date and its real last-updated date; and say whether the
privacy page's 2025 stands, moves, or becomes the date that text was written.

## 6. The push, which is yours to authorise

`cc88599` (the upload refusal and the environment probe) and `cb9d34b` (the build-id reading fix) are
committed locally and not pushed, so the deployed preview still runs `yqwyYPWjOIB73R6FF_Irt` and does
not carry the probe you need for item 1's read-back. Nothing here pushes itself. Say the word and the
two commits go to `qoder/styld-beta-20261027`; no merge, no production deploy.

## What is not on this list

Nothing else is waiting on you. No purchase, no production migration, no production credential, no
public release, and no enablement of Shop, Delivery, live payments or booking commitments. Those stay
off behind `PAYMENTS_LIVE`, `BOOKING_COMMITMENTS` and the role gates, each with a test that keeps it
off. The browser receipts that described the older build were re-run on the current one on 2026-10-31,
so that gap is closed. What remains is work for hardware this workspace does not have: real-device
testing on iOS Safari and Kenyan handsets, and the 63 contrast cases axe could not decide (62 in the
day-before sweep). Both are
recorded as NOT RUN, and neither is a decision only you can make.
