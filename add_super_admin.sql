-- Add Super Admin Access
-- Run this in your Supabase SQL Editor to make a user a super admin

-- Step 1: Check existing super admins
SELECT
  sa.id,
  sa.user_id,
  sa.email,
  sa.created_at,
  u.email as auth_email
FROM super_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id
ORDER BY sa.created_at;

-- Step 2: Check all users in auth
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- Step 3: Add a user as super admin (replace 'your-email@example.com' with your actual email)
-- IMPORTANT: Replace 'your-email@example.com' with your login email

INSERT INTO super_admins (user_id, email)
SELECT
  id,
  email
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify the user was added
SELECT
  sa.id,
  sa.user_id,
  sa.email,
  sa.created_at
FROM super_admins sa
WHERE sa.email = 'your-email@example.com';

-- Alternative: Add super admin by user_id if you know it
-- INSERT INTO super_admins (user_id, email)
-- VALUES (
--   'your-user-id-here',
--   'your-email@example.com'
-- )
-- ON CONFLICT (user_id) DO NOTHING;
