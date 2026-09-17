/**
 * POST /api/bookings  — Create a booking
 * GET  /api/bookings/mine is at /api/bookings?mine=1
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
 * GET ?mine=1  — returns all bookings for the authenticated user
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { verifySession } from "@/lib/auth-server";
import { validBookingDate, validBookingTime } from "@/lib/booking-validation";

async function resolveUserId(token: string): Promise<string | null> {
  try { return (await verifySession(token)).id; } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const userId = await resolveUserId(token);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

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

    if (!body || !validBookingDate(body.bookingDate) || !validBookingTime(body.bookingTime) ||
        !Array.isArray(body.serviceNames) || body.serviceNames.length === 0 || body.serviceNames.length > 30 ||
        body.serviceNames.some(name => typeof name !== 'string' || !name.trim() || name.length > 200) ||
        typeof body.providerSlug !== 'string' || !body.providerSlug || body.providerSlug.length > 200 ||
        !['salons', 'professionals'].includes(body.targetType || '') ||
        typeof body.totalKES !== 'number' || !Number.isSafeInteger(body.totalKES) || body.totalKES < 0 ||
        (body.localId !== undefined && (typeof body.localId !== 'string' || body.localId.length > 100))) {
      return NextResponse.json(
        { ok: false, error: "Choose valid services, provider, price, date and time." },
        { status: 400 },
      );
    }

    const serviceNamesArr = body.serviceNames ?? [];
    const localId = body.localId ?? null;

    // Idempotency: if localId already exists, return the existing booking
    if (localId) {
      const existing = await sql`
        SELECT id FROM bookings WHERE local_id = ${localId} AND client_id = ${userId} LIMIT 1
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
        ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(serviceNamesArr)}::jsonb)),
        ${body.providerSlug ?? null},
        ${body.providerName ?? null},
        ${body.targetType ?? null},
        ${body.bookingDate},
        ${body.bookingTime},
        ${body.totalKES ?? null},
        ${body.notes ?? null},
        ${localId},
        'pending'
      )
      ON CONFLICT (local_id) DO UPDATE SET local_id = EXCLUDED.local_id
      WHERE bookings.client_id = EXCLUDED.client_id
      RETURNING id, status, created_at
    `;

    if (!rows.length) return NextResponse.json({ ok: false, error: 'Booking identifier is already in use.' }, { status: 409 });
    return NextResponse.json({ ok: true, bookingId: rows[0].id, status: rows[0].status });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Booking failed." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const userId = await resolveUserId(token);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

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
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const userId = await resolveUserId(token);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

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
    if ((bookingDate !== undefined && !validBookingDate(bookingDate)) ||
        (bookingTime !== undefined && !validBookingTime(bookingTime)) ||
        (bookingId !== undefined && typeof bookingId !== 'string') ||
        (localId !== undefined && typeof localId !== 'string')) {
      return NextResponse.json({ ok: false, error: 'Invalid booking date, time or identifier.' }, { status: 400 });
    }

    if ((status && status !== "cancelled") || (!!bookingDate !== !!bookingTime) || (!status && !bookingDate)) {
      return NextResponse.json({ ok: false, error: "Choose cancellation or a new date and time." }, { status: 400 });
    }
    const id = localId || bookingId!;
    const result = await sql`UPDATE bookings
      SET status = COALESCE(${status || null}, status),
          booking_date = COALESCE(${bookingDate || null}::date, booking_date),
          booking_time = COALESCE(${bookingTime || null}::time, booking_time), updated_at = NOW()
      WHERE (local_id = ${id} OR id::text = ${id}) AND client_id = ${userId}
        AND status IN ('pending', 'accepted', 'confirmed', 'reschedule_requested')
      RETURNING id`;
    if (!result.rows.length) return NextResponse.json({ ok: false, error: "Booking not found or no longer editable." }, { status: 409 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Update failed." },
      { status: 500 }
    );
  }
}
