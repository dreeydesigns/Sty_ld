/**
 * JOURNEY-05, answering or withdrawing one discussion request.
 *
 * POST { action: 'accept' | 'decline' | 'withdraw' }. Accept and decline are allowed only for a
 * provider workspace that belongs to the caller. Withdraw is allowed only for the client who
 * sent the request. A decided request cannot be decided again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin, authError } from '@/lib/api-security';
import { securityEvent } from '@/lib/security-events';
import { respondToDiscussionRequest, DiscussionError, type DiscussionActor } from '@/lib/discussion-requests';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(req);
    const session = await requireAuthenticatedUser();
    const actor: DiscussionActor = {
      userId: session.userId,
      workspaceId: session.workspaceId,
      role: session.role,
      workspaces: session.workspaces.map((workspace) => ({ id: workspace.id, role: workspace.role, status: workspace.status })),
    };
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    const request = await respondToDiscussionRequest(authPool, actor, id, body?.action);
    try {
      await securityEvent(`discussion_request_${request.status}`, actor.userId, req.headers, {
        requestId: request.id,
      });
    } catch {
      // The stored decision is the record; a failed audit write must not undo it.
      console.error('Discussion audit event unavailable');
    }
    return NextResponse.json({ ok: true, request });
  } catch (error) {
    if (error instanceof DiscussionError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode });
    }
    return authError(error);
  }
}
