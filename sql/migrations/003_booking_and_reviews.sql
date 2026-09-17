-- ============================================================================
-- Migration 003: Booking Engine & Authentic Reviews
-- ============================================================================

-- Booking state & payment architecture expansions
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_mode VARCHAR(50) DEFAULT 'salon';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Authentic Verified Reviews Table
-- Rule: Only authenticated clients with a COMPLETED booking can leave a review.
-- Unique constraint on booking_id prevents duplicate/replayed reviews.
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  client_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_slug VARCHAR(200),
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  is_verified   BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_slug ON reviews(provider_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id);
