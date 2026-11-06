import { NextResponse } from 'next/server';
import { requireAuthenticatedUser,AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin,authError } from '@/lib/api-security';
import { isPersistableWorldKey,isWorldIntensity,worldBadge } from '@/lib/beauty-world';
export { GET } from '@/app/api/me/route';
const fields:Record<string,string>={firstName:'firstName',lastName:'lastName',displayName:'displayName',salonName:'salonName',bio:'bio',location:'location',profileImageUrl:'profilePhoto',coverImageUrl:'coverPhoto',username:'username',specialty:'specialty',serviceMode:'serviceMode'};
export async function PATCH(request:Request){try{
 sameOrigin(request);const s=await requireAuthenticatedUser();if(!s.workspaceId||(s.admin&&!s.mfaVerified))throw new AuthError('Select an authorised workspace.',403);
 const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw new AuthError('Invalid profile.',400);
 const profile:Record<string,string>={};
 for(const [key,value] of Object.entries(body)){
  if(key==='theme'){
   if(typeof value!=='string')throw new AuthError('Choose Pure or one of the five beauty worlds.',400);
   const theme=value.trim();
   if(!isPersistableWorldKey(theme))throw new AuthError('Choose Pure or one of the five beauty worlds.',400);
   if(!s.workspace||s.workspace.role!=='client')throw new AuthError('Beauty worlds are available for client profiles.',403);
   profile.theme=theme;profile.tribeBadge=worldBadge(theme);continue;
  }
  if(key==='worldIntensity'){
   if(!s.workspace||s.workspace.role!=='client')throw new AuthError('Beauty world intensity is available for client profiles.',403);
   if(!isWorldIntensity(value))throw new AuthError('Choose calm, balanced or immersive intensity.',400);
   profile.worldIntensity=value;continue;
  }
  if(key==='tribeBadge')throw new AuthError('The tribe badge is set by the beauty world.',400);
  if(!fields[key])throw new AuthError('This profile field cannot be changed here.',400);
  if(typeof value!=='string'||value.length>2000||(key==='firstName'&&!value.trim()))throw new AuthError('Enter valid profile fields.',400);
  if(key==='profileImageUrl'||key==='coverImageUrl'){
   if(/^(data:|blob:|filesystem:)/i.test(value.trim()))throw new AuthError('Choose a saved image.',400);
   let parsed:URL;
   try{parsed=new URL(value.trim(),'https://styld.invalid');}catch{throw new AuthError('Choose a saved image.',400);}
   let decodedPath=parsed.pathname;
   try{for(let pass=0;pass<3;pass++){const decoded=decodeURIComponent(decodedPath);if(decoded===decodedPath)break;decodedPath=decoded;}}catch{throw new AuthError('Choose a saved image.',400);}
   if(/^\/api\/media\/pending(?:\/|$)/i.test(decodedPath)){
    const match=value.trim().match(new RegExp('^/api/media/pending/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$', 'i'));
    if(!match)throw new AuthError('Choose a saved image.',400);
    const owned=await authPool.query("SELECT 1 FROM media_manifests WHERE asset_id=$1 AND owner_workspace_id=$2 AND state='pending' AND revoked=false AND delivery_type='authenticated' AND provider_restriction_verified=true",[match[1],s.workspaceId]);
    if(!owned.rowCount)throw new AuthError('This image is not available for your workspace.',403);
   }
  }
  profile[fields[key]]=value.trim();
 }
 const result=await authPool.query("UPDATE identity_workspaces SET profile=profile || $3::jsonb WHERE id=$1 AND user_id=$2 AND status='active' RETURNING profile",[s.workspaceId,s.userId,JSON.stringify(profile)]);
 if(!result.rowCount)throw new AuthError('Workspace unavailable.',403);
 if(profile.firstName)await authPool.query("UPDATE users SET first_name=$2 WHERE id=$1 AND COALESCE(first_name,'')=''",[s.userId,profile.firstName]);
 return NextResponse.json({ok:true,user:result.rows[0].profile});
}catch(e){return authError(e);}}
