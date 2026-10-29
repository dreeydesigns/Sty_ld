# STYLD founder actions, minimal set

Date: 2026-10-29
Branch: `qoder/styld-beta-20261027`
Application commit under test: see `STYLD_FINAL_4_PILLAR_CLOSEOUT.md`, which names the exact SHA this
file was written against.

Five items need a person with account access. Four are credentials or account settings that this
agent has no right to change. The fifth is a date only you can set. Everything else in the beta gate
is code, tests and receipts, and those are recorded in the department ledger.

Each item below says what is blocked, the smallest action that unblocks it, and the evidence that
will exist once it is done. Nothing here touches production, enables payments, or turns on booking
commitments.

## 1. Let the test harness reach the preview deployment

**Blocked:** every hosted check. Vercel Deployment Protection answers an anonymous request to a
preview URL with a 302 to `https://vercel.com/sso-api?...`, so no automated browser can load a page,
let alone sign in. The build itself is fine: Vercel reports `success` for these deployments.

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

**Evidence once done:** `docs/readiness/beta/live-hosted-acceptance-preview-<date>.json`, with the
deployed revision in it.

## 2. A preview database that is not production

**Blocked:** a hosted sign-in that reads and writes real rows. Without a database, the preview can
render public pages and nothing else.

**Smallest action:** give the preview environment a connection string for a database that holds no
real user data, on a branch or project you own. Then apply the numbered files in `sql/migrations/`
that database does not yet have, in order. If it already carries the base schema, the three added in
this round are `014_users_integrity_guards.sql`, `015_media_manifests.sql` and
`016_discussion_requests.sql`. All three are tested on a disposable cluster and none has been applied
by this agent to any database.

**Do not** point it at the production database. The application would run, and the first test account
would be a real account.

**Evidence once done:** one line in chat naming the database by name (not by value), and the hosted
acceptance receipt showing an account created and a post read back.

## 3. A real email sender for the preview

**Blocked:** hosted sign-in. Authentication is a Better Auth email one-time code. The loopback
harness runs its own mail capture, so a deployed journey needs a sender that actually delivers.

**Smallest action:** set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender) in the preview
environment, and tell me one inbox I may use to receive the code. The harness reads the code from
that inbox; it never guesses one.

**Evidence once done:** the hosted receipt recording a session created through a real emailed code.

## 4. Provider-side restriction for pending media

**Blocked:** the claim that pending (unmoderated) media is protected by the storage provider as well
as by STYLD. The application currently refuses to serve a pending asset, which is the safe answer,
but files uploaded before that gate remain public `image/upload` URLs.

**Smallest action, in Cloudinary:**

- Make the pending folder or tag require signed or authenticated access, and confirm the plain public
  URL of one pending asset stops working.
- Provide `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_SIGN_KEY`, `STYLD_RESTRICTED_MEDIA_ENABLED=true` and one `STYLD_MEDIA_ALLOWED_ORIGINS`
  HTTPS origin.
- Then the verification record can be written for assets you have checked, and
  `provider_restriction_verified` can be set for those assets only.

**Evidence once done:** a signed delivery response from the application for an asset that answers
401 or 404 without the signature.

This item does not block the beta journeys, which use Looks without media. It blocks the sentence
"pending media is protected by the provider".

## 5. The terms and privacy effective date

**Blocked:** the only placeholder sentence left on a public page. `app/terms/page.tsx` renders
"Effective Date: [To be inserted by Styld]" and "Last Updated: [To be inserted by Styld]". No date is
invented here.

**Smallest action:** give the date the terms take effect, and say whether the privacy page carries the
same date.

**Evidence once done:** the two strings replaced, and the first-render receipt re-run.

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
