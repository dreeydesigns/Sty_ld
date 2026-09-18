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

    // 2. If legacy session cookie is present, remove from database
    if (sessionCookie) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(sessionCookie)
        .digest('hex');

      const result = await sql`
        SELECT id FROM sessions WHERE token_hash = ${tokenHash}
      `;

      if (result.rows.length > 0) {
        await deleteSession(result.rows[0].id);
      }
    }

    // 4. Clear the session cookie definitively
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    cookieStore.set('user_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    cookieStore.set('assumed_role', '', {
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