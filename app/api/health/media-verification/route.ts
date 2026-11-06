import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { requestCarriesHealthToken } from '@/lib/health-token.cjs';
import { previewMediaVerificationEnabled } from '@/lib/media-verification-gate.cjs';
import { createRestrictedSigner } from '@/lib/media-provider-signer';
import { createPendingMediaHandler } from '@/lib/protected-media-contract.cjs';
import type { PendingMediaRecord } from '@/lib/media-manifest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'x-health-check-token', 'X-Content-Type-Options': 'nosniff' };
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAAMIM/////w8AH+4F+7C4l8kAAAAASUVORK5CYII=';
let running = false;
let lastStarted = 0;

async function providerStatus(url: string) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000) });
  await response.body?.cancel();
  return response.status;
}

async function providerJpeg(url: string) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000) });
  if (response.status !== 200 || response.headers.get('content-type')?.split(';')[0] !== 'image/jpeg' || !response.body) {
    await response.body?.cancel();
    return false;
  }
  const reader = response.body.getReader();
  const bytes = new Uint8Array(65536);
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > bytes.byteLength) return false;
      bytes.set(value, total);
      total += value.byteLength;
    }
    return total > 16 && bytes[0] === 255 && bytes[1] === 216;
  } finally { await reader.cancel(); }
}

// This operator canary never accepts customer images, asset IDs or destinations.
// Fixture actors measure the proxy contract, not a real signed-in user journey.
export async function POST(request: Request) {
  if (!previewMediaVerificationEnabled(process.env) || !requestCarriesHealthToken(request)) return new NextResponse(null, { status: 404, headers });
  const missing = ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(key => !process.env[key]?.trim());
  if (missing.length) return NextResponse.json({ ok: false, missing }, { status: 503, headers });
  if (running || Date.now() - lastStarted < 60000) return NextResponse.json({ ok: false, reason: 'canary_busy' }, { status: 429, headers });
  running = true;
  lastStarted = Date.now();
  const canaryId = randomUUID();
  const publicId = `styld/verification/${canaryId}_styld_jpeg`;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!.trim();
  const credentials = { cloud_name: cloudName, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET };
  const checks: Record<string, boolean | number[]> = {};
  let reason: string | undefined;
  let cleanupSucceeded = false;
  let cleanupType: 'authenticated' | 'upload' | 'private' = 'authenticated';
  try {
    const sign = createRestrictedSigner({ cloudName, secureDistribution: 'api.cloudinary.com', signingKey: '', signingMode: 'private-download', apiKey: credentials.api_key, apiSecret: credentials.api_secret });
    const uploaded = await cloudinary.uploader.upload(image, { ...credentials, public_id: publicId, type: 'authenticated', resource_type: 'image', format: 'jpg', overwrite: false, timeout: 10000 });
    if (uploaded.public_id === publicId && (uploaded.type === 'upload' || uploaded.type === 'private')) cleanupType = uploaded.type;
    checks.authenticatedJpeg = uploaded.type === 'authenticated' && uploaded.format === 'jpg' && uploaded.public_id === publicId;
    if (!checks.authenticatedJpeg) throw new Error('provider_answer_mismatch');
    const transformed = new URL(cloudinary.utils.url(publicId, {
      ...credentials, type: 'authenticated', resource_type: 'image', format: 'jpg',
      transformation: [{ width: 1 }], secure: true, sign_url: true,
      private_cdn: false, secure_distribution: 'res.cloudinary.com',
    }));
    if (transformed.origin !== 'https://res.cloudinary.com' || !transformed.pathname.startsWith(`/${cloudName}/image/authenticated/`) || !/\/s--[^/]+--\//.test(transformed.pathname)) throw new Error('unexpected_transform_location');
    checks.signedTransformAllowed = await providerJpeg(transformed.href);
    // Test the exact derived path after proving that the signed variant exists.
    const unsignedTransform = new URL(transformed.origin + transformed.pathname.replace(/\/s--[^/]+--\//, '/'));
    const base = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/`;
    const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
    const unsigned = await Promise.all([
      `${base}upload/${encodedId}.jpg`, `${base}upload/w_1/${encodedId}.jpg`,
      `${base}authenticated/${encodedId}.jpg`, `${base}authenticated/w_1/${encodedId}.jpg`,
      unsignedTransform.href,
    ].map(providerStatus));
    checks.unsignedStatuses = unsigned;
    checks.unsignedDenied = unsigned.every(status => [401, 403, 404].includes(status));
    const workspace = '11111111-1111-4111-8111-111111111111';
    const media: PendingMediaRecord = { assetId: canaryId, providerPublicId: publicId, ownerWorkspaceId: workspace, version: 1, state: 'pending', deliveryType: 'authenticated', providerRestrictionVerified: checks.unsignedDenied === true, revoked: false, publicDerivativeVerified: false, approvedVersion: null, accessExpiresAt: Date.now() + 120000 };
    let actor: object | null = { userId: 'canary-owner', sessionId: 'canary-session', role: 'client', workspaceId: workspace, active: true };
    let providerRequests = 0;
    const handler = createPendingMediaHandler({
      allowedOrigins: ['https://api.cloudinary.com'], maxBytes: 65536, timeoutMs: 5000,
      resolveActor: async () => actor, findManifest: async () => media,
      signAuthenticated: async (record: PendingMediaRecord) => sign(record),
      fetchAsset: (url: string, options: RequestInit) => { providerRequests++; return fetch(url, options); },
    });
    const read = () => handler(new Request('https://canary.invalid/image'), canaryId);
    const owned = await read();
    const bytes = new Uint8Array(await owned.arrayBuffer());
    checks.ownerProxyBytes = owned.status === 200 && owned.headers.get('content-type')?.split(';')[0] === 'image/jpeg' && bytes.length > 16 && bytes[0] === 255 && bytes[1] === 216;
    checks.privateNoStore = owned.headers.get('cache-control') === 'private, no-store';
    const beforeRefusals = providerRequests;
    actor = null;
    checks.anonymousRefused = (await read()).status === 404;
    actor = { userId: 'canary-other', sessionId: 'canary-other-session', role: 'client', workspaceId: '22222222-2222-4222-8222-222222222222', active: true };
    checks.otherWorkspaceRefused = (await read()).status === 404;
    checks.refusalsSkipProvider = providerRequests === beforeRefusals;
    const expired = sign({ ...media, accessExpiresAt: Date.now() - 60000 });
    const expiredStatus = await providerStatus(expired.url);
    checks.expiredSignatureDenied = [400, 401, 403].includes(expiredStatus);
  } catch (error) {
    const status = (error as { http_code?: number })?.http_code;
    reason = status === 401 || status === 403 ? 'provider_authorization_failed' : 'canary_not_verified';
  } finally {
    try {
      const cleanupOptions = { ...credentials, type: cleanupType, resource_type: 'image' as const, invalidate: true, timeout: 5000 };
      const destroyed = await cloudinary.uploader.destroy(publicId, cleanupOptions);
      cleanupSucceeded = destroyed.result === 'ok' || destroyed.result === 'not found';
    } catch { /* The caller receives only the cleanup result, never provider errors. */ }
    running = false;
  }
  const required = ['authenticatedJpeg', 'signedTransformAllowed', 'unsignedDenied', 'ownerProxyBytes', 'privateNoStore', 'anonymousRefused', 'otherWorkspaceRefused', 'refusalsSkipProvider', 'expiredSignatureDenied'];
  const ok = !reason && cleanupSucceeded && required.every(key => checks[key] === true);
  return NextResponse.json({ ok, checks, cleanupSucceeded, reason, canaryId, fixtureActorsOnly: true, realSessionUploadVerified: false }, { status: ok ? 200 : 502, headers });
}
