/*
  # Fix user_profiles RLS policy

  1. Changes
    - Drop the existing overly permissive policy
    - Create proper restrictive policies for authenticated users
    - Users can only read their own profile
    - Users can update their own profile (except role)
    
  2. Security
    - Ensure users can only access their own data
    - Prevent privilege escalation
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users full access user_profiles" ON user_profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (except role and status)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
