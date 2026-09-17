import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { verifySession } from '@/lib/auth-server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifySession(sessionToken);
    
    const hash = createHash("sha256").update(sessionToken).digest("hex");
    // Explicitly casting rows as 'any' to satisfy TypeScript for now
    const { rows } = await sql`
      SELECT id, device_name, browser, last_active_at, created_at, (token_hash = ${hash}) AS is_current
      FROM sessions 
      WHERE user_id = ${user.id} AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY last_active_at DESC
    `;

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    console.error('SESSION_FETCH_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  const token = cookies().get('session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = await verifySession(token);
    const hash = createHash('sha256').update(token).digest('hex');
    const body = await req.json().catch(() => null);
    if (body?.allOthers === true) {
      await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND token_hash != ${hash}`;
    } else if (typeof body?.sessionId === 'string') {
      const result = await sql`DELETE FROM sessions WHERE user_id = ${user.id}
        AND id::text = ${body.sessionId} AND token_hash != ${hash} RETURNING id`;
      if (!result.rows.length) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    } else return NextResponse.json({ error: 'Select a session.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Session revocation failed', error);
    return NextResponse.json({ error: 'Unable to revoke sessions.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
