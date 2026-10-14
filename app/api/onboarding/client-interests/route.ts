import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, AuthError } from '@/lib/auth-resolver';
import { sameOrigin, authError } from '@/lib/api-security';

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const session = await requireAuthenticatedUser();
    if (session.role !== 'client') {
      throw new AuthError('Client account required.', 403);
    }

    const body = await request.json();
    const { interests } = body;

    if (!Array.isArray(interests)) {
      throw new AuthError('Interests must be an array.', 400);
    }

    // Validate interests are from allowed list
    const validInterests = [
      'hair', 'nails', 'makeup', 'skincare', 'massage', 'waxing',
      'brows', 'lashes', 'hair-color', 'braids', 'natural-hair',
      'bridal', 'mens-grooming', 'wellness'
    ];

    const validInterestsSet = new Set(validInterests);
    const invalidInterests = interests.filter(i => !validInterestsSet.has(i));
    if (invalidInterests.length > 0) {
      throw new AuthError(`Invalid interests: ${invalidInterests.join(', ')}`, 400);
    }

    // Store interests in user_settings table
    const { sql } = await import('@vercel/postgres');
    await sql`
      INSERT INTO user_settings (user_id, interests)
      VALUES (${session.userId}, ${JSON.stringify(interests)})
      ON CONFLICT (user_id) DO UPDATE SET
        interests = EXCLUDED.interests,
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, interests });
  } catch (e) {
    const { authError } = await import('@/lib/api-security');
    return authError(e);
  }
}

export async function GET(request: Request) {
  try {
    const session = await (await import('@/lib/auth-resolver')).requireAuthenticatedUser();
    if (session.role !== 'client') {
      throw new Error('Client account required.');
    }

    const { sql } = await import('@vercel/postgres');
    const result = await import('@vercel/postgres').then(({ sql }) =>
      sql`SELECT interests FROM user_settings WHERE user_id = ${session.userId}`
    );

    const interests = result.rows[0]?.interests || [];
    return NextResponse.json({ interests });
  } catch (e) {
    const { authError } = await import('@/lib/api-security');
    return authError(e);
  }
}