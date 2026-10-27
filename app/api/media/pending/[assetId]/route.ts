import { NextRequest, NextResponse } from 'next/server';
import { createPendingMediaHandler } from '@/lib/protected-media-contract.cjs';
import { resolveMediaDeliveryConfig } from '@/lib/media-delivery-config.cjs';
import { findPendingMedia, openPendingAccessWindow, type MediaActor, type PendingMediaRecord } from '@/lib/media-manifest';
import { createRestrictedSigner } from '@/lib/media-provider-signer';
import { resolveCurrentStyldUser } from '@/lib/auth-resolver';
import { authError, sameOrigin } from '@/lib/api-security';
import { consumeLimit, securityEvent } from '@/lib/security-events';

export const dynamic = 'force-dynamic';

const MAX_WINDOW_REQUESTS_PER_HOUR = 60;

// Everything a caller may learn about a restricted asset, in every refusal case. The
// status code stays generic on purpose: 401 says only that a sign-in is missing, and
// 404 never confirms that a pending upload exists under the name someone guessed.
const REFUSAL = { ok: false, error: 'This image is not available.' } as const;

function refusal(status: number) {
  return NextResponse.json(REFUSAL, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

// The actor identity is read from the server session, never from the request. There is
// no separate moderation grant table yet, so an MFA-verified super admin is the
// reviewer, and that is stated plainly rather than implied by a permission row.
async function serverActor(request: NextRequest): Promise<MediaActor | null> {
  const session = await resolveCurrentStyldUser();
  if (!session) return null;
  return {
    userId: session.userId,
    sessionId: session.sessionId,
    role: session.role,
    active: session.accountStatus === 'active',
    workspaceId: session.workspaceId,
    mfaVerified: session.mfaVerified,
    canReviewMedia: session.role === 'super_admin' && session.admin === true,
  };
}

function delivery(
  request: NextRequest,
  signKey: string,
) {
  const config = resolveMediaDeliveryConfig(process.env);
  if (!config) return null;
  try {
    const sign = createRestrictedSigner({ cloudName: config.cloudName, secureDistribution: config.secureDistribution, signingKey: signKey });
    const handler = createPendingMediaHandler({
      allowedOrigins: [...config.allowedOrigins],
      maxBytes: config.maxBytes,
      timeoutMs: config.timeoutMs,
      resolveActor: () => serverActor(request),
      findManifest: async (assetId: string) => findPendingMedia(assetId),
      signAuthenticated: async (media: PendingMediaRecord) => sign(media),
      fetchAsset: (url: string, options: RequestInit) => fetch(url, options),
    });
    return { handler, windowSeconds: config.windowSeconds };
  } catch {
    // A half-configured delivery is a refusal, never a fall back to public storage.
    return null;
  }
}

async function assetId(context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  return typeof assetId === 'string' ? assetId : '';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const signKey = process.env.CLOUDINARY_SIGN_KEY ?? '';
  const setup = delivery(request, signKey);
  if (!setup) return refusal(503);
  return setup.handler(request, await assetId(context));
}

// Opening an access window is the only write this route performs, and the bound lives
// in the statement: an owner may reopen a window on their own pending asset, an
// MFA-verified reviewer on any pending asset. Nothing arrives from the client.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    sameOrigin(request);
    const signKey = process.env.CLOUDINARY_SIGN_KEY ?? '';
    const setup = delivery(request, signKey);
    if (!setup) return refusal(503);
    const actor = await serverActor(request);
    if (!actor) return refusal(401);
    if (!(await consumeLimit(`media-window:${actor.userId}`, MAX_WINDOW_REQUESTS_PER_HOUR, 3600))) {
      return NextResponse.json({ ok: false, error: 'Too many requests right now. Please try again in a moment.' }, { status: 429 });
    }
    const id = await assetId(context);
    const outcome = await openPendingAccessWindow(id, actor, setup.windowSeconds);
    await securityEvent(outcome === 'granted' ? 'media_access_window_granted' : 'media_access_window_refused', actor.userId, request.headers);
    if (outcome !== 'granted') return refusal(404);
    return NextResponse.json({ ok: true, delivery: 'restricted' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authError(error);
  }
}
