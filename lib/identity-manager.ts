/**
 * lib/identity-manager.ts
 *
 * Multi-Method Identity Resolution, Linking & Unlinking Engine for STYLD.
 *
 * Ensures multiple authentication identities (Google, Email, Password, Passkey, Phone)
 * securely resolve to a single canonical Styld user.
 */

import { sql } from '@vercel/postgres';

export type AuthProviderType = 'google' | 'email' | 'phone' | 'password' | 'passkey' | 'apple' | 'clerk';

export interface UserIdentityRecord {
  id: string;
  userId: string;
  provider: AuthProviderType;
  providerSubject: string;
  email: string | null;
  phone: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface CanonicalUser {
  id: string;
  clerkUserId?: string | null;
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName?: string | null;
  role: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  totpEnabled: boolean;
  passkeyEnabled: boolean;
}

export class IdentityError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'IdentityError';
  }
}

/**
 * Find canonical user by their stable Clerk User ID.
 */
export async function findUserByClerkId(clerkUserId: string): Promise<CanonicalUser | null> {
  if (!clerkUserId) return null;
  const { rows } = await sql`
    SELECT 
      u.id,
      u.clerk_user_id,
      u.phone, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.role, 
      COALESCE(u.phone_verified, false) as phone_verified,
      COALESCE(u.email_verified, false) as email_verified,
      COALESCE(u.totp_enabled, false) as totp_enabled,
      COALESCE(u.passkey_enabled, false) as passkey_enabled
    FROM users u
    WHERE u.clerk_user_id = ${clerkUserId}
      AND COALESCE(u.deletion_status, 'active') = 'active'
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
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
}

/**
 * Find user by a specific external provider assertion.
 */
export async function findUserByIdentity(
  provider: AuthProviderType,
  providerSubject: string
): Promise<CanonicalUser | null> {
  const { rows } = await sql`
    SELECT 
      u.id, 
      u.clerk_user_id,
      u.phone, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.role, 
      COALESCE(u.phone_verified, false) as phone_verified,
      COALESCE(u.email_verified, false) as email_verified,
      COALESCE(u.totp_enabled, false) as totp_enabled,
      COALESCE(u.passkey_enabled, false) as passkey_enabled
    FROM user_identities ui
    JOIN users u ON u.id = ui.user_id
    WHERE ui.provider = ${provider}
      AND ui.provider_subject = ${providerSubject}
      AND COALESCE(u.deletion_status, 'active') = 'active'
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
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
}

/**
 * Resolve an existing user or create a new user from a verified identity.
 * Unifies sign-in and sign-up into a single seamless flow.
 */
export async function resolveOrCreateUser(params: {
  provider: AuthProviderType;
  providerSubject: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  verified?: boolean;
  clerkUserId?: string;
}): Promise<CanonicalUser> {
  const { provider, providerSubject, clerkUserId } = params;

  // 1. Check if user already exists by clerkUserId
  if (clerkUserId) {
    const clerkUser = await findUserByClerkId(clerkUserId);
    if (clerkUser) return clerkUser;
  }

  // 2. Check if identity already exists in user_identities
  const existingUser = await findUserByIdentity(provider, providerSubject);
  if (existingUser) {
    // If clerkUserId provided and not set on existing user, link it safely
    if (clerkUserId && !existingUser.clerkUserId) {
      await sql`
        UPDATE users
        SET clerk_user_id = ${clerkUserId}, updated_at = NOW()
        WHERE id = ${existingUser.id} AND clerk_user_id IS NULL
      `;
      existingUser.clerkUserId = clerkUserId;
    }
    // Update last_used_at
    await sql`
      UPDATE user_identities
      SET last_used_at = NOW()
      WHERE provider = ${provider} AND provider_subject = ${providerSubject}
    `;
    return existingUser;
  }

  // 3. Check if a user exists with matching verified email
  if (params.email && params.verified) {
    const cleanEmail = params.email.toLowerCase().trim();
    const { rows: emailUsers } = await sql`
      SELECT id, clerk_user_id, phone, email, first_name, last_name, role,
             COALESCE(phone_verified, false) as phone_verified,
             COALESCE(email_verified, false) as email_verified,
             COALESCE(totp_enabled, false) as totp_enabled,
             COALESCE(passkey_enabled, false) as passkey_enabled
      FROM users
      WHERE LOWER(TRIM(email)) = ${cleanEmail}
        AND COALESCE(deletion_status, 'active') = 'active'
      LIMIT 1
    `;

    if (emailUsers.length > 0) {
      const u = emailUsers[0];
      // Anti-takeover check: if user already has a DIFFERENT clerk_user_id, reject!
      if (clerkUserId && u.clerk_user_id && u.clerk_user_id !== clerkUserId) {
        throw new IdentityError(
          'This email is already associated with an existing Styld account with a different authentication identity.',
          409
        );
      }

      // Safely link clerk_user_id if not present
      if (clerkUserId && !u.clerk_user_id) {
        await sql`
          UPDATE users
          SET clerk_user_id = ${clerkUserId}, updated_at = NOW()
          WHERE id = ${u.id}
        `;
      }

      // Safely link identity to this existing user
      await sql`
        INSERT INTO user_identities (user_id, provider, provider_subject, email, verified_at, last_used_at)
        VALUES (${u.id}, ${provider}, ${providerSubject}, ${cleanEmail}, NOW(), NOW())
        ON CONFLICT (provider, provider_subject) DO NOTHING
      `;
      return {
        id: u.id,
        clerkUserId: clerkUserId || u.clerk_user_id,
        phone: u.phone,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role || 'client',
        phoneVerified: u.phone_verified,
        emailVerified: true,
        totpEnabled: u.totp_enabled,
        passkeyEnabled: u.passkey_enabled,
      };
    }
  }

  // 4. Create brand new canonical user
  const emailVal = params.email ? params.email.toLowerCase().trim() : null;
  const phoneVal = params.phone ? params.phone.trim() : null;
  const firstNameVal = params.firstName ? params.firstName.trim() : (emailVal ? emailVal.split('@')[0] : 'Styld Member');
  // CRITICAL: Public signup must NEVER choose admin or super_admin
  const requestedRole = params.role || 'client';
  const safeRole = (requestedRole === 'admin' || requestedRole === 'super_admin') ? 'client' : requestedRole;
  const emailVerifiedVal = params.verified && (provider === 'google' || provider === 'email' || provider === 'clerk');
  const phoneVerifiedVal = params.verified && (provider === 'phone');

  const { rows: createdRows } = await sql`
    INSERT INTO users (
      first_name,
      last_name,
      email,
      phone,
      role,
      clerk_user_id,
      email_verified,
      phone_verified,
      created_at,
      updated_at
    )
    VALUES (
      ${firstNameVal},
      ${params.lastName || null},
      ${emailVal},
      ${phoneVal},
      ${safeRole},
      ${clerkUserId || null},
      ${emailVerifiedVal},
      ${phoneVerifiedVal},
      NOW(),
      NOW()
    )
    RETURNING id, clerk_user_id, phone, email, first_name, last_name, role, phone_verified, email_verified
  `;

  const newUser = createdRows[0];

  // Insert identity record
  await sql`
    INSERT INTO user_identities (
      user_id,
      provider,
      provider_subject,
      email,
      phone,
      verified_at,
      last_used_at
    )
    VALUES (
      ${newUser.id},
      ${provider},
      ${providerSubject},
      ${emailVal},
      ${phoneVal},
      ${params.verified ? new Date().toISOString() : null},
      NOW()
    )
    ON CONFLICT (provider, provider_subject) DO NOTHING
  `;

  // If clerkUserId is present and provider is not 'clerk', also register a 'clerk' identity
  if (clerkUserId && provider !== 'clerk') {
    await sql`
      INSERT INTO user_identities (
        user_id,
        provider,
        provider_subject,
        email,
        phone,
        verified_at,
        last_used_at
      )
      VALUES (
        ${newUser.id},
        'clerk',
        ${clerkUserId},
        ${emailVal},
        ${phoneVal},
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, provider_subject) DO NOTHING
    `;
  }

  // Insert baseline user role
  await sql`
    INSERT INTO user_roles (user_id, role)
    VALUES (${newUser.id}, ${safeRole})
    ON CONFLICT DO NOTHING
  `;

  return {
    id: newUser.id,
    clerkUserId: newUser.clerk_user_id,
    phone: newUser.phone,
    email: newUser.email,
    firstName: newUser.first_name,
    lastName: newUser.last_name,
    role: newUser.role,
    phoneVerified: Boolean(newUser.phone_verified),
    emailVerified: Boolean(newUser.email_verified),
    totpEnabled: false,
    passkeyEnabled: false,
  };
}

/**
 * Link an additional identity to an authenticated user account.
 */
export async function linkIdentity(
  userId: string,
  provider: AuthProviderType,
  providerSubject: string,
  details?: { email?: string; phone?: string; verified?: boolean }
): Promise<void> {
  // Prevent takeover: verify that this identity is not already linked to another user
  const existing = await findUserByIdentity(provider, providerSubject);
  if (existing && existing.id !== userId) {
    throw new IdentityError(
      'This sign-in method is already connected to a different Styld account.',
      409
    );
  }

  await sql`
    INSERT INTO user_identities (
      user_id,
      provider,
      provider_subject,
      email,
      phone,
      verified_at,
      last_used_at
    )
    VALUES (
      ${userId},
      ${provider},
      ${providerSubject},
      ${details?.email ? details.email.toLowerCase().trim() : null},
      ${details?.phone || null},
      ${details?.verified ? new Date().toISOString() : null},
      NOW()
    )
    ON CONFLICT (provider, provider_subject) DO UPDATE SET
      user_id = ${userId},
      email = COALESCE(EXCLUDED.email, user_identities.email),
      phone = COALESCE(EXCLUDED.phone, user_identities.phone),
      verified_at = COALESCE(EXCLUDED.verified_at, user_identities.verified_at),
      last_used_at = NOW()
  `;
}

/**
 * Unlink an identity from an authenticated user account.
 * Crucial safety rule: Never allow removing the final usable login method.
 */
export async function unlinkIdentity(userId: string, identityId: string): Promise<void> {
  // 1. Get all active identities for this user
  const { rows } = await sql`
    SELECT id, provider FROM user_identities WHERE user_id = ${userId}
  `;

  if (rows.length <= 1) {
    throw new IdentityError('You cannot remove your only sign-in method.', 400);
  }

  const target = rows.find((r) => r.id === identityId);
  if (!target) {
    throw new IdentityError('Identity not found', 404);
  }

  // Delete identity
  await sql`DELETE FROM user_identities WHERE id = ${identityId} AND user_id = ${userId}`;
}

/**
 * Get all linked identities for a user (for Settings -> Security).
 */
export async function getUserIdentities(userId: string): Promise<UserIdentityRecord[]> {
  const { rows } = await sql`
    SELECT id, user_id, provider, provider_subject, email, phone, verified_at, created_at
    FROM user_identities
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    provider: r.provider as AuthProviderType,
    providerSubject: r.provider_subject,
    email: r.email,
    phone: r.phone,
    verifiedAt: r.verified_at ? new Date(r.verified_at) : null,
    createdAt: new Date(r.created_at),
  }));
}
