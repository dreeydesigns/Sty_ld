import { NextRequest, NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-server';
import { requireAuthenticatedUser } from '@/lib/auth-resolver';
import { authError, sameOrigin } from '@/lib/api-security';

/**
 * Get all services
 * GET /api/services
 */
export async function GET(req: NextRequest) {
  try {
    const result = await authPool.query(
      `SELECT id, name, description, price, duration_minutes, image_url, category
      FROM services
      WHERE is_active = true
      ORDER BY category, name`
    );

    return NextResponse.json({
      success: true,
      services: result.rows,
    });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error('Get services error:', failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

/**
 * Create a new service (admin only)
 * POST /api/services
 */
export async function POST(req: NextRequest) {
  try { sameOrigin(req); } catch (error) { return authError(error); }
  const cookieStore = await cookies();
  const token = (cookieStore.get('__Secure-session') || cookieStore.get('session'))?.value;
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const user = await verifySession(token);
    const actor = await requireAuthenticatedUser();
    if (!actor.workspaceId || !['professional','salon'].includes(actor.role) || (actor.admin && !actor.mfaVerified)) {
      return NextResponse.json({ error: 'Provider access required.' }, { status: 403 });
    }
    const { name, description, price, durationMinutes, imageUrl, category } = await req.json();

    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const result = await authPool.query(
      `INSERT INTO services (provider_id, workspace_id, name, description, price, duration_minutes, image_url, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [actor.userId, actor.workspaceId, name, description || null, price, durationMinutes || null, imageUrl || null, category || null]
    );

    return NextResponse.json({
      success: true,
      service: result.rows[0],
    });
  } catch (error) {
    const failure = error as { name?: string; code?: string } | null;
    console.error('Create service error:', failure?.name ? (failure.code ? `${failure.name} (${failure.code})` : failure.name) : 'UnknownError');
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
