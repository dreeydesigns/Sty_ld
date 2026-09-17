-- ============================================================================
-- Migration 005: Multi-Method Authentication Architecture & Identity Ladder
-- ============================================================================

-- 1. Evolve users table: allow signup without phone, add MFA & Passkey flags
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passkey_enabled BOOLEAN DEFAULT false;

-- 2. User Identities: Multi-provider mapping linked to canonical users
CREATE TABLE IF NOT EXISTS user_identities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(32) NOT NULL, -- 'google', 'email', 'phone', 'password', 'passkey', 'apple'
  provider_subject  VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  verified_at       TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_identity_provider_subject UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider ON user_identities(provider);

-- 3. WebAuthn / Passkey Credentials
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id     TEXT NOT NULL UNIQUE,
  public_key        TEXT NOT NULL,
  counter           BIGINT NOT NULL DEFAULT 0,
  device_name       VARCHAR(100),
  backed_up         BOOLEAN DEFAULT false,
  transports        TEXT[],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id ON passkey_credentials(user_id);

-- 4. Temporary Passkey Challenges (for WebAuthn registration/authentication ceremonies)
CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge_hash    TEXT PRIMARY KEY,
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(32) NOT NULL, -- 'registration' | 'authentication'
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires ON passkey_challenges(expires_at);

-- 5. Email Authentication Challenges (OTP & Magic Links)
CREATE TABLE IF NOT EXISTS email_auth_challenges (
  token_hash        TEXT PRIMARY KEY,
  email             VARCHAR(255) NOT NULL,
  code_hash         TEXT NOT NULL,
  magic_link_hash   TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,
  attempts          INTEGER NOT NULL DEFAULT 0,
  verified_at       TIMESTAMPTZ,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_challenges_email ON email_auth_challenges(email);
CREATE INDEX IF NOT EXISTS idx_email_challenges_expires ON email_auth_challenges(expires_at);

-- 6. MFA Methods (TOTP Authenticator Apps)
CREATE TABLE IF NOT EXISTS mfa_methods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(32) NOT NULL DEFAULT 'totp',
  secret_encrypted  TEXT NOT NULL,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_mfa_methods_user_type UNIQUE (user_id, type)
);
CREATE INDEX IF NOT EXISTS idx_mfa_methods_user_id ON mfa_methods(user_id);

-- 7. One-Time Backup Recovery Codes
CREATE TABLE IF NOT EXISTS recovery_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash         TEXT NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);

-- 8. Backfill existing users into user_identities
-- Phone identities
INSERT INTO user_identities (user_id, provider, provider_subject, phone, verified_at)
SELECT id, 'phone', phone, phone, (CASE WHEN phone_verified THEN NOW() ELSE NULL END)
FROM users
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (provider, provider_subject) DO NOTHING;

-- Email identities
INSERT INTO user_identities (user_id, provider, provider_subject, email, verified_at)
SELECT id, 'email', LOWER(TRIM(email)), email, (CASE WHEN email_verified THEN NOW() ELSE NULL END)
FROM users
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (provider, provider_subject) DO NOTHING;

-- Password identities (keyed to phone or email or user id)
INSERT INTO user_identities (user_id, provider, provider_subject, verified_at)
SELECT id, 'password', COALESCE(phone, email, id::text), NOW()
FROM users
WHERE password_hash IS NOT NULL AND password_hash != ''
ON CONFLICT (provider, provider_subject) DO NOTHING;
