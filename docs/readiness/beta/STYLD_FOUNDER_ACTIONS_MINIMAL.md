# STYLD founder actions, minimal set

Date: 2026-10-30 (first written 2026-10-29, refreshed against the platform record and the reported
Vercel environment)
Branch: `qoder/styld-beta-20261027`
Application commit under test: see `STYLD_FINAL_4_PILLAR_CLOSEOUT.md`, which names the exact SHA this
file was written against.
Full plan, with the environment matrix and the migration order:
`STYLD_HOSTED_BETA_ACTIVATION_PLAN.md`. Longer history of each item: `FOUNDER_ACTIONS.md`.

Five items need a person with account access. Four are credentials or account settings that this
agent has no right to change. The fifth is a date only you can set. Everything else in the beta gate
is code, tests and receipts, and those are recorded in the department ledger.

**Work them in this order: 2, then 1, then 3.** The reason is one reported fact: a `POSTGRES_URL`
entry targets both Production and Preview and no override is named for this branch, so opening the
preview before the database is isolated removes the only wall in front of a real customer database.
Item 4 is contained by a server-side refusal and item 5 by dates that are a placeholder or an
unverified claim, so both can wait.

Each item below says what is blocked, the smallest action that unblocks it, and the evidence that
will exist once it is done. Nothing here touches production, enables payments, or turns on booking
commitments.

## 1. Let the test harness reach the preview deployment (after item 2)

**Blocked:** every hosted check. Vercel Deployment Protection answers an anonymous request to a
preview URL with a 302 to `https://vercel.com/sso-api?...`, so no automated browser can load a page,
let alone sign in. The build itself is fine: Vercel reports `success` for these deployments, and both
the branch alias and a preview of the current tip answer that same 302 today.

**Smallest action, pick one:**

- Vercel, project `sty-ld`, Settings, Deployment Protection: turn Standard Protection off for
  Preview deployments only. About two minutes, scoped to previews.
- Or create a Protection Bypass for Shareable Links secret and send it in chat as
  `STYLD_PREVIEW_BYPASS`. The hosted suite sends it as `x-vercel-protection-bypass` and records only
  that a bypass was sent, never the value.
- Or say the preview is for human eyes only. Then the hosted gate stays unpassed and this report
  says so, instead of quoting a link that cannot be opened.

**What it unblocks:** `node tests/browser/live-hosted-acceptance.cjs` against the deployed URL, which
checks health, the landing page, Discover, sign-in, Plan, Compare, Saved, moderation and the media
refusal on the real deployment.

**One condition on whichever option you pick:** the origin testers are given and `BETTER_AUTH_URL`
must be the same string, because `lib/api-security.ts:5` compares every write's origin against that
variable and answers 403 when it does not match. A per-deployment hostname changes on every rebuild
(the current tip has three preview URLs in the deployment record), so testers get the branch alias and
`BETTER_AUTH_URL` gets the branch alias too.

**Evidence once done:** `docs/readiness/beta/live-hosted-acceptance-preview-<date>.json`, with the
deployed revision in it.

## 2. A preview database that is not production (do this first)

**Blocked:** a hosted sign-in that reads and writes real rows, and the safety of everything the
current shared database holds. Without a database the preview can render public pages and nothing
else; with the wrong database the first test account is a real account. The inspection of
2026-10-30 reports one `POSTGRES_URL` entry targeting both Production and Preview and no override
named for `qoder/styld-beta-20261027`, which is why this item is now first.

**Smallest action:** create a fresh, empty Neon database on a project that holds no real user data,
set it as `POSTGRES_URL` for this branch only (leave the shared Production and Preview entry alone),
and apply the numbered chain in `sql/migrations/` in full, `001` through `016`. `001` is the base
schema the journeys need; `002` to `013` add trust and safety, reviews, analytics, the auth tables,
workspaces, social posts and the four Better Auth tables; `014` hardens `users`, `015` creates
`media_manifests`, `016` creates `discussion_requests`. The runner is
`node --env-file=<source of the beta connection string> scripts/apply-migrations.mjs`: it is
idempotent, records each file in `schema_migrations`, and prints no connection string.

Do not reuse a database because its name says QA. `014` refuses to run over rows with a null
`created_at` or `updated_at`, and `013` carries its own "do not apply without founder approval"
warning. None of the sixteen files has been applied by this agent to any hosted database.

**Evidence once done:** one line naming the database by name (not by value), the runner's `APPLY`
lines, `SELECT name FROM schema_migrations ORDER BY name;` returning sixteen rows, and the answer
from inside the running deployment: `GET /api/health/environment` with the `x-health-check-token`
header, which reports `current_database()`, `current_user`, the public table names, the row count of
`users` and the applied migration names, and nothing else about the connection. That route is new
with this work, reads only, and is the only proof here of what the process resolved to rather than
what the screen was set to.

## 3. A real email sender for the preview

**Blocked:** hosted sign-in. Authentication is a Better Auth email one-time code. The loopback
harness runs its own mail capture, so a deployed journey needs a sender that actually delivers.

**Smallest action:** set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender) for this branch
only, and tell me one inbox I may use to receive the code. The harness reads the code from that inbox;
it never guesses one. The 2026-10-30 inspection reports the key present and no sender address, which
is exactly the state where `lib/auth-readiness.ts:12` says the service is not configured and the OTP
route refuses instead of pretending to send.

**Evidence once done:** the hosted receipt recording a session created through a real emailed code,
and `GET /api/health/auth` with the health token answering `emailServiceConfigured: true` (booleans
only, no key).

## 4. Provider-side restriction for pending media

**Blocked:** the claim that pending (unmoderated) media is protected by the storage provider as well
as by STYLD. The application refuses to serve a pending asset, which is the safe answer, and since
2026-10-30 it also refuses to accept one, so the gap that remained (files uploaded before the delivery
gate are public `image/upload` URLs) can no longer be widened by anything a tester does.

**Smallest action, in Cloudinary:**

- Make the pending folder or tag require signed or authenticated access, and confirm the plain public
  URL of one pending asset stops working.
- Provide `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_SIGN_KEY`, `STYLD_RESTRICTED_MEDIA_ENABLED=true` and one `STYLD_MEDIA_ALLOWED_ORIGINS`
  HTTPS origin.
- Set `STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED=true` once you have actually looked, because
  configuration alone does not prove the folder is private and the upload gate asks for both.
- Then the verification record can be written for assets you have checked, and
  `provider_restriction_verified` can be set for those assets only.

**Evidence once done:** a signed delivery response from the application for an asset that answers
401 or 404 without the signature, and `GET /api/health/environment` reporting
`uploadsAllowed: true` with `uploadBasis: "restricted-delivery-attested"`.

The accepting side is enforced rather than requested. `app/api/upload/route.ts:38` consults
`resolvePendingUploadPolicy` before the rate limiter, the request body and the provider, so while both
switches stay off every upload attempt answers `503 Image uploads are not available in this
environment yet.` and no image reaches Cloudinary, whoever tries it
(`tests/media-upload-gate.cjs`). Round one therefore has no image upload at all, which is a stated
limitation rather than a leak. Do not clear that refusal with `STYLD_MEDIA_UPLOADS_UNRESTRICTED=true`
for a tester-facing beta: that switch declares the environment holds no private images, and this one
will hold images belonging to real people.

## 5. The terms and privacy effective date

**Blocked:** a placeholder on one public page and a published date on the other that no record in this
branch supports. `app/terms/page.tsx:29` and `:31` render "Effective Date: [To be inserted by Styld]"
and "Last Updated: [To be inserted by Styld]". `app/privacy/page.tsx:27` and `:29` already render
"Effective Date: 1 January 2025" and "Last Updated: 12 October 2026", and both files first appear in
this repository's history on 2026-07-20. You asked for an effective date of 1 January 2020; it is
recorded as a request and not published, because neither 2020 nor 2025 can be supported by this branch
alone.

**Smallest action:** say whether either policy was genuinely in effect on the date you requested or on
the date the privacy page claims, give the terms its effective date and its real last-updated date,
and say whether the privacy page's 2025 stands, moves, or becomes the date that text was written.
"Last Updated" stays separate and accurate either way.

**Evidence once done:** the two strings replaced with dates that have a record behind them, and the
first-render receipt re-run.

## Optional, not required for the beta

- `better-auth` is pinned to `1.7.14`, which is past the three advisories that named this tree. No
  action left.
- A Lighthouse score was never quoted in this work, so there is no score target to accept or reject.
  Ready time, LCP, CLS and bundle bytes are in `STYLD_DESIGN_REFINEMENT_RECEIPTS.md`.

## What is not being asked for

No production migration, no production credential, no purchase, no public release, and no enablement
of Shop, Delivery, live payments or booking commitments. Those stay off behind `PAYMENTS_LIVE`,
`BOOKING_COMMITMENTS` and the role gates, and the tests that hold them off are in the ledger.

## Until items 1 to 3 are done

Market testing must not begin with invited testers on real devices. The application is deployable and
its gates pass on a production build against a real database on this machine, but no tester can sign
in on the deployed revision until it has a database, a sender and a reachable URL. Saying otherwise
would be the one thing this work has refused to do throughout.
