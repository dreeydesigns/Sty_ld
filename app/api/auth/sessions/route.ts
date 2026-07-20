import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { verifySession } from '@/lib/auth-server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifySession(sessionToken);
    
    // Explicitly casting rows as 'any' to satisfy TypeScript for now
    const { rows } = await sql`
      SELECT id, device_name, browser, last_active_at, created_at 
      FROM sessions 
      WHERE user_id = ${user.id}
      ORDER BY last_active_at DESC
    `;

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    console.error('SESSION_FETCH_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}