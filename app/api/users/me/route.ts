import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin,authError } from '@/lib/api-security';
import { isBeautyWorldKey,beautyWorldBadge } from '@/lib/beauty-world';
export { GET } from '@/app/api/me/route';
const fields:Record<string,string>={firstName:'firstName',lastName:'lastName',displayName:'displayName',salonName:'salonName',bio:'bio',location:'location',profileImageUrl:'profilePhoto',coverImageUrl:'coverPhoto',username:'username',specialty:'specialty',serviceMode:'serviceMode'};
export async function PATCH(request:Request){try{
 sameOrigin(request);const s=await requireAuthenticatedUser();if(!s.workspaceId||(s.admin&&!s.mfaVerified))throw new AuthError('Select an authorised workspace.',403);
 const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw new AuthError('Invalid profile.',400);
 const profile:Record<string,string>={};
 for(const [key,value] of Object.entries(body)){
  if(key==='theme'){
   if(typeof value!=='string')throw new AuthError('Choose one of the five beauty worlds.',400);
   const theme=value.trim();
   if(!isBeautyWorldKey(theme))throw new AuthError('Choose one of the five beauty worlds.',400);
   if(!s.workspace||s.workspace.role!=='client')throw new AuthError('Beauty worlds are available for client profiles.',403);
   profile.theme=theme;profile.tribeBadge=beautyWorldBadge(theme);continue;
  }
  if(key==='tribeBadge')throw new AuthError('The tribe badge is set by the beauty world.',400);
  if(!fields[key])throw new AuthError('This profile field cannot be changed here.',400);
  if(typeof value!=='string'||value.length>2000||(key==='firstName'&&!value.trim()))throw new AuthError('Enter valid profile fields.',400);
  profile[fields[key]]=value.trim();
 }
 const result=await authPool.query("UPDATE identity_workspaces SET profile=profile || $3::jsonb WHERE id=$1 AND user_id=$2 AND status='active' RETURNING profile",[s.workspaceId,s.userId,JSON.stringify(profile)]);
 if(!result.rowCount)throw new AuthError('Workspace unavailable.',403);
 if(profile.firstName)await authPool.query("UPDATE users SET first_name=$2 WHERE id=$1 AND COALESCE(first_name,'')=''",[s.userId,profile.firstName]);
 return NextResponse.json({ok:true,user:result.rows[0].profile});
}catch(e){return authError(e);}}
