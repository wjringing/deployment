/*
  # Fix RLS Policies for Anonymous Role
  
  The issue is that policies were created for 'authenticated' and 'public' roles,
  but the app uses the 'anon' role. We need to create policies specifically for 'anon'.
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated insert on employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated update on employees" ON employees;

-- Create policies for anon role
CREATE POLICY "employees_anon_insert" ON employees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "employees_anon_update" ON employees FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "employees_anon_delete" ON employees FOR DELETE TO anon USING (true);

-- Fix other tables too
DROP POLICY IF EXISTS "Allow authenticated insert on locations" ON locations;
DROP POLICY IF EXISTS "Allow authenticated update on locations" ON locations;

CREATE POLICY "locations_anon_insert" ON locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "locations_anon_update" ON locations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "locations_anon_delete" ON locations FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated update on schedules" ON schedules;
DROP POLICY IF EXISTS "Allow authenticated delete on schedules" ON schedules;

CREATE POLICY "schedules_anon_insert" ON schedules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "schedules_anon_update" ON schedules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "schedules_anon_delete" ON schedules FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on shift_deployments" ON shift_deployments;
DROP POLICY IF EXISTS "Allow authenticated delete on shift_deployments" ON shift_deployments;

CREATE POLICY "shift_deployments_anon_insert" ON shift_deployments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "shift_deployments_anon_update" ON shift_deployments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "shift_deployments_anon_delete" ON shift_deployments FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on stations" ON stations;
DROP POLICY IF EXISTS "Allow authenticated update on stations" ON stations;

CREATE POLICY "stations_anon_insert" ON stations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "stations_anon_update" ON stations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "stations_anon_delete" ON stations FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on training records" ON employee_station_training;
DROP POLICY IF EXISTS "Allow authenticated update on training records" ON employee_station_training;

CREATE POLICY "training_anon_insert" ON employee_station_training FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "training_anon_update" ON employee_station_training FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "training_anon_delete" ON employee_station_training FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on schedule_uploads" ON schedule_uploads;
DROP POLICY IF EXISTS "Allow authenticated update on schedule_uploads" ON schedule_uploads;

CREATE POLICY "uploads_anon_insert" ON schedule_uploads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "uploads_anon_update" ON schedule_uploads FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "uploads_anon_delete" ON schedule_uploads FOR DELETE TO anon USING (true);
