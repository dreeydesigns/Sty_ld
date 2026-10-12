-- Additive migration. Existing user IDs, bookings and Clerk IDs remain intact.
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS security_events (
  id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event text NOT NULL, ip_hash text, user_agent text, details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_user_time ON security_events(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_browsers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  browser_hash text NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,browser_hash)
);
CREATE TABLE IF NOT EXISTS workspace_applications (
  user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL CHECK (role IN ('professional','salon')),
  name text NOT NULL, description text NOT NULL, contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,role)
);
CREATE TABLE IF NOT EXISTS salon_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL UNIQUE REFERENCES users(id), name text NOT NULL
);
CREATE TABLE IF NOT EXISTS salon_memberships (
  salon_id uuid NOT NULL REFERENCES salon_workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
  permission text NOT NULL CHECK (permission IN ('owner','manager','staff')), PRIMARY KEY(salon_id,user_id)
);
CREATE TABLE IF NOT EXISTS auth_session_context (
  session_id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), active_role text NOT NULL DEFAULT 'client',
  mfa_verified_at timestamptz, last_totp_step bigint
);
CREATE TABLE IF NOT EXISTS auth_totp (
  user_id uuid PRIMARY KEY REFERENCES users(id), encrypted_secret text NOT NULL, enabled boolean NOT NULL DEFAULT false,
  last_step bigint NOT NULL DEFAULT -1
);
CREATE TABLE IF NOT EXISTS auth_recovery_codes (
  user_id uuid NOT NULL REFERENCES users(id), code_hash text NOT NULL, PRIMARY KEY(user_id,code_hash)
);
INSERT INTO user_roles (user_id,role) SELECT id,'client' FROM users ON CONFLICT(user_id,role) DO NOTHING;
