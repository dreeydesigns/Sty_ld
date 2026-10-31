# STYLD, founder actions for the private beta gate

Five items are yours. The first four stop this agent from proving the beta on a hosted preview:
each is an account permission or a credential. The fifth is a sentence only you can date.
A sixth item, the `better-auth` dependency decision, was closed by the founder directive of
2026-10-29 and is kept in section 6 as a record of what was decided and re-proved. Section 7 is not
an action: it is the classification this file supports, in the words the release gate requires.
Nothing here asks for a production change.
Everything below names the exact value the code reads, taken from the source that reads it.

The branch is `qoder/styld-beta-20261027`. The remote tip as of 2026-10-30 is
`683f8c3160334e1ef0040203355a8ce4722785dc`, and the GitHub Deployments API reports preview
deployments of it on project `sty-ld` with platform status `success` (deployment `7436081921`, whose
statuses list `https://sty-avxpyxv3n-dreeydesigns-3368s-projects.vercel.app`,
`https://sty-kooa18rsx-dreeydesigns-3368s-projects.vercel.app` and
`https://sty-8199odmu9-dreeydesigns-3368s-projects.vercel.app`). The platform record outranks any
sentence in this file: a per-deployment hostname changes on every rebuild, which is why testers get
the branch alias instead. The last commit that changed a build input and is deployed is `2fa521d`,
and the preview serves application build `yqwyYPWjOIB73R6FF_Irt`. The local branch has since moved
three commits ahead of `683f8c3`: `cc88599` adds the server-side pending-upload refusal, the
environment probe and the shared health-token rule, `cb9d34b` fixes a test's build-id reading, and
`5bd494a` makes the accessibility scan wait for the splash to detach. None is pushed, because
pushing is your call. The 2026-10-31 receipts were taken against the local artifact
`YHmKlFY-FAfZVz0NcHCHD` built at `cc88599`, and each names its own commit. A gate rebuild at
`5bd494a` produced a new random identifier, `xsIdSgdtr9XptiCR2L-t4`, from the same application code,
because the project sets no `generateBuildId`. The deployed preview still serves the older build, so
no hosted run has yet executed this code.
`docs/readiness/beta/STYLD_HOSTED_BETA_ACTIVATION_PLAN.md` is the plan those two changes belong to,
and it is the current statement of what is configured, what is merely reported, and what has to be
proved before a tester is admitted. The readiness classification is in one line there and repeated
in section 7 below: the MVP is not approved for physical market testing yet.

## 1. Open the preview URL to the test harness (Vercel Deployment Protection)

Measured on 2026-10-27 against `https://sty-azio8hxwc-dreeydesigns-3368s-projects.vercel.app`:
`/`, `/api/health` and `/api/health/auth` all redirect an anonymous client to
`https://vercel.com/login?next=/sso-api...`. The deployment itself reports `success` in the
GitHub Deployments API, so this is access, not a broken build.

Rechecked on 2026-10-28 at 19:35 UTC, both preview deployments, still the same blocker.
`/api/health` and `/discover?tab=looks` on
`https://sty-azio8hxwc-dreeydesigns-3368s-projects.vercel.app` (deployment `7357000606`) and on
`https://styld-auth-test-4f5sj3lp6-dreeydesigns-3368s-projects.vercel.app` (deployment
`7357022792`) each answer `302` with `Location: https://vercel.com/sso-api?url=...` and carry an
`x-vercel-id`, so the request reached Vercel's edge and Vercel stopped it. Both deployments report
`success` in the GitHub Deployments API. Nothing about the build changed; the gate is Vercel's, not
STYLD's.

Rechecked on 2026-10-29. The newest preview deployment the GitHub Deployments API reports for the
`sty-ld` project is still deployment `7357000606`, still built from `2d42e36`, and an anonymous
`GET /discover` on it still answers `302` with `Location: https://vercel.com/sso-api?url=...`. The
production deployment answers `200`; it is public, it is not this branch, and nothing in this work
touches it.

Then the branch was pushed, so this is the one that matters now. Deployment `7401468804` is the
preview for `f841e0e`, the head of `qoder/styld-beta-20261027` as of 2026-10-29, its
`environment_url` is `https://sty-lzas1bsz1-dreeydesigns-3368s-projects.vercel.app` and its status
is `success`, so the build is not the problem. An anonymous `GET /discover` and `GET /api/health`
on that host each answer `302` with `Location: https://vercel.com/sso-api?url=...` and an
`x-vercel-id`. The acceptance suite was then run against it exactly as documented above, with no
cookie and no bypass, and it recorded the stop rather than pretending past it
(`docs/readiness/beta/live-hosted-acceptance-preview-20261029.json`: `mode` hosted preview, one
check executed, `deployment reachable` failed on the redirect, `cookieSupplied false`,
`bypassSupplied false`, and the build-identification grade reported as never reached because this
run never got a document to read an identifier out of). The local-mode receipt
(`docs/readiness/beta/live-hosted-acceptance.json`, 13 checks against the same code on a loopback
production build) is untouched by that run, which is why both files are named here.

Rechecked again after the final push of 2026-10-29. The branch tip is
`ee52e8c3ef961f76c93192427d7c1efcb3fac50a`, and Vercel deployment `7419556619` for project `sty-ld`
built it with platform status `success` at 17:31 UTC, at
`https://sty-4254wlg18-dreeydesigns-3368s-projects.vercel.app`. Anonymous `GET /`, `GET /api/health`
and `GET /discover` each answered `302` with `Location: https://vercel.com/sso-api?url=...` and an
`x-vercel-id` at 17:32 UTC, so this is still the same gate and not a build fault. The hosted suite
recorded the stop again (`docs/readiness/beta/live-hosted-acceptance-preview-ee52e8c.json`), and the
same suite passed 13 of 13 in local mode on this tree
(`docs/readiness/beta/live-hosted-acceptance.json`, commit `ee52e8c`, served build `yqwyYPWj`). Any
later preview built from a commit that edits only files under `docs/` serves this same application.

Rechecked on 2026-10-30, after the activation work: an anonymous `GET /api/health` still answers
`302` to Vercel SSO on both the branch alias
`https://sty-ld-git-qoder-styld-beta-1691f2-dreeydesigns-3368s-projects.vercel.app` and a preview of
the current tip, so both hostnames resolve and both are stopped at the edge rather than failing
inside the application. This item is second, not first. Opening the preview while the preview still
resolves to the shared `POSTGRES_URL` removes the only wall in front of a production-shaped database,
so section 2 is closed and read back before section 1 is.

Pick one of the three options below and the deployed half of this gate can be closed the same day:
with a bypass secret the command is one line, and the suite already records only that a bypass was
sent, never its value.

Pick one:

- Vercel project, Settings, Deployment Protection, Preview deployments: turn Standard
  Protection off for previews on this project. Simplest, and scoped to preview URLs only.
- Or set a **Protection Bypass for Shareable Links** secret and give it to me as
  `STYLD_PREVIEW_BYPASS`. The harness sends it as `x-vercel-protection-bypass` on each
  request, so Protection stays on for people.
- Or tell me the preview is meant for human eyes only, and the acceptance suite stays
  loopback-only. In that case the readiness gate cannot be marked passed on a hosted
  revision, and I will say so in the ledger rather than claim it.

Do not paste a token into a file in this repository. Send it in chat or put it in the Vercel
project environment.

The suite that waits on this is built and passes against a local production build: 13 checks,
0 failures, recorded in `docs/readiness/beta/live-hosted-acceptance.json`. With a bypass it runs as
`STYLD_TARGET_URL=https://<preview>.vercel.app STYLD_PREVIEW_BYPASS=<secret> node
tests/browser/live-hosted-acceptance.cjs`, and it records only whether a bypass was sent, never the
value. Without one, its first check reports the redirect and stops, which is what it did here.

## 2. A preview database that is not the production one

This item grew, because the connected Vercel project was inspected on 2026-10-30 and one entry named
`POSTGRES_URL` targets both Production and Preview with no override for this branch. The application
reads `POSTGRES_URL` first (`lib/auth-database.ts:7`), so a preview that inherits that entry writes
into the production database the moment someone signs up. Treat this as the first thing to fix, not
the first thing to test.

The whole procedure, with the exact queries, the order of the migration files and the read-back that
proves isolation, is `docs/readiness/beta/STYLD_HOSTED_BETA_ACTIVATION_PLAN.md` sections B, C and D.
In short:

- Create a fresh, empty Neon database on a project that holds no real user data, and give it to
  `qoder/styld-beta-20261027` as a branch-scoped `POSTGRES_URL`. Do not overwrite the shared
  production value. Do not copy real customer rows into the beta.
- Do not reuse a database because its name says QA. `014_users_integrity_guards.sql` refuses to run
  over rows with a null `created_at` or `updated_at`, and `013_better_auth_qa_schema.sql` carries its
  own "do not apply without founder approval" warning, so a reused database is a migration that stops
  halfway against data this project did not create.
- Apply the numbered chain in full, `001` through `016`, not the last three files. `001` creates the
  base tables the journeys depend on (`users`, `sessions`, `services`, `bookings`, `posts`,
  `user_roles`, `auth_rate_limits` among them); `002` to `013` add trust and safety, reviews,
  analytics, the auth tables, workspaces, social posts and the four Better Auth tables; `014`
  hardens `users`, `015` creates `media_manifests`, `016` creates `discussion_requests`. The runner
  is `scripts/apply-migrations.mjs`, it is idempotent, it records each file in `schema_migrations`,
  and it prints no connection string. The three loose `.sql` files at the top of `sql/` are legacy
  and are not part of initialisation.
- Then read the identity back from inside the running deployment, from
  `GET /api/health/environment` with the `x-health-check-token` header: `current_database()`,
  `current_user`, the server port, the public table names, the row count of `users`, and the applied
  migration names. That route is new with this work, runs SELECT statements only, and is the only
  thing here that can say what the process resolved to rather than what the screen was set to.
- Confirm in one line which database the preview points at, by name, not by value.

No migration or write has been run by this agent against any hosted database, and none will be until
the read-back says the beta database and not the shared one.

## 3. A live email sender for the preview

Authentication is Better Auth email OTP. The loopback harness runs its own mail stand-in, so a
hosted journey needs a real sender that can deliver.

The inspection of 2026-10-30 reports `RESEND_API_KEY` configured and no `RESEND_FROM_EMAIL` value on
the project. That matches what the code does with it: with the sender address absent,
`emailConfigurationReady` (`lib/auth-readiness.ts:7`) is false and the OTP route says the email
service is not configured, rather than pretending a message went out. A key alone is not a sender.

- Give the preview environment a Resend key that is past the testing restriction, with a
  verified `RESEND_FROM_EMAIL` sender address, both scoped to this branch.
- Tell me which test address may receive OTP mail (for example an inbox you check), so the
  suite reads a real message instead of inventing one. The harness never guesses a code.
- Read both back from the deployment with `GET /api/health/auth` and the
  `x-health-check-token` header. It answers booleans only, which is the point: it says whether the
  process sees a sender without anyone pasting a key into chat.

## 4. Provider-side restriction for pending media (the last part of the media work)

The application refuses to serve a pending upload until the storage provider itself proves the
asset is not public. That refusal is deliberate: with no configuration the route answers 503,
and a manifest row starts with `provider_restriction_verified = false`, so no code path can
release bytes on an assumption.

To turn that refusal into delivery, in the storage account (not in this repository):

- Set the pending upload folder or tag to require signed, non-public access, and confirm the
  asset is no longer reachable by its plain public URL.
- Provide the values the gate reads, as `lib/media-delivery-config.cjs` requires:
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_SIGN_KEY`, plus `STYLD_RESTRICTED_MEDIA_ENABLED=true` and
  `STYLD_MEDIA_ALLOWED_ORIGINS` set to exactly one HTTPS origin with no path.
- Say that the provider side is verified, in the environment and not in prose, by setting
  `STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED=true`. Configuration alone is not proof that the folder
  is private, so the upload gate asks for both.
- Once a restricted asset is proved unreachable without a signature, the verification record
  for that asset can be written, and `tests/postgres/media-manifests.cjs` already checks the
  database bounds it has to sit inside.

The accepting half changed on 2026-10-30, and it changed in code rather than in instructions.
`app/api/upload/route.ts:38` now consults `resolvePendingUploadPolicy` after the sign-in check and
before the rate limiter, the request body and the provider, so an upload in this beta answers
`503 Image uploads are not available in this environment yet.` and costs nothing downstream. It
accepts on exactly two explicit acts: restricted delivery configured **and** attested, or
`STYLD_MEDIA_UPLOADS_UNRESTRICTED=true` declaring that the environment holds no private images at
all. Absent, blank, `false` and a misspelling all refuse
(`tests/media-upload-gate.cjs`, and `.env.example` carries both switches at their refusing values).
So the statement for round one is precise: no tester can upload an image, whether or not they try,
and pending media is not delivered rather than delivered privately. A write-up that shows a Look, a
profile photo or a post with an image is describing a feature that is off at the server.

## 5. The effective date on the terms page, and one already published on the privacy page

`app/terms/page.tsx:29-31` renders "Effective Date: [To be inserted by Styld]" and
"Last Updated: [To be inserted by Styld]" on the live page. The first-render audit brought
that page into the browser's view again, and the placeholder is the only unfinished sentence it
found. No date is invented here: a terms page needs the date the founder sets it.

You supplied a requested effective date of 1 January 2020. It is recorded as a request, and it is
not published yet, because two facts have to agree before a legal date goes on a page.

- The repository record. `git log` on this branch shows both `app/terms/page.tsx` and
  `app/privacy/page.tsx` appearing for the first time on 2026-07-20 (commits `517140c` and
  `599c9c8`), and both last edited in `524353b` on 2026-10-28. A page whose own history begins in
  July 2026 cannot be presented as having taken effect in 2020 on the strength of this repository
  alone.
- The privacy page already carries a published date, and it disagrees with both.
  `app/privacy/page.tsx:27` states "Effective Date: 1 January 2025" and `:29` states
  "Last Updated: 12 October 2026". If that 2025 date is real, it comes from something outside this
  branch (an earlier published policy on the production site, or a dated document you hold) and it
  needs to be checked there; if it is not, it is a claim on a live page that no record supports, and
  it is the more urgent of the two sentences to fix. Production answers 200, so this is not a
  preview-only problem.

So the ask is three lines, not one: confirm whether these two specific policies were ever in effect
on the date you requested, give the terms page its effective date and its actual last-updated date,
and say whether the privacy page's 1 January 2025 should stand, move to the same date, or be
replaced with the date the text was actually written. "Last Updated" stays separate and accurate in
either case, and the placeholders stay until you answer.

## 6. The `better-auth` security advisories (decided, no founder action left)

This was the sixth item and it is closed. The founder directive of 2026-10-29 authorises a
verified patched release at or above `1.7.7`, pinned exactly, so the decision did not need to wait.
`package.json:22` now declares `"better-auth": "1.7.14"` with no caret, the lockfile resolves that
one version, and `npm ci --ignore-scripts` exits `0` against it. `npm audit` reports no advisory
for the package. The three findings that named this tree were `GHSA-965c-763c-88jm`,
`GHSA-r4xp-prcw-77qf` and `GHSA-44jh-23m7-hpcf`, all fixed below `1.7.7`, so the reachability
analysis kept below is now history rather than a live risk.

The full gate set was re-run on the pinned tree before anything was committed: typecheck `0`
errors, lint `0` errors with the same 30 pre-existing image warnings, the unit suite `806` of `806`,
the disposable PostgreSQL suite `28` of `28` on PostgreSQL 17.11, and the live authenticated
browser journey, which signs in with a real emailed code and sets up a live time-based second
factor. The `1.7.5` notes are kept here because the ledger cites them and a future reader should
see what the advisories actually asked of the code.

What was true of `1.7.5`, kept for the record:

- `GHSA-965c-763c-88jm`, an OAuth state value reusable as a magic link to sign in as another user.
- `GHSA-r4xp-prcw-77qf`, an OAuth proxy that lets an attacker sign in as another user.
- `GHSA-44jh-23m7-hpcf`, concurrent requests exceeding a rate limit, filed against
  `@better-auth/drizzle-adapter`.

Read against the source that configures sign-in, none of the three was reachable on STYLD even at
`1.7.5`:

- Both OAuth advisories need a social provider. `lib/better-auth.ts:38` builds `socialProviders`
  only when `GOOGLE_AUTH_VERIFIED === 'true'` **and** a client id and secret are present, and
  `.env.example:45` sets it to `false`, so the object it falls back to is `{}`.
- The magic-link path is not configured: the only plugin imported is `emailOTP`
  (`lib/better-auth.ts:2`), no `magicLink` block exists in the config, and
  `lib/better-auth.ts:26` sets `accountLinking: { enabled: false }`.
- The rate-limit advisory is filed against `@better-auth/drizzle-adapter`. A grep of `app`, `lib`,
  `components`, `scripts` and `tests` finds no import of it. STYLD passes a pool directly at
  `lib/better-auth.ts:21`.


So this is not a live compromise, and it is also not a reason to stay. The version that fixes all
three is `1.7.7`, a patch within the same major, and the only thing that stopped this agent from
taking it is the project rule that no one bumps the authentication library without being told.

Pick one:

- Say "bump `better-auth` to 1.7.7 on the test branch". Then it is installed with `npm ci
  --ignore-scripts`, the full gate set runs (typecheck, lint, the unit suite, the real
  authenticated browser journey against a disposable cluster, which signs in with a genuine OTP),
  and the receipt is recorded here before anything is pushed.
- Or say "hold 1.7.5 for the private beta". That is defensible on the evidence above, and the
  ledger will state the advisories, the reachability reading and the date it was reviewed, so the
  next reader is not left to rediscover it.

## 7. Where the readiness classification stands, in the words this gate requires

The MVP is not approved for physical market testing. That is the current classification and it is
not a matter of tone: the release matrix has areas that are not satisfied, and a passing build, a
READY deployment and a local receipt do not close them.

| Gate | Classification | Why |
| --- | --- | --- |
| Core application, journeys 1 to 6, design 1 to 8, accessibility, performance | IMPLEMENTED BUT UNVERIFIED | Proved on a loopback production build and a disposable PostgreSQL cluster, never on the hosted preview |
| Hosted deployment reachable by a stranger | BLOCKED, item 1 | Every anonymous request answers 302 to Vercel SSO |
| Database isolation and hosted persistence | BLOCKED, item 2 | One reported `POSTGRES_URL` targets Production and Preview, with no override named for this branch |
| Real emailed OTP, sessions and MFA on the hosted revision | BLOCKED, item 3 | No `RESEND_FROM_EMAIL` reported on the project, so no message can leave |
| Pending media | BLOCKED, item 4, and now contained | Uploads are refused by the server, so the beta is safe to open without a private-asset leak, and no image feature is delivered |
| iOS Safari and Android device evidence | NOT RUN | No device has been driven; nothing is claimed for it |
| Terms and privacy dates | BLOCKED, item 5 | A requested date and a published date both lack a record behind them |
| `better-auth` version | VERIFIED COMPLETE, item 6 | Pinned `1.7.14`, clean install and full gate set re-run |

The order of work is item 2, then item 1, then item 3, then the hosted acceptance run against the
deployed SHA, then the device round. Items 4 and 5 stay open in parallel because they are contained
by a refusal and by a placeholder rather than by a fix.

## What is not being asked for

No production migration, no production credential, no purchase, no public release, and no
enablement of Shop, Delivery, live payments or booking commitments. Those stay off, and the
flags that keep them off are covered by tests.

One thing that was briefly a candidate for this list is not on it, because it turned out to be
engineering rather than your decision. The seventeen suites under `tests/browser` all load
`playwright`, and `playwright` was installed in this workspace without being declared in
`package.json` or `package-lock.json`, so a clean checkout of this branch could not run any browser
QA at all. A founder could not have spotted that from the outside, and no permission or credential
was needed to fix it, so it was fixed here: the exact version this workspace measured against is now
a devDependency, a test pins the rule, and `npm ci --ignore-scripts` was re-run to prove a fresh
install resolves it. Details are in the ledger row that names it.
