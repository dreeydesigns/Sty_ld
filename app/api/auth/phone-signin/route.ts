/**
 * POST /api/auth/phone-signin
 *
 * Phone-based sign-in. Looks up (or creates) the user in our DB by phone
 * number directly and issues a server-side session cookie — no verification
 * code is sent or checked.
 *
 * Body: { phone: string; role?: string; firstName?: string }
 *   - phone     E.164 format, e.g. "+254712345678"
 *   - role      Only sent on first sign-up to set the user role
 *   - firstName Only sent on first sign-up
 *
 * Returns: { ok: true; user: { id, role, firstName, phone } }
 *          { ok: false; error: string }  on failure
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { createSession } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      phone?: string;
      role?: string;
      firstName?: string;
    } | null;

    const phone = body?.phone?.trim();
    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }

    // 1. Look up existing user by phone
    let rows = [];
    try {
      const res = await sql`
        SELECT id, first_name, role, phone
        FROM users
        WHERE phone = ${phone}
          AND (deletion_status IS NULL OR deletion_status = 'active')
        LIMIT 1
      `;
      rows = res.rows;
    } catch (e) {
      console.warn("[Database] Query with deletion_status failed, falling back to query without it.", e);
      const res = await sql`
        SELECT id, first_name, role, phone
        FROM users
        WHERE phone = ${phone}
        LIMIT 1
      `;
      rows = res.rows;
    }

    let userId: string;
    let firstName: string;
    let role: string;

    if (rows.length > 0) {
      // Existing user — sign them in
      userId    = rows[0].id as string;
      firstName = rows[0].first_name as string;
      role      = rows[0].role as string;
    } else {
      // New user — create a record with whatever info we have
      // The profile-setup page will fill in the rest
      const resolvedRole      = body?.role ?? "client";
      const resolvedFirstName = body?.firstName ?? "User";

      const insert = await sql`
        INSERT INTO users (phone, first_name, role, phone_verified)
        VALUES (${phone}, ${resolvedFirstName}, ${resolvedRole}, true)
        RETURNING id, first_name, role
      `;

      userId    = insert.rows[0].id as string;
      firstName = insert.rows[0].first_name as string;
      role      = insert.rows[0].role as string;
    }

    // 2. Create DB session
    const userAgent    = req.headers.get("user-agent") ?? "Unknown";
    const sessionToken = await createSession(userId, "Mobile Device", userAgent);

    // 3. Build response and set httpOnly cookie
    const response = NextResponse.json({
      ok: true,
      user: { id: userId, firstName, role, phone },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   30 * 24 * 60 * 60, // 30 days
      path:     "/",
    });

    return response;
  } catch (error: any) {
    console.error("phone-signin error:", error);
    const errMsg = error?.message || String(error);
    return NextResponse.json(
      { ok: false, error: errMsg, details: errMsg },
      { status: 500 },
    );
  }
}
