/**
 * GET /api/me
 * Returns the currently signed-in user based on the session cookie.
 * The frontend calls this on app startup to rehydrate the session
 * (bridges the httpOnly cookie from the API with the localStorage-based
 * client-session store used by the UI).
 *
 * Returns 401 if no valid session exists.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Get session + user in a single query
    const { rows } = await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.phone,
        u.email,
        u.role,
        u.profile_image_url,
        u.cover_image_url,
        u.bio,
        u.display_name,
        u.salon_name,
        u.location,
        u.theme,
        u.tribe_badge,
        u.created_at,
        s.id AS session_id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${tokenHash}
        AND (u.deletion_status IS NULL OR u.deletion_status = 'active')
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, user: null }, { status: 401 });
    }

    // Update session last_active_at
    await sql`
      UPDATE sessions SET last_active_at = NOW()
      WHERE token_hash = ${tokenHash}
    `;

    const u = rows[0];

    // Build a profile object that matches the AppUserSession shape
    // used by lib/client-session.ts so the frontend can write it to localStorage
    const profile = buildProfile(u);

    return NextResponse.json({ ok: true, user: profile });
  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json(
      { ok: false, error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProfile(u: Record<string, any>) {
  const base = {
    id:        u.id as string,
    role:      u.role as string,
    phone:     u.phone as string,
    profilePhoto: (u.profile_image_url as string | null) ?? undefined,
    coverPhoto:   (u.cover_image_url  as string | null) ?? undefined,
    bio:          (u.bio              as string | null) ?? undefined,
    location:     (u.location         as string | null) ?? undefined,
    theme:        (u.theme            as string | null) ?? "not_set",
    tribeBadge:   (u.tribe_badge      as string | null) ?? "✨",
    createdAt:    (u.created_at       as Date | null)?.toISOString(),
  };

  switch (u.role) {
    case "professional":
      return {
        ...base,
        displayName: (u.display_name as string | null) ?? (u.first_name as string),
      };
    case "salon":
      return {
        ...base,
        salonName: (u.salon_name as string | null) ?? (u.first_name as string),
        firstName: u.first_name as string,
      };
    default: // client, guest, team_member, etc.
      return {
        ...base,
        firstName: u.first_name as string,
        lastName:  (u.last_name as string | null) ?? undefined,
      };
  }
}
