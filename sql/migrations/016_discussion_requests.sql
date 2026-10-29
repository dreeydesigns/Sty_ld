-- 016_discussion_requests.sql
-- Non-binding request to discuss a Look, a service or a plan with a provider.
--
-- This table records interest and consent. It is not a booking, holds no slot, reserves no
-- time and carries no price commitment. A row may reach discussion_accepted, which means the
-- provider agreed to talk about the request; it never means an appointment exists.
--
-- Additive only. No existing table is altered, no data is backfilled and no row is created
-- here. Apply to the isolated preview or disposable test database only.

CREATE TABLE IF NOT EXISTS discussion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_workspace_id uuid NOT NULL REFERENCES identity_workspaces(id) ON DELETE CASCADE,
  provider_workspace_id uuid NOT NULL REFERENCES identity_workspaces(id) ON DELETE CASCADE,
  look_post_id uuid REFERENCES social_posts(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  note text NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'discussion_accepted', 'declined', 'withdrawn', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  CONSTRAINT discussion_requests_note_length CHECK (char_length(note) BETWEEN 10 AND 600),
  CONSTRAINT discussion_requests_own_workspace CHECK (client_workspace_id <> provider_workspace_id),
  -- A decided row always carries the moment it was decided, and an open row carries none.
  CONSTRAINT discussion_requests_response_recorded CHECK (
    (status = 'requested' AND responded_at IS NULL)
    OR (status <> 'requested' AND responded_at IS NOT NULL)
  ),
  CONSTRAINT discussion_requests_response_order CHECK (responded_at IS NULL OR responded_at >= created_at),
  CONSTRAINT discussion_requests_expiry_order CHECK (expires_at > created_at)
);

-- One open request per client and provider. Decided rows stay as history, so a client can ask
-- again later without the old row being overwritten.
CREATE UNIQUE INDEX IF NOT EXISTS discussion_requests_one_open_per_pair
  ON discussion_requests (client_user_id, provider_workspace_id)
  WHERE status = 'requested';

CREATE INDEX IF NOT EXISTS discussion_requests_provider_queue_idx
  ON discussion_requests (provider_workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS discussion_requests_client_history_idx
  ON discussion_requests (client_user_id, created_at DESC);
