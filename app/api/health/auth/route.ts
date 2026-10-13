import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { emailAndAuthEnvStatus } from '@/lib/email-diagnostics';

export const dynamic = 'force-dynamic';

function denied() {
  return new NextResponse(null, { status: 404 });
}

function tokenMatches(provided: string | null): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!tokenMatches(request.headers.get('x-health-check-token'))) return denied();
  return NextResponse.json(
    {
      ok: true,
      service: 'styld-email-auth',
      configured: emailAndAuthEnvStatus(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}