/**
 * Styld Trust & Safety, User Blocking API
 *
 * POST   /api/blocks: Block another user (prevents messages, bookings)
 * DELETE /api/blocks: Unblock a previously blocked user
 * GET    /api/blocks: List blocked user IDs for the authenticated session
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authPool } from "@/lib/auth-database";
import { verifySession } from "@/lib/auth-server";
import { authError, sameOrigin } from "@/lib/api-security";

export async function POST(req: NextRequest) {
  try { sameOrigin(req); } catch (error) { return authError(error); }
  try {
    const cookieStore = await cookies();
    const token = (cookieStore.get('__Secure-session') || cookieStore.get('session'))?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = (await verifySession(token)).id;
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { blockedId?: string } | null;
    const blockedId = body?.blockedId;

    if (!blockedId || typeof blockedId !== "string" || blockedId.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "blockedId is required." }, { status: 400 });
    }

    if (blockedId === userId) {
      return NextResponse.json({ ok: false, error: "Cannot block your own account." }, { status: 400 });
    }

    await authPool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [userId, blockedId]
    );

    return NextResponse.json({ ok: true, message: "User blocked successfully." });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("POST /api/blocks error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Failed to block user." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try { sameOrigin(req); } catch (error) { return authError(error); }
  try {
    const cookieStore = await cookies();
    const token = (cookieStore.get('__Secure-session') || cookieStore.get('session'))?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = (await verifySession(token)).id;
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { blockedId?: string } | null;
    const blockedId = body?.blockedId;

    if (!blockedId || typeof blockedId !== "string") {
      return NextResponse.json({ ok: false, error: "blockedId is required." }, { status: 400 });
    }

    await authPool.query(
      `DELETE FROM user_blocks
      WHERE blocker_id = $1 AND blocked_id = $2`,
      [userId, blockedId]
    );

    return NextResponse.json({ ok: true, message: "User unblocked successfully." });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("DELETE /api/blocks error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Failed to unblock user." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = (cookieStore.get('__Secure-session') || cookieStore.get('session'))?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = (await verifySession(token)).id;
    } catch {
      return NextResponse.json({ ok: false, error: "Session invalid." }, { status: 401 });
    }

    const { rows } = await authPool.query(
      `SELECT blocked_id, created_at FROM user_blocks WHERE blocker_id = $1`,
      [userId]
    );

    return NextResponse.json({ ok: true, blockedUsers: rows.map((r) => (r as { blocked_id: string }).blocked_id) });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error("GET /api/blocks error:", failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : "UnknownError");
    return NextResponse.json({ ok: false, error: "Failed to load blocked users." }, { status: 500 });
  }
}
