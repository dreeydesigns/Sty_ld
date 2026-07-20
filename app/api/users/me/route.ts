/**
 * PATCH /api/users/me
 *
 * Updates the current user's profile fields. Requires a valid session cookie.
 * All fields are optional — only provided fields are updated.
 *
 * Accepted body fields:
 *   firstName, lastName, displayName, salonName, bio, location,
 *   profileImageUrl, coverImageUrl, theme, tribeBadge, username,
 *   specialty, serviceMode
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

export async function PATCH(req: NextRequest) {
  try {
    // 1. Resolve current user from session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows: sessionRows } = await sql`
      SELECT user_id FROM sessions WHERE token_hash = ${tokenHash} LIMIT 1
    `;
    if (sessionRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Session not found." }, { status: 401 });
    }
    const userId = sessionRows[0].user_id as string;

    // 2. Parse body
    const body = await req.json().catch(() => ({})) as Record<string, string | undefined>;

    const {
      firstName,
      lastName,
      displayName,
      salonName,
      bio,
      location,
      profileImageUrl,
      coverImageUrl,
      theme,
      tribeBadge,
      username,
      specialty,
      serviceMode,
    } = body;

    // 3. Build update — only include fields that were provided
    const updates: string[] = [];
    const values: (string | null)[] = [];
    let idx = 1;

    function addField(col: string, val: string | undefined) {
      if (val !== undefined) {
        updates.push(`${col} = $${idx++}`);
        values.push(val || null);
      }
    }

    addField("first_name",        firstName);
    addField("last_name",         lastName);
    addField("display_name",      displayName);
    addField("salon_name",        salonName);
    addField("bio",               bio);
    addField("location",          location);
    addField("profile_image_url", profileImageUrl);
    addField("cover_image_url",   coverImageUrl);
    addField("theme",             theme);
    addField("tribe_badge",       tribeBadge);
    addField("username",          username);
    addField("specialty",         specialty);
    addField("service_mode",      serviceMode);

    if (updates.length === 0) {
      return NextResponse.json({ ok: true, message: "No fields to update." });
    }

    updates.push(`updated_at = NOW()`);

    // Use raw query construction for dynamic fields (safe — values are parameterized)
    const queryText = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING id, first_name, last_name, display_name, salon_name, bio,
                location, profile_image_url, cover_image_url, theme, tribe_badge,
                username, specialty, service_mode, role
    `;
    values.push(userId);

    const { rows } = await sql.query(queryText, values);

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json(
      { ok: false, error: "Update failed.", details: String(error) },
      { status: 500 },
    );
  }
}
