/**
 * POST /api/auth/client/signup
 *
 * Client sign-up, P0A-hardened.
 *
 * BEFORE P0A: if the submitted phone already existed, the route signed the caller
 * INTO that existing account — with the submitted password never checked — and the
 * role came from the request body. That is an account-takeover by phone number.
 *
 * NOW:
 *  - Existing phone (including soft-deleted/pending-deletion rows) → 409 and NO
 *    session. An existing account can only be entered through proof of ownership
 *    (/api/auth/phone-signin with password or verified OTP).
 *  - The role is always `client` (`resolvePublicSignupRole`); `body.role` is ignored.
 *
 * Body: { firstName, phone, password, theme?, tribeBadge? }
 * 200 → { ok: true, profile }   409 → { ok: false, message }
 */
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/auth-server";
import { resolvePublicSignupRole } from "@/lib/roles";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import type { ClientUserProfile } from "@/lib/personalization";

const SIGNUP_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    firstName?: string;
    phone?: string;
    password?: string;
    theme?: string;
    tribeBadge?: string;
    role?: unknown;
    location?: object;
  } | null;

  const { firstName, phone, password, theme, tribeBadge } = body ?? {};

  if (!firstName || !phone || !password) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields." },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const limiter = checkRateLimit(clientKeyFromHeaders(request.headers, "client-signup"), SIGNUP_RATE_LIMIT);
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const normalizedPhone = phone.trim();

  try {
    // ── Duplicate phone → 409, and never a session ──────────────────────────
    // (deletion_status is intentionally not filtered: a pending-deletion account
    // still owns the number and must not be re-created or entered here.)
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${normalizedPhone} LIMIT 1
    `;
    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "An account already exists for this number. Sign in instead.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    // `body.role` is ignored: a public path may only create clients.
    const role = resolvePublicSignupRole(body?.role);

    const newUser = await sql`
      INSERT INTO users (phone, first_name, password_hash, phone_verified, role)
      VALUES (${normalizedPhone}, ${firstName}, ${passwordHash}, true, ${role})
      RETURNING id
    `;
    const userId = newUser.rows[0].id as string;

    const sessionToken = await createSession(
      userId,
      "Mobile Device",
      request.headers.get("user-agent") || "Unknown",
    );

    const now = new Date().toISOString();
    const resolvedTheme = (theme as ClientUserProfile["theme"]) ?? "not_set";
    const profile: ClientUserProfile = {
      id:              userId,
      role:            "client",
      firstName:       firstName,
      phone:           normalizedPhone,
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    };

    response.cookies.set("session", sessionToken, cookieOptions);
    response.cookies.set("user_id", userId, cookieOptions);
    // Display hint only — never used for authorization (P0-5).
    response.cookies.set("assumed_role", "client", cookieOptions);

    return response;
  } catch (error) {
    console.error("Client signup error:", error);
    return NextResponse.json(
      { ok: false, message: "Signup failed. Please try again." },
      { status: 500 },
    );
  }
}
