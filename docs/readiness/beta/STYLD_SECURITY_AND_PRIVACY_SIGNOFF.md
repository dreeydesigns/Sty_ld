# STYLD security and privacy signoff

Date: 2026-10-30
Branch: `qoder/styld-beta-20261027`, local HEAD `cb9d34b`, deployed preview `683f8c3`
Scope: the security and privacy surface of the restricted private beta (Client, Professional, Salon).
Statuses: VERIFIED COMPLETE, IMPLEMENTED BUT UNVERIFIED, IN PROGRESS, BLOCKED, DEFERRED, SUPERSEDED,
FAILED ACCEPTANCE. "Verified" here means proved by a named run on a production build against a
disposable database on this machine. Nothing in this file was verified against a hosted deployment,
because no hosted request has reached the application.

## The signoff answer

There is no human signature on this document and an agent cannot supply one. What follows is the
engineering position: the audited set is closed and proved locally, four items are open, and none of
the four is a code task. A reader who wants to release this build needs the four items in
`STYLD_FOUNDER_ACTIONS_FINAL.md`, not another review of this code.

## Closed and proved

| Control | Status | Proof |
| --- | --- | --- |
| Authentication is Better Auth email OTP and nothing else | VERIFIED COMPLETE | `lib/better-auth.ts` imports `emailOTP` only (`:2`), sets `accountLinking: { enabled: false }` (`:26`), and builds `socialProviders` only when `GOOGLE_AUTH_VERIFIED === 'true'` with a client id and secret (`:38`); `.env.example:45` sets it `false`, so the shipped default object is `{}`. No other provider was added and Clerk configuration was not touched. |
| The three `better-auth` advisories | VERIFIED COMPLETE | `package.json:22` pins `1.7.14` exactly, above the `1.7.7` fix line for `GHSA-965c-763c-88jm`, `GHSA-r4xp-prcw-77qf` and `GHSA-44jh-23m7-hpcf`; `npm audit` reports none, and the reachability reading for the older version is kept in `FOUNDER_ACTIONS.md` section 6. |
| Authorization is server-side | VERIFIED COMPLETE | `lib/better-auth.ts`, `middleware.ts`, `lib/auth-policy.ts` and `lib/auth-resolver.ts` were not edited by this work. No route takes a role, user id or workspace id from the client to decide access; the live journey proves it by behaviour, not by reading code. |
| Session integrity | VERIFIED COMPLETE | `live-auth-journey.json`: a forged cookie string is refused (step 8), deleting the session row at the database signs the browser out (step 9), and one account cannot read another account's plan or saves (step 7). A real time-based second factor is set up inside the same run (step 11). |
| Privilege boundaries | VERIFIED COMPLETE | The admin console refuses a signed-in non-admin at the server (step 12). An MFA-less admin is given no review statement at all in `lib/media-manifest.ts`, and the owner filter is expressed only inside the `WHERE` clause from server-derived values. |
| Cross-origin writes | VERIFIED COMPLETE | `lib/api-security.ts:6` answers `403` for a request whose `origin` header does not equal the origin in `BETTER_AUTH_URL`. Pinned in `tests/mfa-totp-recovery.cjs` (16 tests) and the discussion-request cases. |
| Client IP resolution | VERIFIED COMPLETE | `lib/better-auth.ts:33` reads `x-vercel-forwarded-for` only when `VERCEL` is set and nothing otherwise, so no spoofable header is ever trusted. Pinned by `tests/client-ip-resolution.cjs` (7 tests). |
| MFA transaction bounds | VERIFIED COMPLETE | `app/api/auth/mfa/totp/route.ts:22-25` sets `lock_timeout` and `idle_in_transaction_session_timeout` before the `FOR UPDATE` read; `:43-46` turns a `55P03` lock timeout into a 503 that names no driver detail. |
| Schema discipline | VERIFIED COMPLETE | `sql/migrations/014`, `015`, `016` are numbered draft files, proved on an owned disposable PostgreSQL 17.11 (`docs/readiness/sprint4/postgres-result.json`, 28 of 28, `dirtyTestInputPaths []`, database dropped). No production database was read or written, and no hosted database at all. |
| Secrets never leave the process | VERIFIED COMPLETE | `/api/health/auth` answers booleans only and is walked by a test that refuses any non-boolean leaf; the provider tests plant canary strings (`private-payload-canary`, `synthetic-provider-key`) and assert they appear in no log line; the new probe asserts a synthetic connection string is never echoed. Both health routes share one fail-closed token rule in `lib/health-token.cjs`, which denies when the expected token is unset. |
| Indexing posture | VERIFIED COMPLETE | `app/robots.ts` refuses every user agent and publishes no sitemap; `next.config.mjs:17` adds `X-Robots-Tag: noindex, nofollow` only when Vercel itself reports a non-production environment, so no production or self-hosted run inherits it. `tests/indexing-posture.cjs` (4 tests) also proves the six protective headers still ship alongside it. |
| Deferred features stay off | VERIFIED COMPLETE | `lib/feature-flags.ts:14` holds `SHOP: false`, `DELIVERY: false`, `PAYMENTS_LIVE: false`, `BOOKING_COMMITMENTS: false`. A request to discuss creates no booking and no price, proved in `tests/discussion-requests.cjs` (13 tests) and `tests/postgres/discussion-requests.cjs` (4 tests). |
| Copy makes no unproven claim | VERIFIED COMPLETE | The delivery-claim rule lives once in `tests/helpers/delivery-claim.cjs` and is imported by both the unit and the live check; the offline notice states a negative; `app/api/upload/route.ts:40` answers 503 rather than accepting an image it cannot protect. |

## Open, with the reason stated

| Item | Status | What it means for a reader |
| --- | --- | --- |
| Provider-side restricted media delivery | BLOCKED (founder) | The application refuses to serve a pending asset without proof and now refuses to accept one either: `resolvePendingUploadPolicy` (`lib/media-delivery-config.cjs:87`) requires the delivery configuration **and** `STYLD_MEDIA_PROVIDER_RESTRICTION_VERIFIED=true`, and the gate runs at `app/api/upload/route.ts:38` before the rate limiter, the body and the provider, so nothing a tester does can widen the gap. What is still true of assets that already exist: they are public `image/upload` URLs, and when uploads are allowed the route returns the provider's public URL. Round one therefore has no image upload at all. |
| Preview environment isolation | BLOCKED (founder) | Reported: one `POSTGRES_URL` entry targeting both Production and Preview, no override named for this branch, `RESEND_FROM_EMAIL` not found, and part of the Better Auth configuration scoped to an older design branch. This workspace holds no credential and cannot read the Vercel environment; the read-only probe exists precisely so the running process, not the dashboard, answers the question. |
| The terms and privacy dates | BLOCKED (founder) | A privacy signoff cannot be given while the published pages state dates the records do not support. `app/terms/page.tsx:29` and `:31` render placeholders. `app/privacy/page.tsx:27` renders "Effective Date: 1 January 2025" and `:29` "Last Updated: 12 October 2026", while both files first appear in this repository's history on 2026-07-20. The founder's requested 1 January 2020 is recorded as a request and is not published, because publishing it as a historical legal fact would be exactly the kind of unproven claim this project refuses elsewhere. |
| Hosted security behaviour | BLOCKED, not attempted | Headers, redirects, rate limits and the origin rule are proved on a loopback production build (`live-hosted-acceptance.json`, 13 of 13). On Vercel they have never been observed, because every anonymous request is stopped at the edge. |

## Residuals a reviewer should see without asking

- The content security policy allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`
  (`next.config.mjs:21`). That is the framework and the third-party set (Cloudflare turnstile,
  Google APIs, Vercel live) as this application is built today, not an oversight, and it is the widest
  instruction in the header. Tightening it is a build-shape change, not a policy edit, and it is not on
  the beta gate.
- `img-src` and `connect-src` accept any `https:` source. Image loading is deliberately open for a
  marketplace that shows provider photos; it is a data-exposure surface for a page that could be made
  to fetch an attacker-supplied image, and it is stated here rather than defended.
- Off Vercel, Better Auth sees no client IP and every visitor shares one rate-limit bucket. It is an
  availability property of a self-hosted run, and launch is on Vercel.
- `COUNTER: true` maps `/counter` behind a stub that says ordering, payment and delivery are not
  available; its illustrative KES prices are reachable by direct URL. Recorded, not changed, because
  turning it off redirects the route and that is a launch decision.
- Three routes (`app/[collection]/page.tsx`, `app/[collection]/[slug]`,
  `app/counter/product/[id]/page.tsx`) do client work with no waiting affordance of their own. They
  paint a thin real body, so they are thin rather than silent, and no segment fallback was added
  because a segment fallback is the defect this batch removed.

## What would make this signable

One line each, in order: the preview's database named (not its value) and the probe answering from
inside the deployment; a verified sender plus one test inbox and a hosted OTP that completes; the
preview opened to the harness or declared human-only; the pending folder proved unreachable without a
signature; and the two policy dates set from a record that supports them. Then the hosted run is
repeated against the deployed build and this file names the receipt.
