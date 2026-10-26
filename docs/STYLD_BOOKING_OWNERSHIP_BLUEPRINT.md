# STYLD booking ownership blueprint

Scope: every booking read and write in `app/api/bookings/route.ts`, the identity each
predicate is allowed to use, what the current tests prove, and what still blocks
`FEATURES.BOOKING_COMMITMENTS`. This document changes no flag, no schema and no
production data.

## Identity rules

- Session identity comes from `resolveCurrentStyldUser()` on the server. Nothing in the
  request body or query string can supply `userId`, `workspaceId` or `role`.
- `resolveSessionUser()` rejects an admin or super_admin session that has not passed MFA
  (`app/api/bookings/route.ts:17`). An unauthenticated call returns 401 before any query.
- `payment_status` and `payout_status` are never written by this route, so no booking
  response can claim a payment state.

## Gates that run before any database access

| Handler | Gate | Response | Proof |
|---|---|---|---|
| POST | `BOOKING_COMMITMENTS` false | 503 "No booking or payment has been made." | `tests/booking-regressions.cjs` "disabled booking behavior: submit is rejected...", `tests/database-adapter-regression.cjs` "booking submission stays disabled without touching the database" |
| PATCH | `BOOKING_COMMITMENTS` false | 503, `Cache-Control: no-store` | `tests/booking-regressions.cjs` "booking PATCH is blocked and mutates nothing...", `tests/database-adapter-regression.cjs` "booking commitments are gated before any database access" |

Both gates precede the first `authPool.query`, asserted by statement position and by a
zero-query counter.

## Read and write predicates

| Path | Predicate | Notes |
|---|---|---|
| `GET` client view | `WHERE client_id = <session id>` | Default path for client roles. |
| `GET` provider view | `WHERE provider_id = <session id> AND provider_workspace_id = <session workspace>` | Requires a workspace; missing workspace returns 403 instead of an unscoped read. |
| `GET ?role=provider` | Rejected 403 for a client session | A query parameter cannot widen scope. Asserted in `tests/booking-regressions.cjs`. |
| `POST` insert | `client_id` bound from the session only | Provider fields are data, not authorization. |
| `POST` idempotent replay | `WHERE (local_id = $1 OR idempotency_key = $2) AND client_id = $3` | Another user's identical `local_id` is not returned; the conflict path answers 409. |
| `PATCH` lookup | `($admin) OR (provider_id AND provider_workspace_id) OR (client_id)` | One statement, all identities from the session. |
| `PATCH` update | Same identity predicate plus `AND status = <status just read>` | Optimistic lock, so a concurrent transition makes the second write affect zero rows and answer 409. |
| `PATCH` client extra bound | `AND status IN ('pending','requested','accepted','confirmed','reschedule_requested')` | A client cannot edit a terminal booking. |
| Transitions | `validateBookingTransition(previous, target, role)` in `lib/booking-state.ts` | A client may only cancel or request reschedule and can never mark a booking completed. Legacy `pending` and `confirmed` normalize to `requested` and `accepted`. |

No predicate authorizes by display name or slug: `tests/booking-state-machine.cjs`
asserts the route never compares `provider_slug` or `user.username` for access.

## Open blockers before commitments can be enabled

1. Provider linkage is not written at create time. `POST` stores `provider_slug` and
   `provider_name` from the request body and never sets `provider_id` or
   `provider_workspace_id`; those columns only exist for rows backfilled by
   `sql/migrations/011_identity_workspaces.sql`. A booking created today is invisible to
   the provider read and write predicates. Enabling commitments needs a server-resolved
   provider identity derived from an owned service record.
2. Price and services are client-supplied. `total_kes`, `service_names`, `target_type`
   and `provider_name` are shape-validated but never reconciled against the provider's
   own catalog, so no authoritative price exists to show a client.
3. No availability source. There is no slot or calendar table, so double-booking
   prevention is unproven and a date/time cannot be described as held.
4. Unvalidated body fields. `provider_name`, `notes` and `serviceMode` reach the insert
   without type or length bounds. Today the commitment gate makes that path unreachable;
   it must be bounded before the gate opens.
5. `status_history` is written on create only. Later transitions do not append to it, so
   an audit trail of who changed what is incomplete.

## Copy rules that stay in force

`tests/booking-trust-copy.cjs` keeps customer-facing booking copy free of paid, funded,
secured, confirmed or received claims, removes the payment TrustShield and the accepted
timeline, and only renders the payment disclaimer when commitments are enabled. While
`BOOKING_COMMITMENTS` is false every booking surface states that no booking or payment
has been made.

## Decision record

Nothing in this document enables bookings, payments, Shop or Delivery. Flipping
`BOOKING_COMMITMENTS` is a founder decision that requires blockers 1 to 5 to be closed
and browser-accepted on the isolated Preview with the QA database only.
