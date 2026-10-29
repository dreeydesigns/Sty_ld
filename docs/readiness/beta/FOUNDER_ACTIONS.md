# STYLD, founder actions for the private beta gate

Six items are yours. The first four stop this agent from proving the beta on a hosted preview:
each is an account permission or a credential. The fifth is a sentence only you can date.
The sixth is a dependency decision that changes how sign-in is validated, which is why it is
yours and not mine.
Nothing here asks for a production change.
Everything below names the exact value the code reads, taken from the source that reads it.

The branch is `qoder/styld-beta-20261027`. The last commit the remote branch carried before this
push is `2d42e36`; the local branch is ahead of it by 44 commits as of the commit that changes this
sentence (2026-10-29), so the preview GitHub shows is not this code and a redeploy is expected
after item 1. Refresh this sentence at push time rather than trusting the number.

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

## 6. The decision on the `better-auth` security advisories

`npm audit` reports `better-auth` at **critical**, affected range `1.4.0-beta.18 - 1.7.6`, and this
tree installs `1.7.5` (`package.json:22` declares `^1.7.5`; `node_modules/better-auth/package.json`
and `package-lock.json` both read `1.7.5`). The declared range matters for the decision: `^1.7.5`
still admits `1.7.6`, which is inside the affected range, so "this tree holds 1.7.5" is true under
`npm ci` against the lockfile and would not be true after a plain `npm install` that let the range
resolve upward. This workspace only ever runs `npm ci --ignore-scripts`. Three advisories sit under
that one line:

- `GHSA-965c-763c-88jm`, an OAuth state value reusable as a magic link to sign in as another user.
- `GHSA-r4xp-prcw-77qf`, an OAuth proxy that lets an attacker sign in as another user.
- `GHSA-44jh-23m7-hpcf`, concurrent requests exceeding a rate limit, filed against
  `@better-auth/drizzle-adapter`.

Read against the source that configures sign-in, none of the three is reachable on STYLD today:

- Both OAuth advisories need a social provider. `lib/better-auth.ts:38` builds `socialProviders`
  only when `GOOGLE_AUTH_VERIFIED === 'true'` **and** a client id and secret are present, and
  `.env.example:45` sets it to `false`, so the object it falls back to is `{}`.
- The magic-link path is not configured: the only plugin imported is `emailOTP`
  (`lib/better-auth.ts:2`), no `magicLink` block exists in the config, and
  `lib/better-auth.ts:26` sets `accountLinking: { enabled: false }`.
- The rate-limit advisory is filed against `@better-auth/drizzle-adapter`. A grep of `app`, `lib`,
  `components`, `scripts` and `tests` finds no import of it. It is present in the tree only as
  `node_modules/better-auth/node_modules/@better-auth/drizzle-adapter`, an optional dependency the
  application never loads; STYLD passes a pool directly at `lib/better-auth.ts:21`.

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
