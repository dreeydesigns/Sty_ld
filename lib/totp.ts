/**
 * lib/totp.ts
 *
 * RFC 6238 Time-Based One-Time Password (TOTP) implementation
 * & Single-Use Recovery Code Generator for STYLD.
 *
 * Fully native using Node.js crypto module. Zero external dependencies.
 */

import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Convert a buffer to a Base32 string (RFC 4648) */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/** Convert a Base32 string to a Buffer */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a new 20-byte random TOTP secret in Base32 format
 * and construct the standard otpauth URI.
 */
export function generateTotpSecret(accountName: string, issuer = 'Styld'): {
  secret: string;
  otpauthUrl: string;
} {
  const buffer = crypto.randomBytes(20);
  const secret = base32Encode(buffer);
  const encodedAccount = encodeURIComponent(accountName);
  const encodedIssuer = encodeURIComponent(issuer);
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return { secret, otpauthUrl };
}

/**
 * Compute the 6-digit TOTP code for a given secret at a specific counter step.
 */
function computeTotpCode(secretBytes: Buffer, step: number): string {
  const counterBuffer = Buffer.alloc(8);
  // Write counter as 64-bit big-endian integer
  counterBuffer.writeBigInt64BE(BigInt(step));

  const hmac = crypto.createHmac('sha1', secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code against a Base32 secret.
 * Supports a window of ±1 step (30 seconds before/after) for clock drift.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  windowSteps = 1,
  timestampMs = Date.now()
): boolean {
  if (!code || !/^\d{6}$/.test(code.trim())) return false;
  const trimmed = code.trim();
  const secretBytes = base32Decode(secretBase32);
  const currentStep = Math.floor(timestampMs / 1000 / 30);

  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const expected = computeTotpCode(secretBytes, currentStep + delta);
    if (crypto.timingSafeEqual(Buffer.from(trimmed), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * AES-256-GCM encryption for storing TOTP secrets securely at rest.
 */
function getEncryptionKey(): Buffer {
  const master = process.env.MFA_SECRET_KEY || process.env.TWILIO_API_KEY_SECRET || 'styld_default_mfa_encryption_key_v1';
  return crypto.createHash('sha256').update(master).digest();
}

export function encryptTotpSecret(secretBase32: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secretBase32, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // Format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptTotpSecret(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted TOTP secret format');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Recovery Codes Generator & Verifier
 * Format: 8 alphanumeric characters in groups of 4: "ABCD-1234"
 */
export function generateRecoveryCodes(count = 8): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars (O, 0, I, 1)
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += charset[bytes[j] % charset.length];
      if (j === 3) code += '-';
    }
    plainCodes.push(code);
    hashedCodes.push(crypto.createHash('sha256').update(code).digest('hex'));
  }

  return { plainCodes, hashedCodes };
}

export function hashRecoveryCode(code: string): string {
  const clean = code.toUpperCase().replace(/\s+/g, '').trim();
  return crypto.createHash('sha256').update(clean).digest('hex');
}
