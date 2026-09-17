/**
 * Styld Trust & Safety — Moderation Reports API
 *
 * POST /api/reports
 * Allows authenticated users to report suspicious profiles, abusive bookings,
 * or inappropriate content.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { verifySession } from "@/lib/auth-server";

const VALID_TARGET_TYPES = new Set(["user", "provider", "booking", "post", "comment"]);
const VALID_SEVERITIES = new Set(["low", "normal", "high", "urgent"]);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required to submit reports." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = (await verifySession(token)).id;
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      notes?: string;
      severity?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: "Request body required." }, { status: 400 });
    }

    const { targetType, targetId, reason, notes, severity = "normal" } = body;

    if (!targetType || !VALID_TARGET_TYPES.has(targetType)) {
      return NextResponse.json({ ok: false, error: "Invalid targetType specified." }, { status: 400 });
    }

    if (!targetId || typeof targetId !== "string" || targetId.length > 100) {
      return NextResponse.json({ ok: false, error: "Valid targetId required." }, { status: 400 });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0 || reason.length > 100) {
      return NextResponse.json({ ok: false, error: "Reason required (max 100 characters)." }, { status: 400 });
    }

    if (notes !== undefined && (typeof notes !== "string" || notes.length > 2000)) {
      return NextResponse.json({ ok: false, error: "Notes must be under 2000 characters." }, { status: 400 });
    }

    const reportSeverity = VALID_SEVERITIES.has(severity) ? severity : "normal";

    const { rows } = await sql`
      INSERT INTO user_reports (
        reporter_id, target_type, target_id, reason, notes, severity, status
      )
      VALUES (
        ${userId}, ${targetType}, ${targetId}, ${reason.trim()}, ${notes?.trim() ?? null}, ${reportSeverity}, 'pending'
      )
      RETURNING id, status, created_at
    `;

    return NextResponse.json({
      ok: true,
      reportId: rows[0].id,
      status: rows[0].status,
      message: "Report submitted to Trust & Safety moderation queue.",
    });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json({ ok: false, error: "Failed to submit report." }, { status: 500 });
  }
}
