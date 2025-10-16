-- ============================================================================
-- SIMPLE SUPER ADMIN CREATION SCRIPT
-- ============================================================================
-- This script creates a super admin user in your production database
--
-- BEFORE RUNNING THIS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create New User"
-- 3. Enter email: admin@kfc-oswestry.com (or your preferred email)
-- 4. Enter a secure password
-- 5. Click "Create User"
-- 6. Copy the UUID that appears (it looks like: 12345678-1234-1234-1234-123456789abc)
-- 7. Replace 'PASTE_USER_UUID_HERE' below with that UUID
-- 8. Then run this script
-- ============================================================================

-- REPLACE THIS with the UUID from Supabase Dashboard
DO $$
DECLARE
  v_user_id uuid := 'PASTE_USER_UUID_HERE'; -- CHANGE THIS!
  v_email text := 'admin@kfc-oswestry.com'; -- Change this if you used a different email
BEGIN
  -- Create user profile with super_admin role
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_email,
    'System Administrator',
    'super_admin',
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    email = EXCLUDED.email,
    updated_at = now();

  RAISE NOTICE '✅ Super admin user created successfully!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Role: super_admin';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now log in at your application URL with:';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Password: (the password you set in Supabase Dashboard)';
END $$;

-- Verify the user was created
SELECT
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM public.user_profiles
WHERE role = 'super_admin';
