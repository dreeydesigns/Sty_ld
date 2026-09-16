import { NextRequest, NextResponse } from 'next/server';
import { FEATURES } from '@/lib/feature-flags';

/**
 * Styld edge middleware.
 *
 * P0A changes (scope items F + P0-5):
 *  - MV-P0A-F: `/counter`, `/dashboard` and `/shop` (+ children) are FEATURE-GATED at
 *    the route level while `FEATURES.SHOP === false` (current MVP setting). The
 *    implementations stay in the repo and become reachable when the owner flips the
 *    flag — nothing is deleted.
 *  - P0-5: the `assumed_role` cookie is a DISPLAY HINT ONLY. It is not signed and any
 *    caller can set it, so it must never gate a route. The role checks that used it
 *    are removed; authorization is enforced server-side by API handlers and the
 *    `AppShell` guards.
 *
 * THIS MIDDLEWARE IS A PRESENCE CHECK, BY DESIGN: it only confirms that a session
 * cookie exists. Token validity and the user's role are verified in the API routes
 * and server components, which read the `sessions`/`users` tables.
 *
 * Known follow-up (not done here): when FEATURES.SHOP is flipped to `true`,
 * `/dashboard` and `/shop` should be added to `protectedPrefixes` before enabling.
 */

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
  '/api/setup/init-admin',
  '/api/auth/signin',
  '/api/auth/signin-multi-role',
  '/api/auth/phone-signin',
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
  '/delivery',
];

/**
 * Routes withheld from the public while FEATURES.SHOP is off.
 * These are the shop/counter selling surfaces plus the shop dashboard.
 */
const shopGatedPrefixes = ['/counter', '/dashboard', '/shop'];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Feature gate (before anything else: gated routes behave as if absent) ──
  if (!FEATURES.SHOP && shopGatedPrefixes.some(prefix => matchesPrefix(pathname, prefix))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow public routes
  if (publicRoutes.some(route => matchesPrefix(pathname, route))) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  if (protectedPrefixes.some(prefix => matchesPrefix(pathname, prefix))) {
    // Presence check only — the session cookie's token is verified server-side.
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
