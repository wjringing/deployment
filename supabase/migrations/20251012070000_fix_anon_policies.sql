/*
  # Fix Anonymous Access Policies

  ## Problem
  The previous migration didn't properly allow anonymous access because:
  1. Policies need to explicitly allow 'anon' role
  2. Some tables may have had conflicting policies

  ## Solution
  - Drop ALL existing policies
  - Create comprehensive policies for anonymous access
  - Ensure all CRUD operations are allowed for 'anon' role
*/

-- Drop ALL existing policies on all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read access to ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated insert on ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated update on ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated delete on ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert on ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow anon update on ' || r.tablename || '" ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete on ' || r.tablename || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- Create simple, permissive policies for all operations on locations
CREATE POLICY "locations_select_policy" ON locations FOR SELECT TO anon USING (true);
CREATE POLICY "locations_insert_policy" ON locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "locations_update_policy" ON locations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "locations_delete_policy" ON locations FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on employees
CREATE POLICY "employees_select_policy" ON employees FOR SELECT TO anon USING (true);
CREATE POLICY "employees_insert_policy" ON employees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "employees_update_policy" ON employees FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete_policy" ON employees FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on schedules
CREATE POLICY "schedules_select_policy" ON schedules FOR SELECT TO anon USING (true);
CREATE POLICY "schedules_insert_policy" ON schedules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "schedules_update_policy" ON schedules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "schedules_delete_policy" ON schedules FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on shift_deployments
CREATE POLICY "shift_deployments_select_policy" ON shift_deployments FOR SELECT TO anon USING (true);
CREATE POLICY "shift_deployments_insert_policy" ON shift_deployments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "shift_deployments_update_policy" ON shift_deployments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "shift_deployments_delete_policy" ON shift_deployments FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on stations
CREATE POLICY "stations_select_policy" ON stations FOR SELECT TO anon USING (true);
CREATE POLICY "stations_insert_policy" ON stations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "stations_update_policy" ON stations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "stations_delete_policy" ON stations FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on employee_station_training
CREATE POLICY "employee_station_training_select_policy" ON employee_station_training FOR SELECT TO anon USING (true);
CREATE POLICY "employee_station_training_insert_policy" ON employee_station_training FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "employee_station_training_update_policy" ON employee_station_training FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "employee_station_training_delete_policy" ON employee_station_training FOR DELETE TO anon USING (true);

-- Create simple, permissive policies for all operations on schedule_uploads
CREATE POLICY "schedule_uploads_select_policy" ON schedule_uploads FOR SELECT TO anon USING (true);
CREATE POLICY "schedule_uploads_insert_policy" ON schedule_uploads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "schedule_uploads_update_policy" ON schedule_uploads FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "schedule_uploads_delete_policy" ON schedule_uploads FOR DELETE TO anon USING (true);
