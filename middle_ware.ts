import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Check for your session cookie
  const session = request.cookies.get('session');

  // 2. Define your protected paths
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/settings');

  // 3. Redirect to login if path is protected and no session exists
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  return NextResponse.next();
}

// 4. Configure which routes the middleware should run on
export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};