/*
  # Optimize Super Admin Checks and Add User Preferences

  ## Overview
  This migration optimizes the authentication and authorization system by:
  - Materializing super admin status for better performance
  - Adding user preference columns for personalized experience
  - Enforcing strict role-based location access control
  - Adding database indexes for frequently queried columns
  - Updating RLS helper functions with caching hints

  ## Changes

  1. User Table Enhancements
    - Add `is_super_admin_cache` column to materialize super admin status
    - Add `preferred_landing_page` to store user's default starting page
    - Add `default_location_id` to remember last selected location
    - Add indexes on frequently queried columns

  2. Function Optimizations
    - Update `is_super_admin()` function with STABLE marking for better caching
    - Add trigger to automatically maintain `is_super_admin_cache`
    - Optimize `get_user_location_ids()` for better query planning

  3. Role-Based Access Control
    - Add constraint to prevent multiple location assignments for location_admin/location_user
    - Update validation logic for location assignments

  4. Security
    - Add RLS policies for user preference updates
    - Ensure users can only modify their own preferences
    - Maintain existing security model
*/

-- Add user preference columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_super_admin_cache'
  ) THEN
    ALTER TABLE users ADD COLUMN is_super_admin_cache boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'preferred_landing_page'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_landing_page text DEFAULT '/';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_location_id'
  ) THEN
    ALTER TABLE users ADD COLUMN default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin_cache ON users(is_super_admin_cache) WHERE is_super_admin_cache = true;
CREATE INDEX IF NOT EXISTS idx_users_default_location ON users(default_location_id) WHERE default_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);

-- Initialize the super admin cache for existing users
UPDATE users u
SET is_super_admin_cache = EXISTS (
  SELECT 1 FROM super_admins sa WHERE sa.user_id = u.id
)
WHERE is_super_admin_cache IS NULL OR is_super_admin_cache = false;

-- Drop the old function to recreate with optimization
DROP FUNCTION IF EXISTS is_super_admin();

-- Create optimized is_super_admin function with STABLE marking for caching
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check the materialized cache first for performance
  SELECT is_super_admin_cache INTO is_admin
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Create trigger function to maintain is_super_admin_cache
CREATE OR REPLACE FUNCTION sync_super_admin_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE users
    SET is_super_admin_cache = true
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE users
    SET is_super_admin_cache = false
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on super_admins table
DROP TRIGGER IF EXISTS sync_super_admin_cache_trigger ON super_admins;
CREATE TRIGGER sync_super_admin_cache_trigger
AFTER INSERT OR DELETE ON super_admins
FOR EACH ROW
EXECUTE FUNCTION sync_super_admin_cache();

-- Optimize get_user_location_ids function with STABLE marking
DROP FUNCTION IF EXISTS get_user_location_ids();

CREATE OR REPLACE FUNCTION get_user_location_ids()
RETURNS TABLE(location_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Super admins get all locations
  IF is_super_admin() THEN
    RETURN QUERY SELECT id FROM locations;
  ELSE
    -- Regular users get only their assigned locations
    RETURN QUERY 
    SELECT ul.location_id 
    FROM user_locations ul 
    WHERE ul.user_id = auth.uid();
  END IF;
END;
$$;

-- Add validation function for single-location roles
CREATE OR REPLACE FUNCTION validate_location_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  location_count integer;
  user_role text;
BEGIN
  -- Get the role for this assignment
  user_role := NEW.role_name;
  
  -- For location_admin and location_user, enforce single location
  IF user_role IN ('location_admin', 'location_user') THEN
    -- Count existing locations for this user
    SELECT COUNT(*) INTO location_count
    FROM user_locations
    WHERE user_id = NEW.user_id;
    
    -- If this is an insert and user already has a location, reject it
    IF TG_OP = 'INSERT' AND location_count > 0 THEN
      RAISE EXCEPTION 'Users with role % can only be assigned to one location', user_role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for location assignment validation
DROP TRIGGER IF EXISTS validate_location_assignment_trigger ON user_locations;
CREATE TRIGGER validate_location_assignment_trigger
BEFORE INSERT ON user_locations
FOR EACH ROW
EXECUTE FUNCTION validate_location_assignment();

-- Add RLS policy for users to update their own preferences
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can update own preferences" ON users;
  
  -- Create policy for preference updates
  CREATE POLICY "Users can update own preferences"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Users cannot modify their own super admin cache
    is_super_admin_cache = (SELECT is_super_admin_cache FROM users WHERE id = auth.uid())
  );
END $$;

-- Create function to update user preferences safely
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_preferred_landing_page text DEFAULT NULL,
  p_default_location_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  has_access boolean;
BEGIN
  -- Validate landing page
  IF p_preferred_landing_page IS NOT NULL THEN
    IF p_preferred_landing_page NOT IN ('/', '/admin') THEN
      RAISE EXCEPTION 'Invalid landing page';
    END IF;
    
    -- Only super admins can set /admin as landing page
    IF p_preferred_landing_page = '/admin' AND NOT is_super_admin() THEN
      RAISE EXCEPTION 'Only super admins can set admin portal as landing page';
    END IF;
  END IF;
  
  -- Validate location access
  IF p_default_location_id IS NOT NULL THEN
    -- Check if user has access to this location
    SELECT EXISTS (
      SELECT 1 FROM get_user_location_ids() WHERE location_id = p_default_location_id
    ) INTO has_access;
    
    IF NOT has_access THEN
      RAISE EXCEPTION 'User does not have access to the specified location';
    END IF;
  END IF;
  
  -- Update preferences
  UPDATE users
  SET 
    preferred_landing_page = COALESCE(p_preferred_landing_page, preferred_landing_page),
    default_location_id = COALESCE(p_default_location_id, default_location_id)
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permission on the preferences function
GRANT EXECUTE ON FUNCTION update_user_preferences TO authenticated;

-- Comment on new columns
COMMENT ON COLUMN users.is_super_admin_cache IS 'Materialized cache of super admin status for performance';
COMMENT ON COLUMN users.preferred_landing_page IS 'User preferred starting page after login (/ or /admin)';
COMMENT ON COLUMN users.default_location_id IS 'Last selected or preferred location for the user';
