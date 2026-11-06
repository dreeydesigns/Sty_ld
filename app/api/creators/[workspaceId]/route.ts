import { NextRequest, NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { readPublicDiscovery } from '@/lib/public-discovery';

export async function GET(_request: NextRequest, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await context.params;
    const result = await readPublicDiscovery(authPool, workspaceId);
    const provider = result.providers[0];
    if (!provider) return NextResponse.json({ ok: false, error: 'Creator not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    const { area, ...creator } = provider;
    return NextResponse.json({ ok: true, creator: { ...creator, location: area }, services: result.services }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not load creator.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
}
