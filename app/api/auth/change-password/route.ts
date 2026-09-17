import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { verifySession } from '@/lib/auth-server';
import { comparePasswords, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = cookies().get('session')?.value;
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.currentPassword !== 'string' || typeof body?.newPassword !== 'string' ||
      body.newPassword.length < 8 || body.newPassword.length > 72) {
    return NextResponse.json({ error: 'Use a password of 8–72 characters.' }, { status: 400 });
  }
  try {
    const user = await verifySession(token);
    const { rows } = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;
    const oldHash = rows[0]?.password_hash;
    if (!oldHash || !await comparePasswords(body.currentPassword, oldHash)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }
    const hash = await hashPassword(body.newPassword);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const changed = await sql`
      WITH updated AS (
        UPDATE users SET password_hash = ${hash}, updated_at = NOW()
        WHERE id = ${user.id} AND password_hash = ${oldHash} RETURNING id
      ), revoked AS (
        DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)
          AND token_hash != ${tokenHash}
      ) SELECT id FROM updated
    `;
    if (!changed.rows.length) return NextResponse.json({ error: 'Password changed elsewhere. Please sign in again.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Password change failed', error);
    return NextResponse.json({ error: 'Unable to change password. Please sign in and try again.' }, { status: 500 });
  }
}
