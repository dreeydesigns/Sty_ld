-- Add support for users with multiple roles
-- This enables the Wanjiku admin account to function as client, salon, and professional

-- Create user_roles junction table for users with multiple roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by_admin BOOLEAN DEFAULT false,
  UNIQUE(user_id, role)
);

-- Create admin_account_config table to mark special admin accounts
CREATE TABLE IF NOT EXISTS admin_account_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_universal_admin BOOLEAN DEFAULT true,
  can_assume_roles BOOLEAN DEFAULT true,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_account_config_user_id ON admin_account_config(user_id);

-- Add passcode column for OTP/2FA (for Wanjiku account)
ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_universal_admin BOOLEAN DEFAULT false;

-- Add session role tracking (to track which role user assumed in current session)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assumed_role VARCHAR(20);
