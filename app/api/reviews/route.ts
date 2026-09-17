/**
 * Styld Verified Reviews API
 *
 * POST /api/reviews — Submit review for a completed appointment
 * GET  /api/reviews — Fetch public reviews for a provider or salon
 *
 * Rules:
 * - Reviewer must be authenticated
 * - Booking must exist and belong to the client
 * - Booking must have completed status
 * - Only 1 review permitted per booking
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { verifySession } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required to leave a review." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = (await verifySession(token)).id;
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      bookingId?: string;
      rating?: number;
      comment?: string;
    } | null;

    if (!body || !body.bookingId) {
      return NextResponse.json({ ok: false, error: "bookingId is required." }, { status: 400 });
    }

    const { bookingId, rating, comment } = body;

    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "Rating must be an integer between 1 and 5." }, { status: 400 });
    }

    if (comment !== undefined && (typeof comment !== "string" || comment.length > 1000)) {
      return NextResponse.json({ ok: false, error: "Comment must be under 1000 characters." }, { status: 400 });
    }

    // 1. Fetch booking and verify ownership and completion status
    const bookingRes = await sql`
      SELECT id, client_id, provider_id, provider_slug, status
      FROM bookings
      WHERE (id::text = ${bookingId} OR local_id = ${bookingId})
      LIMIT 1
    `;

    if (bookingRes.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
    }

    const booking = bookingRes.rows[0];

    // Ownership check
    if (booking.client_id !== userId) {
      return NextResponse.json({ ok: false, error: "Only the client who booked the appointment can leave a review." }, { status: 403 });
    }

    // Completion check
    const normalizedStatus = String(booking.status || "").toLowerCase().trim();
    if (normalizedStatus !== "completed") {
      return NextResponse.json({
        ok: false,
        error: "Reviews can only be submitted after the service has been completed.",
      }, { status: 400 });
    }

    // Duplicate check
    const existingReview = await sql`
      SELECT id FROM reviews WHERE booking_id = ${booking.id} LIMIT 1
    `;
    if (existingReview.rows.length > 0) {
      return NextResponse.json({ ok: false, error: "A review has already been submitted for this booking." }, { status: 409 });
    }

    // 2. Insert verified review
    const { rows } = await sql`
      INSERT INTO reviews (
        booking_id, client_id, provider_id, provider_slug, rating, comment, is_verified
      )
      VALUES (
        ${booking.id},
        ${userId},
        ${booking.provider_id ?? null},
        ${booking.provider_slug ?? null},
        ${rating},
        ${comment?.trim() ?? null},
        true
      )
      RETURNING id, rating, comment, is_verified, created_at
    `;

    return NextResponse.json({ ok: true, review: rows[0] });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ ok: false, error: "Failed to submit review." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const providerSlug = url.searchParams.get("providerSlug");
    const providerId = url.searchParams.get("providerId");

    if (!providerSlug && !providerId) {
      return NextResponse.json({ ok: false, error: "providerSlug or providerId query required." }, { status: 400 });
    }

    let rows;
    if (providerId) {
      const res = await sql`
        SELECT r.id, r.rating, r.comment, r.is_verified, r.created_at, u.first_name AS client_first_name
        FROM reviews r
        JOIN users u ON u.id = r.client_id
        WHERE r.provider_id = ${providerId}
        ORDER BY r.created_at DESC
        LIMIT 50
      `;
      rows = res.rows;
    } else {
      const res = await sql`
        SELECT r.id, r.rating, r.comment, r.is_verified, r.created_at, u.first_name AS client_first_name
        FROM reviews r
        JOIN users u ON u.id = r.client_id
        WHERE r.provider_slug = ${providerSlug}
        ORDER BY r.created_at DESC
        LIMIT 50
      `;
      rows = res.rows;
    }

    return NextResponse.json({ ok: true, reviews: rows });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load reviews." }, { status: 500 });
  }
}
