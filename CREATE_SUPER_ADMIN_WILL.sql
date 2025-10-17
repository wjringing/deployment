-- Create Super Admin User: will@w-j-lander.uk
--
-- INSTRUCTIONS FOR DEV DATABASE (pehqwlaqijupfhvwgnge.supabase.co):
-- ===================================================================
--
-- Step 1: Create the auth user via Supabase Dashboard
-- Go to: https://supabase.com/dashboard/project/pehqwlaqijupfhvwgnge/auth
-- Click: "Add User" > "Create new user"
-- Email: will@w-j-lander.uk
-- Password: Plainbob1260!
-- Enable: "Auto Confirm User" checkbox
-- Click: "Create user"
-- Copy the user ID that appears
--
-- Step 2: Run this SQL in the SQL Editor
-- Go to: https://supabase.com/dashboard/project/pehqwlaqijupfhvwgnge/sql
-- Replace 'USER_ID_FROM_STEP_1' with the actual UUID
-- Run the SQL below:

-- Create user profile as super admin
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  phone,
  role,
  status,
  created_at,
  updated_at
)
VALUES (
  'USER_ID_FROM_STEP_1'::uuid,  -- Replace with actual user ID from Step 1
  'will@w-j-lander.uk',
  'Will Lander',
  '',
  'super_admin',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = now();

-- Verify the user was created correctly
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.status,
  au.email_confirmed_at
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.email = 'will@w-j-lander.uk';

-- You should see:
-- - role: super_admin
-- - status: active
-- - email_confirmed_at: should have a timestamp

-- ===================================================================
-- ALTERNATIVE: Use the sign-up page then promote
-- ===================================================================
-- 1. Go to your app at /auth
-- 2. Sign up with will@w-j-lander.uk / Plainbob1260!
-- 3. Then run this SQL to promote to super admin:

-- UPDATE user_profiles
-- SET role = 'super_admin', status = 'active'
-- WHERE email = 'will@w-j-lander.uk';
