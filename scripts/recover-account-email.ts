/** Controlled operator tool. Verify the owner's identity outside this script first.
 * Run with --user-id UUID --email address --reason ticket --apply.
 * Never finds/merges accounts by display name, phone input, or unverified claims.
 */
import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main(){
 const {authPool}=await import('../lib/auth-database');
 const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];
 const id=value('--user-id'),email=value('--email')?.trim().toLowerCase(),reason=value('--reason');
 try{
  if(!args.includes('--user-id')||!args.includes('--email')||!args.includes('--reason')||!/^\S+@\S+\.\S+$/.test(email)||!reason)throw new Error('Provide --user-id, --email and --reason after identity review.');
  const client=await authPool.connect();try{
   await client.query('BEGIN');
   const r=await client.query('SELECT id,email,role FROM users WHERE id=$1 FOR UPDATE',[id]);
   if(!r.rowCount)throw new Error('Account not found.');
   if(r.rows[0].email)throw new Error('Account already has an email; this tool only migrates phone-only accounts.');
   const exists=await client.query('SELECT id FROM users WHERE lower(email)=$1',[email]);
   if(exists.rowCount)throw new Error('Email is already attached to an account. Manual duplicate review required.');
   if(!args.includes('--apply')){console.log('Preflight passed. Add --apply after reviewing identity evidence.');await client.query('ROLLBACK');return;}
   await client.query('UPDATE users SET email=$2,email_verified=false WHERE id=$1',[id,email]);
   await client.query('DELETE FROM auth_sessions WHERE "userId"=$1',[id]);
   await client.query('INSERT INTO security_events(user_id,event,details) VALUES($1,$2,$3)',[id,'operator_email_recovery',JSON.stringify({reason})]);
   await client.query('COMMIT');console.log('Email attached. Owner must verify an email OTP at next sign-in.');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }finally{await authPool.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
