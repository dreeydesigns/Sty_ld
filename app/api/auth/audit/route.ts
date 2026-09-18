import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { resolveCurrentStyldUser } from "@/lib/auth-resolver";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/auth/audit
 *
 * Records the Styld "digital print" for a successful authentication.
 *
 * Security posture:
 *  - Identity is resolved SERVER-SIDE from the authenticated session. The
 *    client never supplies a user id, role, or account status.
 *  - The client IP is hashed and never stored raw; the raw user agent is
 *    truncated. No secrets, tokens, or credentials are accepted or stored.
 *  - Rate limited per IP to prevent audit-trail flooding.
 *  - Non-fatal by design: an audit failure must never break authentication.
 */

const MAX_BODY_BYTES = 4096;
const METHOD_ALLOWLIST = new Set([
  "session",
  "email_code",
  "email_code:sign-in",
  "email_code:sign-up",
  "oauth_google",
  "passkey",
  "password",
]);

// Lightweight in-memory rate limit (per warm instance).
const hits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.slice(0, max);
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: any = null;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const method = typeof body?.method === "string" ? body.method : "session";
  if (!METHOD_ALLOWLIST.has(method)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const print = body?.print ?? {};

  // Server-authoritative identity resolution.
  const session = await resolveCurrentStyldUser().catch(() => null);
  if (!session) {
    // Not an error for the client: there is simply nothing to attribute yet.
    return NextResponse.json({ ok: true, recorded: false });
  }

  const ipHash = crypto
    .createHash("sha256")
    .update(`${ip}|styld-audit`)
    .digest("hex");
  const userAgent = truncate(request.headers.get("user-agent"), 256);

  try {
    await sql`
      INSERT INTO auth_audit_log (
        user_id,
        clerk_user_id,
        auth_source,
        auth_method,
        device_fingerprint,
        ip_address_hash,
        user_agent,
        platform,
        language,
        timezone,
        screen
      ) VALUES (
        ${session.userId},
        ${session.clerkUserId},
        ${session.authSource},
        ${method},
        ${truncate(print.fingerprint, 64)},
        ${ipHash},
        ${userAgent},
        ${truncate(print.platform, 64)},
        ${truncate(print.language, 32)},
        ${truncate(print.timezone, 64)},
        ${truncate(print.screen, 32)}
      )
    `;
    return NextResponse.json({ ok: true, recorded: true });
  } catch (err) {
    // The audit trail must never break authentication. Migration 009 may not
    // be applied yet; log and report success so the sign-in flow continues.
    logger.warn("Digital print audit write skipped", { error: String(err) });
    return NextResponse.json({ ok: true, recorded: false });
  }
}
