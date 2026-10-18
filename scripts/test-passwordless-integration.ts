/** Real PostgreSQL and Better Auth test. Captures mail locally; no email sent.
 * Only a randomly named temporary schema is modified. */
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

async function main(){
 const db=new PGlite();
 const query=async(text:any,values?:any[])=>{const q=typeof text==='string'?text:text.text; const params=values||text.values; if(!params && q.includes(';')) {const results=await db.exec(q);const r=results.at(-1);return {rows:r?.rows||[],rowCount:r?.affectedRows||0};}const r=await db.query(q,params);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};};
 const fixture={query,connect:async()=>({query,release(){}}),end:async()=>db.close()};
 (globalThis as any).styldAuthPool=fixture;
 // Readiness requires a configured database URL even though all database calls
 // use the embedded fixture above. Never inherit a live connection from the shell.
 process.env.POSTGRES_URL='postgresql://fixture:fixture@127.0.0.1:1/styld_fixture';
 process.env.DATABASE_URL=process.env.POSTGRES_URL;
 process.env.BETTER_AUTH_SECRET='isolated-test-secret-not-for-production-1234567890';
 process.env.AUTH_MFA_SECRET='isolated-test-mfa-secret-not-for-production';
 delete process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_SECRET;
 const messages=new Map<string,string>();let rejectMail=false;
 const mail=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);if(rejectMail){res.writeHead(503);res.end(JSON.stringify({message:'Simulated outage'}));return;}if(body.subject==='Your STYLD sign-in code')messages.set(body.to[0],body.text.match(/\d{6}/)[0]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'local-captured-mail'}));});
 await new Promise<void>(resolve=>mail.listen(0,'127.0.0.1',resolve));
 let pool:Pool|undefined;
 try{
  await db.exec(`CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE,first_name text NOT NULL DEFAULT '',last_name text,phone text UNIQUE,role text DEFAULT 'client',email_verified boolean DEFAULT false,phone_verified boolean DEFAULT false,profile_image_url text,cover_image_url text,display_name text,salon_name text,bio text,location text,theme text,deletion_status text DEFAULT 'active',deletion_requested_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE user_roles(user_id uuid REFERENCES users(id),role text,PRIMARY KEY(user_id,role));CREATE TABLE services(id uuid PRIMARY KEY,provider_id uuid);CREATE TABLE bookings(id uuid PRIMARY KEY,client_id uuid,provider_id uuid);CREATE TABLE auth_rate_limits(key text PRIMARY KEY,count integer NOT NULL,window_start timestamptz NOT NULL,last_attempt timestamptz NOT NULL);`);
  process.env.BETTER_AUTH_URL='http://localhost:4321';process.env.RESEND_API_URL=`http://127.0.0.1:${(mail.address() as {port:number}).port}`;
  process.env.EMAIL_PROVIDER='resend';
  process.env.RESEND_API_KEY='test-capture-only';process.env.RESEND_FROM_EMAIL='STYLD <test@example.test>';
  const {auth}=await import('../lib/better-auth');const {authPool}=await import('../lib/auth-database');pool=authPool;
  await pool.query(readFileSync('sql/migrations/010_passwordless_auth.sql','utf8'));
  await pool.query(readFileSync('sql/migrations/011_identity_workspaces.sql','utf8'));
  const {getMigrations}=await import('better-auth/db/migration');await(await getMigrations(auth.options)).runMigrations();
  const route=await import('../app/api/auth/[...all]/route');
  let cookie='';
  const call=async(path:string,body?:object)=>{
   const response=await (body?route.POST:route.GET)(new Request('http://localhost:4321/api/auth'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',origin:'http://localhost:4321','user-agent':'STYLD integration test',cookie},body:body?JSON.stringify(body):undefined}));
   const pairs=response.headers.getSetCookie().map(c=>c.split(';')[0]);if(pairs.length){const jar=new Map(cookie.split('; ').filter(Boolean).map(c=>{const at=c.indexOf('=');return [c.slice(0,at),c.slice(at+1)];}));for(const pair of pairs){const at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}cookie=Array.from(jar).map(([k,v])=>k+'='+v).join('; ');}
   return {status:response.status,data:await response.json()};
  };
  const email='integration@example.test';
  assert.equal((await call('/email-otp/send-verification-otp',{email,type:'sign-in'})).status,200);
  const otp=messages.get(email);assert.ok(otp,'Code must be sent through mail adapter');
  const pending=await pool.query('SELECT value FROM auth_verifications');
  assert.ok(pending.rows.length>0);assert.ok(pending.rows.every(r=>!r.value.includes(otp!)),'Pending OTP is hashed before consumption');
  assert.equal((await call('/email-otp/send-verification-otp',{email,type:'sign-in'})).status,429,'Resend cooldown enforced server-side');
  assert.equal((await call('/sign-in/email-otp',{email,otp:'000000'})).status,400);
  const signed=await call('/sign-in/email-otp',{email,otp});assert.equal(signed.status,200,JSON.stringify(signed.data));const userId=signed.data.user.id;
  assert.match(userId,/^[0-9a-f-]{36}$/);assert.equal(signed.data.user.emailVerified,true);
  const active=await call('/get-session');assert.ok(active.data?.user,'Session lookup failed: '+JSON.stringify(active));assert.equal(active.data.user.id,userId);
  assert.equal((await pool.query('SELECT role FROM user_roles WHERE user_id=$1',[userId])).rows[0].role,'client');
  assert.equal((await pool.query("SELECT count(*)::int n FROM security_events WHERE user_id=$1 AND event='login_success'",[userId])).rows[0].n,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM security_events WHERE user_id=$1 AND event='new_browser_sign_in'",[userId])).rows[0].n,1);
  const stored=await pool.query('SELECT value FROM auth_verifications');assert.ok(stored.rows.every(r=>!r.value.includes(otp!)),'No plaintext OTP at rest');
  assert.equal((await call('/sign-in/email-otp',{email,otp})).status,400,'Consumed code must not replay');
  assert.equal((await call('/sign-out',{})).status,200);assert.equal((await call('/get-session')).data,null);
  assert.equal((await call('/sign-in/email-otp',{email,otp})).status,429,'Sign-in burst must be rate limited');
  // Advance only the isolated schema's persisted rate-limit clock, then
  // exercise the real limiter's window-reset path without sleeping a minute.
  await pool.query('UPDATE auth_limits SET "lastRequest"="lastRequest"-61000');
  await pool.query("UPDATE auth_rate_limits SET window_start=window_start-interval '61 seconds'");
  await call('/email-otp/send-verification-otp',{email,type:'sign-in'});
  const again=await call('/sign-in/email-otp',{email,otp:messages.get(email)});assert.equal(again.status,200,JSON.stringify(again.data));assert.equal(again.data.user.id,userId,'Returning login preserves identity');
  await pool.query('DELETE FROM auth_sessions WHERE "userId"=$1',[userId]);assert.equal((await call('/get-session')).data,null,'Revocation invalidates cookie immediately');
  await pool.query('UPDATE auth_limits SET "lastRequest"="lastRequest"-61000');
  const expiredEmail='expired@example.test';
  await call('/email-otp/send-verification-otp',{email:expiredEmail,type:'sign-in'});
  await pool.query('UPDATE auth_verifications SET "expiresAt"=now()-interval \'1 second\'');
  assert.equal((await call('/sign-in/email-otp',{email:expiredEmail,otp:messages.get(expiredEmail)})).status,400,'Expired OTP rejected');
  await pool.query('UPDATE users SET auth_suspended=true WHERE id=$1',[userId]);
  await pool.query("UPDATE auth_rate_limits SET window_start=window_start-interval '61 seconds'");
  await pool.query('UPDATE auth_limits SET "lastRequest"="lastRequest"-61000');
  await call('/email-otp/send-verification-otp',{email,type:'sign-in'});
  assert.equal((await call('/sign-in/email-otp',{email,otp:messages.get(email)})).status,403,'Suspended account denied');
  const clientWorkspace=(await pool.query("SELECT id FROM identity_workspaces WHERE user_id=$1 AND role='client'",[userId])).rows[0];
  await pool.query("INSERT INTO identity_workspaces(user_id,role,profile) VALUES($1,'professional','{\"displayName\":\"Professional fixture\"}')",[userId]);
  await pool.query("UPDATE identity_workspaces SET profile='{\"displayName\":\"Client fixture\"}' WHERE id=$1",[clientWorkspace.id]);
  const profiles=await pool.query('SELECT role,profile FROM identity_workspaces WHERE user_id=$1 ORDER BY role',[userId]);
  assert.equal(profiles.rows.length,2);assert.notEqual(profiles.rows[0].profile.displayName,profiles.rows[1].profile.displayName);
  rejectMail=true;
  const failed=await call('/email-otp/send-verification-otp',{email:'outage@example.test',type:'sign-in'});assert.equal(failed.status,503,'Delivery failure must not claim success');
  console.log('PASS: dispatch, wrong code, signup, verified email, UUID mapping, role, session, audit, OTP hashing/replay, logout, stable identity, revocation, delivery failure.');
 }finally{
  if(pool)await pool.end();await new Promise<void>(resolve=>mail.close(()=>resolve()));
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
