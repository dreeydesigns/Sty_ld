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
import { verifySession } from "@/lib/auth-server";
export { GET } from "@/app/api/me/route";

export async function PATCH(req: NextRequest) {
  try {
    // 1. Resolve current user from session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    let userId: string;
    try { userId = (await verifySession(token)).id; }
    catch { return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 }); }

    // 2. Parse body
    const body = await req.json().catch(() => ({})) as Record<string, string | undefined>;

    if (!body || typeof body !== "object" || Array.isArray(body) || Object.values(body).some(v => typeof v !== "string")) {
      return NextResponse.json({ ok: false, error: "Profile fields must be text." }, { status: 400 });
    }
    if ((body.firstName !== undefined && !body.firstName.trim()) || Object.values(body).some(v => v && v.length > 2000)) {
      return NextResponse.json({ ok: false, error: "Enter valid profile fields." }, { status: 400 });
    }

    // Phone changes route through the configured OTP provider so the server
    // is the only place a phone number is accepted + written to the user record.
    if (body.phone !== undefined) {
      const phoneResult = await fetch(new URL("/api/auth/phone/verify", req.nextUrl.origin), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: body.phone }),
      }).then((r) => r.json().catch(() => ({}))) as { ok: boolean; phone?: string; error?: string };
      if (!phoneResult || !phoneResult.ok) {
        return NextResponse.json(
          { ok: false, error: phoneResult?.error || "Phone verification required to update phone number." },
          { status: 400 },
        );
      }
      const { rows } = await sql`
        UPDATE users
        SET phone = ${phoneResult.phone || body.phone}, phone_verified = true, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id
      `;
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
      }
      delete (body as Record<string, unknown>).phone;
    }

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
      { ok: false, error: "Update failed." },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
