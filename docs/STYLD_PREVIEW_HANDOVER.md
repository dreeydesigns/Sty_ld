# STYLD private-beta preview handover

Branch: `qoder/styld-beta-20261027` on `github.com/dreeydesigns/Sty_ld`.
Prepared 27 October 2026 by Qoder as delivery owner. This file is about access and configuration,
not about feature claims. Read `docs/STYLD_MVP_CLOSEOUT_REPORT.md` for what was verified.

## Status of the preview URL

PARTLY VERIFIED. The deployment builds and the application really does render, but only for a client
that already holds a Vercel session. For an anonymous reviewer, including any tester invited to the
private beta, the preview is still a login wall: PREVIEW ACCESS BLOCKED.

Evidence. The deployment record and the anonymous redirect are reproducible from any terminal. The
signed-in observations below are a sighting by one reviewer in one browser, and no screenshot or log
of them is committed to this tree.
- The GitHub Deployments API for the public repo shows deployment `7352192689`, environment
  the Vercel Preview environment for this project (GitHub labels it "Preview" plus the project name
  `sty-ld`), commit `3bc54ca`, state `success`, description "Deployment has completed", at
  2026-10-27T06:47:08Z, with `environment_url`
  `https://sty-dfz9xx234-dreeydesigns-3368s-projects.vercel.app`.
- From a terminal with no session, `GET /` and `GET /discover` on that host both answer
  `302` to `https://vercel.com/sso-api?...`. That is Vercel Deployment Protection, not the app.
- In a browser that does hold a Vercel session, the same host serves the application. What was seen
  on 27 October 2026: `/discover` rendered the STYLD header, the honest preview disclaimer line, the
  five discovery tabs and the category chips; `/auth/sign-in` rendered the real passwordless form with
  the guest link and the terms links; `/admin` redirected an anonymous visitor to
  `/auth/sign-in?returnTo=%2Fadmin`, which is the server-side guard working on the hosted deployment.
- The same hosted page reports `GET /api/social/posts?limit=50` as HTTP 500, and the guest then sees
  "Looks are unavailable right now. Check your connection, then try again." The preview deployment has
  no database bound, so the copy blames the visitor's connection for a server-side fault. That is a
  real, if minor, honesty problem in the empty-state copy, and it is fixed only by binding a database.

So the correct claim is: the preview deployment exists and serves the application to a signed-in
reviewer, and the guest screens and the admin refusal were observed on it. It is NOT a claim that an
authenticated journey was completed on the hosted preview. Those journeys ran against the real
production build on this machine, with a real database, and are evidenced in
`docs/readiness/beta/live-auth-journey.json`.

Smallest founder action for access (one of three, either is enough for reviewers):
1. Turn off Deployment Protection for preview deployments only, in Vercel project Settings, then any
   reviewer can open the preview URL. Leave protection on Production.
2. Or set a Vercel Deployment Protection bypass secret and give testers the link that carries it.
3. Or invite each tester as a Vercel team member, which is the slowest option for a beauty marketplace
   beta and is not what this product needs.

Second founder action, needed for the preview to be more than a guest shell: preview-scoped
environment variables. `docs/ENV_MATRIX.md` lists every key. The minimum set is
`BETTER_AUTH_URL` (the exact preview origin, or the cookie and origin checks fail closed),
`BETTER_AUTH_SECRET`, `MFA_SECRET_KEY`, an isolated `POSTGRES_URL` that is not the production
database, and a working `EMAIL_PROVIDER` sender so an OTP can actually arrive. Without that database
the preview cannot serve a Look, a save, a shortlist or a review queue, which is what the 500 above
shows.

Never point a preview at the production database, and never run migrations there. Schema changes
stay numbered files under `sql/migrations/` for the founder to apply to an isolated database.

## Two hosting facts found on the preview

- The application sets no `robots` metadata anywhere (`grep robots app/` finds nothing) and ships no
  `public/robots.txt`, so a request for `/robots.txt` returns the app HTML with status 200. Preview
  indexing therefore depends entirely on Vercel's own headers plus Deployment Protection. For a private
  beta that is acceptable, but it should be a founder decision rather than an accident.
- Better Auth logs `Rate limiting could not determine a client IP` when the app runs where the one
  header it trusts is absent. On Vercel that header is `x-vercel-forwarded-for`, so a Vercel preview is
  fine and a non-Vercel host would share one rate bucket between all visitors.

## What is verified, and how to reproduce it without any cloud access

The authenticated journeys do not depend on the preview. They run the real production build against
an owned, loopback-only, disposable PostgreSQL cluster, so the product behaviour is proven even
while the hosted preview is walled.

Prerequisites on a Windows machine: Node 24, the extracted PostgreSQL 17.11 binary directory, and
Google Chrome installed at its normal path. Playwright and axe-core are installed with
`npm install --no-save --ignore-scripts`, so the committed manifest and lockfile stay untouched.

```
npm ci --ignore-scripts
npm install --no-save --ignore-scripts playwright axe-core
npm run build
node tests/browser/live-auth-journey.cjs --bin "C:/path/to/pgsql/bin"
node tests/browser/live-accessibility-audit.cjs --bin "C:/path/to/pgsql/bin"
```

Both harnesses refuse to start if `POSTGRES_URL`, `DATABASE_URL`, `POSTGRES_PRISMA_URL` or
`POSTGRES_URL_NON_POOLING` already exist in the environment, which is what keeps them off a real
database. Each writes a machine-readable receipt under `docs/readiness/beta/` and tears its cluster
down in a `finally` block. Teardown drops the database and stops the server but deliberately does
not recursively delete the temporary data directory; that removal is left to the founder, so no
harness ever runs a broad recursive delete on a machine that also holds real work.

One environment variable must be unset for these runs: the harness points the application's own
email provider at a loopback stand-in with `RESEND_API_URL`. If that variable is ever forwarded to
a real vendor the test would send mail, so the stand-in only accepts a Bearer token, a 64 KB body
and loopback traffic, and it never prints a code.

## Configuration notes the founder should keep

- Off Vercel, Better Auth cannot resolve a client IP from the headers this application allows, so
  all rate limiting falls back to one shared bucket per path. That is deliberate anti-spoofing
  (`advanced.ipAddress.ipAddressHeaders` is `x-vercel-forwarded-for` only on Vercel) but it means a
  preview hosted anywhere without that header can be locked out by one visitor's traffic. On the
  preview: confirm `VERCEL` is set, or add the correct proxy header name.
- `session` cookie is httpOnly, SameSite Lax, Secure in production. Chrome accepts it over
  `http://127.0.0.1` because that origin is trustworthy; a hosted preview over plain HTTP will not
  get a session at all.
- `/api/me` deliberately does not return the email address. Anything that needs it must be an
  explicit, authorised read.
- Salon team membership and the join-team flow are deferred IDEA-009 scope and are now labelled as
  browser prototypes. Decide whether the private beta shows the tab at all, and keep the six-person
  paper test as the gate before any real implementation.
- `BOOKING_COMMITMENTS` and `PAYMENTS_LIVE` stay false. Shop and Delivery remain interest register
  only. Feature flags and route gates are covered by `tests/feature-gates.cjs` and
  `tests/shop-delivery-containment.cjs`.

## Receipts on this branch

- `docs/readiness/beta/live-auth-journey.json` and `live-app-cleanup.json`: the authenticated
  browser journeys, their conditions, the click-findings that show whether a real pointer landed, the
  timestamped stage list, `pg_stat_activity` samples taken while the run was live, the tail of the
  application server log, and the teardown result.
- `docs/readiness/beta/live-accessibility-audit.json` and `live-a11y-cleanup.json`: the axe scan at
  six viewports, keyboard order, reduced motion, 200 percent text, slow-link and offline results.
- `docs/readiness/sprint4/`: the founder's own disposable PostgreSQL runner receipts. This branch
  does not rewrite them; only the founder's runner writes them.
