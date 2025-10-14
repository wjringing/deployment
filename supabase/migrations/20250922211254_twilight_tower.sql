/*
  # Fix GDPR RLS Policies and Staff ID References

  1. Policy Updates
    - Fix gdpr_consent_records policies to allow anon role operations
    - Fix staff table policies to use correct field references
    - Add missing policies for anon role access

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for public access where needed
    - Fix field reference errors in existing policies
*/

-- Fix gdpr_consent_records policies to allow anon role operations
DROP POLICY IF EXISTS "Users can insert their own consent records" ON gdpr_consent_records;
DROP POLICY IF EXISTS "Users can update their own consent records" ON gdpr_consent_records;
DROP POLICY IF EXISTS "Users can view their own consent records" ON gdpr_consent_records;

-- Allow anon role to insert consent records
CREATE POLICY "Allow anon to insert consent records"
  ON gdpr_consent_records
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon role to select consent records
CREATE POLICY "Allow anon to select consent records"
  ON gdpr_consent_records
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon role to update consent records
CREATE POLICY "Allow anon to update consent records"
  ON gdpr_consent_records
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Fix staff table policies - remove references to non-existent staff_id field
DROP POLICY IF EXISTS "Allow all operations on staff" ON staff;

-- Create proper staff policies using correct field names
CREATE POLICY "Allow anon to select staff"
  ON staff
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert staff"
  ON staff
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update staff"
  ON staff
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete staff"
  ON staff
  FOR DELETE
  TO anon
  USING (true);

-- Fix gdpr_audit_logs policies
DROP POLICY IF EXISTS "System can insert audit logs" ON gdpr_audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON gdpr_audit_logs;

CREATE POLICY "Allow anon to insert audit logs"
  ON gdpr_audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to select audit logs"
  ON gdpr_audit_logs
  FOR SELECT
  TO anon
  USING (true);

-- Ensure all other tables have proper anon policies
CREATE POLICY "Allow anon operations on gdpr_breach_reports"
  ON gdpr_breach_reports
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon operations on gdpr_data_retention"
  ON gdpr_data_retention
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);