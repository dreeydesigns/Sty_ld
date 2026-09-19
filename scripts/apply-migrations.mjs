/**
 * scripts/apply-migrations.mjs
 *
 * Standalone migration runner for Styld.
 * Applies any pending SQL migrations from sql/migrations/ to the database
 * pointed at by POSTGRES_URL / POSTGRES_PRISMA_URL, tracking them in
 * schema_migrations. Idempotent: already-applied migrations are skipped.
 *
 * Usage (never prints connection strings or secrets):
 *   node --env-file=.env.local scripts/apply-migrations.mjs
 *
 * Intentionally duplicates the logic of lib/migrations.ts so it can run
 * without a TypeScript toolchain — keep both in sync.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sql } from '@vercel/postgres';

const MIGRATIONS_DIR = path.join(process.cwd(), 'sql', 'migrations');

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.error('ERROR: no POSTGRES_URL configured. Aborting without changes.');
    process.exit(1);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const { rows } = await sql`SELECT name FROM schema_migrations`;
  const appliedSet = new Set(rows.map((r) => r.name));

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`ERROR: migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`SKIP  ${file} (already applied)`);
      skipped += 1;
      continue;
    }

    const script = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await sql.query(script);
      await sql`INSERT INTO schema_migrations (name) VALUES (${file})`;
      console.log(`APPLY ${file}`);
      applied += 1;
    } catch (err) {
      console.error(`FAIL  ${file}`);
      // Print only the PostgreSQL error message — never connection details.
      console.error(String(err?.message || err).split('\n')[0]);
      process.exit(1);
    }
  }

  console.log(`\nDone. applied=${applied} skipped=${skipped} total=${files.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(String(err?.message || err).split('\n')[0]);
    process.exit(1);
  });
