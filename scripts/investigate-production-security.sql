-- Production Security Investigation Script
-- Run this script against the production database to investigate potential security issues
-- DO NOT run this against development databases

-- 1. Check for users with admin or super_admin roles
SELECT
  u.id,
  u.phone,
  u.email,
  u.first_name,
  u.last_name,
  u.role as base_role,
  ur.role as assigned_role,
  ur.assigned_at,
  ur.assigned_by_admin,
  u.created_at,
  u.deletion_status
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role IN ('admin', 'super_admin') OR u.role IN ('admin', 'super_admin')
ORDER BY u.created_at DESC;

-- 2. Check for recently created accounts (last 7 days)
SELECT
  id,
  phone,
  email,
  first_name,
  last_name,
  role,
  phone_verified,
  email_verified,
  is_universal_admin,
  created_at,
  deletion_status
FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 3. Check for accounts with suspicious patterns
-- - Multiple roles assigned
-- - Universal admin flag set
-- - Recently verified but old creation date
SELECT
  u.id,
  u.phone,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_universal_admin,
  u.phone_verified,
  u.email_verified,
  COUNT(ur.role) as role_count,
  ARRAY_AGG(ur.role) as assigned_roles,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.phone, u.email, u.first_name, u.last_name, u.role, u.is_universal_admin, u.phone_verified, u.email_verified, u.created_at, u.updated_at
HAVING COUNT(ur.role) > 1 OR u.is_universal_admin = true
ORDER BY u.created_at DESC;

-- 4. Check for the specific audit test account mentioned in the security audit
SELECT
  id,
  phone,
  email,
  first_name,
  last_name,
  role,
  is_universal_admin,
  phone_verified,
  email_verified,
  created_at,
  updated_at,
  deletion_status
FROM users
WHERE phone = '+254700000001';

-- 5. Check for any sessions associated with suspicious accounts
SELECT
  s.id,
  s.user_id,
  u.phone,
  u.email,
  u.role,
  s.device_name,
  s.browser,
  s.ip_address,
  s.assumed_role,
  s.is_current,
  s.created_at,
  s.last_active_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.role IN ('admin', 'super_admin') OR u.is_universal_admin = true
ORDER BY s.created_at DESC;

-- 6. Check for failed authentication attempts (if rate limit table exists)
SELECT
  key,
  count,
  window_start,
  last_attempt
FROM auth_rate_limits
WHERE last_attempt > NOW() - INTERVAL '24 hours'
ORDER BY last_attempt DESC;

-- 7. Check for any WhatsApp authentication challenges
SELECT
  phone,
  verification_sid,
  expires_at,
  attempts,
  verified_at,
  consumed_at,
  created_at
FROM whatsapp_auth_challenges
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 8. Verify admin account configuration
SELECT
  u.id,
  u.phone,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_universal_admin,
  ac.is_universal_admin as config_is_universal_admin,
  ac.can_assume_roles,
  ac.description,
  u.created_at
FROM users u
LEFT JOIN admin_account_config ac ON u.id = ac.user_id
WHERE u.role IN ('admin', 'super_admin') OR ac.is_universal_admin = true;

-- 9. Check for any bookings created by suspicious accounts
SELECT
  b.id,
  b.client_id,
  u.phone as client_phone,
  u.email as client_email,
  u.role as client_role,
  b.provider_slug,
  b.target_type,
  b.booking_date,
  b.booking_time,
  b.status,
  b.created_at
FROM bookings b
JOIN users u ON b.client_id = u.id
WHERE u.role IN ('admin', 'super_admin') OR u.is_universal_admin = true
ORDER BY b.created_at DESC;

-- 10. Check for any posts created by suspicious accounts
SELECT
  p.id,
  p.author_id,
  u.phone as author_phone,
  u.email as author_email,
  u.role as author_role,
  p.type,
  p.caption,
  p.created_at
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE u.role IN ('admin', 'super_admin') OR u.is_universal_admin = true
ORDER BY p.created_at DESC;
