/*
  # Fix Auto Assignment Rules Public Access

  ## Problem
  The auto_assignment_rules table has RLS policies for authenticated users only,
  but the application uses public access (consistent with other tables in the system).
  
  ## Solution
  Add public access policies to allow the frontend to read and write rules.
  
  ## Changes
  - Add SELECT policy for public role
  - Add INSERT policy for public role
  - Add UPDATE policy for public role
  - Add DELETE policy for public role
*/

-- Drop existing authenticated-only policies if they exist
DROP POLICY IF EXISTS "Users can view auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Users can insert auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Users can update auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Users can delete auto assignment rules" ON auto_assignment_rules;

-- Create public access policies (consistent with rest of the system)
CREATE POLICY "Public can view auto assignment rules"
  ON auto_assignment_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert auto assignment rules"
  ON auto_assignment_rules FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update auto assignment rules"
  ON auto_assignment_rules FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete auto assignment rules"
  ON auto_assignment_rules FOR DELETE
  TO public
  USING (true);
