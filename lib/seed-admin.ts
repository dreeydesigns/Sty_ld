import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth';

/**
 * Bootstrap the Styld admin account.
 *
 * P0A: this file used to contain hardcoded privileged credentials (a phone number,
 * a password, a passcode and an email address) that were committed to git history
 * from the initial commit and printed to the console on every run. Those values are
 * permanently exposed and MUST be rotated (owner-gated) — see the P0A stop-point
 * report §8.
 *
 * Now: every value is read from the environment and nothing credential-shaped is
 * ever logged. Required env vars:
 *   STYLD_ADMIN_PHONE      E.164 phone number for the admin account
 *   STYLD_ADMIN_PASSWORD   password (rotated, never committed)
 *   STYLD_ADMIN_EMAIL      optional
 *   STYLD_ADMIN_FIRST_NAME optional (default "Styld")
 *   STYLD_ADMIN_PASSCODE   optional second factor
 *
 * If the required env vars are absent the function refuses to run rather than
 * falling back to a default — a bootstrap that invents credentials is a backdoor.
 */
export async function seedAdminAccount() {
  const adminPhone = process.env.STYLD_ADMIN_PHONE?.trim();
  const adminPassword = process.env.STYLD_ADMIN_PASSWORD;
  const adminEmail = process.env.STYLD_ADMIN_EMAIL?.trim() || null;
  const adminPasscode = process.env.STYLD_ADMIN_PASSCODE?.trim() || null;
  const adminFirstName = process.env.STYLD_ADMIN_FIRST_NAME?.trim() || 'Styld';
  const adminLastName = process.env.STYLD_ADMIN_LAST_NAME?.trim() || 'Admin';

  if (!adminPhone || !adminPassword) {
    throw new Error(
      '[admin-bootstrap] Refusing to run: STYLD_ADMIN_PHONE and STYLD_ADMIN_PASSWORD must be set in the environment.',
    );
  }

  try {
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${adminPhone}
    `;

    let adminUserId: string;
    let created = false;

    if (existing.rows.length > 0) {
      console.log('[admin-bootstrap] Existing admin account found — updating flags and credential.');
      adminUserId = existing.rows[0].id as string;

      const passwordHash = await hashPassword(adminPassword);
      await sql`
        UPDATE users
        SET
          password_hash = ${passwordHash},
          passcode = ${adminPasscode},
          email = COALESCE(${adminEmail}, email),
          is_universal_admin = true,
          phone_verified = true,
          email_verified = true
        WHERE id = ${adminUserId}
      `;
    } else {
      const passwordHash = await hashPassword(adminPassword);

      const result = await sql`
        INSERT INTO users (
          phone,
          email,
          first_name,
          last_name,
          password_hash,
          passcode,
          role,
          phone_verified,
          email_verified,
          is_universal_admin
        )
        VALUES (
          ${adminPhone},
          ${adminEmail},
          ${adminFirstName},
          ${adminLastName},
          ${passwordHash},
          ${adminPasscode},
          'admin',
          true,
          true,
          true
        )
        RETURNING id
      `;

      adminUserId = result.rows[0].id as string;
      created = true;
    }

    // Roles: client / professional / salon / admin / super_admin
    await sql`DELETE FROM user_roles WHERE user_id = ${adminUserId}`;

    const roles = ['client', 'professional', 'salon', 'admin', 'super_admin'];

    for (const role of roles) {
      await sql`
        INSERT INTO user_roles (user_id, role, assigned_by_admin)
        VALUES (${adminUserId}, ${role}, true)
        ON CONFLICT (user_id, role) DO NOTHING
      `;
    }

    await sql`
      INSERT INTO admin_account_config (
        user_id,
        is_universal_admin,
        can_assume_roles,
        description
      )
      VALUES (
        ${adminUserId},
        true,
        true,
        'Universal admin account bootstrapped from environment configuration'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        is_universal_admin = true,
        can_assume_roles = true
    `;

    // Log labels, ids and role names only — never credential values.
    console.log('[admin-bootstrap] Admin account configured.');
    console.log('[admin-bootstrap] user id:', adminUserId);
    console.log('[admin-bootstrap] roles:', roles.join(', '));
    console.log('[admin-bootstrap] mode:', created ? 'created' : 'updated');

    return {
      success: true,
      userId: adminUserId,
      created,
      roles,
    };
  } catch (error) {
    console.error('[admin-bootstrap] Failed to configure admin account:', error);
    throw error;
  }
}

// Export for use in initialization
if (require.main === module) {
  seedAdminAccount().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
