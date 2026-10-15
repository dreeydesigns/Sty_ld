import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, AuthError } from '@/lib/auth-resolver';
import { sameOrigin, authError } from '@/lib/api-security';

const VALID_INTERESTS = [
  'hair', 'nails', 'makeup', 'skincare', 'massage', 'waxing',
  'brows', 'lashes', 'hair-color', 'braids', 'natural-hair',
  'bridal', 'mens-grooming', 'wellness'
];

/**
 * CONTAINMENT (Phase 8B-A):
 * Interests persistence is DISABLED. The legacy `user_settings.interests`
 * column is unverified (migration 001 omits it; lib/db.ts adds it only when it
 * creates the table) and no migration has been approved, so this endpoint must
 * not attempt a write. It fails closed with a non-cacheable 503 and never falls
 * back to browser storage. Interested storage is proposed to move to
 * identity_workspaces.profile.interests — see
 * docs/phase8b-a-interests-migration-plan.md. Authentication, role and input
 * validation are preserved.
 */
const UNAVAILABLE = {
  ok: false,
  available: false,
  error: 'Saving interests is temporarily unavailable while account preference storage is finalised.',
} as const;

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const session = await requireAuthenticatedUser();
    if (session.role !== 'client') {
      throw new AuthError('Client account required.', 403);
    }

    const body = await request.json().catch(() => null);
    const interests = (body && typeof body === 'object' && 'interests' in body)
      ? (body as { interests?: unknown }).interests
      : undefined;

    if (!Array.isArray(interests)) {
      throw new AuthError('Interests must be an array.', 400);
    }

    // Validate against the allowed list so malformed input is never accepted.
    const validInterestsSet = new Set(VALID_INTERESTS);
    const invalidInterests = interests.filter((i) => !validInterestsSet.has(i));
    if (invalidInterests.length > 0) {
      throw new AuthError(`Invalid interests: ${invalidInterests.join(', ')}`, 400);
    }

    // Fail closed: no read or write to any storage model occurs here.
    return NextResponse.json(UNAVAILABLE, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return authError(e);
  }
}

export async function GET() {
  try {
    const session = await requireAuthenticatedUser();
    if (session.role !== 'client') {
      throw new AuthError('Client account required.', 403);
    }
    // Fail closed: interests cannot be read from unverified storage.
    return NextResponse.json(UNAVAILABLE, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return authError(e);
  }
}
