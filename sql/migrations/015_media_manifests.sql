-- Server-owned manifest for restricted (not yet public) media, STYLD private beta.
-- Draft only: apply to an isolated test database after a founder-approved backup,
-- never to production. Run with ON_ERROR_STOP=1, or as psql --single-transaction.
--
-- Why this table exists: every moderation decision about an uploaded image has to be
-- provable from server records, and the delivery rules in lib/pending-media-policy.cjs
-- read their facts from here. The checks below are the same bounds the policy enforces,
-- so a row that contradicts the rules cannot be written by any code path.

BEGIN;

SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS media_manifests (
  asset_id text PRIMARY KEY,
  provider_public_id text NOT NULL CHECK (char_length(provider_public_id) BETWEEN 1 AND 200),
  owner_workspace_id uuid NOT NULL REFERENCES identity_workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'published', 'rejected', 'deleted')),
  delivery_type text NOT NULL
    CHECK (delivery_type IN ('authenticated', 'public')),
  provider_restriction_verified boolean NOT NULL DEFAULT false,
  provider_restriction_verified_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  public_derivative_verified boolean NOT NULL DEFAULT false,
  approved_version integer CHECK (approved_version IS NULL OR approved_version >= 1),
  access_granted_at timestamptz,
  access_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_manifests_asset_id_shape
    CHECK (asset_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  -- A five minute ceiling is a database rule, not only an application rule, so a
  -- future writer cannot widen the window the proxy was designed around.
  CONSTRAINT media_manifests_access_window_is_bounded
    CHECK (access_expires_at IS NULL
      OR (access_granted_at IS NOT NULL
        AND access_expires_at > access_granted_at
        AND access_expires_at <= access_granted_at + interval '300 seconds')),
  -- Claiming a restriction needs a timestamped verification record behind it.
  CONSTRAINT media_manifests_restriction_needs_a_record
    CHECK (provider_restriction_verified = false
      OR provider_restriction_verified_at IS NOT NULL),
  -- A published row is only meaningful once the approved derivative exists, and an
  -- approved version has to be a version this asset actually has.
  CONSTRAINT media_manifests_publication_needs_derivative
    CHECK (state <> 'published'
      OR (public_derivative_verified AND approved_version = version)),
  CONSTRAINT media_manifests_approved_version_tracks_state
    CHECK (state = 'published' OR approved_version IS NULL)
);

CREATE INDEX IF NOT EXISTS media_manifests_owner_idx
  ON media_manifests (owner_workspace_id, state);

COMMIT;
