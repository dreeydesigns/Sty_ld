import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { sendContactNotification } from "@/lib/email-provider";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    // Rate limiting: 5 contact inquiries per 15 minutes per IP
    try {
      const limitKey = `contact:${ip}`;
      const rateLimitRes = await sql`
        INSERT INTO auth_rate_limits (key, count, window_start, last_attempt)
        VALUES (${limitKey}, 1, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.count + 1 END,
          window_start = CASE WHEN auth_rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_start END,
          last_attempt = NOW()
        WHERE (auth_rate_limits.window_start < NOW() - INTERVAL '15 minutes' OR auth_rate_limits.count < 5)
        RETURNING count;
      `;
      if (!rateLimitRes || rateLimitRes.rowCount === 0) {
        return NextResponse.json(
          { ok: false, error: "Too many messages sent. Please wait a few minutes before trying again." },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      console.warn("Contact rate limit check skipped:", rateLimitErr);
    }

    const body = await req.json().catch(() => null) as {
      name?: string; email?: string; phone?: string; subject?: string; message?: string;
    } | null;

    const name = body?.name?.trim();
    const message = body?.message?.trim();
    const email = body?.email?.trim() || null;
    const phone = body?.phone?.trim() || null;
    const subject = body?.subject?.trim() || null;

    if (!name || !message) {
      return NextResponse.json({ ok: false, error: "Name and message are required." }, { status: 400 });
    }

    if (name.length > 100 || message.length > 5000) {
      return NextResponse.json({ ok: false, error: "Input exceeds permissible length." }, { status: 400 });
    }

    // Persist to Postgres database
    await sql`
      INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES (${name}, ${email}, ${phone}, ${subject}, ${message})
    `;

    // Dispatch email notification via Resend asynchronously (non-blocking for UI response if network lags)
    sendContactNotification({ name, email, phone, subject, message }).catch((err) => {
      console.error("[Contact API] Background email dispatch failed:", err);
    });

    return NextResponse.json({ ok: true, message: "Thank you for contacting us. We will get back to you shortly." });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({ ok: false, error: "Failed to send message. Please try again later." }, { status: 500 });
  }
}
