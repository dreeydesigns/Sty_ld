import { NextRequest, NextResponse } from "next/server";
import { authPool } from "@/lib/auth-database";
import { sendContactNotification } from "@/lib/email-provider";
import { consumeLimit } from "@/lib/security-events";

export async function POST(req: NextRequest) {
  try {
    // Only the Vercel ingress header is trusted. Off-Vercel production hosts fail
    // closed instead of accepting a spoofable x-forwarded-for. In development a
    // single shared bucket stands in for the missing ingress.
    const ip = process.env.VERCEL
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : process.env.NODE_ENV !== "production" ? "dev-local" : undefined;
    if (!ip) {
      return NextResponse.json(
        { ok: false, error: "Message service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Rate limiting: 5 contact inquiries per 15 minutes per client. The key is
    // stored hashed and the check is fail-closed.
    try {
      if (!(await consumeLimit(`contact:${ip}`, 5, 900))) {
        return NextResponse.json(
          { ok: false, error: "Too many messages sent. Please wait a few minutes before trying again." },
          { status: 429 }
        );
      }
    } catch (rateLimitErr) {
      const failure = rateLimitErr as { name?: string; code?: string } | null;
      console.error("Contact rate limit storage unavailable:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
      return NextResponse.json(
        { ok: false, error: "Message service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
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
    await authPool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)`,
      [name, email, phone, subject, message]
    );

    // Dispatch email notification via Resend asynchronously (non-blocking for UI response if network lags)
    sendContactNotification({ name, email, phone, subject, message }).catch((err) => {
      const failure = err as { name?: string; code?: string } | null;
      console.error("[Contact API] Background email dispatch failed:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    });

    return NextResponse.json({ ok: true, message: "Thank you for contacting us. We will get back to you shortly." });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("POST /api/contact error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Failed to send message. Please try again later." }, { status: 500 });
  }
}
