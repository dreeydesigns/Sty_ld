/**
 * POST /api/payments/mpesa/callback
 *
 * Safaricom Daraja STK Push (Lipa Na M-Pesa Online) webhook endpoint.
 *
 * Payment processing is NOT approved for the MVP. This endpoint is intentionally
 * disabled and fails closed. While disabled it does not read or write the
 * database, does not confirm bookings, does not update payment statuses, and does
 * not create payment records. It never treats an inbound request as proof of
 * payment.
 *
 * Do not re-enable this endpoint by flipping a feature flag. Restoring payments
 * requires a separate reviewed implementation that independently verifies payment
 * authenticity (for example a signed payload, a source allowlist, and a
 * server-side status query) plus explicit approval.
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
    { status: 503 },
  );
}
