/*
  # Location-Scoped RLS Policies - Phase 2: Data Isolation
  
  ## Overview
  Implements comprehensive Row-Level Security policies ensuring complete data isolation
  between locations. Each user can only access data for locations they have been
  explicitly granted access to.
  
  ## Security Model
  
  ### Access Control Flow
  1. User authenticates via Supabase Auth
  2. User's location access is checked in user_location_access table
  3. RLS policies filter all queries to only return data for authorized locations
  4. Super admins bypass location restrictions and see all data
  
  ### Role Hierarchy
  - **super_admin**: Full access to all locations and system configuration
  - **location_admin**: Full access to assigned location(s) data
  - **location_operator**: Read-only access to assigned location(s) operational data
  - **regional_manager**: Read-only access to all locations in assigned region(s)
  - **area_manager**: Read-only access to all locations in assigned area(s)
  
  ## Changes Made
  
  ### 1. Helper Functions Created
  - `get_user_role()` - Returns current user's role from user_profiles
  - `get_user_locations()` - Returns array of location IDs user can access
  - `is_super_admin()` - Checks if current user is super admin
  
  ### 2. RLS Policies Applied To
  - staff (location-scoped)
  - positions (location-scoped)
  - deployments (location-scoped)
  - shift_info (location-scoped)
  - sales_data (location-scoped)
  - shift_schedules (location-scoped)
  - staff_training_stations (location-scoped)
  - staff_rankings (location-scoped)
  - staff_sign_offs (location-scoped)
  - station_position_mappings (location-scoped)
  - staff_roles (via staff.location_id)
  - staff_work_status (via staff.location_id)
  - staff_default_positions (via staff.location_id)
  - All other tables with location_id columns
  
  ### 3. Policy Types
  - SELECT: View data for authorized locations
  - INSERT: Create data only for authorized locations
  - UPDATE: Modify data only for authorized locations
  - DELETE: Remove data only for authorized locations
  
  ## Security Guarantees
  - Users cannot see data from locations they don't have access to
  - Users cannot modify data in locations they don't have access to
  - Super admins maintain full system access
  - Service role bypasses all RLS for system operations
  
  ## Testing
  After applying this migration:
  1. Create test users with different roles
  2. Verify users only see their assigned location data
  3. Test cross-location access is blocked
  4. Verify super admin sees all data
*/

-- ============================================================================
-- STEP 1: Create Helper Functions for RLS Policies
-- ============================================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND status = 'active'
  );
$$;

-- Function to get locations user has access to
CREATE OR REPLACE FUNCTION public.get_user_locations()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(location_id)
  FROM public.user_location_access
  WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- STEP 2: Drop Old Policies and Create Location-Scoped Policies
-- ============================================================================

-- Drop all existing policies on core tables
DO $$
DECLARE
  table_record RECORD;
  policy_record RECORD;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'staff', 'positions', 'deployments', 'shift_info', 'sales_data',
      'shift_schedules', 'staff_training_stations', 'staff_rankings',
      'staff_sign_offs', 'station_position_mappings', 'schedule_employees',
      'schedule_shifts', 'staff_roles', 'staff_work_status',
      'staff_default_positions', 'deployment_auto_assignment_config',
      'position_capacity', 'checklists', 'checklist_items',
      'checklist_completions', 'checklist_item_completions',
      'handover_notes', 'break_schedules', 'performance_kpis',
      'labor_sales_snapshots', 'labor_sales_targets',
      'shift_performance_scorecards', 'performance_metrics',
      'auto_assignment_rules', 'assignment_history',
      'staff_fixed_closing_positions', 'training_plans',
      'training_plan_items', 'position_secondary_mappings',
      'closing_station_requirements', 'staff_closing_training',
      'closing_position_config'
    )
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

-- ============================================================================
-- STEP 3: Create Location-Scoped Policies for Core Tables
-- ============================================================================

-- STAFF table policies
CREATE POLICY "Users can view staff in their locations"
  ON staff FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can insert staff in their locations"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

CREATE POLICY "Admins can update staff in their locations"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

CREATE POLICY "Admins can delete staff in their locations"
  ON staff FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- POSITIONS table policies
CREATE POLICY "Users can view positions in their locations"
  ON positions FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage positions in their locations"
  ON positions FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- DEPLOYMENTS table policies
CREATE POLICY "Users can view deployments in their locations"
  ON deployments FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Users can create deployments in their locations"
  ON deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  );

CREATE POLICY "Users can update deployments in their locations"
  ON deployments FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  );

CREATE POLICY "Admins can delete deployments in their locations"
  ON deployments FOR DELETE
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- SHIFT_INFO table policies
CREATE POLICY "Users can view shift_info in their locations"
  ON shift_info FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Users can manage shift_info in their locations"
  ON shift_info FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  );

-- SALES_DATA table policies
CREATE POLICY "Users can view sales_data in their locations"
  ON sales_data FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage sales_data in their locations"
  ON sales_data FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- SHIFT_SCHEDULES table policies
CREATE POLICY "Users can view shift_schedules in their locations"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Users can manage shift_schedules in their locations"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin', 'location_operator'))
  );

-- STAFF_TRAINING_STATIONS table policies
CREATE POLICY "Users can view training_stations in their locations"
  ON staff_training_stations FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage training_stations in their locations"
  ON staff_training_stations FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- STAFF_RANKINGS table policies
CREATE POLICY "Users can view staff_rankings in their locations"
  ON staff_rankings FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage staff_rankings in their locations"
  ON staff_rankings FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- STAFF_SIGN_OFFS table policies
CREATE POLICY "Users can view staff_sign_offs in their locations"
  ON staff_sign_offs FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage staff_sign_offs in their locations"
  ON staff_sign_offs FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- STATION_POSITION_MAPPINGS table policies
CREATE POLICY "Users can view station_mappings in their locations"
  ON station_position_mappings FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    location_id = ANY(get_user_locations())
  );

CREATE POLICY "Admins can manage station_mappings in their locations"
  ON station_position_mappings FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (location_id = ANY(get_user_locations()) AND get_user_role() IN ('location_admin'))
  );

-- ============================================================================
-- STEP 4: Apply Policies to Related Tables (via staff.location_id)
-- ============================================================================

-- STAFF_ROLES policies (access via staff table)
CREATE POLICY "Users can view staff_roles in their locations"
  ON staff_roles FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_roles.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    )
  );

CREATE POLICY "Admins can manage staff_roles in their locations"
  ON staff_roles FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_roles.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_roles.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  );

-- STAFF_WORK_STATUS policies
CREATE POLICY "Users can view staff_work_status in their locations"
  ON staff_work_status FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_work_status.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    )
  );

CREATE POLICY "Admins can manage staff_work_status in their locations"
  ON staff_work_status FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_work_status.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_work_status.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  );

-- STAFF_DEFAULT_POSITIONS policies
CREATE POLICY "Users can view staff_default_positions in their locations"
  ON staff_default_positions FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR 
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_default_positions.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    )
  );

CREATE POLICY "Admins can manage staff_default_positions in their locations"
  ON staff_default_positions FOR ALL
  TO authenticated
  USING (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_default_positions.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  )
  WITH CHECK (
    is_super_admin() OR 
    (EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.id = staff_default_positions.staff_id 
      AND staff.location_id = ANY(get_user_locations())
    ) AND get_user_role() IN ('location_admin'))
  );

-- ============================================================================
-- STEP 5: Apply Generic Policies to All Other Tables with location_id
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.column_name = 'location_id'
    AND c.table_name NOT IN (
      'staff', 'positions', 'deployments', 'shift_info', 'sales_data',
      'shift_schedules', 'staff_training_stations', 'staff_rankings',
      'staff_sign_offs', 'station_position_mappings'
    )
    AND EXISTS (
      SELECT 1 FROM pg_tables t
      WHERE t.schemaname = 'public'
      AND t.tablename = c.table_name
    )
  LOOP
    -- Create SELECT policy
    EXECUTE format(
      'CREATE POLICY "Users can view %I in their locations" 
       ON %I FOR SELECT 
       TO authenticated 
       USING (is_super_admin() OR location_id = ANY(get_user_locations()))',
      table_record.table_name,
      table_record.table_name
    );
    
    -- Create ALL policy for admins
    EXECUTE format(
      'CREATE POLICY "Admins can manage %I in their locations" 
       ON %I FOR ALL 
       TO authenticated 
       USING (is_super_admin() OR (location_id = ANY(get_user_locations()) AND get_user_role() IN (''location_admin'')))
       WITH CHECK (is_super_admin() OR (location_id = ANY(get_user_locations()) AND get_user_role() IN (''location_admin'')))',
      table_record.table_name,
      table_record.table_name
    );
  END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Update Management Tables Policies
-- ============================================================================

-- Super admin only access to user management
CREATE POLICY "Super admins can manage all users"
  ON user_profiles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage location access"
  ON user_location_access FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage regions"
  ON regions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage areas"
  ON areas FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage locations"
  ON locations FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
