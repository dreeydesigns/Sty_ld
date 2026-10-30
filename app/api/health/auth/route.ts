import { NextResponse } from 'next/server';
import { emailAndAuthEnvStatus } from '@/lib/email-diagnostics';
import { requestCarriesHealthToken } from '@/lib/health-token.cjs';

export const dynamic = 'force-dynamic';

function denied() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: Request) {
  if (!requestCarriesHealthToken(request)) return denied();
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