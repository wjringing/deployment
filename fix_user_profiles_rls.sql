-- Fix RLS policies for user_profiles to allow authenticated users to read their own profile

-- First, check current policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';

-- Drop any overly restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON public.user_profiles;

-- Create a simple policy that allows users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Also allow users to update their own last_login
DROP POLICY IF EXISTS "Users can update own last_login" ON public.user_profiles;
CREATE POLICY "Users can update own last_login"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the user exists
SELECT id, email, role, status
FROM public.user_profiles
WHERE id = 'b0c66e5c-3535-4feb-91be-a9491cdbf53c';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';
