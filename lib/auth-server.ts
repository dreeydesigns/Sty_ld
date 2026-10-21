import { requireAuthenticatedUser } from './auth-resolver';
import { authPool } from './auth-database';
interface DatabaseRow { [key:string]:unknown }
export async function verifySession(_token:string){const s=await requireAuthenticatedUser();if(s.admin&&!s.mfaVerified)throw new Error('Administrator MFA required.');return {id:s.userId};}
export async function createSession(..._args:unknown[]):Promise<string>{throw new Error('Use unified sign-in.');}
export async function verifyUserCredentials(..._args:unknown[]):Promise<unknown>{throw new Error('Password login retired.');}
export async function createUser(..._args:unknown[]):Promise<unknown>{throw new Error('Use unified sign-in.');}
export async function invalidateAllSessions(userId:string){await authPool.query('DELETE FROM auth_sessions WHERE "userId"=$1',[userId]);await authPool.query('DELETE FROM auth_session_context WHERE user_id=$1',[userId]);}
export async function getActiveSessions(userId:string){const s=await requireAuthenticatedUser();if(s.userId!==userId)throw new Error('Forbidden');return (await authPool.query('SELECT id,"userAgent" AS browser,"createdAt" AS created_at,"updatedAt" AS last_active_at FROM auth_sessions WHERE "userId"=$1 AND "expiresAt">now()',[userId])).rows;}
export async function deleteSession(id:string){const s=await requireAuthenticatedUser();await authPool.query('DELETE FROM auth_sessions WHERE id=$1 AND "userId"=$2',[id,s.userId]);}
export async function deleteOtherSessions(userId:string,currentId:string){const s=await requireAuthenticatedUser();if(s.userId!==userId||s.sessionId!==currentId)throw new Error('Forbidden');await authPool.query('DELETE FROM auth_sessions WHERE "userId"=$1 AND id<>$2',[userId,currentId]);}
/**
 * Request account deletion (sets 30-day timer)
 */
export async function requestAccountDeletion(userId: string) {
  try {
    await authPool.query(
      `UPDATE users
      SET deletion_status = 'pending', deletion_requested_at = NOW()
      WHERE id = $1`,
      [userId]
    );
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
    await authPool.query(
      `UPDATE users
      SET deletion_status = 'active', deletion_requested_at = NULL
      WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Error canceling deletion:', error);
    throw error;
  }
}

/**
 * Read the account deletion lifecycle state for signed-in UI (Settings banner).
 */
export async function getAccountDeletionStatus(
  userId: string
): Promise<{ status: string; scheduledFor: string | null }> {
  try {
    const { rows } = await authPool.query(
      `SELECT COALESCE(deletion_status, 'active') AS status, deletion_requested_at
      FROM users
      WHERE id = $1`,
      [userId]
    );
    const row = rows[0] as DatabaseRow | undefined;
    const requestedAt = row?.deletion_requested_at
      ? new Date(row.deletion_requested_at as string)
      : null;
    return {
      status: (row?.status as string) || 'active',
      scheduledFor: requestedAt && !isNaN(requestedAt.getTime()) ? requestedAt.toISOString() : null,
    };
  } catch (error) {
    console.error('Error reading account deletion status:', error);
    throw error;
  }
}
