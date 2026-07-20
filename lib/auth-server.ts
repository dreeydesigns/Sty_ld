import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

// Strict interface definition to eliminate type errors permanently
interface DatabaseRow {
  id: string;
  user_id: string;
  password_hash: string;
  first_name: string;
  role: string;
  [key: string]: unknown;
}

/**
 * Create a new authenticated session in the database
 */
export async function createSession(
  userId: string,
  deviceName: string,
  browser?: string,
  ipAddress?: string
) {
  try {
    if (!userId) {
      throw new Error('createSession failed: userId is null or undefined.');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    try {
      await sql`
        INSERT INTO sessions (user_id, token_hash, device_name, browser, ip_address, is_current)
        VALUES (${userId}, ${tokenHash}, ${deviceName}, ${browser || null}, ${ipAddress || null}, true)
      `;
    } catch (insertError: unknown) {
      const err = insertError as Error;
      if (err.message?.includes('relation "sessions" does not exist')) {
        console.warn('sessions table does not exist. Creating sessions table...');
        await sql`
          CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            device_name VARCHAR(255),
            browser VARCHAR(255),
            ip_address VARCHAR(45),
            is_current BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        // Retry insertion
        await sql`
          INSERT INTO sessions (user_id, token_hash, device_name, browser, ip_address, is_current)
          VALUES (${userId}, ${tokenHash}, ${deviceName}, ${browser || null}, ${ipAddress || null}, true)
        `;
      } else {
        throw insertError;
      }
    }

    return token;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Verify an existing session token
 */
export async function verifySession(token: string) {
  try {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const { rows } = await sql`
      SELECT user_id FROM sessions WHERE token_hash = ${tokenHash}
    `;
    
    if (rows.length === 0) {
      throw new Error('Unauthorized');
    }
    
    const row = rows as unknown as DatabaseRow;
    return { id: row.user_id };
  } catch (error) {
    console.error('Error verifying session:', error);
    throw error;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: string) {
  try {
    const result = await sql`
      SELECT id, device_name, browser, ip_address, created_at, last_active_at, is_current
      FROM sessions
      WHERE user_id = ${userId}
      ORDER BY last_active_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

/**
 * Delete a specific session
 */
export async function deleteSession(sessionId: string) {
  try {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Delete all sessions except current
 */
export async function deleteOtherSessions(userId: string, currentSessionId: string) {
  try {
    await sql`
      DELETE FROM sessions
      WHERE user_id = ${userId} AND id != ${currentSessionId}
    `;
  } catch (error) {
    console.error('Error deleting other sessions:', error);
    throw error;
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllSessions(userId: string) {
  try {
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
  } catch (error) {
    console.error('Error invalidating sessions:', error);
    throw error;
  }
}

/**
 * Verify user credentials (phone + password)
 */
export async function verifyUserCredentials(phone: string, password: string) {
  try {
    const result = await sql`
      SELECT id, password_hash, first_name, role
      FROM users
      WHERE phone = ${phone} AND phone_verified = true
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows as unknown as DatabaseRow;
    const { comparePasswords } = await import('@/lib/auth');
    const passwordValid = await comparePasswords(password, user.password_hash);

    if (!passwordValid) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.first_name,
      role: user.role,
    };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    throw error;
  }
}

/**
 * Create a new user after phone-based signup
 */
export async function createUser({
  phone,
  firstName,
  password,
  role = 'client',
}: {
  phone: string;
  firstName: string;
  password: string;
  role?: string;
}) {
  try {
    const passwordHash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (phone, first_name, password_hash, phone_verified, role)
      VALUES (${phone}, ${firstName}, ${passwordHash}, true, ${role})
      RETURNING id, first_name, role
    `;

    const createdUser = result.rows as unknown as DatabaseRow;
    return {
      id: createdUser.id,
      first_name: createdUser.first_name,
      role: createdUser.role,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Request account deletion (sets 30-day timer)
 */
export async function requestAccountDeletion(userId: string) {
  try {
    await sql`
      UPDATE users
      SET deletion_status = 'pending', deletion_requested_at = NOW()
      WHERE id = ${userId}
    `;
    return { deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  } catch (error) {
    console.error('Error requesting deletion:', error);
    throw error;
  }
}

/**
 * Cancel account deletion request
 */
export async function cancelAccountDeletion(userId: string) {
  try {
    await sql`
      UPDATE users
      SET deletion_status = 'active', deletion_requested_at = NULL
      WHERE id = ${userId}
    `;
  } catch (error) {
    console.error('Error canceling deletion:', error);
    throw error;
  }
}