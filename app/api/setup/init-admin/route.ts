import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

/**
 * POST /api/setup/init-admin
 *
 * P0A-hardened (scope items C + D):
 *  - Disabled outright in production (403) — it mutates schema and privileged rows.
 *  - In every other environment it requires the `x-setup-secret` header to match
 *    the SETUP_SECRET environment variable (compared in constant time). No secret
 *    configured → 403 (fail closed), missing/wrong header → 401.
 *  - The response never echoes credentials: no password, no passcode, nothing from
 *    the removed hardcoded bootstrap. Account values come from STYLD_ADMIN_* env vars.
 *
 * NOTE: the runtime `CREATE TABLE IF NOT EXISTS` block below is a stop-gap carried
 * over from before P0A; the P0C migration workstream replaces it so setup endpoints
 * stop mutating schema.
 */

function secretEquals(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Returns a NextResponse when the caller may not proceed, else null. */
function setupGuard(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Setup endpoints are disabled in production' },
      { status: 403 },
    );
  }

  const expected = process.env.SETUP_SECRET;
  if (!expected) {
    return NextResponse.json(
      { success: false, error: 'Setup is not configured for this environment' },
      { status: 403 },
    );
  }

  const provided = req.headers.get('x-setup-secret');
  if (!provided || !secretEquals(provided, expected)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  return null;
}

export async function POST(req: NextRequest) {
  const blocked = setupGuard(req);
  if (blocked) return blocked;

  try {
    console.log('[setup] Starting admin setup...');

    // ── Schema stop-gap (replaced by P0C migrations) ───────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by_admin BOOLEAN DEFAULT false,
        UNIQUE(user_id, role)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_account_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        is_universal_admin BOOLEAN DEFAULT true,
        can_assume_roles BOOLEAN DEFAULT true,
        description VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode VARCHAR(10)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_universal_admin BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assumed_role VARCHAR(20)`;

    await sql`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_config_user_id ON admin_account_config(user_id)`;

    // ── Bootstrap from environment only (never from committed defaults) ─────
    const { seedAdminAccount } = await import('@/lib/seed-admin');
    const result = await seedAdminAccount();

    console.log('[setup] Admin setup completed.');

    return NextResponse.json({
      success: true,
      message: 'Admin account setup completed',
      admin_account: {
        // Identifiers only — never password / passcode values.
        user_id: result.userId,
        created: result.created,
        roles: result.roles,
      },
    });
  } catch (error) {
    console.error('[setup] Admin setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/setup/init-admin
 * Setup status (same guard as POST; no credential values in the response).
 */
export async function GET(req: NextRequest) {
  const blocked = setupGuard(req);
  if (blocked) return blocked;

  try {
    const tablesCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_roles'
      ) as user_roles_exists,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'admin_account_config'
      ) as admin_config_exists
    `;

    const tables = tablesCheck.rows[0] as { user_roles_exists: boolean; admin_config_exists: boolean };

    const adminPhone = process.env.STYLD_ADMIN_PHONE?.trim() || null;
    const adminCheck = adminPhone
      ? await sql`
          SELECT id, first_name, is_universal_admin
          FROM users
          WHERE phone = ${adminPhone}
          LIMIT 1
        `
      : { rows: [] as Array<{ id: string; first_name: string; is_universal_admin?: boolean }> };

    const adminExists = adminCheck.rows.length > 0;
    const admin = adminCheck.rows[0] as { id: string; first_name: string; is_universal_admin?: boolean };

    return NextResponse.json({
      success: true,
      status: {
        user_roles_table: tables.user_roles_exists,
        admin_config_table: tables.admin_config_exists,
        admin_account_configured: adminExists,
        admin_account: adminExists
          ? {
              id: admin.id,
              name: admin.first_name,
              is_universal_admin: admin.is_universal_admin,
            }
          : null,
      },
      next_step: !adminExists ? 'Run POST /api/setup/init-admin with the x-setup-secret header' : 'Admin setup complete!',
    });
  } catch (error) {
    console.error('[setup] Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
