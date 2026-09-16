/**
 * Styld — OTP verification primitives
 *
 * ⚠️ SCOPE: this module verifies one-time codes. It does NOT issue or send them.
 * Issuance + delivery (WhatsApp/SMS provider adapter) is P0B and is owner-gated —
 * nothing in this file contacts a provider, and no live OTP traffic exists yet.
 * `verifyOtpCode()` therefore fails closed (`reason: "missing"`) until an approved
 * issuer writes rows into `otp_codes`.
 *
 * Storage contract (table `otp_codes`, created by the existing init route):
 *   phone TEXT PRIMARY KEY, otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ,
 *   attempts INTEGER DEFAULT 0, created_at TIMESTAMPTZ
 *
 * Guarantees:
 *  - codes are stored only as a SHA-256 hash (never plaintext);
 *  - 5-minute expiry;
 *  - 5-attempt cap per code, after which the code is destroyed;
 *  - one-time use: a successful verification deletes the row;
 *  - secrets (code, hash) are never written to logs.
 */
import crypto from "crypto";
import { sql } from "@vercel/postgres";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_CODE_LENGTH = 6;

export type OtpFailureReason =
  | "missing"
  | "invalid_format"
  | "expired"
  | "mismatch"
  | "attempts_exceeded"
  | "store_unavailable";

export interface OtpVerificationResult {
  ok: boolean;
  reason?: OtpFailureReason;
}

/**
 * Normalize a phone number to the storage form used for OTP keys:
 * digits with a leading `+`, Kenya-local numbers promoted to `+254`.
 * Returns null when the input cannot be a phone number.
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[^\d+]/g, "");
  if (!digits) return null;

  let value = digits.startsWith("+") ? digits.slice(1) : digits;
  if (!/^\d+$/.test(value)) return null;

  if (value.startsWith("0") && value.length === 10) value = `254${value.slice(1)}`; // 0712345678
  else if (value.startsWith("2540") && value.length === 13) value = `254${value.slice(4)}`;
  else if (value.length === 9) value = `254${value}`; // 712345678

  if (value.length < 9 || value.length > 15) return null;
  return `+${value}`;
}

/** SHA-256 hash of a normalized code — the only form ever persisted. */
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/** Accept only a plausible numeric code of the expected length. */
export function normalizeOtpCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  if (trimmed.length < 4 || trimmed.length > OTP_CODE_LENGTH + 2) return null;
  return trimmed;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function deleteOtpRow(phone: string): Promise<void> {
  try {
    await sql`DELETE FROM otp_codes WHERE phone = ${phone}`;
  } catch (error) {
    console.error("[otp] failed to clear consumed code row:", error);
  }
}

/**
 * Persist a hashed code for `phone` (issued by an approved provider in P0B).
 * Upsert-per-phone: one live code per number; the raw code never touches the DB.
 */
export async function storeOtpCode(
  phone: string,
  code: string,
  ttlMs: number = OTP_TTL_MS,
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedCode = normalizeOtpCode(code);
  if (!normalizedPhone || !normalizedCode) return false;

  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  try {
    await sql`
      INSERT INTO otp_codes (phone, otp_hash, expires_at, attempts, created_at)
      VALUES (${normalizedPhone}, ${hashOtpCode(normalizedCode)}, ${expiresAt}, 0, NOW())
      ON CONFLICT (phone) DO UPDATE SET
        otp_hash   = EXCLUDED.otp_hash,
        expires_at = EXCLUDED.expires_at,
        attempts   = 0,
        created_at = NOW()
    `;
    return true;
  } catch (error) {
    console.error("[otp] failed to store code hash:", error);
    return false;
  }
}

/**
 * Verify a submitted code. Fails closed on every uncertain path.
 * Destroys the row on success (one-time use), on expiry, and once attempts are
 * exhausted, so a code can never be replayed or brute-forced indefinitely.
 */
export async function verifyOtpCode(phone: unknown, code: unknown): Promise<OtpVerificationResult> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { ok: false, reason: "invalid_format" };

  const normalizedCode = normalizeOtpCode(code);
  if (!normalizedCode) return { ok: false, reason: "invalid_format" };

  let row: { otp_hash?: string; expires_at?: string | Date; attempts?: number } | undefined;
  try {
    const { rows } = await sql`
      SELECT otp_hash, expires_at, attempts
      FROM otp_codes
      WHERE phone = ${normalizedPhone}
      LIMIT 1
    `;
    row = rows[0] as typeof row;
  } catch (error) {
    console.error("[otp] lookup failed:", error);
    return { ok: false, reason: "store_unavailable" };
  }

  if (!row) return { ok: false, reason: "missing" };

  const attempts = Number(row.attempts ?? 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtpRow(normalizedPhone);
    return { ok: false, reason: "attempts_exceeded" };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (!expiresAt || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    await deleteOtpRow(normalizedPhone);
    return { ok: false, reason: "expired" };
  }

  const matches = typeof row.otp_hash === "string"
    && constantTimeEquals(row.otp_hash, hashOtpCode(normalizedCode));

  if (!matches) {
    try {
      const { rows } = await sql`
        UPDATE otp_codes
        SET attempts = attempts + 1
        WHERE phone = ${normalizedPhone}
        RETURNING attempts
      `;
      const nextAttempts = Number(rows[0]?.attempts ?? attempts + 1);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) await deleteOtpRow(normalizedPhone);
    } catch (error) {
      console.error("[otp] failed to record attempt:", error);
    }
    return { ok: false, reason: "mismatch" };
  }

  await deleteOtpRow(normalizedPhone);
  return { ok: true };
}
