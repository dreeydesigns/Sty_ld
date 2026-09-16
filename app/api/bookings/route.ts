/**
 * POST /api/bookings  — Create a booking request
 * GET  /api/bookings  — List the authenticated client's bookings
 * PATCH /api/bookings — Update status / schedule for the authenticated client's booking
 *
 * POST body (flexible — no UUID service required):
 * {
 *   localId:      string   — client-generated ID for idempotency
 *   serviceNames: string[] — human-readable service names
 *   providerSlug: string   — slug of the professional/salon
 *   providerName: string   — display name
 *   targetType:   "salons"|"professionals"
 *   bookingDate:  string   — ISO date
 *   bookingTime:  string   — e.g. "10:00 AM"
 *   totalKES:     number
 *   notes?:       string
 * }
 *
 * P0A (scope item G — booking cross-user mutation + state-machine enforcement):
 *  - the caller is resolved from the VERIFIED session (`verifySession`, which joins
 *    users and rejects deleted/inactive accounts) — never from a client-supplied id;
 *  - every read and update is scoped to `client_id = <session user id>`;
 *  - another client's booking is never revealed and never mutated → 404;
 *  - a status PATCH must name a canonical status and be a transition the client is
 *    allowed to make (`lib/booking-state.ts`). Money-implied states ("funded",
 *    "paid") and provider-side states ("accepted", "in_progress", "completed") are
 *    not client-writable;
 *  - schedule (date/time) edits are only allowed while the slot is still negotiable.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { verifySession } from "@/lib/auth-server";
import {
  INITIAL_BOOKING_STATUS,
  canonicalStatus,
  canTransition,
  clientMayEditSchedule,
  isBookingStatus,
} from "@/lib/booking-state";

interface BookingRow {
  id: string;
  status: string | null;
  booking_date: string | null;
  booking_time: string | null;
}

/** Resolve the authenticated user id, or null when there is no valid session. */
async function resolveSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  try {
    const session = await verifySession(token);
    return session.id;
  } catch {
    return null;
  }
}

function notAuthenticated() {
  return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveSessionUserId();
    if (!userId) return notAuthenticated();

    const body = await req.json().catch(() => null) as {
      localId?: string;
      serviceNames?: string[];
      providerSlug?: string;
      providerName?: string;
      targetType?: string;
      bookingDate?: string;
      bookingTime?: string;
      totalKES?: number;
      notes?: string;
    } | null;

    if (!body?.bookingDate || !body?.bookingTime) {
      return NextResponse.json(
        { ok: false, error: "bookingDate and bookingTime are required." },
        { status: 400 },
      );
    }

    const serviceNamesArr = body.serviceNames ?? [];
    const localId = body.localId ?? null;

    // Idempotency: a retry of the same client-generated id returns that booking.
    // Scoped to this client so nobody can probe another client's local ids.
    if (localId) {
      const existing = await sql`
        SELECT id FROM bookings
        WHERE local_id = ${localId} AND client_id = ${userId}
        LIMIT 1
      `;
      if (existing.rows.length > 0) {
        return NextResponse.json({ ok: true, bookingId: existing.rows[0].id, existing: true });
      }
    }

    const { rows } = await sql`
      INSERT INTO bookings (
        client_id, service_names, provider_slug, provider_name,
        target_type, booking_date, booking_time, total_kes, notes,
        local_id, status
      )
      VALUES (
        ${userId},
        ${serviceNamesArr as unknown as string},
        ${body.providerSlug ?? null},
        ${body.providerName ?? null},
        ${body.targetType ?? null},
        ${body.bookingDate},
        ${body.bookingTime},
        ${body.totalKES ?? null},
        ${body.notes ?? null},
        ${localId},
        ${INITIAL_BOOKING_STATUS}
      )
      RETURNING id, status, created_at
    `;

    return NextResponse.json({ ok: true, bookingId: rows[0].id, status: rows[0].status });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Booking failed." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const userId = await resolveSessionUserId();
    if (!userId) return notAuthenticated();

    const { rows } = await sql`
      SELECT
        id, local_id, service_names, provider_slug, provider_name,
        target_type, booking_date, booking_time, total_kes, notes,
        status, created_at, updated_at
      FROM bookings
      WHERE client_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ ok: true, bookings: rows });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load bookings." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await resolveSessionUserId();
    if (!userId) return notAuthenticated();

    const body = await req.json().catch(() => null) as {
      bookingId?: string;
      localId?: string;
      status?: string;
      bookingDate?: string;
      bookingTime?: string;
    } | null;

    if (!body || (!body.bookingId && !body.localId)) {
      return NextResponse.json(
        { ok: false, error: "bookingId or localId is required." },
        { status: 400 }
      );
    }

    const { status, bookingId, localId, bookingDate, bookingTime } = body;

    if (!status && !(bookingDate && bookingTime)) {
      return NextResponse.json(
        { ok: false, error: "Provide a status, or both bookingDate and bookingTime." },
        { status: 400 }
      );
    }

    // ── Load the row scoped to this client ──────────────────────────────────
    // A foreign booking id and a non-existent id are indistinguishable (404), so
    // this never confirms that another client's booking exists.
    const idToUse = (bookingId ?? localId) as string;
    const { rows } = await sql`
      SELECT id, status, booking_date, booking_time
      FROM bookings
      WHERE (local_id = ${idToUse} OR id::text = ${idToUse})
        AND client_id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
    }

    const existing = rows[0] as unknown as BookingRow;
    const current = canonicalStatus(existing.status);

    // ── Validate the requested status against the state machine ─────────────
    let nextStatus: string | null = null;
    if (status !== undefined && status !== null) {
      if (!isBookingStatus(status)) {
        return NextResponse.json(
          { ok: false, error: "Unknown booking status." },
          { status: 400 }
        );
      }
      if (!canTransition(current, status, "client")) {
        return NextResponse.json(
          { ok: false, error: `A client cannot move a booking from ${current} to ${status}.` },
          { status: 400 }
        );
      }
      nextStatus = status;
    }

    // ── Validate schedule edits ─────────────────────────────────────────────
    const wantsScheduleEdit = Boolean(bookingDate && bookingTime);
    if (wantsScheduleEdit && !clientMayEditSchedule(current)) {
      return NextResponse.json(
        { ok: false, error: `A booking in state ${current} can no longer be rescheduled.` },
        { status: 400 }
      );
    }

    await sql`
      UPDATE bookings
      SET
        status       = COALESCE(${nextStatus}, status),
        booking_date = COALESCE(${wantsScheduleEdit ? bookingDate : null}, booking_date),
        booking_time = COALESCE(${wantsScheduleEdit ? bookingTime : null}, booking_time),
        updated_at   = NOW()
      WHERE id = ${existing.id} AND client_id = ${userId}
    `;

    return NextResponse.json({ ok: true, status: nextStatus ?? current });
  } catch (error) {
    console.error("PATCH /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Update failed." },
      { status: 500 }
    );
  }
}
