import { NextRequest,NextResponse } from 'next/server';
import { ROUTE_FEATURE_GATES,isFeatureEnabled } from '@/lib/feature-flags';
const protectedPrefixes=['/activity','/profile','/settings','/notifications','/admin','/pro','/salon','/dashboard','/onboarding'];
export async function middleware(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path.startsWith('/counter/'))return NextResponse.redirect(new URL('/counter',request.url));
 // Same-origin mutations across all browser APIs, including legacy business routes.
 if(path.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(request.method)&&path!=='/api/payments/mpesa/callback'){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(process.env.BETTER_AUTH_URL||request.url).origin)return NextResponse.json({error:'Invalid origin.'},{status:403});
 }
 for(const [prefix,flag] of Object.entries(ROUTE_FEATURE_GATES))if((path===prefix||path.startsWith(prefix+'/'))&&!isFeatureEnabled(flag))return NextResponse.redirect(new URL('/discover',request.url));
 if(protectedPrefixes.some(p=>path===p||path.startsWith(p+'/'))){
  const signIn=new URL('/auth/sign-in',request.url);signIn.searchParams.set('returnTo',path+request.nextUrl.search);
  if(!(request.cookies.get('__Secure-session') || request.cookies.get('session'))?.value)return NextResponse.redirect(signIn);
  let data: { admin?: boolean; mfaVerified?: boolean; roles?: string[] } | null = null;
  try{const r=await fetch(new URL('/api/me',request.url),{headers:{cookie:request.headers.get('cookie')||''},cache:'no-store'});if(!r.ok)return NextResponse.redirect(signIn);data=await r.json();}catch{return NextResponse.redirect(signIn);}
  if(!data)return NextResponse.redirect(signIn);
  if(path==='/admin'||path.startsWith('/admin/')){
   if(!data.admin)return NextResponse.redirect(new URL('/unauthorized',request.url));
   if(!data.mfaVerified)return NextResponse.redirect(new URL('/auth/mfa',request.url));
  }
  if((path==='/pro'||path.startsWith('/pro/'))&&!data.roles?.includes('professional'))return NextResponse.redirect(new URL('/settings/workspaces',request.url));
  if((path==='/salon'||path.startsWith('/salon/'))&&!data.roles?.includes('salon'))return NextResponse.redirect(new URL('/settings/workspaces',request.url));
 }
 const response=NextResponse.next();
 if(path.startsWith('/api/auth')||path==='/api/me'||path.startsWith('/api/admin'))response.headers.set('Cache-Control','no-store');
 response.headers.set('X-Content-Type-Options','nosniff');return response;
}
export default middleware;
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
