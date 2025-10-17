/*
  # Seed Oswestry Location and Migrate Existing Data
  
  ## Overview
  Creates the initial KFC Oswestry location and migrates all existing data
  to the new multi-tenant structure by assigning location_id references.
  
  ## Changes
  1. Create default KFC Oswestry location
  2. Update all existing data tables with Oswestry location_id
  3. Create default store settings for Oswestry
  
  ## Data Migration
  - Staff records → location_id = Oswestry
  - Deployment records → location_id = Oswestry
  - Position records → location_id = Oswestry
  - Shift info records → location_id = Oswestry
  - Sales data records → location_id = Oswestry
  - Schedule records → location_id = Oswestry
  - Training records → location_id = Oswestry (through staff)
  - Break schedules → location_id = Oswestry
  
  ## Notes
  - This migration is idempotent and safe to run multiple times
  - Only updates records that don't already have a location_id
*/

-- ============================================================================
-- CREATE OSWESTRY LOCATION
-- ============================================================================

-- Insert or update Oswestry location
INSERT INTO locations (
  location_code,
  location_name,
  brand,
  address,
  city,
  postcode,
  region,
  timezone,
  operating_status
) VALUES (
  'KFC001',
  'KFC Oswestry',
  'KFC',
  'Oswestry High Street',
  'Oswestry',
  'SY11 1XX',
  'West Midlands',
  'Europe/London',
  'active'
)
ON CONFLICT (location_code) 
DO UPDATE SET
  location_name = EXCLUDED.location_name,
  updated_at = now();

-- ============================================================================
-- MIGRATE EXISTING DATA TO OSWESTRY LOCATION
-- ============================================================================

-- Get the Oswestry location ID for use in updates
DO $$
DECLARE
  oswestry_location_id uuid;
BEGIN
  -- Get Oswestry location ID
  SELECT id INTO oswestry_location_id
  FROM locations
  WHERE location_code = 'KFC001';

  -- Update staff table
  UPDATE staff
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update deployments table
  UPDATE deployments
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update positions table
  UPDATE positions
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update shift_info table
  UPDATE shift_info
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update sales_data table
  UPDATE sales_data
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update shift_schedules table
  UPDATE shift_schedules
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update break_schedules table
  UPDATE break_schedules
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  -- Update staff_current_locations table
  UPDATE staff_current_locations
  SET location_id = oswestry_location_id
  WHERE location_id IS NULL;

  RAISE NOTICE 'Successfully migrated all existing data to Oswestry location';
END $$;

-- ============================================================================
-- CREATE DEFAULT STORE SETTINGS FOR OSWESTRY
-- ============================================================================

INSERT INTO store_settings (
  location_id,
  operating_hours,
  break_policies,
  performance_targets,
  feature_flags
)
SELECT 
  id,
  '{"monday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "10:00", "close": "22:00"}, "wednesday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "10:00", "close": "22:00"}, "friday": {"open": "10:00", "close": "23:00"}, "saturday": {"open": "10:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "22:00"}}'::jsonb,
  '{"rest_break_minutes": 15, "meal_break_minutes": 30, "min_hours_for_break": 4, "min_hours_for_meal": 6}'::jsonb,
  '{"labor_percent_target": 12.5, "daily_sales_target": 5000, "customer_satisfaction_target": 90}'::jsonb,
  '{"training_tracking": true, "break_scheduler": true, "performance_scorecard": true, "staff_location_board": true}'::jsonb
FROM locations
WHERE location_code = 'KFC001'
ON CONFLICT (location_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Output migration summary
DO $$
DECLARE
  oswestry_location_id uuid;
  staff_count integer;
  deployment_count integer;
  position_count integer;
BEGIN
  SELECT id INTO oswestry_location_id FROM locations WHERE location_code = 'KFC001';
  
  SELECT COUNT(*) INTO staff_count FROM staff WHERE location_id = oswestry_location_id;
  SELECT COUNT(*) INTO deployment_count FROM deployments WHERE location_id = oswestry_location_id;
  SELECT COUNT(*) INTO position_count FROM positions WHERE location_id = oswestry_location_id;
  
  RAISE NOTICE '=== Oswestry Location Migration Summary ===';
  RAISE NOTICE 'Location ID: %', oswestry_location_id;
  RAISE NOTICE 'Staff migrated: %', staff_count;
  RAISE NOTICE 'Deployments migrated: %', deployment_count;
  RAISE NOTICE 'Positions migrated: %', position_count;
  RAISE NOTICE '==========================================';
END $$;
