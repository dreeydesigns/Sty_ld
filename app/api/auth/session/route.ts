import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { workspaceAvailable,workspaceHome } from '@/lib/workspace-policy';
import { securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function GET(){try{const s=await requireAuthenticatedUser();return NextResponse.json({success:true,session:{user_id:s.userId,assumed_role:s.role,workspaceId:s.workspaceId,available_roles:s.roles,admin:s.admin,mfaVerified:s.mfaVerified,mfaEnabled:s.mfaEnabled}},{headers:{'Cache-Control':'no-store'}});}catch(e){return authError(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const s=await requireAuthenticatedUser();const {workspaceId,newRole}=await request.json();
 if(s.admin&&!s.mfaVerified)throw new AuthError('Administrator MFA required.',403);
 const selected=s.workspaces.find(w=>workspaceId?w.id===workspaceId:w.role===newRole);
 if(!selected||!workspaceAvailable(selected.role))throw new AuthError('Workspace access denied.',403);
 const client=await authPool.connect();try{
  await client.query('BEGIN');
  const owned=await client.query("SELECT id FROM identity_workspaces WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE",[selected.id,s.userId]);
  if(!owned.rowCount)throw new AuthError('Workspace access denied.',403);
  await client.query('INSERT INTO auth_session_context(session_id,user_id,active_role,workspace_id) VALUES($1,$2,$3,$4) ON CONFLICT(session_id) DO UPDATE SET active_role=$3,workspace_id=$4',[s.sessionId,s.userId,selected.role,selected.id]);
  await client.query('UPDATE users SET last_workspace_id=$2 WHERE id=$1',[s.userId,selected.id]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 await securityEvent('workspace_switched',s.userId,request.headers,{workspaceId:selected.id,role:selected.role});
 return NextResponse.json({success:true,new_role:selected.role,workspaceId:selected.id,destination:workspaceHome(selected.role)});
}catch(e){return authError(e);}}
