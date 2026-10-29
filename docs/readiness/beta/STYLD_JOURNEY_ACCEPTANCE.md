# STYLD journey acceptance register

Date: 2026-10-29
Branch: `qoder/styld-beta-20261027`
Evidence commits: `8c46b7f` (Compare wait fix), `9964c0d` (receipts and ledger), `7d1ebd3` (live
request journey step and this register)
Build under test: `bSzE3Vm0XijUzz5UwSuz6`
Live journey receipt: `docs/readiness/beta/live-auth-journey.json`, 14 of 14 steps passed, written by
the run at `7d1ebd3`. Steps are numbered in the order that receipt lists them.

Method: every "PASS" below names a receipt that a harness wrote while it ran, not a reading of the
source alone. The live receipts come from a production `next start` on an owned, disposable
PostgreSQL 17.11 loopback cluster with a real Better Auth session, so no route is intercepted. The
mocked receipts come from `scripts/run-browser-qa-mock.cjs`, which serves the same production build
and rewrites only `/api/**`. Unit and database receipts come from `npm test` (806 of 806) and
`scripts/run-local-postgres.cjs` (28 of 28, `dirtyTestInputPaths []`).

| Journey | Scope | Verdict | Primary receipt |
| --- | --- | --- | --- |
| JOURNEY-01 | Canonical Looks, service reference, trusted demo provenance | PASS | `docs/readiness/beta/live-auth-journey.json`, `tests/look-contract.cjs` |
| JOURNEY-02 | Plan V2 persistence, shortlist of three, leading choice, conflict | PASS | live journey steps 4 and 6, `tests/browser/compare.cjs`, `tests/browser/plan-v2.cjs` |
| JOURNEY-03 | Truthful estimate with no implied total | PASS | `components/plan-estimate.tsx`, live journey step 5, mocked journey step |
| JOURNEY-04 | Compare two or three providers with a measured slow-read path | PASS, responsive fix shipped | `docs/readiness/beta/compare-wait-stress.json`, `tests/browser/compare.cjs` |
| JOURNEY-05 | Non-binding request to discuss, never a booking | PASS | live journey step 6, `tests/discussion-requests.cjs`, `tests/postgres/discussion-requests.cjs`, migration 016 |
| JOURNEY-06 | MFA-gated moderation with audit and private pending media | PASS for the code and live path, provider-side media protection BLOCKED on founder | live journey step 10, `tests/postgres/moderation.cjs` |

## JOURNEY-01: a Look is proof of a real service, not a label

What the directive asks for: a Look counts only when it is a public, published, moderated,
non-deleted post by a professional or salon workspace, carrying exactly one `svc:<uuid>` reference
that resolves to an active service owned by that same workspace, and that eligibility is re-checked
on every read. The reserved `qa:demo` marker must never be settable by a client on any create, edit,
moderation or import path.

Where it lives:

- `lib/look-contract.ts:90` `checkServiceTagsForCreate` refuses `qa:demo` from every client
  (`:96`), refuses more than one service reference, refuses a malformed reference, and refuses
  service references from roles other than professional and salon.
- `app/api/social/posts/route.ts:226` is the only create path, and it re-queries the referenced
  service to prove the workspace owns it and the service is active (`:232` onwards).
- `app/api/social/posts/[id]/route.ts` exposes only GET and DELETE, so there is no edit path that
  could add a tag after creation. The moderation route accepts decisions, not tags.
- `lib/look-contract.ts:126` `buildCanonicalLook` re-derives all of it on read: visibility,
  publication, moderation, author role, service ownership and activity. A stale or hand-edited row
  stops being a Look.
- `lib/look-contract.ts:176` derives `demoProvenance.trusted` from the tag rather than a column, and
  only the founder-authorized fixture package can write that tag (`scripts/pilot-fixture-package.cjs`
  builds a dry-run manifest for one allowlisted review identity and prints `dryRunOnly: true`).

Evidence: `tests/look-contract.cjs` covers the reserved tag, the client role refusal, the malformed
reference, duplicates, the two-reference case, ownership and each read-side revalidation. Live
journey steps 5 and 11 show a real saved Look and a real moderation transition against the real
database.

Not claimed: a Look is not evidence of payment, verification or availability, and the UI does not
say it is.

## JOURNEY-02: the Plan is server state with a version, not tab state

What the directive asks for: Plan V2 persisted per client workspace, shortlist at most three with a
leading choice that must be in the shortlist, a 409 precondition rather than last-write-wins, and a
conflict the visitor can recover from in place.

Where it lives:

- `lib/plan-v2.ts:30` to `:58` validates the whole field set: unknown keys rejected, revision-2
  schema, at most three shortlist ids, ten services, lower-cased UUIDs, no duplicates, leading
  choice must be in the shortlist.
- `lib/plan-repository.ts:66` writes inside a transaction with `SELECT ... FOR UPDATE` (`:71`), so a
  stale revision returns a conflict instead of overwriting (`:72`).
- `app/api/plan/route.ts:33` requires `If-Match` to equal the server-derived ETag for the expected
  revision, and `:35` answers 409 with the current Plan.
- `lib/plan-client.ts` treats 409 and 412 as a recoverable conflict, keeps the visitor's edits, and
  `resolveConflict` either reloads the saved version or retries the edits against it.
- Ownership is only ever the server session (`app/api/plan/route.ts:9`), never a client-supplied
  workspace or user id.

Evidence: live journey step 4 shortlists two real providers from their pages and reads the stored
`activePlan.shortlistProviderWorkspaceIds` and revision back out of `identity_workspaces`; step 7
proves a second account cannot read the first account's Plan. `tests/browser/compare.cjs` covers the
stale revision, Undo after a committed remove, identity switching, and the guest path that never
loads or writes a private Plan.

Not claimed: nothing in the Plan reserves a provider, and the copy says so.

## JOURNEY-03: an estimate that never invents a total

What the directive asks for: show what is known, say "Not provided" for what is not, and never imply
the figure is a complete or payable total.

Where it lives: `components/plan-estimate.tsx:62` shows "Not provided" instead of a subtotal whenever
the selected services are not all priced, `:63` and `:64` label add-ons, mobile travel, and taxes as
"Unconfirmed", and the final line is always "Not provided". Dates, areas and durations that are
missing say "Not provided" rather than being filled in.

Evidence: the mocked journey in `tests/browser/compare.cjs` walks Discover, Save, Saved, Look, Plan,
Estimate, Compare and back, asserting the same Plan survives. Live journey step 5 saves a Look and
reads the plan row back from the database.

Not claimed: the estimate is not a quote, and the page does not say it is.

## JOURNEY-04: Compare is honest under a slow read

What the directive asks for: reproduce the intermittent Compare wait with bounded real-database tests
under CPU and 3G contention, collect time to request, the `/api/plan` answer and revision, time to
visible rows, and decide on a fix with a measured threshold rather than a guess.

What was measured, both runs on the committed instrument
(`tests/browser/compare-wait-stress.cjs`, receipt `docs/readiness/beta/compare-wait-stress.json`):

- At `fe5625e`, 16 visits: 15 painted. One visit painted at 18216ms and one never painted inside the
  20s bound while its `GET /api/plan` answered `200` at 20375ms. The post-timeout DOM probe found the
  table present with every row label, so the rows were never missing; the wait was request latency.
- At `ea1a416`, the same instrument with a Node-side isolation block: 16 of 16 painted, rows p50
  3078ms and p95 3993ms under 3G with 4x CPU throttling. The same server answered `GET /api/plan` for
  the same session in 52ms p50 and 62ms p95, and 725ms at the worst of eight concurrent calls. The
  first-visit waterfall shows the document arriving at 2078ms and the plan request leaving the
  browser afterwards, which is where the visible wait lives on a cold visit, not in the database.

Conclusion: the gating logic in `components/provider-comparison.tsx` was correct in both runs; the
tail was host contention inflating document and request latency. The gap that the slow run exposed is
recovery: a signed-in visitor had no message and no action while the request was in flight.

Fix shipped at `8c46b7f`: after the measured 6s threshold (1.5x the 3993ms p95), Compare adds a
plain slower-connection sentence and a `Retry loading` button, both `role="status"`, and the notice
clears when rows arrive. `tests/browser/compare.cjs` runs a 9s delayed plan read, asserts the notice
is absent before the threshold and present after it, retries, reaches the rows, and asserts the
notice is gone. No locator timeout was relaxed; the live journey still uses its original 30s budget.

Not claimed: 6s is a UX threshold for showing help, not a promise about network speed, and a retry is
not a guarantee that a starved host will answer faster.

## JOURNEY-05: a request to discuss is not a booking

What the directive asks for: a client can ask to discuss a provider's service, the provider can
accept the discussion, decline it, or let it expire, the client can withdraw, and nothing in the
feature implies a reservation, a slot, availability, a payment or an escrow.

Where it lives:

- `sql/migrations/016_discussion_requests.sql` creates the table and its status check.
- `lib/discussion-requests.ts:14` is the whole status set: `requested`, `discussion_accepted`,
  `declined`, `withdrawn`, `expired`. Expiry is applied on read and on decision (`:92`, `:228`), and
  a decision on an expired request answers 409 rather than reviving it.
- `app/api/discussion-requests/route.ts:56` requires a same-origin request and a server session
  (`:58`, `:59`); `app/api/discussion-requests/[id]/route.ts` applies the same rule to decisions.
- `lib/feature-flags.ts:22` keeps `PAYMENTS_LIVE` false and `:27` keeps `BOOKING_COMMITMENTS` false,
  and `app/api/bookings/route.ts:30` answers 503 with a sentence that says no booking or payment has
  been made.

Evidence: live journey step 6 opens a real provider page as a signed-in client, sends a request with
a note, and then reads the stored row back: exactly one row, status `requested`, the note as typed,
the caller's own workspace as the client, the provider's workspace as the receiver, and no decision
time. The same step opens `/profile?tab=requests` and sees the note with "Waiting for a reply", then
tries to accept as the sender and gets 403 while the row stays `requested`. That step applies
migration 016 to the run's own disposable cluster, and the receipt records the applied schema.
`tests/discussion-requests.cjs` runs the API end to end against the real route handlers, and
`tests/postgres/discussion-requests.cjs` proves the partial unique index, every named check and the
conflict target on server PostgreSQL 17.11.

Not claimed: accepting a discussion does not create a booking, a message thread or a payment, and the
UI language stays at "request to discuss".

## JOURNEY-06: moderation is gated, audited and private until decided

What the directive asks for: moderation transitions require an administrator with a live second
factor, every decision is audited with the acting user and the resulting status, pending media is not
public, and demo data is deterministic, preview-only and reversible.

Where it lives:

- `app/api/admin/moderation/route.ts:18` and `:92` call `requireAdmin`, which requires a verified
  factor (see `lib/auth-resolver.ts:35`).
- The decision takes the row `FOR UPDATE` (`:121`), re-checks the service reference (`:137`) and
  returns the status the database actually holds through `RETURNING` (`:153`), so the answer cannot
  disagree with the row.
- Each decision writes a `security_events` audit record with the actor, the resulting status and the
  reason.
- Pending media is served only to its owner through the restricted route added in migration 015 and
  `lib/media-*`, never from a public path.
- `scripts/pilot-fixture-package.cjs` builds deterministic `qa:demo` fixtures for one allowlisted
  review identity, is dry-run only (`:54` prints `dryRunOnly: true`), validates ownership, media and
  moderation on every record (`:31`), and returns a reverse-ordered cleanup plan for anything it
  would create (`:35`).

Evidence: live journey step 11 sets up a real TOTP factor, clears the queue, and the receipt records
the stored rows after both decisions plus the two audit records with actor, resulting status and
reason. `tests/postgres/moderation.cjs` covers the negative paths, including a decision without a
live factor.

Residual risk, stated plainly: Cloudinary delivers the pending media, and the provider-side
authenticated delivery setting has not been verified from the Cloudinary dashboard. Until that is
confirmed, `provider_restriction_verified` must not be recorded. This is a founder action, tracked in
`docs/readiness/beta/FOUNDER_ACTIONS.md`; it does not change the code verdict above, and it does
gate the claim that pending media is protected by the provider as well as by STYLD.
