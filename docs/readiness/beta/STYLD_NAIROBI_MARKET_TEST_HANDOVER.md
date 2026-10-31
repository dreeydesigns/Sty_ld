# STYLD Nairobi market test handover

Date: 2026-10-30
Branch: `qoder/styld-beta-20261027`. Local HEAD `cb9d34b`; deployed preview `683f8c3`.
Verdict this handover is written under: **B, engineering complete, founder action required.** The
product is not approved for physical market testing yet, and this file says what has to be true before
the first session.

## The state in one paragraph

The application is finished for the beta scope and proved on this machine: a production build, a real
Better Auth session, a real database, 69 routes that all ship words, 14 browser suites clean, 14 of 14
live journey steps, the accessibility sweep with 0 content violations, and the six customer journeys
accepted in `STYLD_JOURNEY_ACCEPTANCE.md`. The browser receipts were re-run on build
`YHmKlFY-FAfZVz0NcHCHD` on 2026-10-31, so they describe the code in this branch. What is missing is not
code. A stranger cannot reach the deployment, the deployment has no database of its own, no sender can
deliver a login code, and the two policy pages carry dates nobody can support. Those are the founder's
six actions in `STYLD_FOUNDER_ACTIONS_FINAL.md`, and three of them (items 1, 2, 3) are the difference
between a run and no run.

## Before the first session, all of these are true

The same list the runbook carries, in the order that keeps a real customer's data safe:

1. The preview points at its own empty database, branch-scoped, and `/api/health/environment` answers
   from inside the deployment with that database's name and 16 applied migrations.
2. A verified sender plus one test inbox, and one hosted sign-in completed with a genuine emailed code.
3. The tester origin is open (protection off for previews, or a bypass) and equals `BETTER_AUTH_URL`.
4. The terms and privacy dates are set from a record that supports them; the placeholders are gone.
5. `PAYMENTS_LIVE`, `BOOKING_COMMITMENTS`, Shop and Delivery are still off. Confirm on `/api/health`
   and by checking that a booking attempt answers 503 with the "no booking or payment has been made"
   sentence.
6. A named person receives issues and a shared sheet records them.

## What testers can and cannot do in round one

Say it before the first task, because a tester who cannot find a button will report it as a defect:

- Images cannot be uploaded. The server refuses uploads until the storage provider proves the pending
  folder is private, so posting a look, a portfolio photo or an avatar is out of scope for this round.
  Everything that does not need a new image works.
- Nothing is booked, paid or committed. A request to discuss is a request; the product says so on the
  screen that makes it.
- Shop and Delivery are interest registers, not stores.

## Sessions

The full runbook is `STYLD_HOSTED_BETA_TEST_PLAN.md` and is not repeated here: 6 to 8 testers, three
clients who book beauty services in real life, two professionals or salon owners who take bookings on
WhatsApp or Instagram today, one facilitator playing administrator; at least one low-end Android on
mobile data, one mid-range Android on Wi-Fi, one iPhone on mobile data, one tablet; ten scripted
journeys, each with the pass sentence the tester should be able to say in their own words.

Three facilitation rules that change the value of what comes back: do not explain the product before the
first task; do not point at the screen; stop the session if anything on screen claims a payment, a
confirmation or a verification the server did not record.

## What this round must settle that a lab cannot

Recorded as NOT RUN today, in `STYLD_MOBILE_AND_UX_ACCEPTANCE.md`, and each one is a market-test
question rather than an engineering task:

- iOS Safari, on a real iPhone. No device here has ever rendered this build on WebKit.
- Low-end Android handsets on Kenyan mobile data. The throttled numbers here are simulated at 4x CPU on
  a desktop browser.
- The 63 color-contrast nodes axe left incomplete (62 on the preceding build). A facilitator with the phone in sunlight can decide
  whether the text is readable; that is a human judgement, and no re-run of axe will make it.
- Whether the "no image upload this round" limitation is tolerable to a provider whose whole pitch is
  her portfolio. That is a product question the beta exists to answer.

## Stop conditions

Stop the test, do not just log it, if any of these happens:

- A tester's data appears in a place another tester should not see.
- Any screen states that something is saved, sent, booked, paid, confirmed or verified when the server
  has no record of it.
- An email from the product arrives at an inbox nobody named.
- The database the probe reports is not the branch-scoped one.

The last one is why the environment probe exists: it answers `current_database()` from inside the
running deployment, so isolation is proved by the process rather than assumed from a dashboard setting.

## Data policy for the round

Testers' names, contacts and images are real personal data and the beta holds them in a preview
database. Keep that database separate from production, delete the test rows when the round ends, and do
not move anything from it into production. Do not publish a screenshot of a tester's data in a report.

## After the round

The only new engineering work is what the sessions find. Every finding gets a ledger row in
`DEPARTMENT_LEDGER.md` with the receipt that proved it or the test that will, and the same status words
this round uses: VERIFIED COMPLETE, IMPLEMENTED BUT UNVERIFIED, IN PROGRESS, BLOCKED, DEFERRED,
SUPERSEDED, FAILED ACCEPTANCE. A finding that needs a device this machine does not have stays recorded
as NOT RUN until someone with the device runs it.
