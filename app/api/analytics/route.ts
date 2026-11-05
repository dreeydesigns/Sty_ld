/**
 * Styld Analytics Ingestion API
 *
 * POST /api/analytics
 * Ingests sanitized client-side telemetry and funnel tracking events.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { recordServerEvent, type AnalyticsEventName, type EventProperties } from "@/lib/analytics";
import { verifySession } from "@/lib/auth-server";
import { consumeLimit } from "@/lib/security-events";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      eventName?: AnalyticsEventName;
      anonymousId?: string;
      properties?: EventProperties;
    } | null;

    if (!body || !body.eventName) {
      return NextResponse.json({ ok: false, error: "eventName is required." }, { status: 400 });
    }

    // Optional user identification from session cookie
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = (cookieStore.get('__Secure-session') || cookieStore.get('session'))?.value;
      if (token) {
        userId = (await verifySession(token)).id;
      }
    } catch {
      // Unauthenticated client event is acceptable (e.g. search_started)
    }

    // Cap intake the same way the contact route does: only the Vercel ingress header is trusted,
    // so an anonymous client on another production host is refused rather than keyed to a
    // spoofable x-forwarded-for. 60 events a minute bounds flooding without dropping real use.
    const ip = process.env.VERCEL
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : process.env.NODE_ENV !== "production" ? "dev-local" : undefined;
    const limitKey = userId ? `analytics:user:${userId}` : ip ? `analytics:ip:${ip}` : null;
    if (!limitKey) {
      return NextResponse.json({ ok: false, error: "Event intake is temporarily unavailable." }, { status: 503 });
    }
    try {
      if (!(await consumeLimit(limitKey, 60, 60))) {
        return NextResponse.json({ ok: false, error: "Too many events. Please slow down." }, { status: 429 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "Event intake is temporarily unavailable." }, { status: 503 });
    }

    await recordServerEvent(body.eventName, {
      userId,
      anonymousId: typeof body.anonymousId === "string" ? body.anonymousId.slice(0, 64) : body.anonymousId,
      properties: body.properties,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("POST /api/analytics error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Failed to ingest event." }, { status: 500 });
  }
}
