-- ============================================================================
-- Migration 006: Clerk External Identity Integration & Canonical Styld User
-- ============================================================================

-- 1. Add clerk_user_id to users table (unique, nullable during migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);

-- 2. Add unique constraint and index on clerk_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_clerk_user_id'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT uq_users_clerk_user_id UNIQUE (clerk_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- 3. Ensure user_identities has index for clerk provider searches
CREATE INDEX IF NOT EXISTS idx_user_identities_clerk ON user_identities(provider, provider_subject)
WHERE provider = 'clerk';
