import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin,authError } from '@/lib/api-security';
import { workspaceAvailable } from '@/lib/workspace-policy';
import { securityEvent } from '@/lib/security-events';
export async function GET(){try{const s=await requireAuthenticatedUser();const {rows}=await authPool.query('SELECT role,name,status FROM workspace_applications WHERE user_id=$1',[s.userId]);return NextResponse.json({roles:s.roles,current:s.role,workspaceId:s.workspaceId,workspaces:s.workspaces.map(w=>({...w,available:workspaceAvailable(w.role)})),applications:rows});}catch(e){return authError(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const s=await requireAuthenticatedUser();const {role,name,description,contact}=await request.json();
 if(!['professional','salon'].includes(role)||![name,description,contact].every(v=>typeof v==='string'&&v.trim().length>=2&&v.length<=2000))throw new AuthError('Complete all application fields.',400);
 if(s.roles.includes(role))throw new AuthError('You already have this workspace.',409);
 await authPool.query(`INSERT INTO workspace_applications(user_id,role,name,description,contact) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(user_id,role) DO UPDATE SET name=$3,description=$4,contact=$5,status='pending' WHERE workspace_applications.status<>'approved'`,[s.userId,role,name.trim(),description.trim(),contact.trim()]);
 await securityEvent('workspace_requested',s.userId,request.headers,{role});return NextResponse.json({ok:true});
}catch(e){return authError(e);}}
