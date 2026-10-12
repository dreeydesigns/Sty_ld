import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { recentAuthentication } from '@/lib/auth-policy';
import { generateTotpSecret,verifyTotpCode,encryptTotpSecret,decryptTotpSecret,generateRecoveryCodes,hashRecoveryCode } from '@/lib/totp';
import { consumeLimit,securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function POST(request:Request){try{
  sameOrigin(request);const s=await requireAuthenticatedUser();const {action,code}=await request.json();
  if(!await consumeLimit(`mfa:${s.userId}`,8,300))throw new AuthError('Too many attempts. Wait five minutes.',429);
  if(action==='setup'){
    if(!recentAuthentication(s.createdAt))throw new AuthError('Sign in again before setting up your authenticator.',403);
    const existing=await authPool.query('SELECT enabled FROM auth_totp WHERE user_id=$1',[s.userId]);
    if(existing.rows[0]?.enabled)throw new AuthError('An authenticator is already configured.',409);
    const {secret,otpauthUrl}=generateTotpSecret(s.email||s.userId);
    await authPool.query(`INSERT INTO auth_totp(user_id,encrypted_secret) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET encrypted_secret=$2 WHERE auth_totp.enabled=false`,[s.userId,encryptTotpSecret(secret)]);
    return NextResponse.json({success:true,secret,otpauthUrl},{headers:{'Cache-Control':'no-store'}});
  }
  if(!['verify','validate','recovery'].includes(action)||typeof code!=='string')throw new AuthError('Invalid request.',400);
  const client=await authPool.connect();let recoveryCodes:string[]|undefined;
  try{
    await client.query('BEGIN');
    const {rows}=await client.query('SELECT * FROM auth_totp WHERE user_id=$1 FOR UPDATE',[s.userId]);const factor=rows[0];
    if(!factor)throw new AuthError('Set up an authenticator first.',400);
    if(action==='recovery'){
      if(!factor.enabled)throw new AuthError('Authenticator not enabled.',400);
      const used=await client.query('DELETE FROM auth_recovery_codes WHERE user_id=$1 AND code_hash=$2 RETURNING code_hash',[s.userId,hashRecoveryCode(code)]);
      if(!used.rowCount)throw new AuthError('Invalid recovery code.',400);
    }else{
      if(action==='verify'&&!recentAuthentication(s.createdAt))throw new AuthError('Sign in again to finish setup.',403);
      const step=Math.floor(Date.now()/30000);const secret=decryptTotpSecret(factor.encrypted_secret);
      const matched=[step-1,step,step+1].find(n=>n>Number(factor.last_step)&&verifyTotpCode(secret,code,0,n*30000));
      if(matched===undefined)throw new AuthError('Invalid or already used authenticator code.',400);
      if(!factor.enabled&&action!=='verify')throw new AuthError('Finish authenticator setup first.',400);
      await client.query('UPDATE auth_totp SET enabled=true,last_step=$2 WHERE user_id=$1',[s.userId,matched]);
      if(!factor.enabled){const recovery=generateRecoveryCodes();recoveryCodes=recovery.plainCodes;
        for(const hash of recovery.hashedCodes)await client.query('INSERT INTO auth_recovery_codes(user_id,code_hash) VALUES($1,$2)',[s.userId,hash]);}
    }
    await client.query(`INSERT INTO auth_session_context(session_id,user_id,active_role,mfa_verified_at) VALUES($1,$2,$3,now()) ON CONFLICT(session_id) DO UPDATE SET mfa_verified_at=now(),active_role=$3`,[s.sessionId,s.userId,s.admin?'super_admin':s.role]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await securityEvent('mfa_verified',s.userId,request.headers);return NextResponse.json({success:true,recoveryCodes},{headers:{'Cache-Control':'no-store'}});
}catch(e){return authError(e);}}
