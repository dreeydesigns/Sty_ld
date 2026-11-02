# STYLD public investor site

`public-site/` is a separate, public-only Vercel project. It is not the beta application.

This note lives in `docs/` and not in that folder on purpose: everything inside `public-site/` is served, so
a README there would be a publicly fetchable file describing internal gate names and a local database path.

## What it is

A static site with nothing to compile, no script of any kind, no cookies and no analytics. Two pages,
`index.html` and `privacy.html`, one stylesheet `styles.css`, `robots.txt`, `sitemap.xml`, the fixed
`www`-to-apex redirect in `vercel.json`, the no-op `package.json`, and the images under `assets/`.

It is deployed as its own Vercel project with Root Directory set to `public-site`. It must not receive
environment variables, it must not connect to the `styld_beta` database, and Vercel Deployment Protection
must stay disabled on it so an investor is not sent to a sign-in wall.

The beta application stays a different project on a different host. The apex domain `wearestyld.com` points
here. `beta.wearestyld.com` is not connected until DB-ISO-01, CFG-01 and SAFETY-01 have independent evidence.

## Rules for editing the copy

- Every capability claim is read from the shipped beta build. The "Working in the private beta" and
  "Not enabled yet" lists map to `FEATURES` in `lib/feature-flags.ts` and to the routes that refuse in
  `middleware.ts`. If a gate changes, both lists change in the same commit.
- Never add a number that is not in a database: no market size, no provider count, no retention, no
  revenue, no waitlist total.
- Never add a testimonial, a partner logo, a verification badge or a sample provider profile.
- Never say bookings, payments or provider availability are live.
- Screenshots under `assets/screens/` come from `tests/browser/live-public-screenshots.cjs`, which runs the
  production build against an empty disposable test database. A frame that shows seeded or synthetic
  records is not a source for this site.
- The contact address is `hello@styld.co.ke`, the address already shipped in the beta's public pages.
- No em dashes or en dashes anywhere in this folder. `tests/public-site.cjs` fails on them, and
  `tests/copy-typography.cjs` does not reach this folder, so that gate is the only one that does.

## Checking it locally

```
node --test tests/public-site.cjs
node tests/browser/live-public-screenshots.cjs --bin "<path to the PostgreSQL 17 bin directory>"
node tests/browser/live-public-site-check.cjs
```

The first command holds the content rules. The second re-captures the four product frames from a real
production build against an owned disposable database and writes
`docs/readiness/beta/live-public-screenshots.json`. The third serves this folder over loopback, opens it in
Chrome at desktop and phone widths, measures every tap target and every image, and writes
`docs/readiness/beta/public-site-static.json` beside two full-page screenshots. Both receipts are gates:
`tests/public-site.cjs` fails if a published frame is not the frame the harness captured, or if the last
browser pass found a dead link, an unloaded frame or a control under 44px.

## Deploying it

The exact account-owner clicks are the eleven-step runbook under "The exact clicks that attach the domain" in
`docs/readiness/beta/STYLD_DOMAIN_ACTIVATION_AND_MVP_CLOSURE_2026-10-31.md`, and step 1 of the founder actions
in that file. The short form: this folder is imported as its own Vercel project with Root Directory
`public-site`, no environment variables, Deployment Protection off, its Production branch pointed at
`qoder/styld-beta-20261027` so a custom domain has a production deployment to resolve to, and
`wearestyld.com` plus `www.wearestyld.com` attached to it. `package.json` here exists only so the build step
is a no-op under the Other preset the runbook sets; it declares no dependencies and runs no code.
