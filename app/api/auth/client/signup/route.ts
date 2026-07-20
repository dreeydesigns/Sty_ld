import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/auth-server";
import type { ClientUserProfile } from "@/lib/personalization";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    firstName?: string;
    phone?: string;
    password?: string;
    theme?: string;
    tribeBadge?: string;
    location?: object;
  } | null;

  const { firstName, phone, password, theme, tribeBadge, location } = body ?? {};

  if (!firstName || !phone || !password) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields." },
      { status: 400 }
    );
  }

  try {
    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${phone}
    `;

    let userId: string;

    if (existing.rows.length > 0) {
      // User exists — sign them in instead (phone already verified)
      userId = existing.rows[0].id;
    } else {
      // Create new user
      const passwordHash = await hashPassword(password);

      const newUser = await sql`
        INSERT INTO users (phone, first_name, password_hash, phone_verified, role)
        VALUES (${phone}, ${firstName}, ${passwordHash}, true, 'client')
        RETURNING id
      `;
      userId = newUser.rows[0].id;
    }

    // Create session
    const req = request as Request & { headers: Headers };
    const sessionToken = await createSession(
      userId,
      "Mobile Device",
      req.headers.get("user-agent") || "Unknown"
    );

    // Build the client profile returned to the frontend
    const now = new Date().toISOString();
    const resolvedTheme = (theme as ClientUserProfile["theme"]) ?? "not_set";
    const profile: ClientUserProfile = {
      id:              userId,
      role:            "client",
      firstName:       firstName,
      phone:           phone,
      theme:           resolvedTheme,
      tribeBadge:      tribeBadge ?? "✨",
      quizCompleted:   resolvedTheme !== "not_set",
      themeSetBy:      resolvedTheme === "not_set" ? "fallback" : "quiz",
      themeUpdatedAt:  now,
      createdAt:       now,
      subscription:    { tier: "none", status: "teaser" },
      tribes:          resolvedTheme === "not_set" ? [] : [resolvedTheme],
    };

    const response = NextResponse.json({ ok: true, profile });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Client signup error:", error);
    return NextResponse.json(
      { ok: false, message: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
