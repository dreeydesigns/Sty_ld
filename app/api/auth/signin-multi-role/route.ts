import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  verifyCredentialsMultiRole, 
  createMultiRoleSession 
} from '@/lib/auth-multi-role';

/**
 * POST /api/auth/signin-multi-role
 * 
 * Sign in with phone and password, returns available roles
 * Optionally accepts assumedRole to create session with specific role
 * 
 * Request body:
 * {
 *   phone: string,
 *   password: string,
 *   assumedRole?: string (optional - if provided, creates session with this role)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   user: {
 *     id: string,
 *     first_name: string,
 *     email: string,
 *     phone: string,
 *     current_role: string,
 *     available_roles: string[],
 *     is_universal_admin: boolean
 *   },
 *   session?: {
 *     assumed_role: string,
 *     token: string (for session cookie)
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { phone, password, assumedRole } = body || {};

    if (!phone || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Phone and password are required' 
        },
        { status: 400 }
      );
    }

    // Verify credentials and get available roles
    const user = await verifyCredentialsMultiRole(phone, password);

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid phone or password' 
        },
        { status: 401 }
      );
    }

    // If assumedRole is provided, create session with that role
    if (assumedRole) {
      // Validate that user has access to this role
      if (!user.available_roles.includes(assumedRole)) {
        return NextResponse.json(
          { 
            success: false,
            error: `User does not have access to role: ${assumedRole}` 
          },
          { status: 403 }
        );
      }

      const userAgent = req.headers.get('user-agent') || 'Unknown';
      const session = await createMultiRoleSession(
        user.id,
        assumedRole,
        'Mobile Device',
        userAgent,
        req.headers.get('x-forwarded-for')?.split(',')[0] || undefined
      );

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set('session', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          first_name: user.first_name,
          email: user.email,
          phone: user.phone,
          current_role: user.current_role,
          available_roles: user.available_roles,
          is_universal_admin: user.is_universal_admin,
        },
        session: {
          assumed_role: session.assumed_role,
          available_roles: session.available_roles,
        },
      });
    }

    // If no assumedRole provided, just return available roles for user to choose
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        email: user.email,
        phone: user.phone,
        current_role: user.current_role,
        available_roles: user.available_roles,
        is_universal_admin: user.is_universal_admin,
      },
      message: 'Please select a role to proceed',
    });
  } catch (error) {
    console.error('SIGNIN_MULTI_ROLE_ERROR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Sign in failed',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
}
