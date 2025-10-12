/*
  # Allow Anonymous Access for Single-User System

  ## Overview
  This migration updates RLS policies to allow anonymous (unauthenticated) users
  to perform all operations. This is appropriate for a single-user deployment
  management system that doesn't require authentication.

  ## Changes
  - Drop existing restrictive policies
  - Add permissive policies for anonymous users on all tables
  - Maintain data integrity through foreign key constraints

  ## Security Note
  This configuration is suitable for:
  - Single-user systems
  - Internal tools
  - Systems behind other authentication layers (VPN, firewall, etc.)
*/

-- Drop existing restrictive policies and create permissive ones

-- Locations policies
DROP POLICY IF EXISTS "Allow authenticated insert on locations" ON locations;
DROP POLICY IF EXISTS "Allow authenticated update on locations" ON locations;

CREATE POLICY "Allow anon insert on locations"
  ON locations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on locations"
  ON locations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on locations"
  ON locations FOR DELETE
  TO anon
  USING (true);

-- Employees policies
DROP POLICY IF EXISTS "Allow authenticated insert on employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated update on employees" ON employees;

CREATE POLICY "Allow anon insert on employees"
  ON employees FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on employees"
  ON employees FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on employees"
  ON employees FOR DELETE
  TO anon
  USING (true);

-- Schedules policies
DROP POLICY IF EXISTS "Allow authenticated insert on schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated update on schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated delete on schedules" ON schedules;

CREATE POLICY "Allow anon insert on schedules"
  ON schedules FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on schedules"
  ON schedules FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on schedules"
  ON schedules FOR DELETE
  TO anon
  USING (true);

-- Shift deployments policies
DROP POLICY IF EXISTS "Allow authenticated insert on shift_deployments" ON shift_deployments;
DROP POLICY IF EXISTS "Allow authenticated delete on shift_deployments" ON shift_deployments;

CREATE POLICY "Allow anon insert on shift_deployments"
  ON shift_deployments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on shift_deployments"
  ON shift_deployments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on shift_deployments"
  ON shift_deployments FOR DELETE
  TO anon
  USING (true);

-- Stations policies
DROP POLICY IF EXISTS "Allow authenticated insert on stations" ON stations;
DROP POLICY IF EXISTS "Allow authenticated update on stations" ON stations;

CREATE POLICY "Allow anon insert on stations"
  ON stations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on stations"
  ON stations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on stations"
  ON stations FOR DELETE
  TO anon
  USING (true);

-- Employee station training policies
DROP POLICY IF EXISTS "Allow authenticated insert on training records" ON employee_station_training;
DROP POLICY IF EXISTS "Allow authenticated update on training records" ON employee_station_training;

CREATE POLICY "Allow anon insert on training records"
  ON employee_station_training FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on training records"
  ON employee_station_training FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on training records"
  ON employee_station_training FOR DELETE
  TO anon
  USING (true);

-- Schedule uploads policies
DROP POLICY IF EXISTS "Allow authenticated insert on schedule_uploads" ON schedule_uploads;
DROP POLICY IF EXISTS "Allow authenticated update on schedule_uploads" ON schedule_uploads;

CREATE POLICY "Allow anon insert on schedule_uploads"
  ON schedule_uploads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on schedule_uploads"
  ON schedule_uploads FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on schedule_uploads"
  ON schedule_uploads FOR DELETE
  TO anon
  USING (true);
