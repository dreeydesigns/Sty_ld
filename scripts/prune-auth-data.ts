import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main(){
 const {authPool}=await import('../lib/auth-database');
 try{
  await authPool.query('DELETE FROM auth_sessions WHERE "expiresAt" < now()');
  await authPool.query('DELETE FROM auth_verifications WHERE "expiresAt" < now()');
  await authPool.query('DELETE FROM auth_session_context c WHERE NOT EXISTS(SELECT 1 FROM auth_sessions s WHERE s.id::text=c.session_id)');
  await authPool.query("DELETE FROM security_events WHERE created_at < now()-interval '90 days' AND event NOT LIKE 'moderation_%'");
  await authPool.query("DELETE FROM auth_browsers WHERE last_seen_at < now()-interval '90 days'");
  await authPool.query("DELETE FROM auth_rate_limits WHERE window_start < now()-interval '32 days'");
  console.log('Authentication retention cleanup complete.');
 }finally{await authPool.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
