import { NextResponse } from 'next/server';
import { requireAdmin,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function GET(request:Request){try{
 const actor=await requireAdmin();const q=(new URL(request.url).searchParams.get('q')||'').slice(0,100);
 const [users,events,applications]=await Promise.all([
  authPool.query(`SELECT id,first_name,email,role,auth_suspended FROM users WHERE email ILIKE $1 OR first_name ILIKE $1 ORDER BY created_at DESC LIMIT 50`,['%'+q+'%']),
  authPool.query(`SELECT e.id,e.user_id,e.event,e.user_agent,e.ip_hash,e.created_at,e.details,u.email FROM security_events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 100`),
  authPool.query(`SELECT a.*,u.email FROM workspace_applications a JOIN users u ON u.id=a.user_id WHERE a.status='pending' ORDER BY a.created_at`),
 ]);
 await securityEvent('admin_security_viewed',actor.userId,request.headers);
 return NextResponse.json({users:users.rows,events:events.rows,applications:applications.rows},{headers:{'Cache-Control':'no-store'}});
}catch(e){return authError(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const actor=await requireAdmin();const {action,userId,role,reason}=await request.json();
 if(typeof userId!=='string'||! /^[0-9a-f-]{36}$/i.test(userId)||typeof reason!=='string'||reason.trim().length<5||reason.length>500)throw new AuthError('Select an account and enter a review reason.',400);
 if(userId===actor.userId)throw new AuthError('You cannot modify your own administrative account here.',403);
 if(!['suspend','restore','revoke','approve','reject'].includes(action))throw new AuthError('Invalid action.',400);
 const client=await authPool.connect();try{
  await client.query('BEGIN');
  const target=await client.query('SELECT role FROM users WHERE id=$1 FOR UPDATE',[userId]);
  const privileged=await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role IN ('admin','super_admin')",[userId]);
  if(!target.rowCount)throw new AuthError('Account not found.',404);
  if(['admin','super_admin'].includes(target.rows[0].role)||privileged.rowCount)throw new AuthError('Administrative account changes require the controlled recovery process.',403);
  if(action==='suspend'||action==='restore')await client.query('UPDATE users SET auth_suspended=$2 WHERE id=$1',[userId,action==='suspend']);
  if(action==='suspend'||action==='revoke'){
   await client.query('DELETE FROM auth_sessions WHERE "userId"=$1',[userId]);
   await client.query('DELETE FROM auth_session_context WHERE user_id=$1',[userId]);
  }
  if(action==='approve'||action==='reject'){
   if(!['professional','salon'].includes(role))throw new AuthError('Invalid workspace.',400);
   const applied=await client.query(`UPDATE workspace_applications SET status=$3,reviewed_by=$4 WHERE user_id=$1 AND role=$2 AND status='pending' RETURNING name`,[userId,role,action==='approve'?'approved':'rejected',actor.userId]);
   if(!applied.rowCount)throw new AuthError('Application already reviewed.',409);
   if(action==='approve'){
    await client.query('INSERT INTO user_roles(user_id,role,assigned_by_admin) VALUES($1,$2,true) ON CONFLICT(user_id,role) DO NOTHING',[userId,role]);
    if(role==='salon'){
     const salon=await client.query('INSERT INTO salon_workspaces(owner_id,name) VALUES($1,$2) ON CONFLICT(owner_id) DO UPDATE SET name=$2 RETURNING id',[userId,applied.rows[0].name]);
     await client.query("INSERT INTO salon_memberships(salon_id,user_id,permission) VALUES($1,$2,'owner') ON CONFLICT DO NOTHING",[salon.rows[0].id,userId]);
    }
   }
  }
  await client.query('INSERT INTO security_events(user_id,event,details) VALUES($1,$2,$3)',[actor.userId,'admin_'+action,JSON.stringify({target:userId,role,reason:reason.trim()})]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 return NextResponse.json({ok:true});
}catch(e){return authError(e);}}
