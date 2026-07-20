import { sql } from "@vercel/postgres";

// This creates a record when a user logs in
export async function createSession(userId: string, tokenHash: string, deviceInfo: string) {
  return await sql`
    INSERT INTO sessions (user_id, token_hash, device_name)
    VALUES (${userId}, ${tokenHash}, ${deviceInfo})
  `;
}

// This retrieves active sessions for a user
export async function getActiveSessions(userId: string) {
  return await sql`
    SELECT id, device_name, browser, last_active_at 
    FROM sessions 
    WHERE user_id = ${userId}
  `;
}

// THIS IS THE ONE USED BY YOUR LOGOUT FUNCTION
// It permanently removes the session from the database
export async function deleteSession(sessionId: string) {
  return await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}