/**
 * POST /api/payments/mpesa/callback
 *
 * Safaricom Daraja STK Push (Lipa Na M-Pesa Online) webhook endpoint.
 *
 * SECURITY HOTFIX (fail closed):
 * Live payment processing is not approved for the MVP, and this endpoint cannot
 * independently authenticate the origin of an inbound callback. To prevent an
 * unauthenticated request from altering payment records or confirming bookings,
 * this route is hard-disabled. It does NOT parse the request body, does NOT
 * touch the database, and does NOT transition any booking state.
 *
 * This is intentionally hard-coded and is NOT driven by any feature flag, so
 * toggling PAYMENTS_LIVE (or any other flag) cannot reactivate this handler.
 * Re-enabling payments requires a separate, reviewed implementation that
 * authenticates callback origin before any write.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "payments_unavailable",
      error:
        "Payment processing is not enabled. No payment record or booking status has been changed.",
    },
    { status: 503 }
  );
}
