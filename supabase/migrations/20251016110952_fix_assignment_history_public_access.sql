/*
  # Fix Assignment History Public Access

  ## Problem
  The assignment_history table has RLS policies for authenticated users only,
  but the application uses public access (consistent with other tables in the system).
  
  ## Solution
  Add public access policies to allow the frontend to read and write assignment history.
  
  ## Changes
  - Add SELECT policy for public role
  - Add INSERT policy for public role
  - Add UPDATE policy for public role
  - Add DELETE policy for public role
*/

-- Drop existing authenticated-only policies
DROP POLICY IF EXISTS "Users can view assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Users can insert assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Users can update assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Users can delete assignment history" ON assignment_history;

-- Create public access policies (consistent with rest of the system)
CREATE POLICY "Public can view assignment history"
  ON assignment_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert assignment history"
  ON assignment_history FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update assignment history"
  ON assignment_history FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete assignment history"
  ON assignment_history FOR DELETE
  TO public
  USING (true);
