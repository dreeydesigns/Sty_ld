/**
 * lib/auth-resolver.ts
 *
 * Single Application Identity Resolution Boundary for STYLD.
 *
 * Reconciles external Clerk authentication with canonical Styld PostgreSQL user records.
 * Provides a seamless migration bridge for existing legacy session cookies.
 */

import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import {
  findUserByClerkId,
  resolveOrCreateUser,
  CanonicalUser,
} from './identity-manager';
import { logger } from './logger';

export interface StyldAuthSession {
  userId: string;
  role: string;
  accountStatus: string;
  clerkUserId: string | null;
  authSource: 'clerk' | 'legacy';
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  canonicalUser: CanonicalUser;
}

export class AuthError extends Error {
  constructor(message: string, public statusCode = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Resolves the currently authenticated Styld user.
 * Prioritizes Clerk session; falls back to legacy Styld session cookie during migration.
 */
export async function resolveCurrentStyldUser(): Promise<StyldAuthSession | null> {
  // 1. Try Clerk authentication
  try {
    const clerkAuth = auth();
    const clerkUserId = clerkAuth?.userId;

    if (clerkUserId) {
      // Step A: Look up existing user by clerk_user_id
      let canonical = await findUserByClerkId(clerkUserId);

      // Step B: If not found, provision or link user via Clerk profile
      if (!canonical) {
        try {
          const clerkUser = await currentUser();
          if (clerkUser) {
            const primaryEmail = clerkUser.emailAddresses?.find(
              (e) => e.id === clerkUser.primaryEmailAddressId
            );
            const isEmailVerified =
              primaryEmail?.verification?.status === 'verified';
            const email = primaryEmail?.emailAddress || undefined;
            const phone =
              clerkUser.phoneNumbers?.[0]?.phoneNumber || undefined;
            const firstName =
              clerkUser.firstName ||
              (email ? email.split('@')[0] : 'Styld Member');
            const lastName = clerkUser.lastName || undefined;

            canonical = await resolveOrCreateUser({
              provider: 'clerk',
              providerSubject: clerkUserId,
              clerkUserId,
              email,
              phone,
              firstName,
              lastName,
              role: 'client', // Default consumer role, never admin/pro on public auth
              verified: isEmailVerified,
            });

            logger.info('Provisioned new canonical Styld user from Clerk session', {
              userId: canonical.id,
              clerkUserId,
            });
          }
        } catch (clerkErr) {
          logger.warn('Failed to fetch Clerk currentUser details', { error: String(clerkErr) });
        }
      }

      if (canonical) {
        return {
          userId: canonical.id,
          role: canonical.role,
          accountStatus: 'active',
          clerkUserId: canonical.clerkUserId || clerkUserId,
          authSource: 'clerk',
          email: canonical.email,
          phone: canonical.phone,
          firstName: canonical.firstName,
          lastName: canonical.lastName || null,
          canonicalUser: canonical,
        };
      }
    }
  } catch (err) {
    // Clerk may throw if environment keys are missing or during unauthenticated SSR
    logger.debug('Clerk auth resolution skipped or unavailable', { error: String(err) });
  }

  // 2. Migration Bridge: Check legacy Styld session cookie
  try {
    const cookieStore = await cookies();
    const legacyToken = cookieStore.get('session')?.value;

    if (legacyToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(legacyToken)
        .digest('hex');

      const { rows } = await sql`
        SELECT
          u.id,
          u.clerk_user_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          COALESCE(s.assumed_role, u.role) AS role,
          COALESCE(u.deletion_status, 'active') AS deletion_status,
          COALESCE(u.phone_verified, false) as phone_verified,
          COALESCE(u.email_verified, false) as email_verified,
          COALESCE(u.totp_enabled, false) as totp_enabled,
          COALESCE(u.passkey_enabled, false) as passkey_enabled
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash}
          AND s.created_at > NOW() - INTERVAL '30 days'
          AND (u.deletion_status IS NULL
               OR u.deletion_status = 'active'
               OR (u.deletion_status = 'pending'
                   AND u.deletion_requested_at > NOW() - INTERVAL '30 days'))
        LIMIT 1
      `;

      if (rows.length > 0) {
        const row = rows[0];
        // Update session last active
        await sql`
          UPDATE sessions SET last_active_at = NOW()
          WHERE token_hash = ${tokenHash}
        `;

        const canonical: CanonicalUser = {
          id: row.id,
          clerkUserId: row.clerk_user_id,
          phone: row.phone,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role || 'client',
          phoneVerified: row.phone_verified,
          emailVerified: row.email_verified,
          totpEnabled: row.totp_enabled,
          passkeyEnabled: row.passkey_enabled,
        };

        return {
          userId: canonical.id,
          role: canonical.role,
          accountStatus: 'active',
          clerkUserId: canonical.clerkUserId || null,
          authSource: 'legacy',
          email: canonical.email,
          phone: canonical.phone,
          firstName: canonical.firstName,
          lastName: canonical.lastName || null,
          canonicalUser: canonical,
        };
      }
    }
  } catch (err) {
    logger.warn('Legacy session resolution error', { error: String(err) });
  }

  return null;
}

/**
 * Enforces that a valid Styld user session exists.
 * Throws AuthError(401) if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<StyldAuthSession> {
  const session = await resolveCurrentStyldUser();
  if (!session) {
    throw new AuthError('Authentication required to access this resource.', 401);
  }
  return session;
}
