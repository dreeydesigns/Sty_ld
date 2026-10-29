# STYLD, founder actions for the private beta gate

Five items are yours. The first four stop this agent from proving the beta on a hosted preview:
each is an account permission or a credential. The fifth is a sentence only you can date.
A sixth item, the `better-auth` dependency decision, was closed by the founder directive of
2026-10-29 and is kept in section 6 as a record of what was decided and re-proved.
Nothing here asks for a production change.
Everything below names the exact value the code reads, taken from the source that reads it.

The branch is `qoder/styld-beta-20261027`. As of 2026-10-29 the remote tip is `c278ed6`, which
Vercel built as deployment `7401647064` at
`https://sty-dhw899d38-dreeydesigns-3368s-projects.vercel.app` with status `success`. The commit
that changes this sentence sits on top of it and edits only files under `docs/`, which are not
build inputs, so the application in the newest preview is the same code as at `c278ed6` and none of
the six items below changes. Refresh this sentence at push time rather than trusting the number.

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

The preview needs its own isolated Postgres so the acceptance suite can sign a real account in,
create a real post and read it back.

- Provide a connection string for a disposable database as the preview environment's database
  URL, on a branch or project that no real user data lives in.
- Then apply the numbered files that the beta code expects, in order, to that database only:
  `sql/migrations/014_users_integrity_guards.sql` and `sql/migrations/015_media_manifests.sql`.
  Both were tested on an owned disposable cluster, and neither has been applied by this agent
  to any database.
- Confirm in one line which database URL the preview points at, by name, not by value.

## 3. A live email sender for the preview

Authentication is Better Auth email OTP. The loopback harness runs its own mail stand-in, so a
hosted journey needs a real sender that can deliver.

- Give the preview environment a Resend key that is past the testing restriction, with a
  verified `RESEND_FROM_EMAIL` sender address.
- Tell me which test address may receive OTP mail (for example an inbox you check), so the
  suite reads a real message instead of inventing one. The harness never guesses a code.

## 4. Provider-side restriction for pending media (the last part of the media work)

The application refuses to serve a pending upload until the storage provider itself proves the
asset is not public. That refusal is deliberate: with no configuration the route answers 503,
and a manifest row starts with `provider_restriction_verified = false`, so no code path can
release bytes on an assumption.

To turn that refusal into delivery, in the storage account (not in this repository):

- Set the pending upload folder or tag to require signed, non-public access, and confirm the
  asset is no longer reachable by its plain public URL.
- Provide the four values the gate reads, as `lib/media-delivery-config.cjs` requires:
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_SIGN_KEY`, plus `STYLD_RESTRICTED_MEDIA_ENABLED=true` and
  `STYLD_MEDIA_ALLOWED_ORIGINS` set to exactly one HTTPS origin with no path.
- Once a restricted asset is proved unreachable without a signature, the verification record
  for that asset can be written, and `tests/postgres/media-manifests.cjs` already checks the
  database bounds it has to sit inside.

Until then `app/api/upload/route.ts` still returns the provider's public URL, which is stated
as an open item in the ledger and is the reason pending media is not called finished.

## 5. The effective date on the terms page

`app/terms/page.tsx:29-31` renders "Effective Date: [To be inserted by Styld]" and
"Last Updated: [To be inserted by Styld]" on the live page. The first-render audit brought
that page into the browser's view again, and the placeholder is the only unfinished sentence it
found. No date is invented here: a terms page needs the date the founder sets it, and it is the
same date that should head the privacy page if the two are meant to agree.

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
