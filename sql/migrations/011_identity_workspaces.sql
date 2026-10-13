-- Additive; review and apply only after founder-approved production backup/cutover.
CREATE TABLE IF NOT EXISTS identity_workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK(role IN ('client','professional','salon','shop','delivery')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 profile jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,role)
);
ALTER TABLE auth_session_context ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES identity_workspaces(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_workspace_id uuid REFERENCES identity_workspaces(id);
INSERT INTO identity_workspaces(user_id,role,profile)
SELECT u.id,r.role,jsonb_strip_nulls(jsonb_build_object(
 'firstName',u.first_name,'lastName',u.last_name,'phone',u.phone,
 'displayName',CASE WHEN r.role='professional' THEN u.display_name END,
 'salonName',CASE WHEN r.role='salon' THEN u.salon_name END,
 'bio',u.bio,'location',u.location,'profilePhoto',u.profile_image_url,'coverPhoto',u.cover_image_url,'theme',u.theme))
FROM users u JOIN (SELECT user_id,role FROM user_roles UNION SELECT id,role FROM users UNION SELECT id,'client' FROM users) r ON r.user_id=u.id
WHERE r.role IN ('client','professional','salon','shop','delivery')
ON CONFLICT(user_id,role) DO NOTHING;
-- Existing ownership remains unchanged. Ambiguous legacy services are left unassigned.
ALTER TABLE services ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES identity_workspaces(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_workspace_id uuid REFERENCES identity_workspaces(id);
UPDATE services s SET workspace_id=w.id FROM identity_workspaces w
WHERE s.workspace_id IS NULL AND s.provider_id=w.user_id AND w.role IN ('professional','salon')
AND (SELECT count(*) FROM identity_workspaces p WHERE p.user_id=w.user_id AND p.role IN ('professional','salon'))=1;
UPDATE bookings b SET provider_workspace_id=w.id FROM identity_workspaces w
WHERE b.provider_workspace_id IS NULL AND b.provider_id=w.user_id AND w.role IN ('professional','salon')
AND (SELECT count(*) FROM identity_workspaces p WHERE p.user_id=w.user_id AND p.role IN ('professional','salon'))=1;
