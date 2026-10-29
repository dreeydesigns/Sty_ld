# STYLD hosted beta test plan

Date: 2026-10-29
Branch: `qoder/styld-beta-20261027`

The exact preview URL, deployed commit and build identifier for the revision this plan was written
against are at the top of `STYLD_FINAL_4_PILLAR_CLOSEOUT.md`. If that file and a live URL ever
disagree, the file is right and the URL is stale.

## What this test is

A controlled, in-person usability and trust test of the restricted beta with invited testers in
Nairobi, on their own phones, with a facilitator present. It answers three questions a lab cannot:

1. Can a first-time visitor complete a real journey on a real Kenyan network without help?
2. Does every sentence the product shows read as true to someone who has not seen the source?
3. Where does the product feel slow, unclear or untrustworthy in the first five minutes?

It is not a load test, a security test or a payment test. No payment, booking or commitment exists in
this build, and testers are told so before they start.

## Before any tester is invited

All of these must be true, or the test does not run:

- A preview URL that answers `200` to an anonymous request, not a 302 to Vercel's login.
- A preview database that is not the production one, with the migrations in `sql/migrations/`
  applied in order.
- A real email sender configured for the preview, and one test inbox the facilitator can read.
- The terms placeholder date resolved on `/terms` and `/privacy` (see
  `STYLD_FOUNDER_ACTIONS_MINIMAL.md`, item 5).
- `PAYMENTS_LIVE`, `BOOKING_COMMITMENTS`, Shop and Delivery still off. Confirm on `/api/health` and
  by checking that a booking attempt answers 503 with the "no booking or payment has been made"
  sentence.
- A named person to receive issues, and a way to record them (a shared sheet is enough).

## People and devices

Six to eight testers is enough for a first round. Recruit, per role:

- Three clients who book beauty services in real life.
- Two professionals or salon owners who currently take bookings on WhatsApp or Instagram.
- One person who will act as administrator, which is a facilitator role, not a tester role.

Devices, at least one each: a low-end Android phone (Tecno, Infinix or similar) on mobile data, a
mid-range Android on Wi-Fi, an iPhone on mobile data, one tablet. No desktop-only session: the
product is built for phones.

Record for every session: device model, OS version, browser and version, network type, and whether
the phone was on battery saver.

## Ground rules for the facilitator

- Do not explain the product before the first task. Read the task, then stay quiet.
- Do not point at the screen. If a tester is stuck for 90 seconds, note it and then help.
- Ask testers to think aloud only in the first session per device; silent observation is more honest.
- Never say "it should..." about a behaviour you have not seen on this device.
- Stop the session if anything shows a state that claims payment, confirmation or verification.

## Scripted journeys

Each journey has a pass sentence the tester should be able to say in their own words afterwards.
Record the exact wording they use; it is the finding.

### 1. Arrive and understand (client)

Open the URL fresh. Ask: what is this, who is it for, what can you do here?

Pass: the tester describes a place to find beauty services and the people who provide them, without
saying "shop", "booking app" or "payment".

Watch: time to first meaningful screen, whether the signature loader shows or is skipped on this
device, and whether anything jumps or shifts while it loads.

### 2. Create an account (client)

Sign up with a real inbox. Read the code from the email and sign in.

Pass: signed in without help, and the tester can say what the account is for.

Watch: how long the code takes to arrive, whether the six-digit entry is easy on a small keyboard,
and what the screen says while it waits.

### 3. Discover and open a Look

Browse Discover, open a Look, then open the professional behind it.

Pass: tester understands a Look is a real posted service by a real provider.

Watch: whether the provider page states what is verified and what is not, and whether "Save" is
findable on a 5.5-inch screen one-handed.

### 4. Save, plan, and check the estimate (client)

Save two providers, open the Plan, pick a leading choice, open the estimate.

Pass: the tester reads the estimate as partial and says so, for example "it doesn't give me a total".

Watch: any moment where a number reads like a quote. Record the exact string if so.

### 5. Compare, including on a slow connection

Compare two providers, then a third, then remove one. Repeat once on mobile data with the phone in a
weak-signal spot if the tester is willing.

Pass: rows appear, and if the wait is long the screen says it is slower and offers a retry that
works.

Watch: whether the "Retry loading" notice appears, how long before it appears, and whether the tester
presses it without prompting.

### 6. Ask to discuss (client)

From a provider page, send a request with a short note.

Pass: the tester says they asked to talk, and does not believe they booked anything.

Watch: the sentence "This is not a booking." Did they read it? Ask them to repeat what happens next.

### 7. Answer a request (professional or salon)

On the provider account, open requests and accept one.

Pass: the provider understands accepting opens a discussion, not an appointment.

Watch: whether the next-step expectation is clear. Record what they ask the facilitator.

### 8. Withdraw and decline (client and provider)

Withdraw a sent request as the client. Decline one as the provider.

Pass: both sides see the state change without a reload, and no error text appears.

### 9. Bad network and recovery

Turn mobile data off with a page open, then on again.

Pass: an offline notice appears and clears, and nothing the tester did is silently lost.

Watch: whether the tester waits or abandons. Record the time to the notice.

### 10. Trust check (all testers, at the end)

Show `/terms` and `/privacy`. Ask: is there anything here you would not sign?

Pass: no placeholder text, and the effective date is present.

## What testers must not be told, and must not be able to do

- No payment is possible, and no tester should be asked for card details, M-Pesa details or any
  personal financial information.
- No booking is created. "Request to discuss" is not an appointment.
- No verification badge means anything beyond what its label says.
- Shop and Delivery are not part of this test. If a tester finds an entry point, that is a finding.

## Recording findings

One row per finding:

| Field | What to record |
| --- | --- |
| Time | Local time, to the minute |
| Tester | Code name, role, device, browser, network |
| Journey | 1 to 10 above, and the step |
| What happened | What the screen did, in one sentence |
| What was expected | The tester's words, not yours |
| Evidence | Screenshot or screen recording, plus the URL with the path only (no query with tokens) |
| Severity | Blocking, major, minor, wording |
| Claim risk | Yes if the screen implied payment, confirmation, verification or a total |

Stop the test immediately, and report the same day, if any of these happen:

- A screen says or implies that something is paid, confirmed, booked, secured or verified.
- One tester can see another tester's data.
- An error page shows a stack trace, a key, a connection string or an email address.
- A pending image is reachable by a plain public URL.

## Exit criteria for the first round

- Every journey attempted by at least three testers on three devices.
- No open blocking finding.
- No claim-risk finding left open without a copy change that was re-tested.
- The three questions at the top answered in writing with quotes.
- A decision from the founder: fix and repeat, or widen the group.

## Support path during the test

- One facilitator phone number and one inbox, given to testers in writing before they start.
- The facilitator watches the deployment's error log during sessions.
- If the deployment misbehaves in a way that affects data, stop the session, note the time, and roll
  back by redeploying the previous preview revision. Production is not touched either way.

## Data after the test

- Delete the tester accounts created for the session from the preview database at the end of the
  round, or keep them only with the tester's explicit consent.
- No tester data goes into the repository. Findings carry device and behaviour, never names, phone
  numbers, emails or codes.
- The receipts in `docs/readiness/beta/` are test evidence about the product, not about testers.

## What this plan does not cover

- Payments, bookings, Shop and Delivery, which are out of scope and off.
- Anything requiring the production deployment, which this work does not touch.
- iOS Safari outside the tester's own device, since this machine has no iOS simulator.
