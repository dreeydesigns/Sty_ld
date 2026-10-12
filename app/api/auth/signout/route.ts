import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth';
import { resolveCurrentStyldUser } from '@/lib/auth-resolver';
import { securityEvent } from '@/lib/security-events';
import { sameOrigin,authError } from '@/lib/api-security';
export async function POST(request:Request){try{
  sameOrigin(request);const s=await resolveCurrentStyldUser();if(s)await securityEvent('logout',s.userId,request.headers);
  return await auth.api.signOut({headers:await headers(),asResponse:true});
}catch(e){return authError(e);}}
