import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
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

    if (interests.length > validInterests.length) throw new AuthError('Too many interests.', 400);
    const saved = [...new Set(interests)];
    const result = await authPool.query(
      "UPDATE identity_workspaces SET profile=jsonb_set(profile,'{interests}',$3::jsonb,true) WHERE id=$1 AND user_id=$2 AND role='client' AND status='active' RETURNING id",
      [session.workspaceId, session.userId, JSON.stringify(saved)]
    );
    if (!result.rowCount) throw new AuthError('Client workspace unavailable.', 403);

    return NextResponse.json({ ok: true, interests: saved });
  } catch (e) {
    const { authError } = await import('@/lib/api-security');
    return authError(e);
  }
}

export async function GET(request: Request) {
  try {
    const session = await (await import('@/lib/auth-resolver')).requireAuthenticatedUser();
    if (session.role !== 'client') {
      throw new AuthError('Client account required.', 403);
    }

    const result = await authPool.query(
      "SELECT profile->'interests' AS interests FROM identity_workspaces WHERE id=$1 AND user_id=$2 AND role='client' AND status='active'",
      [session.workspaceId, session.userId]
    );
    if (!result.rows.length) throw new AuthError('Client workspace unavailable.', 403);
    const interests = result.rows[0].interests || [];
    return NextResponse.json({ interests });
  } catch (e) {
    const { authError } = await import('@/lib/api-security');
    return authError(e);
  }
}
