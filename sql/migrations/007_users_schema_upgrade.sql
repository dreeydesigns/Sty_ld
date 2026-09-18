-- ============================================================================
-- Migration 007: Users Schema Compatibility (Idempotent)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tribe_badge VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_universal_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(30);

ALTER TABLE whatsapp_auth_challenges ALTER COLUMN verification_sid TYPE VARCHAR(100);

