import { readPublicDiscovery } from '@/lib/public-discovery';
import { NextRequest, NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';



import { authError, sameOrigin } from '@/lib/api-security';

/**
 * Get all services
 * GET /api/services
 */
export async function GET() {
  try {
    const { services } = await readPublicDiscovery(authPool);
    return NextResponse.json({ success: true, services: services.map(service => ({
      id: service.id, workspace_id: service.workspaceId, name: service.name,
      category: service.category, price: service.price, duration_minutes: service.durationMinutes,
    })) }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch {
    return NextResponse.json({ error: 'Services are unavailable right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { saveProviderService } = await import('@/lib/provider-services');
    return NextResponse.json(await saveProviderService(await req.json(), false), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return authError(error); }
}
