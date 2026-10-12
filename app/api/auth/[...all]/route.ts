import { auth } from '@/lib/better-auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { securityEvent } from '@/lib/security-events';
export const runtime = 'nodejs';
const handler = toNextJsHandler(auth);
async function handle(request:Request){
  const existing=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('styld_browser='))?.slice('styld_browser='.length);
  const browser=existing&&/^[0-9a-f-]{36}$/i.test(existing)?existing:crypto.randomUUID();
  const headers=new Headers(request.headers);
  const other=(headers.get('cookie')||'').split(';').filter(x=>!x.trim().startsWith('styld_browser=')).join(';');
  headers.set('cookie',`${other}; styld_browser=${browser}`);
  const input=new Request(request,{headers});
  const response = await (request.method==='GET'?handler.GET(input):handler.POST(input));
  if(response.status<400&&!existing)response.headers.append('Set-Cookie',`styld_browser=${browser}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV==='production'?'; Secure':''}`);
  const path = new URL(request.url).pathname;
  if (!response.ok && path.endsWith('/sign-in/email-otp')) {
    await securityEvent('login_failed', null, request.headers);
  }
  return response;
}
export const GET=handle;
export const POST=handle;
