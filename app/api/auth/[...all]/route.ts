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
  // Build a plain Fetch Request from primitives instead of wrapping the incoming
  // NextRequest. Passing a NextRequest into `new Request(request, ...)` can hit a
  // dual-Request-class brand mismatch in bundled runtimes, surfacing as
  // "TypeError: Cannot read private member #state from an object whose class did
  // not declare it". Method, cookies, abort signal and the original body are
  // preserved explicitly. Better Auth auth payloads are small, so buffering the
  // body is acceptable.
  const method=request.method.toUpperCase();
  const hasBody=method!=='GET'&&method!=='HEAD';
  const input=new Request(request.url,{
    method,
    headers,
    signal:request.signal,
    ...(hasBody?{body:await request.arrayBuffer()}:{}),
  });
  const response = await (method==='GET'?handler.GET(input):handler.POST(input));
  if(response.status<400&&!existing)response.headers.append('Set-Cookie',`styld_browser=${browser}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV==='production'?'; Secure':''}`);
  const path = new URL(request.url).pathname;
  if (!response.ok && path.endsWith('/sign-in/email-otp')) {
    await securityEvent('login_failed', null, request.headers);
  }
  return response;
}
export const GET=handle;
export const POST=handle;
