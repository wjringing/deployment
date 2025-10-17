/*
  # Fix Super Admin Check Policy
  
  1. Changes
    - Drop the existing restrictive super admin SELECT policy
    - Add a new policy that allows users to check their own super admin status
    - This fixes the chicken-and-egg problem where users couldn't check if they're super admins
  
  2. Security
    - Users can only check their own super admin status (user_id = auth.uid())
    - INSERT/UPDATE/DELETE still require being a super admin
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;

-- Allow users to check their own super admin status
CREATE POLICY "Users can check their own super admin status"
  ON super_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins can view all super admin records
CREATE POLICY "Super admins can view all super admin records"
  ON super_admins
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));