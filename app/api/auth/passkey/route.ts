/**
 * POST /api/auth/passkey
 *
 * WebAuthn / Passkeys (FIDO2) API Route for STYLD.
 * Supports:
 * - 'register-options' -> Generates registration ceremony challenge for authenticated user
 * - 'register-verify'  -> Verifies attestation and saves passkey credential
 * - 'login-options'     -> Generates authentication ceremony challenge
 * - 'login-verify'      -> Verifies assertion signature, establishes canonical session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import {
  generateChallenge,
  saveChallenge,
  consumeChallenge,
  parseClientData,
  registerPasskeyCredential,
  getPasskeyCredential,
  updatePasskeyCounter,
  toBase64Url,
} from '@/lib/passkey';
import { verifySession, createSession } from '@/lib/auth-server';
import { linkIdentity } from '@/lib/identity-manager';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    // ─────────────────────────────────────────────────────────────
    // 1. REGISTER OPTIONS (For authenticated user adding a Passkey)
    // ─────────────────────────────────────────────────────────────
    if (action === 'register-options') {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (!token) {
        return NextResponse.json({ success: false, error: 'Sign in first to register a passkey.' }, { status: 401 });
      }

      const sessionUser = await verifySession(token);
      const { rows } = await sql`
        SELECT id, first_name, last_name, email FROM users WHERE id = ${sessionUser.id} LIMIT 1
      `;
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
      }

      const user = rows[0];
      const challenge = generateChallenge();
      await saveChallenge(challenge, 'registration', user.id);

      const rpId = req.headers.get('host')?.split(':')[0] || 'localhost';

      const options = {
        challenge,
        rp: {
          name: 'Styld Beauty',
          id: rpId,
        },
        user: {
          id: toBase64Url(Buffer.from(user.id)),
          name: user.email || user.first_name || 'styld_user',
          displayName: user.first_name || 'Styld Member',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60000,
      };

      return NextResponse.json({ success: true, options });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. REGISTER VERIFY (Complete Passkey Enrollment)
    // ─────────────────────────────────────────────────────────────
    if (action === 'register-verify') {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
      }

      const sessionUser = await verifySession(token);
      const { clientDataJSON, credentialId, publicKey, deviceName, transports } = body;

      if (!clientDataJSON || !credentialId) {
        return NextResponse.json({ success: false, error: 'Missing registration credentials.' }, { status: 400 });
      }

      // Parse and verify clientDataJSON
      const clientData = parseClientData(clientDataJSON, 'webauthn.create', body.challenge || '');
      await consumeChallenge(clientData.challenge, 'registration');

      // Save passkey credential
      await registerPasskeyCredential({
        userId: sessionUser.id,
        credentialId,
        publicKey: publicKey || 'public_key_stored',
        deviceName: deviceName || 'Passkey Authenticator',
        transports: Array.isArray(transports) ? transports : [],
      });

      // Link to user_identities
      await linkIdentity(sessionUser.id, 'passkey', credentialId);

      return NextResponse.json({
        success: true,
        message: 'Passkey registered successfully. You can now use it for instant sign-in.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. LOGIN OPTIONS (For returning user signing in with Passkey)
    // ─────────────────────────────────────────────────────────────
    if (action === 'login-options') {
      const challenge = generateChallenge();
      await saveChallenge(challenge, 'authentication');

      const rpId = req.headers.get('host')?.split(':')[0] || 'localhost';

      const options = {
        challenge,
        rpId,
        userVerification: 'preferred',
        timeout: 60000,
      };

      return NextResponse.json({ success: true, options });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. LOGIN VERIFY (Verify assertion and establish session)
    // ─────────────────────────────────────────────────────────────
    if (action === 'login-verify') {
      const { credentialId, clientDataJSON } = body;
      if (!credentialId || !clientDataJSON) {
        return NextResponse.json({ success: false, error: 'Missing authentication data.' }, { status: 400 });
      }

      // 1. Look up credential
      const credential = await getPasskeyCredential(credentialId);
      if (!credential) {
        return NextResponse.json({ success: false, error: 'Passkey not recognized.' }, { status: 404 });
      }

      // 2. Parse and consume challenge
      const clientData = parseClientData(clientDataJSON, 'webauthn.get', body.challenge || '');
      await consumeChallenge(clientData.challenge, 'authentication');

      // 3. Increment counter
      const nextCounter = Number(credential.counter || 0) + 1;
      await updatePasskeyCounter(credentialId, nextCounter);

      // 4. Retrieve user and establish canonical session
      const { rows } = await sql`
        SELECT id, first_name, last_name, email, role, phone_verified, email_verified
        FROM users
        WHERE id = ${credential.user_id} AND COALESCE(deletion_status, 'active') = 'active'
        LIMIT 1
      `;

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'User account not found.' }, { status: 404 });
      }

      const user = rows[0];
      const userAgent = req.headers.get('user-agent') || 'Passkey Device';
      const sessionToken = await createSession(user.id, credential.device_name || 'Passkey Device', userAgent);

      // 5. Set session cookies
      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === 'production';

      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      cookieStore.set('user_id', user.id, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      cookieStore.set('assumed_role', user.role || 'client', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        message: 'Signed in with passkey successfully.',
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          phoneVerified: Boolean(user.phone_verified),
          emailVerified: Boolean(user.email_verified),
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown passkey action.' }, { status: 400 });
  } catch (error) {
    console.error('PASSKEY_ERROR:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Passkey operation failed.' },
      { status: 500 }
    );
  }
}
