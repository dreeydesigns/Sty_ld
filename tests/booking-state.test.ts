/**
 * P0A regression suite — booking state machine (lib/booking-state.ts)
 *
 * Vulnerability G: `/api/bookings` wrote any client-supplied string as a booking
 * status, so a client could declare a booking `completed`, or invent a money-implied
 * state such as `funded`/`paid` in a platform with no payment provider. These
 * assertions pin the closed status set and the per-actor transition policy.
 *
 * DENY-BY-DEFAULT NOTES (provider identity gap → P0D): `rescheduled → accepted`
 * and `completed → confirmed` are joint client+provider confirmations in the §5
 * design. There is no provider surface yet, so the shipped policy denies both to a
 * lone client; the tests assert that current, truthful behaviour. Revisit in P0D.
 */
import { describe, expect, it } from "vitest";
import {
  CLIENT_FORBIDDEN_STATUSES,
  canTransition,
  canonicalStatus,
  clientMayEditSchedule,
  isBookingStatus,
} from "@/lib/booking-state";

describe("booking state machine", () => {
  it("rejects arbitrary/unknown statuses", () => {
    expect(isBookingStatus("completed")).toBe(true);
    expect(isBookingStatus("funded")).toBe(false);
    expect(isBookingStatus("paid")).toBe(false);
    expect(isBookingStatus("nonsense")).toBe(false);
  });

  it("client cannot set money-implied or provider-side states directly", () => {
    expect(canTransition("requested", "completed", "client")).toBe(false);
    expect(canTransition("requested", "funded", "client")).toBe(false);
    expect(canTransition("requested", "in_progress", "client")).toBe(false);
    expect(canTransition("requested", "accepted", "client")).toBe(false);
    expect(canTransition("accepted", "completed", "client")).toBe(false);

    expect(CLIENT_FORBIDDEN_STATUSES).toContain("funded");
    expect(CLIENT_FORBIDDEN_STATUSES).toContain("paid");
  });

  it("client may cancel a requested booking", () => {
    expect(canTransition("requested", "cancelled", "client")).toBe(true);
    // Legacy rows written before P0A used `pending`; they canonicalize to requested.
    expect(canTransition("pending", "cancelled", "client")).toBe(true);
  });

  it("client may propose reschedule on accepted; confirming the slot is joint", () => {
    expect(canTransition("accepted", "rescheduled", "client")).toBe(true);
    // Joint client+provider confirmation: a lone client cannot accept the new slot.
    // Policy currently denies this for providers-less clients (P0D gap).
    expect(canTransition("rescheduled", "accepted", "client")).toBe(false);
  });

  it("client cannot set confirmed unilaterally (confirm-completion gated pending P0D)", () => {
    // Deny-by-default: confirmation of completion is a joint step (§5) and there is
    // no client-side surface that may claim it yet. Header docs are aspirational here.
    expect(canTransition("completed", "confirmed", "client")).toBe(false);
    expect(canTransition("in_progress", "confirmed", "client")).toBe(false);
  });

  it("provider transitions are not client-triggerable", () => {
    expect(canTransition("requested", "accepted", "client")).toBe(false);
    expect(canTransition("requested", "declined", "client")).toBe(false);
    expect(canTransition("in_progress", "completed", "client")).toBe(false);

    // The same moves are the provider's to make — the policy is actor-aware.
    expect(canTransition("requested", "accepted", "provider")).toBe(true);
    expect(canTransition("requested", "declined", "provider")).toBe(true);
    expect(canTransition("in_progress", "completed", "provider")).toBe(true);
  });

  it("schedule edits are restricted to reschedulable states", () => {
    expect(clientMayEditSchedule("requested")).toBe(true);
    expect(clientMayEditSchedule("accepted")).toBe(true);
    expect(clientMayEditSchedule("rescheduled")).toBe(true);
    expect(clientMayEditSchedule("completed")).toBe(false);
    expect(clientMayEditSchedule("cancelled")).toBe(false);
  });

  it("canonicalStatus normalizes legacy pending to requested", () => {
    expect(canonicalStatus("pending")).toBe("requested");
    expect(canonicalStatus(null)).toBe("draft");
  });
});
