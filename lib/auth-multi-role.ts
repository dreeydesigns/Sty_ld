import { requireAuthenticatedUser } from './auth-resolver';
export async function verifyMultiRoleSession(_token:string){const s=await requireAuthenticatedUser();return {user_id:s.userId,assumed_role:s.role,created_at:s.createdAt};}
export async function getUserWithRoles(..._args:unknown[]):Promise<unknown>{throw new Error('Use unified sign-in.');}
export async function verifyCredentialsMultiRole(..._args:unknown[]):Promise<unknown>{throw new Error('Password login retired.');}
export async function createMultiRoleSession(..._args:unknown[]):Promise<unknown>{throw new Error('Use unified sign-in.');}
export async function getAllUserSessionsWithRoles(..._args:unknown[]):Promise<unknown>{throw new Error('Use session management API.');}
export async function deleteOtherDeviceSessions(..._args:unknown[]):Promise<void>{throw new Error('Use session management API.');}
export async function switchRoleInSession(..._args:unknown[]):Promise<void>{throw new Error('Use workspace API.');}
