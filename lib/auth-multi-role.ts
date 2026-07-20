import { sql } from '@vercel/postgres';
import { comparePasswords } from '@/lib/auth';
import crypto from 'crypto';

interface UserWithRoles {
  id: string;
  first_name: string;
  email: string;
  phone: string;
  role: string;
  available_roles: string[];
  is_universal_admin: boolean;
}

interface SessionData {
  token: string;
  user_id: string;
  assumed_role: string;
  available_roles: string[];
  is_universal_admin: boolean;
}

/**
 * Get user by phone with all available roles
 */
export async function getUserWithRoles(phone: string): Promise<UserWithRoles | null> {
  try {
    const result = await sql`
      SELECT 
        u.id,
        u.first_name,
        u.email,
        u.phone,
        u.role,
        u.is_universal_admin,
        COALESCE(
          (SELECT json_agg(DISTINCT ur.role) FROM user_roles ur WHERE ur.user_id = u.id),
          json_build_array(u.role)
        ) as available_roles
      FROM users u
      WHERE u.phone = ${phone} AND u.phone_verified = true
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = result.rows[0] as any;
    return {
      id: row.id,
      first_name: row.first_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      available_roles: Array.isArray(row.available_roles) ? row.available_roles : [row.role],
      is_universal_admin: row.is_universal_admin || false,
    };
  } catch (error) {
    console.error('Error getting user with roles:', error);
    throw error;
  }
}

/**
 * Verify credentials and return user with available roles
 * Does NOT create session yet - allows role selection first
 */
export async function verifyCredentialsMultiRole(phone: string, password: string) {
  try {
    const result = await sql`
      SELECT 
        id, 
        password_hash, 
        first_name, 
        email,
        role,
        is_universal_admin,
        phone_verified
      FROM users
      WHERE phone = ${phone}
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = result.rows[0] as any;
    
    if (!user.phone_verified) return null;

    const passwordValid = await comparePasswords(password, user.password_hash);
    if (!passwordValid) return null;

    // Get all available roles
    const rolesResult = await sql`
      SELECT role FROM user_roles WHERE user_id = ${user.id}
      UNION
      SELECT ${user.role} as role
      ORDER BY role
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableRoles = rolesResult.rows.map((r: any) => r.role);

    return {
      id: user.id,
      first_name: user.first_name,
      email: user.email,
      phone,
      current_role: user.role,
      available_roles: availableRoles.length > 0 ? availableRoles : [user.role],
      is_universal_admin: user.is_universal_admin || false,
    };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    throw error;
  }
}

/**
 * Create session with assumed role for multi-role accounts
 */
export async function createMultiRoleSession(
  userId: string,
  assumedRole: string,
  deviceName: string,
  browser?: string,
  ipAddress?: string
): Promise<SessionData> {
  try {
    // Verify user has access to this role
    const roleCheck = await sql`
      SELECT 1 FROM user_roles 
      WHERE user_id = ${userId} AND role = ${assumedRole}
      UNION
      SELECT 1 FROM users 
      WHERE id = ${userId} AND role = ${assumedRole}
      LIMIT 1
    `;

    if (roleCheck.rows.length === 0) {
      throw new Error(`User does not have access to role: ${assumedRole}`);
    }

    // Generate token
    const tokenBuffer = crypto.randomBytes(32);
    const token = tokenBuffer.toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Create session with assumed role
    await sql`
      INSERT INTO sessions (
        user_id, 
        token_hash, 
        device_name, 
        browser, 
        ip_address,
        assumed_role,
        is_current
      )
      VALUES (
        ${userId}, 
        ${tokenHash}, 
        ${deviceName}, 
        ${browser || null}, 
        ${ipAddress || null},
        ${assumedRole},
        true
      )
    `;

    // Get user info
    const userResult = await sql`
      SELECT is_universal_admin FROM users WHERE id = ${userId}
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = userResult.rows[0] as any;

    // Get available roles
    const rolesResult = await sql`
      SELECT role FROM user_roles WHERE user_id = ${userId}
      UNION
      SELECT role FROM users WHERE id = ${userId}
      ORDER BY role
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableRoles = rolesResult.rows.map((r: any) => r.role);

    return {
      token,
      user_id: userId,
      assumed_role: assumedRole,
      available_roles: availableRoles,
      is_universal_admin: user.is_universal_admin || false,
    };
  } catch (error) {
    console.error('Error creating multi-role session:', error);
    throw error;
  }
}

/**
 * Verify session token and get the assumed role
 */
export async function verifyMultiRoleSession(token: string) {
  try {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const result = await sql`
      SELECT 
        user_id, 
        assumed_role,
        created_at
      FROM sessions 
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired session');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = result.rows[0] as any;
    
    // Update last_active_at
    await sql`
      UPDATE sessions 
      SET last_active_at = NOW()
      WHERE token_hash = ${tokenHash}
    `;

    return {
      user_id: session.user_id,
      assumed_role: session.assumed_role,
      created_at: session.created_at,
    };
  } catch (error) {
    console.error('Error verifying multi-role session:', error);
    throw error;
  }
}

/**
 * Get all sessions for a user with their assumed roles
 */
export async function getAllUserSessionsWithRoles(userId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        device_name,
        browser,
        ip_address,
        assumed_role,
        created_at,
        last_active_at,
        is_current
      FROM sessions
      WHERE user_id = ${userId}
      ORDER BY last_active_at DESC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
}

/**
 * Delete all sessions for a user except those on allowed devices
 * (Implements the rule: only that account can be logged in on multiple devices)
 */
export async function deleteOtherDeviceSessions(
  userId: string,
  currentSessionId: string
): Promise<void> {
  try {
    await sql`
      DELETE FROM sessions
      WHERE user_id = ${userId} 
        AND id != ${currentSessionId}
        AND is_current = true
    `;
  } catch (error) {
    console.error('Error deleting other sessions:', error);
    throw error;
  }
}

/**
 * Switch role in current session (for universal admins)
 */
export async function switchRoleInSession(
  sessionId: string,
  newRole: string
): Promise<void> {
  try {
    // Get the session
    const sessionResult = await sql`
      SELECT user_id FROM sessions WHERE id = ${sessionId}
    `;

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = sessionResult.rows[0] as any;

    // Verify user has access to this role
    const roleCheck = await sql`
      SELECT 1 FROM user_roles 
      WHERE user_id = ${session.user_id} AND role = ${newRole}
      UNION
      SELECT 1 FROM users 
      WHERE id = ${session.user_id} AND role = ${newRole}
      LIMIT 1
    `;

    if (roleCheck.rows.length === 0) {
      throw new Error('User does not have access to this role');
    }

    // Update session with new role
    await sql`
      UPDATE sessions 
      SET assumed_role = ${newRole}, last_active_at = NOW()
      WHERE id = ${sessionId}
    `;
  } catch (error) {
    console.error('Error switching role:', error);
    throw error;
  }
}
