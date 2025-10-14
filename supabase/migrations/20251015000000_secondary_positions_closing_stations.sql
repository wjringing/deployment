/*
  # Secondary Position Auto-Deployment & Closing Station Management

  ## Overview
  Enables automatic deployment of secondary positions and validates closing training
  for night shift assignments. Integrates with existing position and training systems.

  ## New Tables

  ### position_secondary_mappings
  Maps primary positions to their complementary secondary positions
  - `id` (uuid, primary key) - Unique mapping identifier
  - `primary_position_id` (uuid, foreign key) - Links to positions table (primary position)
  - `secondary_position_id` (uuid, foreign key) - Links to positions table (secondary position)
  - `priority` (integer) - Priority order when multiple secondaries available (1 = highest)
  - `shift_type` (text) - Which shifts this mapping applies to (Day Shift, Night Shift, Both)
  - `is_enabled` (boolean) - Whether this mapping is active
  - `auto_deploy` (boolean) - Whether to automatically deploy this secondary
  - `notes` (text) - Optional configuration notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### closing_station_requirements
  Defines which positions require closing training for night shifts
  - `id` (uuid, primary key) - Unique requirement identifier
  - `position_id` (uuid, foreign key) - Links to positions table
  - `requires_closing_training` (boolean) - Whether closing training is mandatory
  - `shift_type` (text) - Which shifts require closing (typically Night Shift)
  - `minimum_trained_staff` (integer) - Minimum closing-trained staff needed
  - `closing_start_time` (text) - Time when closing duties begin (e.g., "22:00")
  - `is_active` (boolean) - Whether this requirement is enforced
  - `notes` (text) - Optional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### staff_closing_training
  Tracks which staff members are trained for closing duties
  - `id` (uuid, primary key) - Unique training record identifier
  - `staff_id` (uuid, foreign key) - Links to staff table
  - `position_id` (uuid, foreign key) - Links to positions table (which position closing trained for)
  - `is_trained` (boolean) - Whether staff is closing-trained for this position
  - `trained_date` (timestamptz) - Date of closing training completion
  - `trainer_staff_id` (uuid, foreign key) - Staff member who provided training
  - `manager_signoff_date` (timestamptz) - Date of manager certification
  - `manager_staff_id` (uuid, foreign key) - Manager who signed off
  - `expiry_date` (date) - Optional training expiry date
  - `certification_notes` (text) - Notes about certification
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### closing_position_config
  Maps cleaning_area positions to deployable positions that require closing duties
  - `id` (uuid, primary key) - Unique configuration identifier
  - `cleaning_area_position_id` (uuid, foreign key) - Links to positions table (cleaning_area type)
  - `deployable_position_id` (uuid, foreign key) - Links to positions table (position type)
  - `priority` (integer) - Priority order for closing assignment
  - `shift_type` (text) - Which shifts this applies to
  - `is_active` (boolean) - Whether this configuration is active
  - `created_at` (timestamptz) - Record creation timestamp

  ## Changes to Existing Tables
  - Add `has_secondary` (boolean) column to deployments table
  - Add `is_closing_duty` (boolean) column to deployments table
  - Add `closing_validated` (boolean) column to deployments table

  ## Security
  - Row Level Security (RLS) enabled on all new tables
  - Public access policies (consistent with existing architecture)

  ## Performance
  - Indexes on foreign keys for efficient joins
  - Indexes on shift_type for filtering
  - Composite indexes for common query patterns

  ## Default Data
  - Seed common primary-secondary position mappings
  - Configure default closing requirements for night shifts
  - Link existing cleaning_area positions to closing configuration
*/

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Position secondary mappings table
CREATE TABLE IF NOT EXISTS position_secondary_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  secondary_position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  shift_type text NOT NULL DEFAULT 'Both' CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')),
  is_enabled boolean DEFAULT true,
  auto_deploy boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(primary_position_id, secondary_position_id, shift_type)
);

-- Closing station requirements table
CREATE TABLE IF NOT EXISTS closing_station_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  requires_closing_training boolean DEFAULT true,
  shift_type text NOT NULL DEFAULT 'Night Shift' CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')),
  minimum_trained_staff integer DEFAULT 1,
  closing_start_time text DEFAULT '22:00',
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(position_id, shift_type)
);

-- Staff closing training table
CREATE TABLE IF NOT EXISTS staff_closing_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  is_trained boolean DEFAULT true,
  trained_date timestamptz DEFAULT now(),
  trainer_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  manager_signoff_date timestamptz,
  manager_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  expiry_date date,
  certification_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_id)
);

-- Closing position configuration table
CREATE TABLE IF NOT EXISTS closing_position_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_area_position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  deployable_position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  shift_type text NOT NULL DEFAULT 'Night Shift' CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cleaning_area_position_id, deployable_position_id, shift_type)
);

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Add columns to deployments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'has_secondary'
  ) THEN
    ALTER TABLE deployments ADD COLUMN has_secondary boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'is_closing_duty'
  ) THEN
    ALTER TABLE deployments ADD COLUMN is_closing_duty boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'closing_validated'
  ) THEN
    ALTER TABLE deployments ADD COLUMN closing_validated boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- position_secondary_mappings indexes
CREATE INDEX IF NOT EXISTS idx_secondary_mappings_primary
  ON position_secondary_mappings(primary_position_id);

CREATE INDEX IF NOT EXISTS idx_secondary_mappings_secondary
  ON position_secondary_mappings(secondary_position_id);

CREATE INDEX IF NOT EXISTS idx_secondary_mappings_shift_type
  ON position_secondary_mappings(shift_type);

CREATE INDEX IF NOT EXISTS idx_secondary_mappings_enabled
  ON position_secondary_mappings(is_enabled)
  WHERE is_enabled = true;

-- Composite index for assignment queries
CREATE INDEX IF NOT EXISTS idx_secondary_mappings_assignment
  ON position_secondary_mappings(primary_position_id, shift_type, is_enabled, priority)
  WHERE is_enabled = true AND auto_deploy = true;

-- closing_station_requirements indexes
CREATE INDEX IF NOT EXISTS idx_closing_requirements_position
  ON closing_station_requirements(position_id);

CREATE INDEX IF NOT EXISTS idx_closing_requirements_shift_type
  ON closing_station_requirements(shift_type);

CREATE INDEX IF NOT EXISTS idx_closing_requirements_active
  ON closing_station_requirements(is_active)
  WHERE is_active = true;

-- staff_closing_training indexes
CREATE INDEX IF NOT EXISTS idx_closing_training_staff
  ON staff_closing_training(staff_id);

CREATE INDEX IF NOT EXISTS idx_closing_training_position
  ON staff_closing_training(position_id);

CREATE INDEX IF NOT EXISTS idx_closing_training_trained
  ON staff_closing_training(is_trained)
  WHERE is_trained = true;

-- Composite index for validation queries
CREATE INDEX IF NOT EXISTS idx_closing_training_validation
  ON staff_closing_training(staff_id, position_id, is_trained)
  WHERE is_trained = true;

-- closing_position_config indexes
CREATE INDEX IF NOT EXISTS idx_closing_config_cleaning_area
  ON closing_position_config(cleaning_area_position_id);

CREATE INDEX IF NOT EXISTS idx_closing_config_deployable
  ON closing_position_config(deployable_position_id);

CREATE INDEX IF NOT EXISTS idx_closing_config_active
  ON closing_position_config(is_active)
  WHERE is_active = true;

-- deployments table indexes for new columns
CREATE INDEX IF NOT EXISTS idx_deployments_has_secondary
  ON deployments(has_secondary)
  WHERE has_secondary = true;

CREATE INDEX IF NOT EXISTS idx_deployments_closing_duty
  ON deployments(is_closing_duty)
  WHERE is_closing_duty = true;

CREATE INDEX IF NOT EXISTS idx_deployments_closing_validated
  ON deployments(closing_validated);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE position_secondary_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_station_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_closing_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_position_config ENABLE ROW LEVEL SECURITY;

-- Create policies for position_secondary_mappings
DROP POLICY IF EXISTS "Allow all operations on position_secondary_mappings" ON position_secondary_mappings;
CREATE POLICY "Allow all operations on position_secondary_mappings"
  ON position_secondary_mappings
  FOR ALL
  USING (true);

-- Create policies for closing_station_requirements
DROP POLICY IF EXISTS "Allow all operations on closing_station_requirements" ON closing_station_requirements;
CREATE POLICY "Allow all operations on closing_station_requirements"
  ON closing_station_requirements
  FOR ALL
  USING (true);

-- Create policies for staff_closing_training
DROP POLICY IF EXISTS "Allow all operations on staff_closing_training" ON staff_closing_training;
CREATE POLICY "Allow all operations on staff_closing_training"
  ON staff_closing_training
  FOR ALL
  USING (true);

-- Create policies for closing_position_config
DROP POLICY IF EXISTS "Allow all operations on closing_position_config" ON closing_position_config;
CREATE POLICY "Allow all operations on closing_position_config"
  ON closing_position_config
  FOR ALL
  USING (true);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp (reuse existing or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for position_secondary_mappings
DROP TRIGGER IF EXISTS update_position_secondary_mappings_updated_at ON position_secondary_mappings;
CREATE TRIGGER update_position_secondary_mappings_updated_at
  BEFORE UPDATE ON position_secondary_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for closing_station_requirements
DROP TRIGGER IF EXISTS update_closing_station_requirements_updated_at ON closing_station_requirements;
CREATE TRIGGER update_closing_station_requirements_updated_at
  BEFORE UPDATE ON closing_station_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for staff_closing_training
DROP TRIGGER IF EXISTS update_staff_closing_training_updated_at ON staff_closing_training;
CREATE TRIGGER update_staff_closing_training_updated_at
  BEFORE UPDATE ON staff_closing_training
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT DATA
-- ============================================================================

-- Seed common primary-secondary position mappings
-- DT -> DT Pack (most common pairing)
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 1, 'Both', true
FROM positions p1, positions p2
WHERE p1.name = 'DT' AND p1.type = 'position'
  AND p2.name = 'DT Pack' AND p2.type = 'pack_position'
ON CONFLICT DO NOTHING;

-- DT2 -> DT Pack (backup for DT)
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 2, 'Both', true
FROM positions p1, positions p2
WHERE p1.name = 'DT2' AND p1.type = 'position'
  AND p2.name = 'DT Pack' AND p2.type = 'pack_position'
ON CONFLICT DO NOTHING;

-- Cook -> Cook2 (backup cook)
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 1, 'Both', true
FROM positions p1, positions p2
WHERE p1.name = 'Cook' AND p1.type = 'position'
  AND p2.name = 'Cook2' AND p2.type = 'position'
ON CONFLICT DO NOTHING;

-- Rst -> Rst Pack
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 1, 'Both', true
FROM positions p1, positions p2
WHERE p1.name = 'Rst' AND p1.type = 'position'
  AND p2.name = 'Rst Pack' AND p2.type = 'pack_position'
ON CONFLICT DO NOTHING;

-- Front -> DT Pack (cross-training)
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 3, 'Both', false
FROM positions p1, positions p2
WHERE p1.name = 'Front' AND p1.type = 'position'
  AND p2.name = 'DT Pack' AND p2.type = 'pack_position'
ON CONFLICT DO NOTHING;

-- Mid -> Rst Pack (cross-training)
INSERT INTO position_secondary_mappings (primary_position_id, secondary_position_id, priority, shift_type, auto_deploy)
SELECT p1.id, p2.id, 3, 'Both', false
FROM positions p1, positions p2
WHERE p1.name = 'Mid' AND p1.type = 'position'
  AND p2.name = 'Rst Pack' AND p2.type = 'pack_position'
ON CONFLICT DO NOTHING;

-- Seed closing station requirements for common night shift positions
-- DT position requires closing training on night shifts
INSERT INTO closing_station_requirements (position_id, requires_closing_training, shift_type, minimum_trained_staff, closing_start_time)
SELECT id, true, 'Night Shift', 1, '22:00'
FROM positions
WHERE name = 'DT' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Front position requires closing training on night shifts
INSERT INTO closing_station_requirements (position_id, requires_closing_training, shift_type, minimum_trained_staff, closing_start_time)
SELECT id, true, 'Night Shift', 1, '22:00'
FROM positions
WHERE name = 'Front' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Mid position requires closing training on night shifts
INSERT INTO closing_station_requirements (position_id, requires_closing_training, shift_type, minimum_trained_staff, closing_start_time)
SELECT id, true, 'Night Shift', 1, '22:00'
FROM positions
WHERE name = 'Mid' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Lobby position requires closing training on night shifts
INSERT INTO closing_station_requirements (position_id, requires_closing_training, shift_type, minimum_trained_staff, closing_start_time)
SELECT id, true, 'Night Shift', 1, '22:00'
FROM positions
WHERE name = 'Lobby' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Cook position requires closing training on night shifts
INSERT INTO closing_station_requirements (position_id, requires_closing_training, shift_type, minimum_trained_staff, closing_start_time)
SELECT id, true, 'Night Shift', 1, '22:00'
FROM positions
WHERE name = 'Cook' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Link cleaning_area positions to deployable positions
-- Lobby / Toilets -> Lobby position
INSERT INTO closing_position_config (cleaning_area_position_id, deployable_position_id, priority, shift_type)
SELECT ca.id, dp.id, 1, 'Night Shift'
FROM positions ca, positions dp
WHERE ca.name = 'Lobby / Toilets' AND ca.type = 'cleaning_area'
  AND dp.name = 'Lobby' AND dp.type = 'position'
ON CONFLICT DO NOTHING;

-- Front -> Front position
INSERT INTO closing_position_config (cleaning_area_position_id, deployable_position_id, priority, shift_type)
SELECT ca.id, dp.id, 1, 'Night Shift'
FROM positions ca, positions dp
WHERE ca.name = 'Front' AND ca.type = 'cleaning_area'
  AND dp.name = 'Front' AND dp.type = 'position'
ON CONFLICT DO NOTHING;

-- Kitchen -> Cook position
INSERT INTO closing_position_config (cleaning_area_position_id, deployable_position_id, priority, shift_type)
SELECT ca.id, dp.id, 1, 'Night Shift'
FROM positions ca, positions dp
WHERE ca.name = 'Kitchen' AND ca.type = 'cleaning_area'
  AND dp.name = 'Cook' AND dp.type = 'position'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get secondary positions for a primary position
CREATE OR REPLACE FUNCTION get_secondary_positions(
  primary_pos_id uuid,
  shift_type_filter text DEFAULT 'Both'
)
RETURNS TABLE (
  secondary_position_id uuid,
  secondary_position_name text,
  priority integer,
  auto_deploy boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as secondary_position_id,
    p.name as secondary_position_name,
    psm.priority,
    psm.auto_deploy
  FROM position_secondary_mappings psm
  JOIN positions p ON psm.secondary_position_id = p.id
  WHERE psm.primary_position_id = primary_pos_id
    AND psm.is_enabled = true
    AND (psm.shift_type = shift_type_filter OR psm.shift_type = 'Both' OR shift_type_filter = 'Both')
  ORDER BY psm.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if staff is closing-trained for a position
CREATE OR REPLACE FUNCTION is_closing_trained(
  staff_uuid uuid,
  position_uuid uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff_closing_training
    WHERE staff_id = staff_uuid
      AND position_id = position_uuid
      AND is_trained = true
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get all closing-trained staff for a position with seniority ranking
CREATE OR REPLACE FUNCTION get_closing_trained_staff(
  position_uuid uuid,
  shift_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  seniority_days integer,
  average_ranking numeric,
  manager_signed_off boolean,
  trained_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as staff_id,
    s.name as staff_name,
    EXTRACT(DAY FROM (now() - s.created_at))::integer as seniority_days,
    COALESCE(AVG(sr.rating), 0)::numeric as average_ranking,
    (sct.manager_signoff_date IS NOT NULL) as manager_signed_off,
    sct.trained_date
  FROM staff s
  JOIN staff_closing_training sct ON s.id = sct.staff_id
  LEFT JOIN staff_rankings sr ON s.id = sr.staff_id
  WHERE sct.position_id = position_uuid
    AND sct.is_trained = true
    AND (sct.expiry_date IS NULL OR sct.expiry_date > shift_date)
  GROUP BY s.id, s.name, s.created_at, sct.manager_signoff_date, sct.trained_date
  ORDER BY seniority_days DESC, average_ranking DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get closing coverage report for a shift
CREATE OR REPLACE FUNCTION get_closing_coverage_report(
  shift_date date,
  shift_type_filter text
)
RETURNS TABLE (
  position_name text,
  requires_closing boolean,
  minimum_required integer,
  currently_assigned integer,
  closing_trained_available integer,
  coverage_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name as position_name,
    csr.requires_closing_training as requires_closing,
    csr.minimum_trained_staff as minimum_required,
    COUNT(DISTINCT d.id)::integer as currently_assigned,
    (
      SELECT COUNT(DISTINCT sct.staff_id)
      FROM staff_closing_training sct
      WHERE sct.position_id = p.id
        AND sct.is_trained = true
        AND (sct.expiry_date IS NULL OR sct.expiry_date > shift_date)
    )::integer as closing_trained_available,
    CASE
      WHEN COUNT(DISTINCT d.id) >= csr.minimum_trained_staff THEN 'COVERED'
      WHEN COUNT(DISTINCT d.id) > 0 THEN 'PARTIAL'
      ELSE 'NOT_COVERED'
    END as coverage_status
  FROM positions p
  JOIN closing_station_requirements csr ON p.id = csr.position_id
  LEFT JOIN deployments d ON d.position = p.name
    AND d.date::date = shift_date
    AND d.shift_type = shift_type_filter
    AND d.is_closing_duty = true
  WHERE csr.is_active = true
    AND csr.shift_type = shift_type_filter
  GROUP BY p.id, p.name, csr.requires_closing_training, csr.minimum_trained_staff
  ORDER BY coverage_status ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE position_secondary_mappings IS 'Maps primary positions to complementary secondary positions for auto-deployment';
COMMENT ON TABLE closing_station_requirements IS 'Defines which positions require closing training for night shifts';
COMMENT ON TABLE staff_closing_training IS 'Tracks which staff members are trained and certified for closing duties';
COMMENT ON TABLE closing_position_config IS 'Links cleaning_area positions to deployable positions requiring closing duties';

COMMENT ON COLUMN deployments.has_secondary IS 'Indicates if a secondary position was automatically assigned';
COMMENT ON COLUMN deployments.is_closing_duty IS 'Indicates if this deployment includes closing responsibilities';
COMMENT ON COLUMN deployments.closing_validated IS 'Indicates if closing training was validated for this assignment';
