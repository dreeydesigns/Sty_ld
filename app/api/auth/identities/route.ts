/**
 * GET & DELETE /api/auth/identities
 *
 * User Identity & Sign-In Method Management API for STYLD Settings.
 * Lists connected methods and safely unlinks identities without account lockout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { verifySession } from '@/lib/auth-server';
import { getUserIdentities, unlinkIdentity, IdentityError } from '@/lib/identity-manager';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = await verifySession(token);
    const identities = await getUserIdentities(sessionUser.id);

    const { rows: userRows } = await sql`
      SELECT totp_enabled, passkey_enabled, phone, phone_verified, email, email_verified
      FROM users WHERE id = ${sessionUser.id} LIMIT 1
    `;

    const user = userRows[0] || {};

    return NextResponse.json({
      success: true,
      identities,
      status: {
        totpEnabled: Boolean(user.totp_enabled),
        passkeyEnabled: Boolean(user.passkey_enabled),
        phone: user.phone || null,
        phoneVerified: Boolean(user.phone_verified),
        email: user.email || null,
        emailVerified: Boolean(user.email_verified),
      },
    });
  } catch (error) {
    console.error('GET_IDENTITIES_ERROR:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve connected sign-in methods.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = await verifySession(token);
    const body = await req.json();
    const identityId = body.identityId;

    if (!identityId) {
      return NextResponse.json({ success: false, error: 'identityId is required.' }, { status: 400 });
    }

    // Safely unlink identity
    await unlinkIdentity(sessionUser.id, identityId);

    const updatedIdentities = await getUserIdentities(sessionUser.id);

    return NextResponse.json({
      success: true,
      message: 'Sign-in method removed.',
      identities: updatedIdentities,
    });
  } catch (error) {
    if (error instanceof IdentityError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('DELETE_IDENTITY_ERROR:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove sign-in method.' },
      { status: 500 }
    );
  }
}
