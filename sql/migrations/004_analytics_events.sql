-- ============================================================================
-- Migration 004: Analytics Events & Market Liquidity Tracking
-- ============================================================================

-- First-party sanitized analytics event store
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name   VARCHAR(100) NOT NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(100),
  role         VARCHAR(30),
  market       VARCHAR(30) DEFAULT 'nairobi',
  properties   JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
