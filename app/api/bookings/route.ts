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
import crypto from "crypto";

async function resolveUserId(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await sql`
    SELECT user_id FROM sessions WHERE token_hash = ${tokenHash} LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].user_id as string) : null;
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

    if (!body?.bookingDate || !body?.bookingTime) {
      return NextResponse.json(
        { ok: false, error: "bookingDate and bookingTime are required." },
        { status: 400 },
      );
    }

    const serviceNamesArr = body.serviceNames ?? [];
    const localId = body.localId ?? null;

    // Idempotency: if localId already exists, return the existing booking
    if (localId) {
      const existing = await sql`
        SELECT id FROM bookings WHERE local_id = ${localId} LIMIT 1
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
        'pending'
      )
      RETURNING id, status, created_at
    `;

    return NextResponse.json({ ok: true, bookingId: rows[0].id, status: rows[0].status });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Booking failed.", details: String(error) },
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
      { ok: false, error: "Failed to load bookings.", details: String(error) },
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

    if (bookingId && bookingId.length === 36) { // standard uuid length
      if (status && bookingDate && bookingTime) {
        await sql`
          UPDATE bookings
          SET status = ${status}, booking_date = ${bookingDate}, booking_time = ${bookingTime}, updated_at = NOW()
          WHERE id = ${bookingId} AND client_id = ${userId}
        `;
      } else if (bookingDate && bookingTime) {
        await sql`
          UPDATE bookings
          SET booking_date = ${bookingDate}, booking_time = ${bookingTime}, updated_at = NOW()
          WHERE id = ${bookingId} AND client_id = ${userId}
        `;
      } else if (status) {
        await sql`
          UPDATE bookings
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${bookingId} AND client_id = ${userId}
        `;
      }
    } else {
      const idToUse = localId || bookingId;
      if (idToUse) {
        if (status && bookingDate && bookingTime) {
          await sql`
            UPDATE bookings
            SET status = ${status}, booking_date = ${bookingDate}, booking_time = ${bookingTime}, updated_at = NOW()
            WHERE (local_id = ${idToUse} OR id::text = ${idToUse}) AND client_id = ${userId}
          `;
        } else if (bookingDate && bookingTime) {
          await sql`
            UPDATE bookings
            SET booking_date = ${bookingDate}, booking_time = ${bookingTime}, updated_at = NOW()
            WHERE (local_id = ${idToUse} OR id::text = ${idToUse}) AND client_id = ${userId}
          `;
        } else if (status) {
          await sql`
            UPDATE bookings
            SET status = ${status}, updated_at = NOW()
            WHERE (local_id = ${idToUse} OR id::text = ${idToUse}) AND client_id = ${userId}
          `;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Update failed.", details: String(error) },
      { status: 500 }
    );
  }
}
