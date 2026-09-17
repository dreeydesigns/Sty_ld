import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-server';

/**
 * Get all services
 * GET /api/services
 */
export async function GET(req: NextRequest) {
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
      { error: 'Failed to fetch services', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Create a new service (admin only)
 * POST /api/services
 */
export async function POST(req: NextRequest) {
  const token = cookies().get('session')?.value;
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const user = await verifySession(token);
    const account = await sql`SELECT role FROM users WHERE id = ${user.id}`;
    if (!['professional', 'salon', 'admin', 'super_admin'].includes(account.rows[0]?.role)) {
      return NextResponse.json({ error: 'Provider access required.' }, { status: 403 });
    }
    const { name, description, price, durationMinutes, imageUrl, category } = await req.json();

    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO services (provider_id, name, description, price, duration_minutes, image_url, category)
      VALUES (${user.id}, ${name}, ${description || null}, ${price}, ${durationMinutes || null}, ${imageUrl || null}, ${category || null})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      service: result.rows[0],
    });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: 'Failed to create service', details: String(error) },
      { status: 500 }
    );
  }
}
