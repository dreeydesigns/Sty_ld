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
  '/api/webhooks',
  '/api/init',
  '/api/setup/init-admin',
  '/api/auth/signin',
  '/api/auth/signin-multi-role',
  '/api/auth/client/signup',
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
];

export function middleware(request: NextRequest) {
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
    const userId = request.cookies.get('user_id');
    if (!userId) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Optional role-based restrictions
    const assumedRole = request.cookies.get('assumed_role')?.value || 'client';
    if (pathname.startsWith('/admin') && assumedRole !== 'admin' && assumedRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (pathname.startsWith('/pro') && assumedRole !== 'professional' && assumedRole !== 'admin' && assumedRole !== 'super_admin') {
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
