import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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
  try {
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
      { error: 'Failed to create service', details: String(error) },
      { status: 500 }
    );
  }
}
