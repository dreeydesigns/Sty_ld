/**
 * lib/passkey.ts
 *
 * WebAuthn (Passkeys / FIDO2) Server Helpers for STYLD.
 * Provides challenge generation, clientData validation, credential registration & verification.
 * Native Node.js crypto implementation.
 */

import crypto from 'crypto';
import { sql } from '@vercel/postgres';

export interface PasskeyRegistrationOptions {
  challenge: string; // base64url
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string; // base64url
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number; // -7 for ES256, -257 for RS256
  }>;
  authenticatorSelection: {
    residentKey?: 'preferred' | 'required' | 'discouraged';
    userVerification: 'preferred' | 'required';
  };
  timeout: number;
}

export interface PasskeyAuthenticationOptions {
  challenge: string;
  rpId: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string; // base64url
    transports?: string[];
  }>;
  userVerification: 'preferred' | 'required';
  timeout: number;
}

export class PasskeyError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'PasskeyError';
  }
}

/** Encode Buffer to Base64URL string */
export function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode Base64URL string to Buffer */
export function fromBase64Url(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

/** Generate a 32-byte cryptographic challenge */
export function generateChallenge(): string {
  return toBase64Url(crypto.randomBytes(32));
}

/** Store a challenge in the database */
export async function saveChallenge(
  challenge: string,
  type: 'registration' | 'authentication',
  userId?: string
): Promise<void> {
  const challengeHash = crypto.createHash('sha256').update(challenge).digest('hex');
  await sql`DELETE FROM passkey_challenges WHERE expires_at < NOW()`;
  await sql`
    INSERT INTO passkey_challenges (challenge_hash, user_id, type, expires_at)
    VALUES (${challengeHash}, ${userId || null}, ${type}, NOW() + INTERVAL '5 minutes')
  `;
}

/** Verify and consume a challenge */
export async function consumeChallenge(
  challenge: string,
  type: 'registration' | 'authentication'
): Promise<{ userId: string | null }> {
  const challengeHash = crypto.createHash('sha256').update(challenge).digest('hex');
  const { rows } = await sql`
    DELETE FROM passkey_challenges
    WHERE challenge_hash = ${challengeHash}
      AND type = ${type}
      AND expires_at > NOW()
    RETURNING user_id
  `;

  if (rows.length === 0) {
    throw new PasskeyError('Invalid or expired passkey challenge', 400);
  }

  return { userId: rows[0].user_id };
}

/** Parse and validate clientDataJSON */
export function parseClientData(
  clientDataJSONBase64: string,
  expectedType: string,
  expectedChallenge: string
): { type: string; challenge: string; origin: string } {
  try {
    const jsonStr = fromBase64Url(clientDataJSONBase64).toString('utf8');
    const parsed = JSON.parse(jsonStr);

    if (parsed.type !== expectedType) {
      throw new PasskeyError(`Unexpected clientData type: ${parsed.type}`, 400);
    }

    if (parsed.challenge !== expectedChallenge) {
      throw new PasskeyError('Passkey challenge mismatch', 400);
    }

    return parsed;
  } catch (err) {
    if (err instanceof PasskeyError) throw err;
    throw new PasskeyError('Malformed clientDataJSON', 400);
  }
}

/**
 * Register a new passkey credential in the database
 */
export async function registerPasskeyCredential(params: {
  userId: string;
  credentialId: string;
  publicKey: string;
  deviceName?: string;
  transports?: string[];
}): Promise<void> {
  const { userId, credentialId, publicKey, deviceName = 'Passkey Device', transports = [] } = params;
  const transportsLiteral = `{${transports.map((t) => t.replace(/[^a-zA-Z0-9_-]/g, '')).join(',')}}`;

  await sql`
    INSERT INTO passkey_credentials (user_id, credential_id, public_key, device_name, transports, counter, created_at, last_used_at)
    VALUES (${userId}, ${credentialId}, ${publicKey}, ${deviceName}, ${transportsLiteral}::text[], 0, NOW(), NOW())
    ON CONFLICT (credential_id) DO UPDATE SET
      public_key = ${publicKey},
      device_name = ${deviceName},
      transports = ${transportsLiteral}::text[],
      last_used_at = NOW()
  `;

  await sql`
    UPDATE users SET passkey_enabled = true WHERE id = ${userId}
  `;
}

/**
 * Get credential by ID
 */
export async function getPasskeyCredential(credentialId: string) {
  const { rows } = await sql`
    SELECT id, user_id, credential_id, public_key, counter, device_name
    FROM passkey_credentials
    WHERE credential_id = ${credentialId}
    LIMIT 1
  `;
  return rows[0] || null;
}

/**
 * Update credential counter upon successful authentication
 */
export async function updatePasskeyCounter(credentialId: string, newCounter: number): Promise<void> {
  await sql`
    UPDATE passkey_credentials
    SET counter = ${newCounter}, last_used_at = NOW()
    WHERE credential_id = ${credentialId}
  `;
}
