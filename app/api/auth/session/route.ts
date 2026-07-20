import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  verifyMultiRoleSession,
  switchRoleInSession,
  getAllUserSessionsWithRoles
} from '@/lib/auth-multi-role';
import { sql } from '@vercel/postgres';

/**
 * GET /api/auth/current-session
 * Get current session info including assumed role
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const sessionData = await verifyMultiRoleSession(sessionToken);

    // Get user info
    const userResult = await sql`
      SELECT 
        id,
        first_name,
        email,
        phone,
        role,
        is_universal_admin
      FROM users
      WHERE id = ${sessionData.user_id}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0] as any;

    // Get all available roles
    const rolesResult = await sql`
      SELECT role FROM user_roles WHERE user_id = ${user.id}
      UNION
      SELECT role FROM users WHERE id = ${user.id}
      ORDER BY role
    `;

    const availableRoles = rolesResult.rows.map((r: any) => r.role);

    return NextResponse.json({
      success: true,
      session: {
        user_id: sessionData.user_id,
        assumed_role: sessionData.assumed_role,
        user: {
          id: user.id,
          first_name: user.first_name,
          email: user.email,
          phone: user.phone,
          is_universal_admin: user.is_universal_admin,
        },
        available_roles: availableRoles,
      },
    });
  } catch (error) {
    console.error('GET current session error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/switch-role
 * Switch to a different role in current session
 * 
 * Body:
 * {
 *   newRole: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const { newRole } = body || {};

    if (!newRole) {
      return NextResponse.json(
        { success: false, error: 'newRole is required' },
        { status: 400 }
      );
    }

    const sessionData = await verifyMultiRoleSession(sessionToken);

    // Get the session ID
    const sessionResult = await sql`
      SELECT id FROM sessions 
      WHERE token_hash = (
        SELECT token_hash FROM sessions 
        WHERE user_id = ${sessionData.user_id} 
        AND assumed_role = ${sessionData.assumed_role}
        ORDER BY last_active_at DESC
        LIMIT 1
      )
    `;

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionId = sessionResult.rows[0].id;

    // Switch role
    await switchRoleInSession(sessionId, newRole);

    return NextResponse.json({
      success: true,
      message: `Role switched to ${newRole}`,
      new_role: newRole,
    });
  } catch (error) {
    console.error('Switch role error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to switch role',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
