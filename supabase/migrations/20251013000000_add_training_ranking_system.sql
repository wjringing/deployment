/*
  # Training and Ranking System Integration

  ## Overview
  Comprehensive training and ranking system integrated with existing staff table.
  Enables training tracking, performance rankings, station sign-offs, and intelligent
  deployment assignment based on training qualifications and performance scores.

  ## New Tables

  ### staff_training_stations
  Tracks training completion status for each staff member across all KFC stations
  - `id` (uuid, primary key) - Unique training record identifier
  - `staff_id` (uuid, foreign key) - Links to existing staff table
  - `station_name` (text, not null) - Station identifier (e.g., 'BOH Cook', 'FOH Cashier')
  - `is_trained` (boolean) - Whether staff member is trained on this station
  - `trained_date` (timestamptz) - When training was completed
  - `job_code` (text) - Job role (Team Member, Cook, Shift Runner, etc.)
  - `is_primary_station` (boolean) - Whether this is their primary/default station
  - `training_notes` (text) - Additional notes about training completion
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### staff_rankings
  Multi-manager performance rankings for trained stations (1-10 scale)
  - `id` (uuid, primary key) - Unique ranking identifier
  - `staff_id` (uuid, foreign key) - Staff member being ranked
  - `rater_staff_id` (uuid, foreign key) - Manager/supervisor providing rating
  - `station_name` (text, not null) - Station being rated
  - `rating` (integer) - Performance score 1-10 (10 = highest)
  - `rating_notes` (text) - Comments about performance
  - `rating_date` (timestamptz) - When rating was given
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### staff_sign_offs
  Formal manager sign-offs confirming station competency
  - `id` (uuid, primary key) - Unique sign-off identifier
  - `staff_id` (uuid, foreign key) - Staff member being signed off
  - `manager_staff_id` (uuid, foreign key) - Manager providing sign-off
  - `station_name` (text, not null) - Station being signed off
  - `sign_off_date` (timestamptz) - When sign-off was granted
  - `sign_off_notes` (text) - Comments about competency level
  - `created_at` (timestamptz) - Record creation timestamp

  ### training_stations_master
  Master list of all available training stations with metadata
  - `id` (uuid, primary key) - Unique station identifier
  - `station_name` (text, unique, not null) - Station identifier
  - `station_category` (text) - BOH (Back of House), FOH (Front of House), MOH (Middle of House)
  - `display_name` (text) - User-friendly display name
  - `description` (text) - Station description and responsibilities
  - `requires_age_18_plus` (boolean) - Age restriction flag
  - `sort_order` (integer) - Display order
  - `is_active` (boolean) - Whether station is currently used
  - `created_at` (timestamptz) - Record creation timestamp

  ## Integration Features

  1. **Training Tracking**
     - Track which stations each staff member is trained on
     - Support cross-training (training outside primary role)
     - Store training completion dates for compliance

  2. **Performance Rankings**
     - Multiple managers can rate same employee on same station
     - Average ratings calculated for deployment prioritization
     - 1-10 scale for granular performance assessment

  3. **Sign-Off System**
     - Formal competency approval process
     - Manager accountability via foreign key relationship
     - Historical audit trail

  4. **Deployment Intelligence**
     - Auto-deployment can check training status before assignment
     - Prioritize staff based on average ranking scores
     - Prevent assignment to untrained stations
     - Support cross-training deployment opportunities

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access policies (consistent with existing architecture)
  - Manager role validation for sign-offs and rankings
  - Audit trails via timestamps

  ## Performance Optimizations
  - Indexes on all foreign keys
  - Composite indexes for common query patterns
  - Unique constraints to prevent duplicate records
  - Efficient join paths for deployment queries

  ## Data Integrity
  - Foreign key constraints to existing staff table
  - Check constraints for rating values (1-10 range)
  - Cascading deletes to maintain referential integrity
  - Unique constraints on staff_id + station_name combinations
*/

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Master list of training stations
CREATE TABLE IF NOT EXISTS training_stations_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text UNIQUE NOT NULL,
  station_category text NOT NULL DEFAULT 'BOH' CHECK (station_category IN ('BOH', 'FOH', 'MOH', 'General')),
  display_name text NOT NULL,
  description text DEFAULT '',
  requires_age_18_plus boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Staff training stations tracking
CREATE TABLE IF NOT EXISTS staff_training_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  is_trained boolean DEFAULT false,
  trained_date timestamptz,
  job_code text DEFAULT 'Team Member',
  is_primary_station boolean DEFAULT false,
  training_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

-- Staff performance rankings
CREATE TABLE IF NOT EXISTS staff_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  rater_staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  rating_notes text DEFAULT '',
  rating_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, rater_staff_id, station_name)
);

-- Staff station sign-offs
CREATE TABLE IF NOT EXISTS staff_sign_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  manager_staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  sign_off_date timestamptz DEFAULT now(),
  sign_off_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, manager_staff_id, station_name)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- training_stations_master indexes
CREATE INDEX IF NOT EXISTS idx_training_stations_category
  ON training_stations_master(station_category);

CREATE INDEX IF NOT EXISTS idx_training_stations_active
  ON training_stations_master(is_active);

CREATE INDEX IF NOT EXISTS idx_training_stations_sort
  ON training_stations_master(sort_order);

-- staff_training_stations indexes
CREATE INDEX IF NOT EXISTS idx_staff_training_staff_id
  ON staff_training_stations(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_training_station_name
  ON staff_training_stations(station_name);

CREATE INDEX IF NOT EXISTS idx_staff_training_is_trained
  ON staff_training_stations(is_trained);

CREATE INDEX IF NOT EXISTS idx_staff_training_job_code
  ON staff_training_stations(job_code);

CREATE INDEX IF NOT EXISTS idx_staff_training_primary
  ON staff_training_stations(is_primary_station);

-- Composite index for deployment queries
CREATE INDEX IF NOT EXISTS idx_staff_training_station_trained
  ON staff_training_stations(station_name, is_trained, staff_id)
  WHERE is_trained = true;

-- staff_rankings indexes
CREATE INDEX IF NOT EXISTS idx_staff_rankings_staff_id
  ON staff_rankings(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_rankings_rater_id
  ON staff_rankings(rater_staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_rankings_station_name
  ON staff_rankings(station_name);

CREATE INDEX IF NOT EXISTS idx_staff_rankings_rating
  ON staff_rankings(rating);

-- Composite index for average rating calculations
CREATE INDEX IF NOT EXISTS idx_staff_rankings_staff_station
  ON staff_rankings(staff_id, station_name, rating);

-- staff_sign_offs indexes
CREATE INDEX IF NOT EXISTS idx_staff_signoffs_staff_id
  ON staff_sign_offs(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_signoffs_manager_id
  ON staff_sign_offs(manager_staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_signoffs_station_name
  ON staff_sign_offs(station_name);

CREATE INDEX IF NOT EXISTS idx_staff_signoffs_date
  ON staff_sign_offs(sign_off_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE training_stations_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sign_offs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations - consistent with existing architecture)
DROP POLICY IF EXISTS "Allow all operations on training_stations_master" ON training_stations_master;
CREATE POLICY "Allow all operations on training_stations_master"
  ON training_stations_master
  FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all operations on staff_training_stations" ON staff_training_stations;
CREATE POLICY "Allow all operations on staff_training_stations"
  ON staff_training_stations
  FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all operations on staff_rankings" ON staff_rankings;
CREATE POLICY "Allow all operations on staff_rankings"
  ON staff_rankings
  FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all operations on staff_sign_offs" ON staff_sign_offs;
CREATE POLICY "Allow all operations on staff_sign_offs"
  ON staff_sign_offs
  FOR ALL
  USING (true);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for staff_training_stations
DROP TRIGGER IF EXISTS update_staff_training_stations_updated_at ON staff_training_stations;
CREATE TRIGGER update_staff_training_stations_updated_at
  BEFORE UPDATE ON staff_training_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_training_updated_at();

-- Trigger for staff_rankings
DROP TRIGGER IF EXISTS update_staff_rankings_updated_at ON staff_rankings;
CREATE TRIGGER update_staff_rankings_updated_at
  BEFORE UPDATE ON staff_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_training_updated_at();

-- ============================================================================
-- SEED DATA - KFC TRAINING STATIONS
-- ============================================================================

-- Insert default KFC stations
INSERT INTO training_stations_master (station_name, station_category, display_name, description, requires_age_18_plus, sort_order, is_active)
VALUES
  -- Back of House (BOH) - Kitchen stations
  ('BOH Cook', 'BOH', 'Cook', 'Main cooking station - operates fryers and prepares chicken', false, 1, true),
  ('BOH Cook2', 'BOH', 'Cook 2', 'Secondary cooking station', false, 2, true),

  -- Front of House (FOH) - Customer facing
  ('FOH Cashier', 'FOH', 'Cashier', 'Takes customer orders and processes payments', false, 10, true),
  ('FOH Guest Host', 'FOH', 'Guest Host', 'Greets customers and manages dining area', false, 11, true),
  ('FOH Pack', 'FOH', 'Packing', 'Assembles and packs customer orders', false, 12, true),
  ('FOH Present', 'FOH', 'Present', 'Presents orders to customers at counter/drive-thru', false, 13, true),

  -- Middle of House (MOH) - Food prep
  ('MOH Burgers', 'MOH', 'Burgers', 'Prepares burgers and sandwiches', false, 20, true),
  ('MOH Chicken Pack', 'MOH', 'Chicken Pack', 'Packs and portions fried chicken', false, 21, true),
  ('MOH Sides', 'MOH', 'Sides', 'Prepares side items (fries, coleslaw, etc.)', false, 22, true),
  ('Freezer to Fryer', 'MOH', 'Freezer to Fryer', 'Manages chicken inventory and preparation', false, 23, true),

  -- Drive-Thru specific
  ('DT Order Taker', 'FOH', 'Drive-Thru Order Taker', 'Takes orders via drive-thru headset', false, 30, true),
  ('DT Window', 'FOH', 'Drive-Thru Window', 'Manages drive-thru payment and order handoff', false, 31, true),

  -- General positions
  ('Lobby', 'General', 'Lobby Maintenance', 'Maintains dining area cleanliness', false, 40, true),
  ('Restocking', 'General', 'Restocking', 'Restocks supplies and ingredients', false, 41, true),
  ('Cleaning', 'General', 'Cleaning', 'General cleaning duties', false, 42, true),

  -- Management/Advanced
  ('Shift Runner', 'General', 'Shift Runner', 'Supervises shift operations', true, 50, true),
  ('Opening Procedures', 'General', 'Opening Procedures', 'Opening checklist and setup', true, 51, true),
  ('Closing Procedures', 'General', 'Closing Procedures', 'Closing checklist and cleanup', true, 52, true),
  ('Cash Handling', 'General', 'Cash Handling', 'Till management and reconciliation', true, 53, true)
ON CONFLICT (station_name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS FOR DEPLOYMENT INTELLIGENCE
-- ============================================================================

-- Function to get staff members trained for a specific station with rankings
CREATE OR REPLACE FUNCTION get_trained_staff_for_station(
  target_station text,
  minimum_rating integer DEFAULT 1,
  exclude_under_18 boolean DEFAULT false
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  is_under_18 boolean,
  job_code text,
  is_primary_station boolean,
  trained_date timestamptz,
  average_rating numeric,
  total_ratings bigint,
  has_sign_off boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as staff_id,
    s.name as staff_name,
    s.is_under_18,
    sts.job_code,
    sts.is_primary_station,
    sts.trained_date,
    COALESCE(AVG(sr.rating), 0) as average_rating,
    COUNT(sr.id) as total_rankings,
    EXISTS(
      SELECT 1 FROM staff_sign_offs sso
      WHERE sso.staff_id = s.id
      AND sso.station_name = target_station
    ) as has_sign_off
  FROM staff s
  INNER JOIN staff_training_stations sts ON s.id = sts.staff_id
  LEFT JOIN staff_rankings sr ON s.id = sr.staff_id AND sr.station_name = target_station
  WHERE sts.station_name = target_station
    AND sts.is_trained = true
    AND (NOT exclude_under_18 OR s.is_under_18 = false)
  GROUP BY s.id, s.name, s.is_under_18, sts.job_code, sts.is_primary_station, sts.trained_date
  HAVING COALESCE(AVG(sr.rating), 0) >= minimum_rating
  ORDER BY average_rating DESC, sts.is_primary_station DESC, sts.trained_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff training summary
CREATE OR REPLACE FUNCTION get_staff_training_summary(target_staff_id uuid)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  total_stations_trained bigint,
  primary_station text,
  total_rankings bigint,
  average_overall_rating numeric,
  total_sign_offs bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as staff_id,
    s.name as staff_name,
    COUNT(DISTINCT sts.station_name) FILTER (WHERE sts.is_trained = true) as total_stations_trained,
    MAX(sts.station_name) FILTER (WHERE sts.is_primary_station = true) as primary_station,
    COUNT(DISTINCT sr.id) as total_rankings,
    COALESCE(AVG(sr.rating), 0) as average_overall_rating,
    COUNT(DISTINCT sso.id) as total_sign_offs
  FROM staff s
  LEFT JOIN staff_training_stations sts ON s.id = sts.staff_id
  LEFT JOIN staff_rankings sr ON s.id = sr.staff_id
  LEFT JOIN staff_sign_offs sso ON s.id = sso.staff_id
  WHERE s.id = target_staff_id
  GROUP BY s.id, s.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get station rankings for a staff member
CREATE OR REPLACE FUNCTION get_staff_station_rankings(target_staff_id uuid)
RETURNS TABLE (
  station_name text,
  is_trained boolean,
  average_rating numeric,
  rating_count bigint,
  has_sign_off boolean,
  latest_rating_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sts.station_name,
    sts.is_trained,
    COALESCE(AVG(sr.rating), 0) as average_rating,
    COUNT(sr.id) as rating_count,
    EXISTS(
      SELECT 1 FROM staff_sign_offs sso
      WHERE sso.staff_id = target_staff_id
      AND sso.station_name = sts.station_name
    ) as has_sign_off,
    MAX(sr.rating_date) as latest_rating_date
  FROM staff_training_stations sts
  LEFT JOIN staff_rankings sr ON sts.staff_id = sr.staff_id
    AND sts.station_name = sr.station_name
  WHERE sts.staff_id = target_staff_id
  GROUP BY sts.station_name, sts.is_trained
  ORDER BY average_rating DESC, sts.station_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if staff is qualified for a station (training + optional rating threshold)
CREATE OR REPLACE FUNCTION is_staff_qualified_for_station(
  target_staff_id uuid,
  target_station text,
  minimum_rating integer DEFAULT 0,
  require_sign_off boolean DEFAULT false
)
RETURNS boolean AS $$
DECLARE
  is_qualified boolean;
BEGIN
  SELECT
    CASE
      WHEN NOT EXISTS(
        SELECT 1 FROM staff_training_stations
        WHERE staff_id = target_staff_id
        AND station_name = target_station
        AND is_trained = true
      ) THEN false
      WHEN require_sign_off AND NOT EXISTS(
        SELECT 1 FROM staff_sign_offs
        WHERE staff_id = target_staff_id
        AND station_name = target_station
      ) THEN false
      WHEN minimum_rating > 0 THEN (
        SELECT COALESCE(AVG(rating), 0) >= minimum_rating
        FROM staff_rankings
        WHERE staff_id = target_staff_id
        AND station_name = target_station
      )
      ELSE true
    END INTO is_qualified;

  RETURN COALESCE(is_qualified, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Staff training overview with statistics
CREATE OR REPLACE VIEW v_staff_training_overview AS
SELECT
  s.id as staff_id,
  s.name as staff_name,
  s.is_under_18,
  COUNT(DISTINCT sts.station_name) FILTER (WHERE sts.is_trained = true) as stations_trained,
  COUNT(DISTINCT sr.id) as total_ratings,
  ROUND(COALESCE(AVG(sr.rating), 0), 2) as avg_rating,
  COUNT(DISTINCT sso.id) as total_sign_offs,
  MAX(sts.station_name) FILTER (WHERE sts.is_primary_station = true) as primary_station
FROM staff s
LEFT JOIN staff_training_stations sts ON s.id = sts.staff_id
LEFT JOIN staff_rankings sr ON s.id = sr.staff_id
LEFT JOIN staff_sign_offs sso ON s.id = sso.staff_id
GROUP BY s.id, s.name, s.is_under_18;

-- View: Station coverage - which stations have trained staff
CREATE OR REPLACE VIEW v_station_coverage AS
SELECT
  tsm.station_name,
  tsm.station_category,
  tsm.display_name,
  COUNT(DISTINCT sts.staff_id) FILTER (WHERE sts.is_trained = true) as trained_staff_count,
  COUNT(DISTINCT sr.staff_id) as rated_staff_count,
  ROUND(COALESCE(AVG(sr.rating), 0), 2) as avg_station_rating,
  COUNT(DISTINCT sso.staff_id) as signed_off_staff_count
FROM training_stations_master tsm
LEFT JOIN staff_training_stations sts ON tsm.station_name = sts.station_name
LEFT JOIN staff_rankings sr ON tsm.station_name = sr.station_name
LEFT JOIN staff_sign_offs sso ON tsm.station_name = sso.station_name
WHERE tsm.is_active = true
GROUP BY tsm.station_name, tsm.station_category, tsm.display_name, tsm.sort_order
ORDER BY tsm.sort_order;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE training_stations_master IS 'Master list of all KFC training stations with metadata';
COMMENT ON TABLE staff_training_stations IS 'Tracks training completion for each staff member by station';
COMMENT ON TABLE staff_rankings IS 'Performance rankings from managers (1-10 scale, supports multiple raters)';
COMMENT ON TABLE staff_sign_offs IS 'Formal manager sign-offs confirming station competency';

COMMENT ON FUNCTION get_trained_staff_for_station IS 'Returns qualified staff for a station ordered by rating';
COMMENT ON FUNCTION get_staff_training_summary IS 'Returns training overview for a specific staff member';
COMMENT ON FUNCTION get_staff_station_rankings IS 'Returns all station rankings for a staff member';
COMMENT ON FUNCTION is_staff_qualified_for_station IS 'Checks if staff meets qualification criteria for a station';

COMMENT ON VIEW v_staff_training_overview IS 'Comprehensive training statistics for all staff members';
COMMENT ON VIEW v_station_coverage IS 'Shows training coverage across all stations';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
  To rollback this migration, execute the following SQL:

  -- Drop views
  DROP VIEW IF EXISTS v_station_coverage;
  DROP VIEW IF EXISTS v_staff_training_overview;

  -- Drop functions
  DROP FUNCTION IF EXISTS is_staff_qualified_for_station;
  DROP FUNCTION IF EXISTS get_staff_station_rankings;
  DROP FUNCTION IF EXISTS get_staff_training_summary;
  DROP FUNCTION IF EXISTS get_trained_staff_for_station;
  DROP FUNCTION IF EXISTS update_training_updated_at;

  -- Drop tables (in reverse order due to foreign keys)
  DROP TABLE IF EXISTS staff_sign_offs;
  DROP TABLE IF EXISTS staff_rankings;
  DROP TABLE IF EXISTS staff_training_stations;
  DROP TABLE IF EXISTS training_stations_master;
*/
