import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { isAdminRole } from '@/lib/auth-policy';
import { securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function GET(){
  try{const s=await requireAuthenticatedUser();return NextResponse.json({success:true,session:{user_id:s.userId,assumed_role:s.role,available_roles:s.roles,user:{id:s.userId,first_name:s.firstName,email:s.email,phone:s.phone},admin:s.admin,mfaVerified:s.mfaVerified,mfaEnabled:s.mfaEnabled}});}
  catch(e){return authError(e);}
}
export async function POST(request:Request){
  try{sameOrigin(request);const s=await requireAuthenticatedUser();const {newRole}=await request.json();
    if(!s.roles.includes(newRole)||(isAdminRole(newRole)&&!s.mfaVerified))throw new AuthError('Workspace access denied.',403);
    await authPool.query(`INSERT INTO auth_session_context(session_id,user_id,active_role) VALUES($1,$2,$3) ON CONFLICT(session_id) DO UPDATE SET active_role=$3`,[s.sessionId,s.userId,newRole]);
    await securityEvent('workspace_switched',s.userId,request.headers,{role:newRole});return NextResponse.json({success:true,new_role:newRole});
  }catch(e){return authError(e);}
}
