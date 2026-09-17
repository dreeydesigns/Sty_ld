/**
 * Styld Database Migration Runner
 *
 * Provides authoritative, versioned, idempotent schema migrations.
 * Tracks applied migrations in the `schema_migrations` table.
 */

import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
  errors?: Array<{ migration: string; error: string }>;
}

/**
 * Ensure the migrations tracking table exists.
 */
export async function ensureMigrationTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * Run all pending migrations in alphabetical sequence.
 */
export async function runMigrations(): Promise<MigrationResult> {
  await ensureMigrationTable();

  const { rows } = await sql`SELECT name FROM schema_migrations`;
  const appliedSet = new Set(rows.map((r) => (r as { name: string }).name));

  const migrationsDir = path.join(process.cwd(), 'sql', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return { applied: [], alreadyApplied: Array.from(appliedSet) };
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const result: MigrationResult = {
    applied: [],
    alreadyApplied: [],
  };

  for (const file of files) {
    if (appliedSet.has(file)) {
      result.alreadyApplied.push(file);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const script = fs.readFileSync(filePath, 'utf8');

    try {
      logger.info(`Running migration: ${file}`);
      await sql.query(script);
      await sql`INSERT INTO schema_migrations (name) VALUES (${file})`;
      result.applied.push(file);
      logger.info(`Migration applied successfully: ${file}`);
    } catch (err) {
      const errorMsg = String(err);
      logger.error(`Migration failed on ${file}`, err, { file });
      if (!result.errors) result.errors = [];
      result.errors.push({ migration: file, error: errorMsg });
      throw new Error(`Migration ${file} failed: ${errorMsg}`);
    }
  }

  return result;
}
