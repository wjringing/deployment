/*
  # Multi-Tenant Super Admin Portal and Permission System
  
  ## Overview
  Complete transformation to multi-location architecture with Super Admin portal,
  three-tier permission system, and complete data isolation.
  
  ## New Tables Created
  
  ### 1. LOCATIONS - Store/Location Management
  - `id` (uuid, primary key) - Location identifier
  - `location_code` (text, unique) - Store code (e.g., "KFC001")
  - `location_name` (text) - Store name (e.g., "KFC Oswestry")
  - `brand` (text) - Brand name
  - `address` (text) - Street address
  - `city` (text) - City
  - `postcode` (text) - Postal code
  - `region` (text) - Geographic region
  - `timezone` (text) - Timezone identifier
  - `operating_status` (text) - active, inactive, onboarding, maintenance
  - `manager_user_id` (uuid, FK) - Location manager
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. USERS - Extended user profiles
  - `id` (uuid, primary key, FK to auth.users) - User identifier
  - `email` (text) - Email address
  - `full_name` (text) - Full name
  - `phone` (text) - Phone number
  - `employee_id` (text) - Employee ID
  - `status` (text) - active, inactive, suspended
  - `created_by_admin_id` (uuid, FK) - Super admin who created user
  - `created_at` (timestamptz) - Creation timestamp
  - `last_login` (timestamptz) - Last login timestamp
  
  ### 3. SUPER_ADMINS - Super administrator accounts
  - `id` (uuid, primary key) - Super admin identifier
  - `user_id` (uuid, FK to auth.users) - Auth user reference
  - `full_name` (text) - Full name
  - `email` (text) - Email address
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 4. USER_ROLES - Role definitions and hierarchy
  - `id` (uuid, primary key) - Role identifier
  - `role_name` (text) - super_admin, location_admin, location_user
  - `role_description` (text) - Role description
  - `role_level` (integer) - Hierarchy level (1=highest)
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 5. USER_LOCATIONS - User-Location mappings with roles
  - `id` (uuid, primary key) - Mapping identifier
  - `user_id` (uuid, FK) - User reference
  - `location_id` (uuid, FK) - Location reference
  - `role_name` (text) - Role at this location
  - `assigned_at` (timestamptz) - Assignment timestamp
  - `assigned_by` (uuid, FK) - Super admin who assigned
  - UNIQUE constraint on (user_id, location_id)
  
  ### 6. PERMISSIONS - Granular feature permissions
  - `id` (uuid, primary key) - Permission identifier
  - `permission_key` (text, unique) - Permission identifier key
  - `permission_name` (text) - Display name
  - `permission_category` (text) - Category grouping
  - `description` (text) - Permission description
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 7. ROLE_PERMISSIONS - Role-Permission mappings
  - `id` (uuid, primary key) - Mapping identifier
  - `role_name` (text, FK) - Role name
  - `permission_key` (text, FK) - Permission key
  - `granted` (boolean) - Permission granted/denied
  - `created_at` (timestamptz) - Creation timestamp
  - UNIQUE constraint on (role_name, permission_key)
  
  ### 8. LOCATION_USER_PERMISSIONS - Per-user permission overrides
  - `id` (uuid, primary key) - Override identifier
  - `user_id` (uuid, FK) - User reference
  - `location_id` (uuid, FK) - Location reference
  - `permission_key` (text, FK) - Permission key
  - `granted` (boolean) - Permission granted/denied
  - `granted_by` (uuid, FK) - Super admin who granted
  - `granted_at` (timestamptz) - Grant timestamp
  - UNIQUE constraint on (user_id, location_id, permission_key)
  
  ### 9. STORE_SETTINGS - Per-location configuration
  - `id` (uuid, primary key) - Setting identifier
  - `location_id` (uuid, FK, unique) - Location reference
  - `operating_hours` (jsonb) - Operating schedule
  - `break_policies` (jsonb) - Break rules
  - `performance_targets` (jsonb) - KPI targets
  - `feature_flags` (jsonb) - Enabled features
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 10. REGIONS - Regional groupings
  - `id` (uuid, primary key) - Region identifier
  - `region_name` (text, unique) - Region name
  - `region_code` (text, unique) - Region code
  - `manager_user_id` (uuid, FK) - Regional manager
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 11. AREAS - Area groupings of regions
  - `id` (uuid, primary key) - Area identifier
  - `area_name` (text, unique) - Area name
  - `area_code` (text, unique) - Area code
  - `manager_user_id` (uuid, FK) - Area manager
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 12. AUDIT_LOGS - Comprehensive audit trail
  - `id` (uuid, primary key) - Log identifier
  - `user_id` (uuid, FK) - User who performed action
  - `action_type` (text) - Action category
  - `action_details` (jsonb) - Detailed action data
  - `affected_table` (text) - Table affected
  - `affected_record_id` (uuid) - Record affected
  - `ip_address` (text) - User IP address
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz) - Action timestamp
  
  ## Modifications to Existing Tables
  All core data tables will receive `location_id` column for multi-tenancy
  
  ## Security
  - Row Level Security enabled on all tables
  - Location-scoped RLS policies with super admin bypass
  - Role-based access control through RLS
  - Authenticated-only access (no public access)
  
  ## Performance
  - Indexes on location_id for all data tables
  - Composite indexes on (location_id, date) for time-series tables
  - Indexes on foreign keys for user_locations and permissions
*/

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text UNIQUE NOT NULL,
  location_name text NOT NULL,
  brand text DEFAULT 'KFC',
  address text DEFAULT '',
  city text DEFAULT '',
  postcode text DEFAULT '',
  region text DEFAULT '',
  timezone text DEFAULT 'Europe/London',
  operating_status text NOT NULL DEFAULT 'active' CHECK (operating_status IN ('active', 'inactive', 'onboarding', 'maintenance', 'archived')),
  manager_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text DEFAULT '',
  employee_id text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by_admin_id uuid,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Super admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL CHECK (role_name IN ('super_admin', 'location_admin', 'location_user', 'regional_manager', 'area_manager')),
  role_description text DEFAULT '',
  role_level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User-Location mappings
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES user_roles(role_name) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, location_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text UNIQUE NOT NULL,
  permission_name text NOT NULL,
  permission_category text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Role-Permission mappings
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES user_roles(role_name) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  granted boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_name, permission_key)
);

-- Location-specific user permission overrides
CREATE TABLE IF NOT EXISTS location_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  granted boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id, permission_key)
);

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid UNIQUE NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  break_policies jsonb DEFAULT '{}'::jsonb,
  performance_targets jsonb DEFAULT '{}'::jsonb,
  feature_flags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name text UNIQUE NOT NULL,
  region_code text UNIQUE NOT NULL,
  manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name text UNIQUE NOT NULL,
  area_code text UNIQUE NOT NULL,
  manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  affected_table text DEFAULT '',
  affected_record_id uuid,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ADD LOCATION_ID TO EXISTING TABLES
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

-- Add location_id to break_schedules table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'break_schedules' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE break_schedules ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add location_id to staff_current_locations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_current_locations' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff_current_locations ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- SEED DEFAULT ROLES AND PERMISSIONS
-- ============================================================================

-- Insert default roles
INSERT INTO user_roles (role_name, role_description, role_level) VALUES
  ('super_admin', 'System administrator with full access to all locations and settings', 1),
  ('location_admin', 'Location manager with full access to assigned location', 2),
  ('location_user', 'Location staff with read-only access to assigned location', 3),
  ('regional_manager', 'Regional manager with read-only access to multiple locations', 2),
  ('area_manager', 'Area manager with oversight of multiple regions', 1)
ON CONFLICT (role_name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (permission_key, permission_name, permission_category, description) VALUES
  -- User Management
  ('users.create', 'Create Users', 'User Management', 'Create new user accounts'),
  ('users.edit', 'Edit Users', 'User Management', 'Edit existing user details'),
  ('users.delete', 'Delete Users', 'User Management', 'Delete user accounts'),
  ('users.view', 'View Users', 'User Management', 'View user list and details'),
  
  -- Location Management
  ('locations.create', 'Create Locations', 'Location Management', 'Create new locations'),
  ('locations.edit', 'Edit Locations', 'Location Management', 'Edit location details'),
  ('locations.delete', 'Delete Locations', 'Location Management', 'Delete locations'),
  ('locations.view', 'View Locations', 'Location Management', 'View location list'),
  
  -- Staff Management
  ('staff.create', 'Create Staff', 'Staff Management', 'Add new staff members'),
  ('staff.edit', 'Edit Staff', 'Staff Management', 'Edit staff details'),
  ('staff.delete', 'Delete Staff', 'Staff Management', 'Delete staff members'),
  ('staff.view', 'View Staff', 'Staff Management', 'View staff list'),
  
  -- Deployment Management
  ('deployments.create', 'Create Deployments', 'Deployment Management', 'Create new deployments'),
  ('deployments.edit', 'Edit Deployments', 'Deployment Management', 'Edit deployments'),
  ('deployments.delete', 'Delete Deployments', 'Deployment Management', 'Delete deployments'),
  ('deployments.view', 'View Deployments', 'Deployment Management', 'View deployments'),
  
  -- Schedule Management
  ('schedules.upload', 'Upload Schedules', 'Schedule Management', 'Upload schedule files'),
  ('schedules.edit', 'Edit Schedules', 'Schedule Management', 'Edit schedules'),
  ('schedules.delete', 'Delete Schedules', 'Schedule Management', 'Delete schedules'),
  ('schedules.view', 'View Schedules', 'Schedule Management', 'View schedules'),
  
  -- Sales Data
  ('sales.create', 'Create Sales Data', 'Sales Management', 'Enter sales data'),
  ('sales.edit', 'Edit Sales Data', 'Sales Management', 'Edit sales data'),
  ('sales.delete', 'Delete Sales Data', 'Sales Management', 'Delete sales data'),
  ('sales.view', 'View Sales Data', 'Sales Management', 'View sales data'),
  
  -- Reports
  ('reports.view', 'View Reports', 'Reporting', 'View reports and analytics'),
  ('reports.export', 'Export Reports', 'Reporting', 'Export data to Excel/PDF'),
  
  -- Settings
  ('settings.view', 'View Settings', 'Settings', 'View location settings'),
  ('settings.edit', 'Edit Settings', 'Settings', 'Edit location settings'),
  
  -- Training
  ('training.create', 'Create Training', 'Training Management', 'Create training records'),
  ('training.edit', 'Edit Training', 'Training Management', 'Edit training records'),
  ('training.view', 'View Training', 'Training Management', 'View training records'),
  
  -- Performance
  ('performance.view', 'View Performance', 'Performance Management', 'View performance data'),
  ('performance.edit', 'Edit Performance', 'Performance Management', 'Edit performance data'),
  
  -- System
  ('system.audit_logs', 'View Audit Logs', 'System', 'View system audit logs'),
  ('system.permissions', 'Manage Permissions', 'System', 'Manage user permissions')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant all permissions to super_admin
INSERT INTO role_permissions (role_name, permission_key, granted)
SELECT 'super_admin', permission_key, true
FROM permissions
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Grant location_admin permissions (all except system-level)
INSERT INTO role_permissions (role_name, permission_key, granted)
SELECT 'location_admin', permission_key, true
FROM permissions
WHERE permission_category != 'System' 
  AND permission_category != 'User Management' 
  AND permission_category != 'Location Management'
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Grant specific view permissions to location_admin
INSERT INTO role_permissions (role_name, permission_key, granted) VALUES
  ('location_admin', 'users.view', true),
  ('location_admin', 'locations.view', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Grant location_user permissions (read-only)
INSERT INTO role_permissions (role_name, permission_key, granted) VALUES
  ('location_user', 'staff.view', true),
  ('location_user', 'deployments.view', true),
  ('location_user', 'schedules.view', true),
  ('location_user', 'training.view', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(operating_status);
CREATE INDEX IF NOT EXISTS idx_locations_region ON locations(region);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User-Location indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_role ON user_locations(role_name);

-- Permission indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_location_user_permissions_user ON location_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_location_user_permissions_location ON location_user_permissions(location_id);

-- Multi-tenant data table indexes
CREATE INDEX IF NOT EXISTS idx_staff_location_id ON staff(location_id);
CREATE INDEX IF NOT EXISTS idx_deployments_location_id ON deployments(location_id);
CREATE INDEX IF NOT EXISTS idx_positions_location_id ON positions(location_id);
CREATE INDEX IF NOT EXISTS idx_shift_info_location_id ON shift_info(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_location_id ON sales_data(location_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_location_id ON shift_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_break_schedules_location_id ON break_schedules(location_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deployments_location_date ON deployments(location_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_location_date ON shift_schedules(location_id, week_start_date);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = user_uuid
  );
$$;

-- Helper function to get user's accessible location IDs
CREATE OR REPLACE FUNCTION get_user_location_ids(user_uuid uuid)
RETURNS TABLE(location_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ul.location_id
  FROM user_locations ul
  WHERE ul.user_id = user_uuid;
$$;

-- Locations RLS Policies
CREATE POLICY "Super admins can manage all locations"
  ON locations FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their assigned locations"
  ON locations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_user_location_ids(auth.uid()))
  );

-- Users RLS Policies
CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Super Admins RLS Policies
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- User Roles RLS Policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- User Locations RLS Policies
CREATE POLICY "Super admins can manage all user-location mappings"
  ON user_locations FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own location mappings"
  ON user_locations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Permissions RLS Policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Role Permissions RLS Policies
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Location User Permissions RLS Policies
CREATE POLICY "Super admins can manage location user permissions"
  ON location_user_permissions FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own permission overrides"
  ON location_user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Store Settings RLS Policies
CREATE POLICY "Super admins can manage all store settings"
  ON store_settings FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Location admins can manage their location settings"
  ON store_settings FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    )
  );

CREATE POLICY "Users can view their location settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  );

-- Regions RLS Policies
CREATE POLICY "Super admins can manage all regions"
  ON regions FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view regions"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

-- Areas RLS Policies
CREATE POLICY "Super admins can manage all areas"
  ON areas FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view areas"
  ON areas FOR SELECT
  TO authenticated
  USING (true);

-- Audit Logs RLS Policies
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- UPDATE RLS POLICIES FOR EXISTING DATA TABLES
-- ============================================================================

-- Drop existing policies that allow public access
DO $$
DECLARE
  table_record RECORD;
  policy_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('staff', 'deployments', 'positions', 'shift_info', 'sales_data', 
                        'shift_schedules', 'break_schedules', 'staff_current_locations',
                        'staff_training_stations', 'staff_rankings', 'staff_sign_offs')
  LOOP
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_record.tablename
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        policy_record.policyname, 
        table_record.tablename
      );
    END LOOP;
  END LOOP;
END $$;

-- Create location-scoped RLS policies for data tables
CREATE POLICY "Super admins and location users can view staff"
  ON staff FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  );

CREATE POLICY "Super admins and location admins can manage staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Super admins and location users can view deployments"
  ON deployments FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  );

CREATE POLICY "Super admins and location admins can manage deployments"
  ON deployments FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Super admins and location users can view positions"
  ON positions FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  );

CREATE POLICY "Super admins and location admins can manage positions"
  ON positions FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

-- Similar policies for other data tables
CREATE POLICY "Location-scoped shift_info access"
  ON shift_info FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Location-scoped sales_data access"
  ON sales_data FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Location-scoped shift_schedules access"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Location-scoped break_schedules access"
  ON break_schedules FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );

CREATE POLICY "Location-scoped staff_current_locations access"
  ON staff_current_locations FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    location_id IN (SELECT get_user_location_ids(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (location_id IN (
      SELECT ul.location_id 
      FROM user_locations ul 
      WHERE ul.user_id = auth.uid() 
        AND ul.role_name = 'location_admin'
    ))
  );
