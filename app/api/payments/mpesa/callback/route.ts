/**
 * POST /api/payments/mpesa/callback
 * Safaricom Daraja STK Push (Lipa Na M-Pesa Online) webhook handler.
 * Validates transaction results, writes audit records, and transitions booking states idempotently.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

interface DarajaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number | string;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: CallbackItem[];
      };
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null) as DarajaCallbackPayload | null;

    if (!rawBody?.Body?.stkCallback) {
      console.warn("[M-Pesa Callback] Received malformed or missing callback body");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const callback = rawBody.Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = Number(callback.ResultCode);
    const resultDesc = callback.ResultDesc || "";

    if (!checkoutRequestId) {
      console.warn("[M-Pesa Callback] Missing CheckoutRequestID in payload");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    console.info(`[M-Pesa Callback] Received update for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}`);

    // Check existing payment log for idempotency
    const existing = await sql`
      SELECT id, status, booking_id
      FROM payment_logs
      WHERE checkout_request_id = ${checkoutRequestId}
      LIMIT 1
    `;

    if (existing.rowCount && existing.rows[0].status === "completed") {
      console.info(`[M-Pesa Callback] Transaction ${checkoutRequestId} is already marked completed. Skipping.`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (resultCode === 0) {
      // Successful payment
      const items = callback.CallbackMetadata?.Item || [];
      const receiptNumber = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value?.toString() || null;
      const amount = items.find((i) => i.Name === "Amount")?.Value?.toString() || null;

      const updated = await sql`
        UPDATE payment_logs
        SET status = 'completed',
            receipt_number = ${receiptNumber},
            transaction_id = ${receiptNumber},
            raw_callback = ${JSON.stringify(rawBody)},
            updated_at = NOW()
        WHERE checkout_request_id = ${checkoutRequestId}
        RETURNING booking_id
      `;

      const bookingId = updated.rows[0]?.booking_id || existing.rows[0]?.booking_id;

      if (bookingId) {
        await sql`
          UPDATE bookings
          SET payment_status = 'completed',
              status = 'confirmed',
              updated_at = NOW()
          WHERE id = ${bookingId}
        `;
        console.info(`[M-Pesa Callback] Confirmed booking ${bookingId} with receipt ${receiptNumber} (Amount: ${amount})`);
      }
    } else {
      // Failed or cancelled payment (1032 = cancelled by user)
      const failedStatus = resultCode === 1032 ? "cancelled" : "failed";

      await sql`
        UPDATE payment_logs
        SET status = ${failedStatus},
            raw_callback = ${JSON.stringify(rawBody)},
            updated_at = NOW()
        WHERE checkout_request_id = ${checkoutRequestId}
      `;

      console.warn(`[M-Pesa Callback] STK push marked as ${failedStatus} (${resultDesc}) for ${checkoutRequestId}`);
    }

    // Safaricom expects standard acknowledgment
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("[M-Pesa Callback] Error processing webhook:", error);
    // Always acknowledge Safaricom to avoid unneeded retry loops
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
