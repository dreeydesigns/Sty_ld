-- Additive canonical social post storage for STYLD.
-- Review and apply only after founder-approved database backup and cutover.
-- This migration does not import or publish existing browser-local posts.

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_workspace_id uuid NOT NULL REFERENCES identity_workspaces(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 120),
  author_slug text CHECK (author_slug IS NULL OR char_length(author_slug) <= 80),
  author_role text NOT NULL CHECK (author_role IN ('client', 'professional', 'salon')),
  post_type text NOT NULL CHECK (post_type IN ('before_after', 'inspo', 'tip', 'portfolio', 'promotion')),
  caption text NOT NULL CHECK (char_length(caption) BETWEEN 1 AND 2000),
  tags text[] NOT NULL DEFAULT '{}',
  media_urls text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publication_status text NOT NULL DEFAULT 'pending' CHECK (publication_status IN ('pending', 'published', 'rejected')),
  moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT social_posts_tags_limit CHECK (cardinality(tags) <= 10),
  CONSTRAINT social_posts_media_limit CHECK (cardinality(media_urls) <= 4)
);

CREATE INDEX IF NOT EXISTS social_posts_public_created_idx
  ON social_posts (created_at DESC)
  WHERE deleted_at IS NULL
    AND visibility = 'public'
    AND publication_status = 'published'
    AND moderation_status = 'visible';

CREATE INDEX IF NOT EXISTS social_posts_author_workspace_idx
  ON social_posts (author_workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS social_posts_author_user_idx
  ON social_posts (author_user_id, created_at DESC);
