import { NextRequest, NextResponse } from 'next/server';

// Public routes (no authentication required)
const publicRoutes = [
  '/',
  '/discover',
  '/explore',
  '/privacy',
  '/terms',
  '/contact',
  '/help',
  '/unauthorized',
  '/api/webhooks',
  '/api/init',
  '/api/auth/signin',
  '/api/auth/signin-multi-role',
  '/api/auth/whatsapp',
  '/auth/sign-in',
  '/auth/sign-up',
];

// Protected route prefixes
const protectedPrefixes = [
  '/home',
  '/book',
  '/activity',
  '/profile',
  '/settings',
  '/notifications',
  '/admin',
  '/pro',
  '/salon',
  '/shop',
  '/delivery',
  '/dashboard',
  '/onboarding',
  '/counter',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtected = protectedPrefixes.some(prefix => 
    pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected) {
    const token = request.cookies.get('session')?.value;
    let assumedRole: string | undefined;
    if (token) {
      try {
        const response = await fetch(new URL('/api/me', request.url), {
          headers: { cookie: `session=${encodeURIComponent(token)}` },
          cache: 'no-store',
        });
        if (response.ok) assumedRole = (await response.json()).user?.role;
      } catch { /* Unverifiable sessions must sign in again. */ }
    }
    if (!assumedRole) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname + request.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }

    // Optional role-based restrictions
    if ((pathname === '/admin' || pathname.startsWith('/admin/')) && assumedRole !== 'admin' && assumedRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if ((pathname === '/pro' || pathname.startsWith('/pro/')) && assumedRole !== 'professional' && assumedRole !== 'admin' && assumedRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
