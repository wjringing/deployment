/*
  # Schedule Parser Enhancements

  1. New Tables
    - `staff_roles`: Track staff roles (Team Member, Cook, Shift Runner, Manager)
    - `staff_work_status`: Track work status (active, holiday_only, visiting, inactive)
    - `station_position_mappings`: Link training stations to deployment positions
    - `staff_default_positions`: Store default position preferences per staff
    - `deployment_auto_assignment_config`: Configuration for auto-assignment behavior
    - `position_capacity`: Position capacity limits per shift

  2. Changes
    - Insert default configuration
    - Insert default station-position mappings
    - Create indexes for performance

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated access
*/

-- Staff roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Team Member', 'Cook', 'Shift Runner', 'Manager')),
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Staff work status table
CREATE TABLE IF NOT EXISTS staff_work_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'holiday_only', 'visiting', 'inactive')),
  home_store text DEFAULT NULL,
  notes text DEFAULT '',
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Station-position mappings table
CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  station_category text NOT NULL CHECK (station_category IN ('BOH', 'FOH', 'MOH')),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(station_name, position_id)
);

-- Staff default positions table
CREATE TABLE IF NOT EXISTS staff_default_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  day_of_week text DEFAULT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_id, shift_type)
);

-- Auto-assignment configuration table
CREATE TABLE IF NOT EXISTS deployment_auto_assignment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text UNIQUE NOT NULL,
  enabled boolean DEFAULT true,
  use_training_stations boolean DEFAULT true,
  use_rankings boolean DEFAULT true,
  use_default_positions boolean DEFAULT true,
  min_ranking_threshold decimal DEFAULT 3.0,
  prefer_signed_off_only boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Position capacity table
CREATE TABLE IF NOT EXISTS position_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  max_concurrent integer DEFAULT 1,
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(position_id, shift_type)
);

-- Enable RLS
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_default_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_auto_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_capacity ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Allow authenticated access to staff_roles"
  ON staff_roles FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to staff_work_status"
  ON staff_work_status FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to station_position_mappings"
  ON station_position_mappings FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to staff_default_positions"
  ON staff_default_positions FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to deployment_auto_assignment_config"
  ON deployment_auto_assignment_config FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated access to position_capacity"
  ON position_capacity FOR ALL TO authenticated USING (true);

-- Create public access policies (for compatibility with current system)
CREATE POLICY "Allow public access to staff_roles"
  ON staff_roles FOR ALL USING (true);

CREATE POLICY "Allow public access to staff_work_status"
  ON staff_work_status FOR ALL USING (true);

CREATE POLICY "Allow public access to station_position_mappings"
  ON station_position_mappings FOR ALL USING (true);

CREATE POLICY "Allow public access to staff_default_positions"
  ON staff_default_positions FOR ALL USING (true);

CREATE POLICY "Allow public access to deployment_auto_assignment_config"
  ON deployment_auto_assignment_config FOR ALL USING (true);

CREATE POLICY "Allow public access to position_capacity"
  ON position_capacity FOR ALL USING (true);

-- Insert default configuration
INSERT INTO deployment_auto_assignment_config (
  config_name,
  enabled,
  use_training_stations,
  use_rankings,
  use_default_positions,
  min_ranking_threshold,
  prefer_signed_off_only
) VALUES (
  'default',
  true,
  true,
  true,
  true,
  3.0,
  false
) ON CONFLICT (config_name) DO NOTHING;

-- Insert default station-position mappings
INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'BOH Cook', 'BOH', id, 1 FROM positions WHERE name = 'Cook' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'BOH Cook', 'BOH', id, 2 FROM positions WHERE name = 'Cook2' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Burgers', 'MOH', id, 1 FROM positions WHERE name = 'Burgers' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Chicken Pack', 'MOH', id, 1 FROM positions WHERE name = 'Chick' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'MOH Sides', 'MOH', id, 1 FROM positions WHERE name = 'Fries' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'Freezer to Fryer', 'MOH', id, 1 FROM positions WHERE name = 'Rst' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 1 FROM positions WHERE name = 'Front' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 2 FROM positions WHERE name = 'Mid' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Cashier', 'FOH', id, 3 FROM positions WHERE name = 'DT' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Guest Host', 'FOH', id, 1 FROM positions WHERE name = 'Lobby' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Pack', 'FOH', id, 1 FROM positions WHERE name = 'DT Pack' AND type = 'pack_position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Pack', 'FOH', id, 2 FROM positions WHERE name = 'Rst Pack' AND type = 'pack_position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Present', 'FOH', id, 1 FROM positions WHERE name = 'DT' AND type = 'position'
ON CONFLICT DO NOTHING;

INSERT INTO station_position_mappings (station_name, station_category, position_id, priority)
SELECT 'FOH Present', 'FOH', id, 2 FROM positions WHERE name = 'DT2' AND type = 'position'
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_id ON staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_work_status_staff_id ON staff_work_status(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_work_status_status ON staff_work_status(status);
CREATE INDEX IF NOT EXISTS idx_station_mappings_station ON station_position_mappings(station_name);
CREATE INDEX IF NOT EXISTS idx_station_mappings_position ON station_position_mappings(position_id);
CREATE INDEX IF NOT EXISTS idx_staff_default_positions_staff ON staff_default_positions(staff_id);
CREATE INDEX IF NOT EXISTS idx_deployments_date_shift_position ON deployments(date, shift_type, position);