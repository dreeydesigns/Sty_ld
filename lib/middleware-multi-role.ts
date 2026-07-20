/**
 * Middleware utility for handling multi-role sessions
 * Use in your middleware.ts or route handlers to check role access
 */

import { NextRequest } from 'next/server';
import { verifyMultiRoleSession } from '@/lib/auth-multi-role';

/**
 * Extract assumed role from current session
 * Falls back to user's default role if not a multi-role account
 */
export async function getAssumedRoleFromRequest(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie) return null;

    const session = await verifyMultiRoleSession(sessionCookie);
    return session.assumed_role;
  } catch {
    return null;
  }
}

/**
 * Check if user has a specific role in current session
 */
export async function hasRole(req: NextRequest, requiredRole: string): Promise<boolean> {
  const role = await getAssumedRoleFromRequest(req);
  return role === requiredRole;
}

/**
 * Check if user has any of the provided roles
 */
export async function hasAnyRole(req: NextRequest, requiredRoles: string[]): Promise<boolean> {
  const role = await getAssumedRoleFromRequest(req);
  return role ? requiredRoles.includes(role) : false;
}

/**
 * Example middleware for protecting routes by role
 * 
 * Usage in middleware.ts:
 * 
 * import { NextRequest, NextResponse } from 'next/server';
 * import { hasRole } from '@/lib/middleware-multi-role';
 * 
 * export async function middleware(request: NextRequest) {
 *   // Protect salon routes - require assumed_role to be 'salon'
 *   if (request.nextUrl.pathname.startsWith('/admin/salon')) {
 *     const isSalon = await hasRole(request, 'salon');
 *     if (!isSalon) {
 *       return NextResponse.redirect(new URL('/unauthorized', request.url));
 *     }
 *   }
 *   
 *   return NextResponse.next();
 * }
 */

/**
 * Verify user has access to multiple roles (used with Wanjiku account)
 */
export async function getUserRoles(userId: string) {
  try {
    // This would typically call your API or database
    // For now, returns null - implement with your auth logic
    console.log('Getting user roles for:', userId);
    return null;
  } catch {
    return null;
  }
}

/**
 * Type guard for role checking
 */
export type AppRole = 'client' | 'professional' | 'salon' | 'admin' | 'super_admin' | 'shop' | 'delivery' | 'guest';

export function isValidRole(role: unknown): role is AppRole {
  const validRoles: AppRole[] = ['client', 'professional', 'salon', 'admin', 'super_admin', 'shop', 'delivery', 'guest'];
  return typeof role === 'string' && validRoles.includes(role as AppRole);
}

/**
 * Example API route protection
 * 
 * Usage in route.ts:
 * 
 * import { hasRole } from '@/lib/middleware-multi-role';
 * 
 * export async function GET(req: NextRequest) {
 *   // Only admins can access this route
 *   const isAdmin = await hasRole(req, 'admin');
 *   if (!isAdmin) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 *   
 *   // Route logic here
 *   return NextResponse.json({ data: 'admin only' });
 * }
 */
