/*
  # Add User Self-Update Policy
  
  1. Changes
    - Add policy allowing users to update their own profile
    - This enables the last_login timestamp to be updated
  
  2. Security
    - Users can only update their own record (id = auth.uid())
    - WITH CHECK ensures they can't change their ID to someone else's
*/

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());