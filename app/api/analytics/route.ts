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
      const token = cookieStore.get("session")?.value;
      if (token) {
        userId = (await verifySession(token)).id;
      }
    } catch {
      // Unauthenticated client event is acceptable (e.g. search_started)
    }

    await recordServerEvent(body.eventName, {
      userId,
      anonymousId: body.anonymousId,
      properties: body.properties,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/analytics error:", error);
    return NextResponse.json({ ok: false, error: "Failed to ingest event." }, { status: 500 });
  }
}
