import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { ROUTE_FEATURE_GATES, isFeatureEnabled } from '@/lib/feature-flags';

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
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/auth/sign-in',
  '/auth/sign-up',
  '/legal/terms',
  '/legal/privacy',
  '/api/webhooks',
  '/api/init',
  '/api/auth/signin',
  '/api/auth/signin-multi-role',
  '/api/auth/whatsapp',
  '/api/auth/google',
  '/api/auth/email',
  '/api/auth/passkey',
  '/__clerk',
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

function applySecurityHeaders(response: NextResponse): NextResponse {
  if (response && response.headers && typeof response.headers.set === 'function') {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

/**
 * Core Styld Authentication, Authorization & Feature Gate Logic.
 * Evaluates Clerk session (if present) and legacy session cookie fallback.
 */
async function runStyldMiddleware(
  request: NextRequest,
  clerkUserId?: string | null,
  clerkRole?: string | null
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Feature Gate Enforcement — intercept disabled beta surfaces
  for (const [prefix, flag] of Object.entries(ROUTE_FEATURE_GATES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!isFeatureEnabled(flag)) {
        const discoverUrl = new URL('/discover', request.url);
        discoverUrl.searchParams.set('notice', 'feature_gated');
        return applySecurityHeaders(NextResponse.redirect(discoverUrl));
      }
    }
  }

  // 2. Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 3. Check if route requires authentication
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected) {
    const legacyToken = request.cookies.get('session')?.value;
    let assumedRole: string | undefined = clerkRole || undefined;

    // If no role from Clerk session, and legacy token exists, verify via /api/me
    if (!assumedRole && legacyToken) {
      try {
        const response = await fetch(new URL('/api/me', request.url), {
          headers: { cookie: `session=${encodeURIComponent(legacyToken)}` },
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          assumedRole = data.user?.role;
        }
      } catch {
        // Unverifiable sessions must sign in again.
      }
    }

    // If neither Clerk nor valid legacy session was resolved:
    if (!clerkUserId && !assumedRole) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname + request.nextUrl.search);
      return applySecurityHeaders(NextResponse.redirect(signInUrl));
    }

    // Role-based route restrictions
    if (
      (pathname === '/admin' || pathname.startsWith('/admin/')) &&
      assumedRole !== 'admin' &&
      assumedRole !== 'super_admin'
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)));
    }
    if (
      (pathname === '/pro' || pathname.startsWith('/pro/')) &&
      assumedRole !== 'professional' &&
      assumedRole !== 'admin' &&
      assumedRole !== 'super_admin'
    ) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

// Clerk Middleware handler (active when Clerk publishable key is present in environment)
let clerkHandler: any = null;
if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  try {
    clerkHandler = clerkMiddleware(async (auth, request) => {
      const clerkAuth = auth();
      const userId = clerkAuth?.userId;
      const claims = clerkAuth?.sessionClaims as any;
      const role = claims?.metadata?.role || claims?.role || null;
      return runStyldMiddleware(request as NextRequest, userId, role);
    });
  } catch (err) {
    console.warn('Clerk middleware initialization fallback:', err);
  }
}

export async function middleware(request: NextRequest, event?: any) {
  if (clerkHandler && typeof clerkHandler === 'function') {
    return clerkHandler(request, event);
  }
  return runStyldMiddleware(request, null, null);
}

export default middleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
};
