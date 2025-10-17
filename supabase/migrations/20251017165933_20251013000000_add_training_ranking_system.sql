/*
  # Training and Ranking System Integration

  ## Overview
  Comprehensive training and ranking system integrated with existing staff table.
  Enables training tracking, performance rankings, station sign-offs, and intelligent
  deployment assignment based on training qualifications and performance scores.

  ## New Tables

  ### staff_training_stations
  Tracks training completion status for each staff member across all KFC stations

  ### staff_rankings
  Multi-manager performance rankings for trained stations (1-10 scale)

  ### staff_sign_offs
  Formal manager sign-offs confirming station competency

  ### training_stations_master
  Master list of all available training stations with metadata

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access policies (consistent with existing architecture)

  ## Performance Optimizations
  - Indexes on all foreign keys
  - Composite indexes for common query patterns
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
  ('BOH Cook', 'BOH', 'Cook', 'Main cooking station', false, 1, true),
  ('BOH Cook2', 'BOH', 'Cook 2', 'Secondary cooking station', false, 2, true),
  ('FOH Cashier', 'FOH', 'Cashier', 'Takes customer orders', false, 10, true),
  ('FOH Guest Host', 'FOH', 'Guest Host', 'Greets customers', false, 11, true),
  ('FOH Pack', 'FOH', 'Packing', 'Assembles orders', false, 12, true),
  ('FOH Present', 'FOH', 'Present', 'Presents orders', false, 13, true),
  ('MOH Burgers', 'MOH', 'Burgers', 'Prepares burgers', false, 20, true),
  ('MOH Chicken Pack', 'MOH', 'Chicken Pack', 'Packs chicken', false, 21, true),
  ('MOH Sides', 'MOH', 'Sides', 'Prepares sides', false, 22, true),
  ('Freezer to Fryer', 'MOH', 'Freezer to Fryer', 'Manages chicken prep', false, 23, true),
  ('DT Order Taker', 'FOH', 'Drive-Thru Order Taker', 'Takes drive-thru orders', false, 30, true),
  ('DT Window', 'FOH', 'Drive-Thru Window', 'Manages drive-thru window', false, 31, true),
  ('Lobby', 'General', 'Lobby Maintenance', 'Maintains dining area', false, 40, true),
  ('Restocking', 'General', 'Restocking', 'Restocks supplies', false, 41, true),
  ('Cleaning', 'General', 'Cleaning', 'General cleaning', false, 42, true),
  ('Shift Runner', 'General', 'Shift Runner', 'Supervises shift', true, 50, true),
  ('Opening Procedures', 'General', 'Opening Procedures', 'Opening checklist', true, 51, true),
  ('Closing Procedures', 'General', 'Closing Procedures', 'Closing checklist', true, 52, true),
  ('Cash Handling', 'General', 'Cash Handling', 'Till management', true, 53, true)
ON CONFLICT (station_name) DO NOTHING;