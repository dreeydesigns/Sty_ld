-- ============================================================================
-- Migration 001: Initial Core Schema (Idempotent Baseline)
-- ============================================================================

-- Rate limiting and verification tables
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  last_attempt TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_auth_challenges (
  token_hash TEXT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  verification_sid VARCHAR(34) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS whatsapp_challenge_expiry ON whatsapp_auth_challenges (expires_at);

-- Core Users Table
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                 VARCHAR(20) UNIQUE NOT NULL,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100),
  email                 VARCHAR(255) UNIQUE,
  password_hash         VARCHAR(255),
  phone_verified        BOOLEAN DEFAULT false,
  email_verified        BOOLEAN DEFAULT false,
  role                  VARCHAR(20) DEFAULT 'client',
  profile_image_url     VARCHAR(500),
  cover_image_url       VARCHAR(500),
  bio                   TEXT,
  display_name          VARCHAR(150),
  salon_name            VARCHAR(150),
  location              VARCHAR(200),
  theme                 VARCHAR(50),
  tribe_badge           VARCHAR(10),
  is_universal_admin    BOOLEAN DEFAULT false,
  passcode              VARCHAR(255),
  terms_accepted_at     TIMESTAMPTZ,
  terms_version         VARCHAR(30),
  firebase_uid          TEXT UNIQUE,
  deletion_status       VARCHAR(20) DEFAULT 'active',
  deletion_requested_at TIMESTAMPTZ,
  username              TEXT UNIQUE,
  specialty             TEXT,
  service_mode          TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  device_name    VARCHAR(100),
  browser        VARCHAR(200),
  ip_address     VARCHAR(50),
  is_current     BOOLEAN DEFAULT false,
  assumed_role   VARCHAR(20),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- Multi-Role Mapping
CREATE TABLE IF NOT EXISTS user_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL,
  assigned_at       TIMESTAMPTZ DEFAULT NOW(),
  assigned_by_admin BOOLEAN DEFAULT false,
  UNIQUE(user_id, role)
);

-- Admin Config
CREATE TABLE IF NOT EXISTS admin_account_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_universal_admin BOOLEAN DEFAULT false,
  can_assume_roles   BOOLEAN DEFAULT false,
  description        VARCHAR(500),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER,
  image_url        VARCHAR(500),
  category         VARCHAR(50),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);

-- Bookings Table (authoritative baseline)
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES users(id),
  service_id    UUID REFERENCES services(id),
  provider_id   UUID REFERENCES users(id),
  service_names TEXT[],
  provider_slug TEXT,
  provider_name TEXT,
  target_type   TEXT,
  booking_date  DATE NOT NULL,
  booking_time  TIME NOT NULL,
  total_kes     INTEGER,
  total_price   DECIMAL(10, 2),
  status        VARCHAR(30) DEFAULT 'pending',
  notes         TEXT,
  local_id      TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Social & Portfolio Tables
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL DEFAULT 'portfolio',
  caption       TEXT NOT NULL DEFAULT '',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  images        TEXT[] NOT NULL DEFAULT '{}',
  location      VARCHAR(200),
  likes         INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0,
  saved_by      TEXT[] NOT NULL DEFAULT '{}',
  bookmarked_by TEXT[] NOT NULL DEFAULT '{}',
  reposted_by   TEXT[] NOT NULL DEFAULT '{}',
  archived      BOOLEAN NOT NULL DEFAULT false,
  deleted       BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS stories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  caption    TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings & Preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  color_scheme          VARCHAR(10) DEFAULT 'system',
  text_size             VARCHAR(10) DEFAULT 'medium',
  reduce_motion         BOOLEAN DEFAULT false,
  high_contrast         BOOLEAN DEFAULT false,
  push_notifications    BOOLEAN DEFAULT true,
  private_account       BOOLEAN DEFAULT false,
  show_activity_status  BOOLEAN DEFAULT true,
  allow_direct_messages BOOLEAN DEFAULT true,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Support Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
