-- ============================================================================
-- Migration 002: Trust, Safety & Verification Architecture
-- ============================================================================

-- Reports table for user/booking/content moderation
CREATE TABLE IF NOT EXISTS user_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  VARCHAR(50) NOT NULL, -- 'user', 'provider', 'booking', 'post', 'comment'
  target_id    VARCHAR(100) NOT NULL,
  reason       VARCHAR(100) NOT NULL,
  notes        TEXT,
  severity     VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status       VARCHAR(20) DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
  resolved_by  UUID REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);

-- User Blocking table
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);

-- Explicit Verification Hierarchy on Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'not_started';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
