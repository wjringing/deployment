/*
  # Multi-Location Foundation - Phase 1: Core Schema
  
  ## Overview
  Transforms the single-location KFC Oswestry system into a multi-tenant architecture
  supporting 45+ independent store locations with complete data isolation.
  
  ## Changes Made
  
  ### 1. New Tables Created
  
  #### locations
  - `id` (uuid, primary key) - Unique location identifier
  - `location_code` (text, unique) - Store code (e.g., "3016" for Oswestry)
  - `location_name` (text) - Full location name
  - `address` (text) - Physical address
  - `city` (text) - City name
  - `postcode` (text) - Postal code
  - `region` (text) - Regional grouping (North, South, East, West, Central)
  - `area` (text) - Area grouping within region
  - `timezone` (text) - Timezone identifier
  - `status` (text) - active, inactive, onboarding
  - `settings` (jsonb) - Store-specific configuration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  #### user_profiles
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text) - User's full name
  - `email` (text) - Email address
  - `phone` (text) - Contact phone
  - `employee_id` (text) - Company employee identifier
  - `role` (text) - super_admin, location_admin, location_operator, regional_manager, area_manager
  - `status` (text) - active, inactive, suspended
  - `last_login` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  #### user_location_access
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `location_id` (uuid, references locations)
  - `role` (text) - Role specific to this location
  - `permissions` (jsonb) - Granular permission settings
  - `is_primary` (boolean) - Primary location for this user
  - `granted_at` (timestamptz)
  - `granted_by` (uuid) - User who granted access
  
  #### regions
  - `id` (uuid, primary key)
  - `name` (text) - Region name
  - `manager_user_id` (uuid) - Regional manager
  - `location_ids` (uuid[]) - Array of location IDs
  - `created_at` (timestamptz)
  
  #### areas
  - `id` (uuid, primary key)
  - `name` (text) - Area name
  - `manager_user_id` (uuid) - Area manager
  - `region_ids` (uuid[]) - Array of region IDs
  - `created_at` (timestamptz)
  
  #### audit_logs
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who performed action
  - `location_id` (uuid) - Affected location
  - `action` (text) - Action type
  - `table_name` (text) - Affected table
  - `record_id` (uuid) - Affected record
  - `old_data` (jsonb) - Data before change
  - `new_data` (jsonb) - Data after change
  - `ip_address` (text) - User's IP address
  - `created_at` (timestamptz)
  
  ### 2. Existing Tables Modified
  - Added `location_id` column to all core tables
  - Created composite indexes for optimal query performance
  - Maintained all existing data and relationships
  
  ### 3. Data Migration
  - Created "KFC Oswestry - Maebury Road" location (code: 3016)
  - Associated all existing data with Oswestry location
  
  ### 4. Security
  - RLS enabled on all new tables
  - Temporary authenticated-only policies (will be replaced with location-scoped policies in Phase 2)
  
  ## Notes
  - All existing functionality preserved
  - No data loss - Oswestry data migrated to new structure
  - Phase 2 will implement strict RLS policies for data isolation
*/

-- ============================================================================
-- STEP 1: Create New Core Tables
-- ============================================================================

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text UNIQUE NOT NULL,
  location_name text NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  postcode text DEFAULT '',
  region text DEFAULT '',
  area text DEFAULT '',
  timezone text DEFAULT 'Europe/London',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profiles extending auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  employee_id text DEFAULT '',
  role text NOT NULL CHECK (role IN ('super_admin', 'location_admin', 'location_operator', 'regional_manager', 'area_manager')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User location access mapping
CREATE TABLE IF NOT EXISTS user_location_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('location_admin', 'location_operator', 'regional_manager', 'area_manager')),
  permissions jsonb DEFAULT '{}'::jsonb,
  is_primary boolean DEFAULT false,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES user_profiles(id),
  UNIQUE(user_id, location_id)
);

-- Regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manager_user_id uuid REFERENCES user_profiles(id),
  location_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now()
);

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manager_user_id uuid REFERENCES user_profiles(id),
  region_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  location_id uuid REFERENCES locations(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb DEFAULT '{}'::jsonb,
  new_data jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 2: Add location_id to Existing Tables
-- ============================================================================

-- Add location_id to staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to positions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'positions' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE positions ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to deployments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deployments' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE deployments ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to shift_info table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_info' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE shift_info ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to sales_data table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_data' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE sales_data ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to shift_schedules table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_schedules' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE shift_schedules ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to staff_training_stations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_training_stations' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff_training_stations ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to staff_rankings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_rankings' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff_rankings ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to staff_sign_offs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_sign_offs' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff_sign_offs ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to station_position_mappings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'station_position_mappings' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE station_position_mappings ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to checklists table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklists') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'checklists' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE checklists ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add location_id to handover_notes table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'handover_notes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'handover_notes' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE handover_notes ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add location_id to break_schedules table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'break_schedules') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'break_schedules' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE break_schedules ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add location_id to performance_kpis table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_kpis') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'performance_kpis' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE performance_kpis ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create Oswestry Location and Migrate Data
-- ============================================================================

-- Insert KFC Oswestry location
INSERT INTO locations (
  id,
  location_code,
  location_name,
  address,
  city,
  postcode,
  region,
  area,
  status,
  settings
) VALUES (
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978',
  '3016',
  'KFC Oswestry - Maebury Road',
  'Maebury Road',
  'Oswestry',
  'SY10 8HA',
  'West Midlands',
  'Shropshire',
  'active',
  '{
    "operating_hours": {
      "monday": {"open": "10:00", "close": "23:00"},
      "tuesday": {"open": "10:00", "close": "23:00"},
      "wednesday": {"open": "10:00", "close": "23:00"},
      "thursday": {"open": "10:00", "close": "23:00"},
      "friday": {"open": "10:00", "close": "23:00"},
      "saturday": {"open": "10:00", "close": "23:00"},
      "sunday": {"open": "10:00", "close": "22:00"}
    },
    "target_labor_percentage": 18.5,
    "max_staff_per_shift": 25
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Update all existing data with Oswestry location_id
UPDATE staff SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE positions SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE deployments SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE shift_info SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE sales_data SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE shift_schedules SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE staff_training_stations SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE staff_rankings SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE staff_sign_offs SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;
UPDATE station_position_mappings SET location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978' WHERE location_id IS NULL;

-- Update optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklists') THEN
    EXECUTE 'UPDATE checklists SET location_id = ''d9f2a15e-1465-4ab6-bffc-9bdb3d461978'' WHERE location_id IS NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'handover_notes') THEN
    EXECUTE 'UPDATE handover_notes SET location_id = ''d9f2a15e-1465-4ab6-bffc-9bdb3d461978'' WHERE location_id IS NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'break_schedules') THEN
    EXECUTE 'UPDATE break_schedules SET location_id = ''d9f2a15e-1465-4ab6-bffc-9bdb3d461978'' WHERE location_id IS NULL';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_kpis') THEN
    EXECUTE 'UPDATE performance_kpis SET location_id = ''d9f2a15e-1465-4ab6-bffc-9bdb3d461978'' WHERE location_id IS NULL';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_location ON staff(location_id);
CREATE INDEX IF NOT EXISTS idx_positions_location ON positions(location_id);
CREATE INDEX IF NOT EXISTS idx_deployments_location ON deployments(location_id);
CREATE INDEX IF NOT EXISTS idx_deployments_location_date ON deployments(location_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_info_location ON shift_info(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_location ON sales_data(location_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_location ON shift_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_location ON staff_training_stations(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_rankings_location ON staff_rankings(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_sign_offs_location ON staff_sign_offs(location_id);
CREATE INDEX IF NOT EXISTS idx_station_mappings_location ON station_position_mappings(location_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_location ON user_location_access(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_location ON audit_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ============================================================================
-- STEP 5: Enable RLS on New Tables
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create Temporary Authenticated Policies
-- ============================================================================

-- Locations policies (temporary - will be replaced with location-scoped policies)
CREATE POLICY "Authenticated users can view locations" 
  ON locations FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can manage locations" 
  ON locations FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- User profiles policies
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- User location access policies
CREATE POLICY "Users can view their location access" 
  ON user_location_access FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Regions policies
CREATE POLICY "Authenticated users can view regions" 
  ON regions FOR SELECT 
  TO authenticated 
  USING (true);

-- Areas policies
CREATE POLICY "Authenticated users can view areas" 
  ON areas FOR SELECT 
  TO authenticated 
  USING (true);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" 
  ON audit_logs FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());
