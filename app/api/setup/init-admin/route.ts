import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * POST /api/setup/init-admin
 * 
 * ⚠️ SECURITY WARNING: This endpoint should only be available in development
 * Delete this file or add authentication guard in production
 * 
 * Creates the admin account structure and seeds the Wanjiku admin account
 */
export async function POST(req: NextRequest) {
  // Security check - only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Setup endpoints are disabled in production' 
      },
      { status: 403 }
    );
  }

  try {
    console.log('Starting admin setup...');

    // Step 1: Create user_roles table
    console.log('Creating user_roles table...');
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

    // Step 2: Create admin_account_config table
    console.log('Creating admin_account_config table...');
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

    // Step 3: Add new columns to users table
    console.log('Adding columns to users table...');
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode VARCHAR(10)
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_universal_admin BOOLEAN DEFAULT false
    `;

    // Step 4: Add assumed_role to sessions table
    console.log('Adding assumed_role column to sessions table...');
    await sql`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assumed_role VARCHAR(20)
    `;

    // Step 5: Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_config_user_id ON admin_account_config(user_id)`;

    // Step 6: Seed admin account
    console.log('Seeding admin account...');
    
    const { hashPassword } = await import('@/lib/auth');
    
    const adminPhone = '+254743817931';
    const adminEmail = 'dreeydesigns@gmail.com';
    const adminPassword = 'Mobisa123';
    const adminPasscode = '123456';
    const adminFirstName = 'Wanjiku';
    const adminLastName = 'Mobile Salon';

    // Check if already exists
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${adminPhone}
    `;

    let adminUserId: string;

    if (existing.rows.length > 0) {
      adminUserId = existing.rows[0].id as string;
      console.log('Admin account already exists, updating...');
      
      const passwordHash = await hashPassword(adminPassword);
      await sql`
        UPDATE users
        SET 
          password_hash = ${passwordHash},
          passcode = ${adminPasscode},
          email = ${adminEmail},
          first_name = ${adminFirstName},
          last_name = ${adminLastName},
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
      console.log('Admin account created');
    }

    // Step 7: Assign roles
    console.log('Assigning roles...');
    await sql`DELETE FROM user_roles WHERE user_id = ${adminUserId}`;

    const roles = ['client', 'professional', 'salon', 'admin', 'super_admin'];
    
    for (const role of roles) {
      await sql`
        INSERT INTO user_roles (user_id, role, assigned_by_admin)
        VALUES (${adminUserId}, ${role}, true)
        ON CONFLICT (user_id, role) DO NOTHING
      `;
    }

    // Step 8: Create admin config
    console.log('Creating admin config...');
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

    console.log('✅ Admin setup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Admin account setup completed',
      admin_account: {
        user_id: adminUserId,
        phone: adminPhone,
        email: adminEmail,
        username: adminFirstName,
        password: adminPassword,
        passcode: adminPasscode,
        roles: roles,
      },
      test_command: 'curl -X POST http://localhost:3000/api/auth/signin-multi-role -H "Content-Type: application/json" -d \'{"phone":"+254743817931","password":"Mobisa123","assumedRole":"admin"}\'',
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup/init-admin
 * Check setup status
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Setup endpoints are disabled in production' 
      },
      { status: 403 }
    );
  }

  try {
    // Check if tables exist and admin account is set up
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

    const tables = tablesCheck.rows[0] as any;

    const adminCheck = await sql`
      SELECT id, first_name, is_universal_admin 
      FROM users 
      WHERE phone = '+254743817931' 
      LIMIT 1
    `;

    const adminExists = adminCheck.rows.length > 0;
    const admin = adminCheck.rows[0] as any;

    return NextResponse.json({
      success: true,
      status: {
        user_roles_table: tables.user_roles_exists,
        admin_config_table: tables.admin_config_exists,
        admin_account_exists: adminExists,
        admin_account: adminExists ? {
          id: admin.id,
          name: admin.first_name,
          is_universal_admin: admin.is_universal_admin,
        } : null,
      },
      next_step: !adminExists ? 'Run POST /api/setup/init-admin to create admin account' : 'Admin setup complete!',
    });
  } catch (error) {
    console.error('Setup status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
