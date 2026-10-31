# STYLD hosted beta activation plan

Written 2026-10-30 on branch `qoder/styld-beta-20261027`. The four-pillar closeout in
`docs/readiness/beta/STYLD_FINAL_4_PILLAR_CLOSEOUT.md` stands as the local evidence record. This
document is the plan that turns it into a hosted beta, and it states plainly which facts came from
reading this repository and which came from someone else looking at the Vercel project.

## The rule this plan is written under

No hosted database write, no change to Deployment Protection, and no tester admitted until this
branch is proved to resolve to a database that is not the production one. Verification first, then
the action. A name that contains QA, a preview that reports READY and a build that passes locally
are none of them that proof.

## A. Effective environment matrix

Two kinds of fact are kept apart on purpose. **From source** means a file in this repository reads
the variable at the line given; it says nothing about whether the variable is set anywhere.
**Reported** means the account owner's inspection of the connected Vercel project `sty-ld`, which
this agent has no credential to re-check. Nothing here records a value.

| Variable | Read at | What it decides | Needed for round one | From source | Reported state |
| --- | --- | --- | --- | --- | --- |
| `POSTGRES_URL` | `lib/auth-database.ts:7` | every runtime query, sessions, plans, saves, requests | yes | first choice of the shared pool | one entry targets both Production and Preview; no entry named for `qoder/styld-beta-20261027` |
| `POSTGRES_PRISMA_URL` | `scripts/apply-migrations.mjs:23`, `lib/migrations.ts` | the migration runner only | no, if `POSTGRES_URL` is set | accepted as an alternative | older branch overrides exist for other branches |
| `DATABASE_URL` | `lib/auth-database.ts:7`, `lib/auth-readiness.ts:6` | fallback when `POSTGRES_URL` is absent | no | second choice | not reported |
| `BETTER_AUTH_SECRET` | `lib/better-auth.ts:13`, `lib/security-events.ts:5`, `lib/totp.ts:126` | session signing, security event keys, the MFA master key | yes | required | branch-scoped to an older design branch |
| `BETTER_AUTH_URL` | `lib/better-auth.ts:12`, `lib/api-security.ts:5` | the canonical origin, and the origin every same-origin write is checked against | yes | required, must equal the tester URL exactly | branch-scoped to an older design branch |
| `RESEND_API_KEY` | `lib/email-provider.ts:37`, `lib/auth-readiness.ts:12` | whether a real email can be sent | yes | required | configured |
| `RESEND_FROM_EMAIL` | `lib/email-provider.ts:47`, `lib/auth-readiness.ts:12` | the visible sender address of the OTP mail | yes | required, and the address must be a verified sender | not found |
| `EMAIL_PROVIDER` | `lib/email-provider.ts:139`, `lib/auth-readiness.ts:8` | which transport is used; anything other than `resend` or `gmail` disables email | yes, leave unset or `resend` | read | not reported |
| `HEALTH_CHECK_TOKEN` | `app/api/health/auth/route.ts:12`, `app/api/health/environment/route.ts:24` | unlocks the presence readout and the identity probe; unset means both answer 404 | yes, to verify the rest of this table from the deployment | read | not reported |
| `MFA_SECRET_KEY` | `lib/totp.ts:126` | alternative MFA master key, falls back to `BETTER_AUTH_SECRET` | optional | read | not reported |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `app/api/upload/route.ts:13-16`, `:46`, `lib/media-delivery-config.cjs:43-45` | whether an upload could reach the provider at all | no, uploads are refused this round | read | not reported |
| `CLOUDINARY_SIGN_KEY`, `STYLD_RESTRICTED_MEDIA_ENABLED`, `STYLD_MEDIA_ALLOWED_ORIGINS`, `STYLD_MEDIA_MAX_BYTES`, `STYLD_MEDIA_TIMEOUT_MS`, `STYLD_MEDIA_ACCESS_WINDOW_SECONDS` | `lib/media-delivery-config.cjs:41-62` | whether restricted pending-media delivery is configured; all six must be right or the feature reports not configured | no | read | not reported |
| `STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED`, `STYLD_MEDIA_UPLOADS_UNRESTRICTED` | `lib/media-delivery-config.cjs:80-95` | the only two ways an upload is accepted (see section E) | no, both stay off | read (added this round) | not set |
| `AUTH_TEST_MODE`, `AUTH_OTP_PROVIDER`, `PHONE_OTP_PROVIDER` | `lib/otp-provider.ts:81-102` | a test OTP path that prints codes instead of sending them | must stay absent | read: `lib/otp-provider.ts:82` returns false whenever `NODE_ENV` is `production`, which is what a Vercel preview runs | not reported |
| `VERCEL_ENV` | `next.config.mjs:17` | any non-production Vercel run answers `X-Robots-Tag: noindex, nofollow` on every route | yes, automatic | read | platform default |

The application also reads variables for paths this beta does not use: Google OAuth, Twilio Verify,
Africa's Talking, M-Pesa, Stripe, Firebase and WhatsApp. None is required for the supported
journeys and none should be set for the beta. Setting a partial value for one of them changes
behaviour, so the isolation branch should carry exactly the variables marked yes above.

Feature gates are not environment variables. `lib/feature-flags.ts:14` freezes `SHOP: false`,
`DELIVERY: false`, `PAYMENTS_LIVE: false`, `BOOKING_COMMITMENTS: false`, and `COUNTER` has no
consumer anywhere in `app/`, `components/` or `lib/`, so it is a dead label rather than a switch.

## B. Which database, and why a new one

The reported configuration leaves one fact unresolved: with a `POSTGRES_URL` targeting both
Production and Preview and no override named for this branch, the preview deployment resolves to
the shared value. A preview that resolves to the shared value is a preview that writes real
customer rows on the first tester who signs up. That is the outcome the plan exists to prevent.

Recommendation: create a fresh, empty, dedicated Neon database for the private beta and give it to
the branch through a branch-scoped Vercel variable. The reasons, in order of weight:

1. The existing candidates cannot be proved empty without writing to them, and reading a
   production-shaped database to check is already a contact with it.
2. Migration `014_users_integrity_guards.sql` is deliberately hostile to dirty data. It sets
   `users.email NOT NULL`, adds a CHECK that an email is not blank, and raises an error with the
   hint "Recover the timestamp from a trusted record or accept a documented unknown" if any row has
   a null `created_at` or `updated_at`. On an empty database it is a no-op guard. On a reused one it
   is a migration that stops, mid-flight, against rows this project did not create.
3. Migration `013_better_auth_qa_schema.sql` carries its own warning: "Do not apply to a production
   database without a separate founder approval."
4. A beta whose data can be deleted without ceremony is a beta that can be tested honestly. Testers
   will create accounts, posts and requests that must not be mistaken for real business.

Do not reuse a database because its name contains QA. If an existing disposable Neon branch is
preferred instead, the burden of proof is the same and no lower: the branch name, the database name,
`current_database()` and `current_user` reported by that endpoint, a row count of `users` of zero,
and one sentence saying no real customer data was copied into it.

Nothing in this plan reads, writes, migrates or deletes any database the agent cannot see. The
`AGENTS.md` rule stands: schema changes live in numbered files under `sql/migrations/` and are
applied to the isolated test database by the founder.

## C. How the beta database is initialised

The runner is `scripts/apply-migrations.mjs`. It creates `schema_migrations (name, applied_at)` if
absent, reads the applied set, then applies every `sql/migrations/*.sql` in filename sort order,
recording each one, and it is idempotent: an applied file is skipped, not re-run. It prints only the
first line of a PostgreSQL error and never a connection string.

Order is the filename order and the dependency chain backs it: `001_initial_schema.sql` creates
`users`, `sessions`, `services`, `bookings`, `posts`, `comments`, `follows`, `stories`,
`user_settings`, `contact_messages`, `user_roles`, `admin_account_config`, `auth_rate_limits` and `whatsapp_auth_challenges` with seven
indexes. `002` to `013` add trust and safety, reviews, analytics, the multi-method auth tables, the
passwordless security tables, `identity_workspaces`, `social_posts` and the four Better Auth tables.
`014` hardens `users`, `015` creates `media_manifests`, `016` creates `discussion_requests`. The
three loose files at the top of `sql/` (`add-user-roles.sql`, `create-auth-tables.sql`,
`passwordless-generated.sql`) are legacy: everything they create is already inside the numbered
chain, so they are not part of the initialisation and should not be run.

Steps, in this order, each one an action the founder takes or expressly authorises:

1. Create the database, empty, in a Neon project that is not the production one. Record its branch
   name and database name here when done.
2. Set `POSTGRES_URL` in Vercel as a branch-scoped secret for `qoder/styld-beta-20261027` only.
   `pg` accepts a pooled or a direct URL, so use the pooled endpoint; the `invalid_connection_string`
   restriction belongs to `@vercel/postgres`, which no live route uses.
3. Confirm precedence in the Vercel environment screen: the branch variable wins over the
   Production and Preview entry, and no older branch override matches this branch name.
4. Read the identity back before writing. `SELECT current_database(), current_user,
   host(inet_server_addr()), inet_server_port(), count(*) FROM users;` on the new database answers
   the beta database name, the beta role and zero users. Run it against the connection string
   itself, not against a guess.
5. Apply the chain: `node --env-file=<the beta connection source> scripts/apply-migrations.mjs`,
   which should print `APPLY 001_initial_schema.sql` through `APPLY 016_discussion_requests.sql`.
6. Verify with `SELECT name FROM schema_migrations ORDER BY name;` returning sixteen rows, and with
   the constraint checks that matter to the journeys: `users.email` is NOT NULL, `media_manifests`
   and `discussion_requests` exist, `auth_rate_limits` exists because the upload and auth routes
   need it.
7. Redeploy the preview so the process picks up the branch variable, then prove the running
   deployment is on that database and not the shared one, using section D.

Rollback for the beta is the whole database: delete the Neon branch, or restore it to the snapshot
taken before step 5. No production migration is ever rolled back from this plan.

## D. Reading the effective configuration back from the deployment

Two routes already answer presence without values.

`GET /api/health` answers `{ ok: true, service: "styld-api", timestamp }` with `no-store`, and is
the cheapest proof that a request reached the application instead of Vercel's edge.

`GET /api/health/auth` answers only to the `x-health-check-token` header, compares it in constant
time, and returns 404 to anybody else, including when `HEALTH_CHECK_TOKEN` is unset. Its payload is
`lib/email-diagnostics.ts`: booleans for `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` and one boolean for "some database URL
is present", plus `emailServiceConfigured` computed the same way the provider computes it. This is
how the reported matrix becomes a verified matrix, and it is the reason `HEALTH_CHECK_TOKEN` should
be set as a branch secret. The comparison is one shared rule now, `lib/health-token.cjs`, used by
both readouts, so a second probe cannot drift from the first.

`GET /api/health/environment`, added with this plan, answers the two questions the presence readout
cannot: which database the process actually reached, and what the media gate says. It is behind the
same token, is `force-dynamic`, and runs four SELECTs through the shared pool:
`SELECT current_database(), current_user, inet_server_port(), host(inet_server_addr())`, the public
base-table names, `count(*)` of `users` when that table exists, and the applied names in
`schema_migrations`. Alongside them it reports `resolveMediaDeliveryConfig` and
`resolvePendingUploadPolicy` answers (configured or not, the one delivery origin, the window, whether
uploads are accepted and on what basis). It reports no connection string, no configured host and no
credential: `tests/hosted-environment-probe.cjs` asserts that with canaries in the environment and in
the driver's error text, and asserts that a wrong token, an empty token and an unset
`HEALTH_CHECK_TOKEN` all answer 404 without the pool being asked anything. A database that refuses to
answer is reported as `503 The environment probe is unavailable.` with no driver message, because a
PostgreSQL error repeats the connection target back.

That route is what converts step 4 of section C from "trust the person who typed it" into a reading
taken from the running deployment.

## E. Media: uploads are refused by the server this round

The instruction was not to rely on telling testers not to upload. The enforcement is in code now.

`lib/media-delivery-config.cjs:87` `resolvePendingUploadPolicy(env)` answers `allowUploads: false`
with reason `restricted-delivery-not-attested` unless one of two explicit acts is present:
`STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED=true` together with a restricted delivery configuration
that fully resolves, or `STYLD_MEDIA_UPLOADS_UNRESTRICTED=true` declaring that the environment holds
no private images at all. Absent, blank, misspelled and `false` all refuse. The configuration half is
`resolveMediaDeliveryConfig`, which needs the cloud name, the API key and secret, the signing key,
exactly one bare HTTPS delivery origin, and bounds within 5 MiB, 5000ms and 300s.

`app/api/upload/route.ts:38` consults that policy after the sign-in check and before everything else.
`tests/media-upload-gate.cjs` proves by counting what the route touched that a refusal costs no rate
limiter write, no request body parse and no provider call, that a signed-out caller is still answered
401 first, that a partially configured restricted delivery still refuses, that both accepted bases
let an upload through and still charge the rate limiter, and that neither the refusal nor the success
body contains a credential. `.env.example` documents the two switches with the fail-closed values.

What this does not do: it does not make uploads work. The route still returns the provider's public
URL and writes no `media_manifests` row, so the restricted proxy at
`app/api/media/pending/[assetId]/route.ts` has nothing to sign, and `provider_restriction_verified`
is a column the account owner must set true after checking Cloudinary's own folder settings. Until
that is proved, the honest statement is: the beta accepts no images, and image upload is not
delivered, not restricted. Any market-test write-up that shows a Look, a profile image or a post with
a photo is describing a feature that is switched off at the server.

## F. Real sign-in on the hosted preview

Email is the supported method, and the code path is honest about being unconfigured: with
`RESEND_FROM_EMAIL` missing, `emailConfigurationReady` (`lib/auth-readiness.ts:7`) is false, so the
OTP route says the email service is not configured instead of pretending to send. Three things are
needed, and the second is not a variable:

1. `RESEND_API_KEY` (reported configured) plus `RESEND_FROM_EMAIL` set to a sender that has passed
   Resend's verification, scoped to this branch.
2. A test inbox that may receive the mail. Resend's testing mode only delivers to a verified
   address, so the first hosted sign-in must use an inbox the founder controls and can read.
3. `BETTER_AUTH_URL` exactly equal to the origin testers type. `lib/api-security.ts:5` compares an
   incoming write's origin against it, so a mismatch between the alias and the variable turns every
   POST into a 403. If testers use the branch alias, that alias is the value.

`AUTH_TEST_MODE`, `AUTH_OTP_PROVIDER=test` and `PHONE_OTP_PROVIDER=test` stay unset. They cannot
open a test path in a preview anyway because `lib/otp-provider.ts:82` refuses whenever `NODE_ENV` is
`production`, which is what Vercel builds run, but the hosted acceptance suite should still assert
that a code printed in a console is not accepted.

## G. Human access without opening the project

Deployment Protection is on, so every anonymous request, including `/api/health`, currently answers
302 to Vercel SSO. The receipts for that are
`docs/readiness/beta/live-hosted-acceptance-preview-ee52e8c.json` and
`...-e38eab6.json`: one check, failed on the redirect, the application never reached.

Two ways in, in order of preference, and both are the account owner's to choose:

1. Keep protection on and set a Vercel bypass secret for shareable links, handed to the agent as
   `STYLD_PREVIEW_BYPASS` for the automated suite only, while the human testers use an invitation
   that Vercel accepts. This preserves the wall and opens one door.
2. Turn Standard Protection off for Preview deployments on `sty-ld` only. This is the smaller
   action and the larger exposure: the hostname is guessable, so the app must be the only thing
   behind it, `X-Robots-Tag: noindex, nofollow` must be observed on the response (it is added by
   `next.config.mjs:17` for any non-production Vercel run), and no real data may exist in the
   database it resolves to, which is why section B comes first.

Neither option is taken by the agent. Do not disable protection across unrelated projects or across
all environments for convenience; `styld-auth-test` and `styld-isolated-preview` are not this beta's
door.

The tester URL needs one more reading than it has now. On 2026-10-30 an anonymous
`GET /api/health` answered `302` on both `https://sty-ld-git-qoder-styld-beta-1691f2-dreeydesigns-3368s-projects.vercel.app`
(the branch alias reported earlier) and
`https://sty-avxpyxv3n-dreeydesigns-3368s-projects.vercel.app` (a preview of the current tip), so
both hostnames resolve and both are stopped by Protection rather than broken. What that does not
prove is which deployment the alias currently points at. The GitHub Deployments API lists three
`success` statuses for deployment `7436081921` at sha `683f8c3`, each with a different
`environment_url` (`sty-avxpyxv3n` at 10:29 UTC, `sty-kooa18rsx` at 11:12, `sty-8199odmu9` at 11:15),
which is exactly why a per-deployment hostname is the wrong thing to hand testers and the branch
alias is the right one, once its target is read from the Vercel screen. Whatever is given to testers
must be the origin `BETTER_AUTH_URL` carries, or every same-origin write answers 403.

## H. The hosted acceptance run, once access and isolation exist

`tests/browser/live-hosted-acceptance.cjs` is the suite and runs in hosted mode against a real
origin, which is the only mode that counts here. The run:

1. Deploy the reviewed tip, read the deployment record for the project, and take the environment URL
   from that record rather than from memory.
2. Run the suite with the receipt written to a SHA-named file so the local-mode receipt at
   `docs/readiness/beta/live-hosted-acceptance.json` is not overwritten, as happened once already.
3. Expect, in this order: a page that is not a redirect; the exact served build identified; the
   database-backed checks; a real sign-up with a code read from the test inbox; wrong, expired and
   replayed codes refused; the four roles' flows; a second account that cannot read the first one's
   plan, saves or requests; an upload attempt that comes back as the section E refusal; no page
   errors; and the security headers present.
4. Record the deployment id, SHA, URL, inputs, outcomes, skipped steps and limits, and the fact that
   the receipt was produced on the hosted origin, not on localhost.

Anything the run cannot reach is written as not run. A passing build, a READY status and a local
receipt are not evidence of a hosted journey, and none of them will be used as a substitute.

## I. What remains after that

The real-device round (iPhone Safari, Android Chrome, a lower-end Android on mobile data) and the 63
contrast cases axe could not decide (62 on the build measured the day before) are still NOT RUN, and remain so until someone performs them on a
device. The Terms and Privacy effective dates stay as placeholders: the founder asked for 1 January
2020, that request is recorded here, and it is not published as a historical legal fact until it is
confirmed that these two policies were actually in effect then, with "Last Updated" kept separate and
accurate.

## What this plan does not claim

It does not claim the variables are set, because no agent has read the Vercel project. It does not
claim the database is isolated, because no read-back has happened. It does not claim a hosted sign-in
works, because no hosted request has reached the application. It claims that the code refuses uploads
without an explicit act, that the migration chain is ordered and idempotent, that presence is
readable back from the deployment without exposing a value, and that every remaining step is named
with the smallest action that clears it.
