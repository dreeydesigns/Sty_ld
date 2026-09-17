/**
 * POST /api/auth/google
 *
 * Authenticates user via Google Identity Services ID Token.
 * Verifies token server-side, resolves or provisions canonical Styld user & identities,
 * and sets canonical session cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyGoogleIdToken, GoogleAuthError } from '@/lib/google-auth';
import { resolveOrCreateUser } from '@/lib/identity-manager';
import { createSession } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'Google credential token is required.' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify Google ID Token server-side
    const googleUser = await verifyGoogleIdToken(credential);

    // 2. Resolve or provision canonical Styld user and identity mapping
    const user = await resolveOrCreateUser({
      provider: 'google',
      providerSubject: googleUser.sub,
      email: googleUser.email,
      firstName: googleUser.givenName || googleUser.name,
      lastName: googleUser.familyName,
      role: 'client',
      verified: true,
    });

    // 3. Establish canonical Styld session
    const userAgent = req.headers.get('user-agent') || 'Browser';
    const sessionToken = await createSession(user.id, 'Google Sign-In Device', userAgent);

    // 4. Set secure session cookies
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
      message: 'Signed in with Google successfully.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('GOOGLE_AUTH_ERROR:', error);
    return NextResponse.json(
      { success: false, error: 'Google sign-in failed. Please try again.' },
      { status: 500 }
    );
  }
}
