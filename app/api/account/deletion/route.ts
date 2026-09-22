import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifySession,
  requestAccountDeletion,
  cancelAccountDeletion,
  invalidateAllSessions,
  getAccountDeletionStatus,
} from '@/lib/auth-server';

/**
 * Account deletion lifecycle (server-authoritative).
 *
 * POST { action: 'request' } -> marks the account deletion_status='pending' with a
 *                               30-day grace period (real database state).
 * POST { action: 'cancel'  } -> restores deletion_status='active'.
 *
 * Both require a verified server-side session. No client-supplied identity is
 * trusted. Existing 30-day grace behaviour in lib/auth-server.ts is reused so
 * the UI claim ("removes your account after the grace period") is truthful.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required.' },
        { status: 401 },
      );
    }

    let userId: string;
    try {
      const session = await verifySession(token);
      userId = session.id;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Your session has expired. Please sign in again.' },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === 'request') {
      await requestAccountDeletion(userId);
      // Sign every legacy device out at request time; the 30-day grace is
      // re-entered only by deliberately signing back in (and can be cancelled
      // from Settings while the grace lasts).
      await invalidateAllSessions(userId);
      const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return NextResponse.json({
        ok: true,
        status: 'pending',
        scheduledFor: scheduledFor.toISOString(),
        message: 'Deletion scheduled. You have 30 days to sign back in and cancel.',
      });
    }

    if (body.action === 'cancel') {
      await cancelAccountDeletion(userId);
      return NextResponse.json({ ok: true, status: 'active', message: 'Account deletion cancelled.' });
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action.' },
      { status: 400 },
    );
  } catch (error) {
    console.error('ACCOUNT_DELETION_ERROR:', error);
    return NextResponse.json(
      { ok: false, error: 'We could not complete that request. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * GET -> current deletion lifecycle state for the signed-in account.
 * Drives the Settings "account deletion scheduled" banner and its cancel
 * button; works during the grace period because verifySession admits
 * pending-in-grace sessions.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    let userId: string;
    try {
      const session = await verifySession(token);
      userId = session.id;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Your session has expired. Please sign in again.' },
        { status: 401 },
      );
    }

    const state = await getAccountDeletionStatus(userId);
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    console.error('ACCOUNT_DELETION_STATUS_ERROR:', error);
    return NextResponse.json(
      { ok: false, error: 'We could not read the account status. Please try again.' },
      { status: 500 },
    );
  }
}
