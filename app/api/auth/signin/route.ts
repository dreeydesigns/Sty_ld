import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserCredentials, createSession } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    // 2. Verify credentials using your helper
    const user = await verifyUserCredentials(phone, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid phone or password' },
        { status: 401 }
      );
    }

    // 3. Create session in database
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const sessionToken = await createSession(user.id, 'Mobile Device', userAgent);

    // 4. Set cookie using next/headers (more reliable in Route Handlers)
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: { 
        id: user.id, 
        firstName: user.firstName, 
        role: user.role 
      },
    });

  } catch (error) {
    // Log full error to terminal for debugging
    console.error('SIGNIN_ERROR_DEBUG:', error);
    
    return NextResponse.json(
      { 
        error: 'Sign in failed', 
        details: error instanceof Error ? error.message : 'Unknown server error' 
      }, 
      { status: 500 }
    );
  }
}