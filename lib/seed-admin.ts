import { sql } from '@vercel/postgres';
import { hashPassword } from '@/lib/auth';

/**
 * Seed the default admin account for Mobile Salon
 * This creates the "Wanjiku" account that can assume multiple roles
 * 
 * Account Details:
 * Username: Wanjiku
 * Email: dreeydesigns@gmail.com
 * Phone: +254 743817931
 * Password: Mobisa123
 * Passcode: 123456
 * Roles: client, professional, salon, admin
 */
export async function seedAdminAccount() {
  try {
    const adminPhone = '+254743817931';
    const adminEmail = 'dreeydesigns@gmail.com';
    const adminPassword = 'Mobisa123';
    const adminPasscode = '123456';
    const adminFirstName = 'Wanjiku';
    const adminLastName = 'Mobile Salon';

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
        'Default universal admin account for Mobile Salon testing and demonstration'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        is_universal_admin = true,
        can_assume_roles = true
    `;

    console.log('✅ Admin account successfully configured');
    console.log('Account Details:');
    console.log('  Phone: ' + adminPhone);
    console.log('  Email: ' + adminEmail);
    console.log('  Username: ' + adminFirstName);
    console.log('  Password: ' + adminPassword);
    console.log('  Passcode: ' + adminPasscode);
    console.log('  Roles: client, professional, salon, admin, super_admin');
    console.log('  User ID: ' + adminUserId);

    return {
      success: true,
      userId: adminUserId,
      phone: adminPhone,
      email: adminEmail,
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
