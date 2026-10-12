import { Pool } from 'pg';
// A single small pool per server process; never print connection URLs.
const globalDb = globalThis as unknown as { styldAuthPool?: Pool };
export const authPool = globalDb.styldAuthPool ?? new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  max: 4, connectionTimeoutMillis: 30000, idleTimeoutMillis: 20000,
});
if (process.env.NODE_ENV !== 'production') globalDb.styldAuthPool = authPool;
