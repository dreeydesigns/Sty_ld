/**
 * lib/google-auth.ts
 *
 * Server-side Google Identity Services ID Token Verification for STYLD.
 * Validates Google JWT tokens without third-party runtime dependencies.
 */

import crypto from 'crypto';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

export class GoogleAuthError extends Error {
  constructor(message: string, public statusCode = 401) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

/** Decode JWT payload safely without verifying signature */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Verify a Google ID token server-side.
 * Uses Google's official tokeninfo endpoint to cryptographically validate the token,
 * or handles sandbox/test tokens in non-production test environments.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new GoogleAuthError('Missing Google credential token');
  }

  // Handle mock/test token in test environments
  if (process.env.NODE_ENV === 'test' || process.env.GOOGLE_AUTH_MOCK === 'true') {
    const payload = decodeJwtPayload(idToken);
    if (payload && payload.sub && payload.email) {
      return {
        sub: String(payload.sub),
        email: String(payload.email).toLowerCase(),
        emailVerified: Boolean(payload.email_verified),
        name: String(payload.name || payload.given_name || 'Google User'),
        givenName: payload.given_name ? String(payload.given_name) : undefined,
        familyName: payload.family_name ? String(payload.family_name) : undefined,
        picture: payload.picture ? String(payload.picture) : undefined,
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new GoogleAuthError(
        errData.error_description || 'Invalid or expired Google token',
        401
      );
    }

    const data = await res.json();

    // Verify Issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(data.iss)) {
      throw new GoogleAuthError('Invalid token issuer', 401);
    }

    // Verify Client ID if configured in environment
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (expectedClientId && data.aud !== expectedClientId) {
      throw new GoogleAuthError('Google Client ID mismatch', 401);
    }

    // Verify Expiration
    const nowSec = Math.floor(Date.now() / 1000);
    if (Number(data.exp) < nowSec) {
      throw new GoogleAuthError('Google token has expired', 401);
    }

    // Email verification check
    const isEmailVerified = data.email_verified === true || data.email_verified === 'true';
    if (!data.email) {
      throw new GoogleAuthError('No email associated with this Google account', 400);
    }

    return {
      sub: String(data.sub),
      email: String(data.email).toLowerCase().trim(),
      emailVerified: isEmailVerified,
      name: data.name || data.given_name || 'Google User',
      givenName: data.given_name,
      familyName: data.family_name,
      picture: data.picture,
    };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    throw new GoogleAuthError(
      error instanceof Error ? error.message : 'Google authentication failed',
      401
    );
  }
}
