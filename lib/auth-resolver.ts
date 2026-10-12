import { headers } from 'next/headers';
import { auth } from './better-auth';
import { authPool } from './auth-database';
import { accountMaySignIn, isAdminRole } from './auth-policy';
import type { CanonicalUser } from './identity-manager';
export interface StyldAuthSession {
 userId:string; sessionId:string; role:string; accountStatus:string; clerkUserId:string|null;
 authSource:'better-auth'; email:string|null; phone:string|null; firstName:string; lastName:string|null;
 canonicalUser:CanonicalUser; roles:string[]; admin:boolean; mfaVerified:boolean; mfaEnabled:boolean; createdAt:Date;
}
export class AuthError extends Error { constructor(message:string,public statusCode=401) {super(message);this.name='AuthError';} }
export async function resolveCurrentStyldUser():Promise<StyldAuthSession|null> {
 const session=await auth.api.getSession({headers:await headers()}); if(!session)return null;
 const {rows}=await authPool.query('SELECT u.*,c.active_role,c.mfa_verified_at,COALESCE(t.enabled,false) AS mfa_enabled FROM users u LEFT JOIN auth_session_context c ON c.session_id=$2 LEFT JOIN auth_totp t ON t.user_id=u.id WHERE u.id=$1',[session.user.id,session.session.id]);
 const u=rows[0]; if(!u || u.auth_suspended || u.suspended || !accountMaySignIn(u.deletion_status||'active',u.deletion_requested_at))return null;
 const granted=await authPool.query('SELECT role FROM user_roles WHERE user_id=$1',[u.id]);
 const roles=Array.from(new Set<string>(['client',u.role,...granted.rows.map(r=>r.role)])).filter(r=>['client','professional','salon','admin','super_admin'].includes(r)).map(r=>r==='admin'?'super_admin':r);
 const admin=roles.some(isAdminRole);
 const mfaVerified=!!u.mfa_enabled && !!u.mfa_verified_at && Date.now()-new Date(u.mfa_verified_at).getTime()<12*3600000;
 const requestedRole=u.active_role||(admin?'client':u.role);
 const role=roles.includes(requestedRole)&&(!isAdminRole(requestedRole)||mfaVerified)?requestedRole:'client';
 const canonicalUser:CanonicalUser={id:u.id,phone:u.phone,email:u.email,firstName:u.first_name,lastName:u.last_name,role,phoneVerified:u.phone_verified,emailVerified:u.email_verified,totpEnabled:u.mfa_enabled,passkeyEnabled:false};
 return {userId:u.id,sessionId:session.session.id,role,accountStatus:u.deletion_status||'active',clerkUserId:null,authSource:'better-auth',email:u.email,phone:u.phone,firstName:u.first_name,lastName:u.last_name,canonicalUser,roles,admin,mfaVerified,mfaEnabled:u.mfa_enabled,createdAt:session.session.createdAt};
}
export async function requireAuthenticatedUser(){const s=await resolveCurrentStyldUser();if(!s)throw new AuthError('Please sign in.');return s;}
export async function requireAdmin(){const s=await requireAuthenticatedUser();if(!s.admin||!s.mfaVerified)throw new AuthError('Administrator MFA required.',403);return s;}
