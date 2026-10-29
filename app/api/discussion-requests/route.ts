/**
 * JOURNEY-05, request to discuss.
 *
 * POST creates a non-binding request from the signed-in client to one provider workspace.
 * GET lists the caller's sent requests and, for a professional or salon, the requests they
 * received. Neither call can read another account's rows: the client side is the caller's user
 * id and the provider side is the caller's own active workspaces.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin, authError } from '@/lib/api-security';
import { securityEvent } from '@/lib/security-events';
import {
  createDiscussionRequest,
  listDiscussionRequests,
  DiscussionError,
  type DiscussionActor,
} from '@/lib/discussion-requests';

function failure(error: unknown) {
  if (error instanceof DiscussionError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode });
  }
  return authError(error);
}

async function audit(event: string, actor: DiscussionActor, req: NextRequest, details: Record<string, unknown>) {
  try {
    await securityEvent(event, actor.userId, req.headers, details);
  } catch {
    // The stored request is the record of consent; a failed audit write must not undo it.
    console.error('Discussion audit event unavailable');
  }
}

function actorFrom(session: Awaited<ReturnType<typeof requireAuthenticatedUser>>): DiscussionActor {
  return {
    userId: session.userId,
    workspaceId: session.workspaceId,
    role: session.role,
    workspaces: session.workspaces.map((workspace) => ({ id: workspace.id, role: workspace.role, status: workspace.status })),
  };
}

export async function GET() {
  try {
    const actor = actorFrom(await requireAuthenticatedUser());
    return NextResponse.json({ ok: true, ...(await listDiscussionRequests(authPool, actor)) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const actor = actorFrom(await requireAuthenticatedUser());
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new DiscussionError('Send the request details.');
    const result = await createDiscussionRequest(authPool, actor, body);
    if (result.created) {
      await audit('discussion_request_sent', actor, req, {
        requestId: result.request.id,
        providerWorkspaceId: String(body.providerWorkspaceId),
      });
    }
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    return failure(error);
  }
}
