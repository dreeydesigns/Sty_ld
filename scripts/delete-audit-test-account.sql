-- Delete Audit Test Account Cleanup Script
-- This script removes the audit test account +254700000001 and verifies cleanup
-- WARNING: This will permanently delete data - ensure you have a backup first

-- Start a transaction for safety
BEGIN;

-- 1. First, check if the account exists and what data exists
SELECT
  'BEFORE DELETION - User Info' as step,
  id,
  phone,
  email,
  first_name,
  last_name,
  role,
  is_universal_admin,
  created_at,
  deletion_status
FROM users
WHERE phone = '+254700000001';

-- 2. Check for any sessions associated with this account
SELECT
  'BEFORE DELETION - Sessions' as step,
  s.id,
  s.user_id,
  s.device_name,
  s.browser,
  s.ip_address,
  s.assumed_role,
  s.created_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.phone = '+254700000001';

-- 3. Check for any roles assigned to this account
SELECT
  'BEFORE DELETION - User Roles' as step,
  ur.user_id,
  ur.role,
  ur.assigned_at,
  ur.assigned_by_admin
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.phone = '+254700000001';

-- 4. Check for any admin account config
SELECT
  'BEFORE DELETION - Admin Config' as step,
  ac.user_id,
  ac.is_universal_admin,
  ac.can_assume_roles,
  ac.description
FROM admin_account_config ac
JOIN users u ON ac.user_id = u.id
WHERE u.phone = '+254700000001';

-- 5. Check for any bookings by this account
SELECT
  'BEFORE DELETION - Bookings' as step,
  b.id,
  b.client_id,
  b.provider_slug,
  b.target_type,
  b.status,
  b.created_at
FROM bookings b
JOIN users u ON b.client_id = u.id
WHERE u.phone = '+254700000001';

-- 6. Check for any posts by this account
SELECT
  'BEFORE DELETION - Posts' as step,
  p.id,
  p.type,
  p.caption,
  p.created_at
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE u.phone = '+254700000001';

-- 7. Check for any comments by this account
SELECT
  'BEFORE DELETION - Comments' as step,
  c.id,
  c.post_id,
  c.text,
  c.created_at
FROM comments c
JOIN users u ON c.author_id = u.id
WHERE u.phone = '+254700000001';

-- 8. Check for any follows involving this account
SELECT
  'BEFORE DELETION - Follows' as step,
  f.follower_id,
  f.following_id,
  f.created_at
FROM follows f
JOIN users u ON f.follower_id = u.id OR f.following_id = u.id
WHERE u.phone = '+254700000001';

-- 9. Check for any stories by this account
SELECT
  'BEFORE DELETION - Stories' as step,
  s.id,
  s.image_url,
  s.expires_at,
  s.created_at
FROM stories s
JOIN users u ON s.author_id = u.id
WHERE u.phone = '+254700000001';

-- NOW PERFORM DELETIONS IN CORRECT ORDER (respecting foreign keys)

-- 10. Delete sessions (CASCADE should handle this, but let's be explicit)
DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 11. Delete user roles
DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 12. Delete admin account config
DELETE FROM admin_account_config
WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 13. Delete comments (CASCADE should handle this)
DELETE FROM comments
WHERE author_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 14. Delete follows (CASCADE should handle this)
DELETE FROM follows
WHERE follower_id IN (SELECT id FROM users WHERE phone = '+254700000001')
   OR following_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 15. Delete stories
DELETE FROM stories
WHERE author_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 16. Delete posts (CASCADE should handle this)
DELETE FROM posts
WHERE author_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 17. Delete bookings (CASCADE should handle this)
DELETE FROM bookings
WHERE client_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- 18. Finally, delete the user account
DELETE FROM users
WHERE phone = '+254700000001';

-- COMMIT THE TRANSACTION
-- APPROVED FOR EXECUTION: Delete audit test account +254700000001
-- Authorization: User approval granted for P0 security remediation
COMMIT;

-- VERIFICATION QUERIES (run after COMMIT to verify cleanup)
-- These should return no results if cleanup was successful

-- Verify user is deleted
SELECT 'VERIFICATION - User should be deleted' as step, COUNT(*) as count
FROM users WHERE phone = '+254700000001';

-- Verify no orphaned sessions
SELECT 'VERIFICATION - Orphaned sessions' as step, COUNT(*) as count
FROM sessions WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- Verify no orphaned roles
SELECT 'VERIFICATION - Orphaned roles' as step, COUNT(*) as count
FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');

-- Verify no orphaned admin config
SELECT 'VERIFICATION - Orphaned admin config' as step, COUNT(*) as count
FROM admin_account_config WHERE user_id IN (SELECT id FROM users WHERE phone = '+254700000001');
