/*
  Create Location Admin for Oswestry

  INSTRUCTIONS:
  1. This user must FIRST sign up through the UI at https://your-app.com/auth
  2. After they sign up, get their user ID from auth.users table
  3. Run this script with their actual user_id

  IMPORTANT: Replace these values before running:
  - 'USER_ID_HERE' with the actual UUID from auth.users
  - 'admin@oswestry.kfc.com' with their actual email
  - 'John Smith' with their actual name
  - '07700900000' with their actual phone
*/

-- First, verify the Oswestry location exists
SELECT id, location_code, location_name
FROM locations
WHERE location_code = '3016';

-- The location ID should be: d9f2a15e-1465-4ab6-bffc-9bdb3d461978

-- Create or update the user profile
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
  'USER_ID_HERE'::uuid,  -- Replace with actual user ID from auth.users
  'admin@oswestry.kfc.com',  -- Replace with actual email
  'John Smith',  -- Replace with actual name
  '07700900000',  -- Replace with actual phone
  'location_admin',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'location_admin',
  status = 'active',
  updated_at = now();

-- Grant access to Oswestry location
INSERT INTO user_location_access (
  id,
  user_id,
  location_id,
  role,
  is_primary,
  created_at
)
VALUES (
  gen_random_uuid(),
  'USER_ID_HERE'::uuid,  -- Replace with actual user ID
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'::uuid,  -- Oswestry location ID
  'location_admin',
  true,
  now()
)
ON CONFLICT ON CONSTRAINT user_location_access_user_id_location_id_key
DO UPDATE SET
  role = 'location_admin',
  is_primary = true;

-- Verify the setup
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role as profile_role,
  ula.role as location_role,
  ula.is_primary,
  l.location_name
FROM user_profiles up
LEFT JOIN user_location_access ula ON ula.user_id = up.id
LEFT JOIN locations l ON l.id = ula.location_id
WHERE up.email = 'admin@oswestry.kfc.com';  -- Replace with actual email
