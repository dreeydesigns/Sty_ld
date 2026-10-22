import { Pool } from 'pg';
// A single small pool per server process; never print connection URLs.
const globalDb = globalThis as unknown as { styldAuthPool?: Pool };

function createAuthPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    max: 4, connectionTimeoutMillis: 30000, idleTimeoutMillis: 20000,
  });
  pool.on('error', (error: Error) => {
    const code = (error as NodeJS.ErrnoException).code || 'NO_CODE';
    console.error('[db] idle connection error:', error.name, code);
  });
  return pool;
}

export const authPool = globalDb.styldAuthPool ?? createAuthPool();
if (process.env.NODE_ENV !== 'production') globalDb.styldAuthPool = authPool;
