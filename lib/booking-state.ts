/**
 * Styld — booking state machine (§5)
 *
 * P0A: `/api/bookings` previously accepted ANY string as a booking status and
 * wrote it straight to the DB, including money-implied states ("funded"/"paid")
 * and provider-side states ("accepted"/"in_progress"/"completed") that a client
 * must never be able to set. Statuses are now a closed set and every transition
 * is checked against the actor.
 *
 * Canonical statuses and who may drive them:
 *   draft        client  — an unsubmitted booking draft
 *   requested    client  — client has sent a booking request
 *   accepted     provider
 *   declined     provider
 *   rescheduled  client proposes, joint client + provider slot confirmation
 *   in_progress  provider
 *   completed    provider
 *   confirmed    joint (client confirmation of completion) — see note below
 *   cancelled    client or provider, from a pre-completion state
 *
 * NOTE (provider identity gap — P0D): there is no provider-side surface yet, so
 * provider transitions are modelled here but cannot be triggered through the API.
 * The same gap means `rescheduled → accepted` and `completed → confirmed` are
 * currently deny-by-default for a lone client (see CLIENT_FORBIDDEN_STATUSES and
 * tests/booking-state.test.ts), and are revisited in P0D.
 */

export const BOOKING_STATUSES = [
  "draft",
  "requested",
  "accepted",
  "declined",
  "rescheduled",
  "in_progress",
  "completed",
  "confirmed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingActor = "client" | "provider";

/** Statuses a client may never write directly (money-implied or provider-side). */
export const CLIENT_FORBIDDEN_STATUSES: readonly string[] = [
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "confirmed",
  "funded",
  "paid",
];

/** States a client is allowed to move a booking into. */
export const CLIENT_WRITABLE_STATUSES: readonly BookingStatus[] = [
  "draft",
  "requested",
  "rescheduled",
  "cancelled",
];

/** Legacy/aliased statuses seen in stored data → canonical status. */
const LEGACY_STATUS_ALIASES: Record<string, BookingStatus> = {
  pending: "requested",     // pre-P0A default written by /api/bookings
  requested: "requested",
  requested_booking: "requested",
  cancelled: "cancelled",
  canceled: "cancelled",
  completed: "completed",
  finished: "completed",
  confirmed: "confirmed",
};

/** Transitions a client may perform, keyed by canonical source status. */
const CLIENT_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["requested", "cancelled"],
  requested: ["cancelled", "rescheduled"],
  accepted: ["cancelled", "rescheduled"],
  declined: [],
  rescheduled: ["cancelled", "rescheduled"],
  in_progress: [],
  completed: [],
  confirmed: [],
  cancelled: [],
};

/** Transitions the provider side may perform, keyed by canonical source status. */
const PROVIDER_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["declined"],
  requested: ["accepted", "declined"],
  accepted: ["in_progress", "cancelled", "rescheduled"],
  declined: [],
  rescheduled: ["accepted", "declined"],
  in_progress: ["completed"],
  completed: ["confirmed"],
  confirmed: [],
  cancelled: [],
};

const TRANSITIONS_BY_ACTOR: Record<BookingActor, Record<BookingStatus, readonly BookingStatus[]>> = {
  client: CLIENT_TRANSITIONS,
  provider: PROVIDER_TRANSITIONS,
};

/** Strict membership test — `funded`, `paid` and arbitrary strings are not statuses. */
export function isBookingStatus(candidate: unknown): candidate is BookingStatus {
  return typeof candidate === "string"
    && (BOOKING_STATUSES as readonly string[]).includes(candidate);
}

/**
 * Normalize a stored/legacy status for comparison and display.
 * Unknown or absent values resolve to `draft` (never to a money-implied state).
 */
export function canonicalStatus(status: unknown): BookingStatus {
  if (typeof status === "string") {
    const trimmed = status.trim().toLowerCase();
    const alias = LEGACY_STATUS_ALIASES[trimmed];
    if (alias) return alias;
    if (isBookingStatus(trimmed)) return trimmed;
  }
  return "draft";
}

/**
 * May `actor` move a booking from `from` to `to`?
 * The source status is canonicalized first, so legacy `pending` rows behave as
 * `requested`. The target must be a canonical status, so money-implied and
 * provider-side targets are rejected for a client regardless of source.
 */
export function canTransition(from: unknown, to: unknown, actor: BookingActor): boolean {
  if (!isBookingStatus(to)) return false;
  if ((CLIENT_FORBIDDEN_STATUSES as readonly string[]).includes(to) && actor === "client") {
    return false;
  }
  const source = canonicalStatus(from);
  const allowed = TRANSITIONS_BY_ACTOR[actor]?.[source] ?? [];
  return allowed.includes(to);
}

/** Schedule (date/time) edits are only allowed while the slot is still negotiable. */
export function clientMayEditSchedule(status: unknown): boolean {
  const canonical = canonicalStatus(status);
  return canonical === "draft"
    || canonical === "requested"
    || canonical === "accepted"
    || canonical === "rescheduled";
}

/** Status the API writes when a client submits a booking request. */
export const INITIAL_BOOKING_STATUS: BookingStatus = "requested";
