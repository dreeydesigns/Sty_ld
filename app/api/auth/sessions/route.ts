import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function GET(){try{
  const s=await requireAuthenticatedUser();
  const {rows}=await authPool.query(`SELECT id,"userAgent" AS browser,"userAgent" AS device_name,"createdAt" AS created_at,"updatedAt" AS last_active_at,(id=$2) AS is_current FROM auth_sessions WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "updatedAt" DESC`,[s.userId,s.sessionId]);
  const events=await authPool.query('SELECT id,event,user_agent,created_at FROM security_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',[s.userId]);
  return NextResponse.json({sessions:rows,events:events.rows},{headers:{'Cache-Control':'no-store'}});
}catch(e){return authError(e);}}
export async function DELETE(request:Request){try{
  sameOrigin(request);const s=await requireAuthenticatedUser();const body=await request.json();
  if(body.allOthers===true)await authPool.query('DELETE FROM auth_sessions WHERE "userId"=$1 AND id<>$2',[s.userId,s.sessionId]);
  else if(body.all===true)await authPool.query('DELETE FROM auth_sessions WHERE "userId"=$1',[s.userId]);
  else if(typeof body.sessionId==='string')await authPool.query('DELETE FROM auth_sessions WHERE "userId"=$1 AND id=$2',[s.userId,body.sessionId]);
  else throw new AuthError('Select a session.',400);
  await securityEvent('sessions_revoked',s.userId,request.headers);return NextResponse.json({ok:true});
}catch(e){return authError(e);}}
