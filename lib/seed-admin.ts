import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth';

/**
 * Seed the default admin account for Styld
 * SECURITY: All credentials must be provided via environment variables.
 * Hardcoded credentials have been removed as part of P0 security remediation.
 * 
 * Required Environment Variables:
 * - ADMIN_PHONE: Admin phone number (with country code, e.g., +254700000000)
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password (min 8 characters)
 * - ADMIN_PASSCODE: Admin passcode for secondary authentication
 * - ADMIN_FIRST_NAME: Admin first name
 * - ADMIN_LAST_NAME: Admin last name
 */
export async function seedAdminAccount() {
  try {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasscode = process.env.ADMIN_PASSCODE;
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

    // Validate required environment variables
    if (!adminPhone || !adminEmail || !adminPassword || !adminPasscode) {
      throw new Error('Missing required admin credentials in environment variables. Please set ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PASSCODE.');
    }

    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    }

    // Check if admin account already exists
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${adminPhone}
    `;

    let adminUserId: string;

    if (existing.rows.length > 0) {
      console.log('Admin account already exists. Updating...');
      adminUserId = existing.rows[0].id;
      
      // Update the admin account with new password and passcode
      const passwordHash = await hashPassword(adminPassword);
      await sql`
        UPDATE users
        SET 
          password_hash = ${passwordHash},
          passcode = ${adminPasscode},
          email = ${adminEmail},
          is_universal_admin = true,
          phone_verified = true,
          email_verified = true
        WHERE id = ${adminUserId}
      `;
    } else {
      // Create new admin account
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
      
      adminUserId = result.rows[0].id;
      console.log('Admin account created with ID:', adminUserId);
    }

    // Clear existing roles for this user
    await sql`DELETE FROM user_roles WHERE user_id = ${adminUserId}`;

    // Assign multiple roles to admin account
    const roles = ['client', 'professional', 'salon', 'admin', 'super_admin'];
    
    for (const role of roles) {
      await sql`
        INSERT INTO user_roles (user_id, role, assigned_by_admin)
        VALUES (${adminUserId}, ${role}, true)
        ON CONFLICT (user_id, role) DO NOTHING
      `;
    }

    // Create admin config entry
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
        'Default universal admin account for Styld testing and demonstration'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        is_universal_admin = true,
        can_assume_roles = true
    `;

    console.log('✅ Admin account successfully configured');
    console.log('Admin ID:', adminUserId);
    console.log('WARNING: Credentials loaded from environment variables - do not log or expose them.');

    return {
      success: true,
      userId: adminUserId,
      // Do not return sensitive credentials
      roles,
    };
  } catch (error) {
    console.error('Error seeding admin account:', error);
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
