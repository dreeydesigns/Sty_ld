import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/auth-server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // 1. Access cookies using the modern header helper
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // 2. Hash the token to locate the record in your database
    const tokenHash = crypto
      .createHash('sha256')
      .update(sessionCookie)
      .digest('hex');

    // 3. Find and remove the session record
    const result = await sql`
      SELECT id FROM sessions WHERE token_hash = ${tokenHash}
    `;

    if (result.rows.length > 0) {
      await deleteSession(result.rows[0].id);
    }

    // 4. Clear the session cookie definitively
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
  } catch (error) {
    console.error('SIGNOUT_ERROR_DEBUG:', error);
    return NextResponse.json(
      { 
        error: 'Sign out failed', 
        details: error instanceof Error ? error.message : 'Unknown server error' 
      }, 
      { status: 500 }
    );
  }
}