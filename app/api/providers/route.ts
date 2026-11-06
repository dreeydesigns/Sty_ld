import { NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { readPublicDiscovery } from '@/lib/public-discovery';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...await readPublicDiscovery(authPool) }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Providers are unavailable right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
}
