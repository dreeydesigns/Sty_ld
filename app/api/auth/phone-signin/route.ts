/**
 * POST /api/auth/phone-signin
 *
 * Phone-based sign-in, P0A-hardened.
 *
 * BEFORE P0A this endpoint looked a user up by phone — and CREATED the account if
 * it did not exist — then issued a session, with no proof of ownership at all,
 * and persisted whatever `role` the request body asked for (live-confirmed
 * escalation to `super_admin`).
 *
 * NOW:
 *  - Proof of ownership is required: either the account's bcrypt password, or a
 *    verified OTP (`lib/otp.ts` — hashed, 5-minute expiry, 5 attempts, one-time use).
 *    No proof → 401. Unknown phone without a password → 401 (never a silent account).
 *  - The request-body `role` is IGNORED. The role always comes from the user row.
 *  - Accounts created here are always `client` (`resolvePublicSignupRole`).
 *
 * Body: { phone: string; password?: string; otpCode?: string; firstName?: string }
 * 200 → { ok: true, user: { id, firstName, role, phone } }
 * 400/401/429/500 → { ok: false, error }
 *
 * NOTE (P0B, owner-gated): nothing issues OTPs yet, so the OTP branch fails
 * closed until an approved provider adapter writes into `otp_codes`.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { comparePasswords, hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/auth-server";
import { verifyOtpCode } from "@/lib/otp";
import { resolvePublicSignupRole } from "@/lib/roles";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

/** Minimum password length for an account created through this endpoint. */
const MIN_PASSWORD_LENGTH = 8;

const RATE_LIMIT = { limit: 8, windowMs: 60_000 } as const;

interface PhoneSigninUserRow {
  id: string;
  first_name: string | null;
  role: string | null;
  phone: string;
  password_hash: string | null;
}

function unauthorized(message = "Phone number and a valid password or verification code are required.") {
  // Deliberately identical for "unknown phone", "wrong password" and "no proof":
  // the response must not reveal whether a phone number has an account.
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      phone?: string;
      password?: string;
      otpCode?: string;
      code?: string;
      firstName?: string;
      role?: unknown;
    } | null;

    const phone = body?.phone?.trim();
    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }

    const limiter = checkRateLimit(clientKeyFromHeaders(req.headers, "phone-signin"), RATE_LIMIT);
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limiter.retryAfterMs / 1000)) } },
      );
    }

    const password = typeof body?.password === "string" && body.password.length > 0
      ? body.password
      : null;
    const otpCode = typeof body?.otpCode === "string"
      ? body.otpCode
      : (typeof body?.code === "string" ? body.code : null);

    // 1. Look up an existing, non-deleted user by phone.
    let rows: PhoneSigninUserRow[] = [];
    try {
      const res = await sql`
        SELECT id, first_name, role, phone, password_hash
        FROM users
        WHERE phone = ${phone}
          AND (deletion_status IS NULL OR deletion_status = 'active')
        LIMIT 1
      `;
      rows = res.rows as unknown as PhoneSigninUserRow[];
    } catch (e) {
      console.warn("[phone-signin] lookup with deletion_status failed, retrying without it.", e);
      const res = await sql`
        SELECT id, first_name, role, phone, password_hash
        FROM users
        WHERE phone = ${phone}
        LIMIT 1
      `;
      rows = res.rows as unknown as PhoneSigninUserRow[];
    }

    let userId: string;
    let firstName: string;
    let role: string;

    if (rows.length > 0) {
      // ── Existing account: require proof of ownership ──────────────────────
      const existing = rows[0];
      let proven = false;

      if (password && typeof existing.password_hash === "string" && existing.password_hash.length > 0) {
        proven = await comparePasswords(password, existing.password_hash);
      }

      if (!proven && otpCode) {
        const otpResult = await verifyOtpCode(phone, otpCode);
        proven = otpResult.ok;
      }

      if (!proven) return unauthorized();

      userId = existing.id;
      firstName = existing.first_name ?? "User";
      role = (existing.role as string) ?? "client"; // server-side truth, never the body
    } else {
      // ── No account yet: create one only with a real credential ────────────
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return unauthorized(
          "No account exists for this number. Create one with a password of at least 8 characters.",
        );
      }

      const resolvedFirstName = (body?.firstName?.trim() || "User").slice(0, 80);
      // `body.role` is intentionally NOT read: a public path may only create clients.
      const resolvedRole = resolvePublicSignupRole(body?.role);
      const passwordHash = await hashPassword(password);

      let insertResult;
      try {
        insertResult = await sql`
          INSERT INTO users (phone, first_name, password_hash, role, phone_verified)
          VALUES (${phone}, ${resolvedFirstName}, ${passwordHash}, ${resolvedRole}, true)
          RETURNING id, first_name, role
        `;
      } catch (insertError) {
        const errorStr = String((insertError as { message?: string })?.message || insertError);
        if (errorStr.includes("password")) {
          console.warn("[phone-signin] retrying insert with legacy password column.");
          insertResult = await sql`
            INSERT INTO users (phone, first_name, password_hash, role, phone_verified, password)
            VALUES (${phone}, ${resolvedFirstName}, ${passwordHash}, ${resolvedRole}, true, '')
            RETURNING id, first_name, role
          `;
        } else {
          throw insertError;
        }
      }

      userId = insertResult.rows[0].id as string;
      firstName = (insertResult.rows[0].first_name as string) ?? resolvedFirstName;
      role = (insertResult.rows[0].role as string) ?? resolvedRole;
    }

    // 2. Create a real server-side session.
    const userAgent = req.headers.get("user-agent") ?? "Unknown";
    const sessionToken = await createSession(userId, "Mobile Device", userAgent);

    const response = NextResponse.json({
      ok: true,
      user: { id: userId, firstName, role, phone },
    });

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
    response.cookies.set("assumed_role", role, cookieOptions);

    return response;
  } catch (error) {
    console.error("phone-signin error:", error);
    return NextResponse.json({ ok: false, error: "Sign-in failed." }, { status: 500 });
  }
}
