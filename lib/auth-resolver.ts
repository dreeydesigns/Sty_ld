import { headers } from 'next/headers';
import { auth } from './better-auth';
import { authPool } from './auth-database';
import { accountMaySignIn,isAdminRole } from './auth-policy';
import { workspaceAvailable,type IdentityWorkspace } from './workspace-policy';
import type { CanonicalUser } from './identity-manager';
export interface StyldAuthSession {
 userId:string; sessionId:string; role:string; accountStatus:string; clerkUserId:string|null;
 authSource:'better-auth'; email:string|null; phone:string|null; firstName:string; lastName:string|null;
 canonicalUser:CanonicalUser; roles:string[]; admin:boolean; mfaVerified:boolean; mfaEnabled:boolean; createdAt:Date;
 workspaceId:string|null; workspace:IdentityWorkspace|null; workspaces:IdentityWorkspace[];
}
export class AuthError extends Error {constructor(message:string,public statusCode=401){super(message);this.name='AuthError';}}
export async function resolveCurrentStyldUser():Promise<StyldAuthSession|null>{
 const session=await auth.api.getSession({headers:await headers()});if(!session)return null;
 const {rows}=await authPool.query('SELECT u.*,c.active_role,c.workspace_id,c.mfa_verified_at,COALESCE(t.enabled,false) AS mfa_enabled FROM users u LEFT JOIN auth_session_context c ON c.session_id=$2 LEFT JOIN auth_totp t ON t.user_id=u.id WHERE u.id=$1',[session.user.id,session.session.id]);
 const u=rows[0];if(!u||u.auth_suspended||u.suspended||!accountMaySignIn(u.deletion_status||'active',u.deletion_requested_at))return null;
 const workspaces=(await authPool.query("SELECT id,role,status,profile FROM identity_workspaces WHERE user_id=$1 AND status='active' ORDER BY created_at,id",[u.id])).rows as IdentityWorkspace[];
 const grants=await authPool.query("SELECT role FROM user_roles WHERE user_id=$1 AND role IN ('admin','super_admin')",[u.id]);
 const admin=isAdminRole(u.role)||grants.rows.length>0;
 const mfaAge=Date.now()-new Date(u.mfa_verified_at).getTime();
 const mfaVerified=!!u.mfa_enabled&&!!u.mfa_verified_at&&mfaAge>=0&&mfaAge<12*3600000;
 const available=workspaces.filter(w=>workspaceAvailable(w.role));
 const workspace=available.find(w=>w.id===u.workspace_id)||available.find(w=>w.id===u.last_workspace_id)||available.find(w=>w.role==='client')||null;
 const role=admin&&mfaVerified&&isAdminRole(u.active_role||'')?'super_admin':workspace?.role||'client';
 const roles=[...new Set(workspaces.map(w=>w.role as string)),...(admin?['super_admin']:[])];
 const canonicalUser:CanonicalUser={id:u.id,phone:u.phone,email:u.email,firstName:u.first_name,lastName:u.last_name,role,phoneVerified:u.phone_verified,emailVerified:u.email_verified,totpEnabled:u.mfa_enabled,passkeyEnabled:false};
 return {userId:u.id,sessionId:session.session.id,role,accountStatus:u.deletion_status||'active',clerkUserId:null,authSource:'better-auth',email:u.email,phone:u.phone,firstName:u.first_name,lastName:u.last_name,canonicalUser,roles,admin,mfaVerified,mfaEnabled:u.mfa_enabled,createdAt:session.session.createdAt,workspaceId:role==='super_admin'?null:workspace?.id||null,workspace:role==='super_admin'?null:workspace,workspaces};
}
export async function requireAuthenticatedUser(){const s=await resolveCurrentStyldUser();if(!s)throw new AuthError('Please sign in.');return s;}
export async function requireAdmin(){const s=await requireAuthenticatedUser();if(!s.admin||!s.mfaVerified)throw new AuthError('Administrator MFA required.',403);return s;}
