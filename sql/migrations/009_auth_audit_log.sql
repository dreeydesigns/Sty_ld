-- 009_auth_audit_log.sql
-- STYLD digital print: durable authentication audit trail.
--
-- Every successful authentication writes one immutable row describing WHO
-- authenticated, HOW, and from WHAT device surface. This is the platform's
-- "digital print": it supports account-recovery disputes, takeover forensics,
-- and abuse investigation without storing any raw credential or secret.

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             TEXT,
  clerk_user_id       TEXT,
  auth_source         TEXT,          -- 'clerk' | 'legacy'
  auth_method         TEXT NOT NULL, -- 'email_code', 'oauth_google', 'passkey', 'password', 'session'
  device_fingerprint  TEXT,          -- privacy-safe hashed device signature
  ip_address_hash     TEXT,          -- SHA-256 of client IP (never raw)
  user_agent          TEXT,          -- truncated user agent string
  platform            TEXT,
  language            TEXT,
  timezone            TEXT,
  screen              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user_created
  ON auth_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_fingerprint
  ON auth_audit_log (device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_auth_audit_method_created
  ON auth_audit_log (auth_method, created_at DESC);
