/**
 * GET /api/health/environment
 *
 * Reads the deployment's own effective state back out of the running process: which database the
 * resolved connection string actually reaches, whether it is empty, which migrations it has
 * recorded, and what the media and email gates currently answer. It exists because a Vercel screen
 * shows what was configured and only the process can show what it resolved to after branch
 * precedence. Every statement is a SELECT, the route is locked behind HEALTH_CHECK_TOKEN, and the
 * answer holds no connection string and no credential value.
 */
import { NextResponse } from 'next/server';
import { authPool } from '@/lib/auth-database';
import { emailAndAuthEnvStatus } from '@/lib/email-diagnostics';
import { requestCarriesHealthToken } from '@/lib/health-token.cjs';
import { readEnvironmentProbe } from '@/lib/environment-probe.cjs';

export const dynamic = 'force-dynamic';

function denied() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: Request) {
  if (!requestCarriesHealthToken(request)) return denied();
  try {
    const probe = await readEnvironmentProbe({
      query: (sql: string) => authPool.query(sql),
      env: process.env,
    });
    return NextResponse.json(
      { ok: true, service: 'styld-environment', configured: emailAndAuthEnvStatus(), probe },
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch {
    // A database that will not answer is reported as unavailable, without its error text, because
    // a driver message repeats the connection target back.
    return NextResponse.json(
      { ok: false, error: 'The environment probe is unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  }
}
