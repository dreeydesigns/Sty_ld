# STYLD MVP closeout report

Prepared by Qoder on 26 October 2026 for the founder. Branch
`qoder/styld-preview-closeout`, base `5c86d38` on `codex/styld-sprint3-20261026`.
This report states what is proven, what is only implemented, and what is blocked on a
founder action. A passing build is not evidence of a live journey.

## Verdict

STYLD is ready for a controlled private preview of browsing, planning and comparison.
It is not ready for a transactional launch. Bookings, payments, confirmed availability,
verification badges and real messaging are not live and no surface claims they are.

## What is proven on this branch

- Quality gates: typecheck zero errors, lint zero errors with 30 pre-existing image
  warnings, 660 of 660 unit and integration tests passing, production build exit 0 with
  115 static pages, `npm audit` reporting zero advisories, `git diff --check` clean.
- Client journey in a real browser against the production build with every API mocked:
  49 Plan/Estimate scenarios, 33 Build 1 journey scenarios across six worlds, 50 Compare
  scenarios, 30 shortlist and Saves coexistence scenarios, 32 private-saves scenarios,
  10 email failure-state scenarios and 6 session-state scenarios. Viewports 360, 375,
  390, 768, 1366 and 1440 px.
- Truthful state: a guest is redirected to sign-in with the destination preserved, a
  private estimate is never rendered for another role, an unconfigured or failed email
  never claims delivery, and a failed write never shows Saved.
- Passwordless email OTP is proven end to end against a disposable database with the
  mail transport captured, including code issue, verification, expiry and reuse refusal.

## What was fixed here

- Session state on Activity and Application Status is decided by the server answer, not
  by a value read during render. The Application Status page then had a second defect:
  its 401 branch set the guest flag and the next handler cleared it, so a signed-out
  visitor saw an empty application list as if the account had been recognised.
- The contact route no longer trusts a forgeable header, uses the shared hashed
  fail-closed limiter, and answers 503 when the store or a trusted source IP is missing.
- Gmail OTP transport added with an explicit sender, TLS on port 465, bounded timeouts,
  attachment and URL access disabled, no SMTP logging, and fail-closed provider choice.
- Compare and shortlist planning integrated from uncommitted work, with prices only for
  exact catalogue matches and "Not provided" or "Unconfirmed" where a fact is absent.
- Copy stops promising a contact unlock and a guaranteed finish that no server record
  supports; package pricing is now labelled illustrative.

## What is implemented but not proven

- Real signed-in browser sessions on a host. The local test database is in-process only,
  so an authenticated session cannot be produced without a deployed environment.
- Real inbox delivery. The Gmail transport is coded and unit-proven; no message has been
  sent to a real inbox from this branch.

## Blocked, with the single founder action for each

- Preview authentication: set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` on the Preview
  environment scope. Until then the preview shows the honest not-configured state.
- Real email proof: create a Google App Password and save it directly as a sensitive
  Preview variable, never in a chat or a file.
- Client interests persistence, legacy account recovery and the Counter scope: product
  decisions, no code was invented for them.
- Payments, booking commitments, Shop, Delivery and IDEA-009 remain off by design.

## Known integrity gap that must stay closed

`docs/STYLD_BOOKING_OWNERSHIP_BLUEPRINT.md` records five blockers, the most serious being
that a booking created today stores no `provider_id` or `provider_workspace_id`, so
provider-scoped reads cannot yet be trusted. Commitments must stay disabled until those
are proven with server records.
