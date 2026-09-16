import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifySession } from '@/lib/auth-server';
import { isAdminRole } from '@/lib/roles';

/**
 * Get all services
 * GET /api/services — public read (catalogue display).
 */
export async function GET() {
  try {
    const result = await sql`
      SELECT id, name, description, price, duration_minutes, image_url, category
      FROM services
      WHERE is_active = true
      ORDER BY category, name
    `;

    return NextResponse.json({
      success: true,
      services: result.rows,
    });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

/**
 * Create a new service (admin only)
 * POST /api/services
 *
 * P0A (scope item D): this used to be fully unauthenticated. Anyone could insert
 * catalogue rows — i.e. invent priced services with no verification. The role is
 * now resolved server-side from the verified session's user record:
 * the session cookie proves identity, the DB proves the role. `assumed_role`,
 * `user_id` cookies and any request-body role are never consulted.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const session = await verifySession(token);
      userId = session.id;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role comes from the database, not from the client.
    const roleResult = await sql`
      SELECT role FROM users WHERE id = ${userId}
      UNION
      SELECT role FROM user_roles WHERE user_id = ${userId} AND role IN ('admin', 'super_admin')
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles = roleResult.rows.map((row: any) => row.role);
    const isAdmin = roles.some((role) => isAdminRole(role));

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, price, durationMinutes, imageUrl, category } = await req.json();

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO services (name, description, price, duration_minutes, image_url, category)
      VALUES (${name}, ${description || null}, ${price}, ${durationMinutes || null}, ${imageUrl || null}, ${category || null})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      service: result.rows[0],
    });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
