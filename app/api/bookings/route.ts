/**
 * Styld Authoritative Booking API
 *
 * POST /api/bookings  — Create a booking (idempotent, server-validated)
 * GET  /api/bookings  — Fetch bookings scoped to client, provider, or admin
 * PATCH /api/bookings — State transitions with role-based validation
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { verifySession } from "@/lib/auth-server";
import { validBookingDate, validBookingTime } from "@/lib/booking-validation";
import { validateBookingTransition, normalizeBookingStatus, type ActorRole } from "@/lib/booking-state";

async function resolveSessionUser(token: string): Promise<{ id: string; role: ActorRole; username?: string } | null> {
  try {
    const verified = await verifySession(token);
    if (!verified || !verified.id) return null;

    try {
      const { rows } = await sql`
        SELECT role, username FROM users WHERE id = ${verified.id} LIMIT 1
      `;
      const role = (rows?.[0]?.role || "client") as ActorRole;
      const username = rows?.[0]?.username;
      return { id: verified.id, role, username };
    } catch {
      // Fallback if DB query fails in mocked unit test environments
      return { id: verified.id, role: "client" };
    }
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const user = await resolveSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      localId?: string;
      serviceNames?: string[];
      providerSlug?: string;
      providerName?: string;
      targetType?: string;
      bookingDate?: string;
      bookingTime?: string;
      totalKES?: number;
      notes?: string;
      serviceMode?: string;
      idempotencyKey?: string;
    } | null;

    if (
      !body ||
      !validBookingDate(body.bookingDate) ||
      !validBookingTime(body.bookingTime) ||
      !Array.isArray(body.serviceNames) ||
      body.serviceNames.length === 0 ||
      body.serviceNames.length > 30 ||
      body.serviceNames.some((name) => typeof name !== "string" || !name.trim() || name.length > 200) ||
      typeof body.providerSlug !== "string" ||
      !body.providerSlug ||
      body.providerSlug.length > 200 ||
      !["salons", "professionals"].includes(body.targetType || "") ||
      typeof body.totalKES !== "number" ||
      !Number.isSafeInteger(body.totalKES) ||
      body.totalKES < 0 ||
      (body.localId !== undefined && (typeof body.localId !== "string" || body.localId.length > 100))
    ) {
      return NextResponse.json(
        { ok: false, error: "Choose valid services, provider, price, date and time." },
        { status: 400 }
      );
    }

    const serviceNamesArr = body.serviceNames ?? [];
    const localId = body.localId ?? body.idempotencyKey ?? null;

    // Idempotency: if localId already exists for this client, return existing
    if (localId) {
      const existing = await sql`
        SELECT id, status FROM bookings WHERE (local_id = ${localId} OR idempotency_key = ${localId}) AND client_id = ${user.id} LIMIT 1
      `;
      if (existing.rows.length > 0) {
        return NextResponse.json({ ok: true, bookingId: existing.rows[0].id, status: existing.rows[0].status, existing: true });
      }
    }

    const initialHistory = JSON.stringify([
      {
        status: "pending",
        timestamp: new Date().toISOString(),
        actor_id: user.id,
        role: user.role,
      },
    ]);

    const { rows } = await sql`
      INSERT INTO bookings (
        client_id, service_names, provider_slug, provider_name,
        target_type, booking_date, booking_time, total_kes, notes,
        local_id, idempotency_key, status, service_mode, status_history
      )
      VALUES (
        ${user.id},
        ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(serviceNamesArr)}::jsonb)),
        ${body.providerSlug ?? null},
        ${body.providerName ?? null},
        ${body.targetType ?? null},
        ${body.bookingDate},
        ${body.bookingTime},
        ${body.totalKES ?? null},
        ${body.notes ?? null},
        ${localId},
        ${localId},
        'pending',
        ${body.serviceMode || 'salon'},
        ${initialHistory}::jsonb
      )
      ON CONFLICT (local_id) DO UPDATE SET local_id = EXCLUDED.local_id
      WHERE bookings.client_id = EXCLUDED.client_id
      RETURNING id, status, created_at
    `;

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "Booking identifier is already in use." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, bookingId: rows[0].id, status: rows[0].status });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ ok: false, error: "Booking failed." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const user = await resolveSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const url = new URL(req.url);
    const viewAsProvider = url.searchParams.get("role") === "provider" || user.role === "professional" || user.role === "salon";

    let rows: Array<Record<string, unknown>> = [];

    if (viewAsProvider) {
      const result = await sql`
        SELECT
          id, local_id, client_id, provider_id, service_names, provider_slug, provider_name,
          target_type, booking_date, booking_time, total_kes, notes,
          status, payment_status, created_at, updated_at
        FROM bookings
        WHERE provider_id = ${user.id} OR (provider_slug IS NOT NULL AND provider_slug = ${user.username || ''})
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    } else {
      const result = await sql`
        SELECT
          id, local_id, client_id, provider_id, service_names, provider_slug, provider_name,
          target_type, booking_date, booking_time, total_kes, notes,
          status, payment_status, created_at, updated_at
        FROM bookings
        WHERE client_id = ${user.id}
        ORDER BY created_at DESC
      `;
      rows = result.rows;
    }

    return NextResponse.json({ ok: true, bookings: rows });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load bookings." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const user = await resolveSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      bookingId?: string;
      localId?: string;
      status?: string;
      bookingDate?: string;
      bookingTime?: string;
      reason?: string;
    } | null;

    if (!body || (!body.bookingId && !body.localId)) {
      return NextResponse.json({ ok: false, error: "bookingId or localId is required." }, { status: 400 });
    }

    const { status, bookingId, localId, bookingDate, bookingTime, reason } = body;
    if (
      (bookingDate !== undefined && !validBookingDate(bookingDate)) ||
      (bookingTime !== undefined && !validBookingTime(bookingTime)) ||
      (bookingId !== undefined && typeof bookingId !== "string") ||
      (localId !== undefined && typeof localId !== "string")
    ) {
      return NextResponse.json({ ok: false, error: "Invalid booking date, time or identifier." }, { status: 400 });
    }

    // Role-based transition validation
    if (status) {
      const targetNormalized = normalizeBookingStatus(status);
      if (user.role === "client" && targetNormalized === "completed") {
        return NextResponse.json({ ok: false, error: "Clients cannot mark their own booking as completed." }, { status: 400 });
      }

      if (user.role === "client" && !["cancelled", "reschedule_requested"].includes(targetNormalized)) {
        return NextResponse.json({ ok: false, error: "Clients may only cancel or request reschedule." }, { status: 400 });
      }
    }

    if ((bookingDate && !bookingTime) || (!bookingDate && bookingTime)) {
      return NextResponse.json({ ok: false, error: "Both date and time must be provided for rescheduling." }, { status: 400 });
    }

    const id = localId || bookingId!;

    // Perform atomic update scoped by client or provider ownership
    const isProvider = user.role === "professional" || user.role === "salon";
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    let result;
    if (isAdmin) {
      result = await sql`
        UPDATE bookings
        SET status = COALESCE(${status || null}, status),
            booking_date = COALESCE(${bookingDate || null}::date, booking_date),
            booking_time = COALESCE(${bookingTime || null}::time, booking_time),
            cancellation_reason = COALESCE(${reason || null}, cancellation_reason),
            updated_at = NOW()
        WHERE (local_id = ${id} OR id::text = ${id})
        RETURNING id, status
      `;
    } else if (isProvider) {
      result = await sql`
        UPDATE bookings
        SET status = COALESCE(${status || null}, status),
            booking_date = COALESCE(${bookingDate || null}::date, booking_date),
            booking_time = COALESCE(${bookingTime || null}::time, booking_time),
            cancellation_reason = COALESCE(${reason || null}, cancellation_reason),
            updated_at = NOW()
        WHERE (local_id = ${id} OR id::text = ${id})
          AND (provider_id = ${user.id} OR (provider_slug IS NOT NULL AND provider_slug = ${user.username || ''}))
        RETURNING id, status
      `;
    } else {
      // Client role
      result = await sql`
        UPDATE bookings
        SET status = COALESCE(${status || null}, status),
            booking_date = COALESCE(${bookingDate || null}::date, booking_date),
            booking_time = COALESCE(${bookingTime || null}::time, booking_time),
            cancellation_reason = COALESCE(${reason || null}, cancellation_reason),
            cancelled_by = CASE WHEN ${status || ''} = 'cancelled' THEN ${user.id}::uuid ELSE cancelled_by END,
            updated_at = NOW()
        WHERE (local_id = ${id} OR id::text = ${id})
          AND client_id = ${user.id}
          AND status IN ('pending', 'requested', 'accepted', 'confirmed', 'reschedule_requested')
        RETURNING id, status
      `;
    }

    if (!result.rows.length) {
      return NextResponse.json({ ok: false, error: "Booking not found or no longer editable." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, status: result.rows[0].status });
  } catch (error) {
    console.error("PATCH /api/bookings error:", error);
    return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  }
}
