import { createHmac } from 'crypto';
import { authPool } from './auth-database';

export function privateIdentifier(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Authentication secret is not configured.');
  return createHmac('sha256', secret).update(value).digest('hex');
}
export async function securityEvent(event: string, userId: string | null, headers?: Headers | null, details: Record<string, unknown> = {}) {
  // Only trust the ingress header provided by Vercel. Unknown on other hosts.
  const ip = process.env.VERCEL ? headers?.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : undefined;
  await authPool.query(`INSERT INTO security_events (user_id,event,ip_hash,user_agent,details) VALUES ($1,$2,$3,$4,$5)`,
    [userId, event, ip ? privateIdentifier(ip) : null, headers?.get('user-agent')?.slice(0, 256) || null, JSON.stringify(details)]);
}
export async function consumeLimit(key: string, maximum: number, seconds: number) {
  const result = await authPool.query(`INSERT INTO auth_rate_limits (key,count,window_start,last_attempt)
    VALUES ($1,1,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN auth_rate_limits.window_start < NOW() - $3 * interval '1 second' THEN 1 ELSE auth_rate_limits.count + 1 END,
    window_start = CASE WHEN auth_rate_limits.window_start < NOW() - $3 * interval '1 second' THEN NOW() ELSE auth_rate_limits.window_start END,
    last_attempt = NOW()
    WHERE auth_rate_limits.window_start < NOW() - $3 * interval '1 second' OR auth_rate_limits.count < $2 RETURNING key`,
    [privateIdentifier(key), maximum, seconds]);
  return result.rowCount === 1;
}
export async function recordBrowserSignIn(userId:string,headers?:Headers|null){
  const cookie=headers?.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('styld_browser='))?.slice('styld_browser='.length);
  if(!cookie||!/^[0-9a-f-]{36}$/i.test(cookie))return;
  const hash=privateIdentifier(`browser:${cookie}`);
  const result=await authPool.query(`INSERT INTO auth_browsers(user_id,browser_hash) VALUES($1,$2)
    ON CONFLICT(user_id,browser_hash) DO NOTHING RETURNING user_id`,[userId,hash]);
  if(!result.rowCount){await authPool.query('UPDATE auth_browsers SET last_seen_at=now() WHERE user_id=$1 AND browser_hash=$2',[userId,hash]);return;}
  await securityEvent('new_browser_sign_in',userId,headers);
  // Notification failure must never undo a valid sign-in. OTP delivery itself is fail-closed.
  try{
    const {rows}=await authPool.query('SELECT email FROM users WHERE id=$1',[userId]);
    if(rows[0]?.email && await consumeLimit('email:daily',90,86400) && await consumeLimit('email:monthly',2700,31*86400)){
      const {sendEmail}=await import('./email-provider');
      const delivered=await sendEmail({to:rows[0].email,subject:'New sign-in to STYLD',text:'Your STYLD account was signed in on a newly recognised browser. If this was not you, open STYLD directly and go to Settings → Devices and security to log out other devices. Never share verification codes.'});
      if(!delivered.ok)await securityEvent('sign_in_alert_failed',userId);
    }
  }catch{console.error('Sign-in notification unavailable');}
}
