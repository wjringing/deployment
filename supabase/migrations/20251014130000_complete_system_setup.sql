/*
  # Complete System Setup - All Tables

  Creates all necessary tables for the KFC Deployment Management System
  including the Schedule Parser Enhancement features.
*/

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_under_18 boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('position', 'pack_position', 'area', 'cleaning_area')),
  created_at timestamptz DEFAULT now()
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  shift_type text DEFAULT 'Day Shift',
  position text NOT NULL,
  secondary text DEFAULT '',
  area text DEFAULT '',
  cleaning text DEFAULT '',
  break_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shift info table
CREATE TABLE IF NOT EXISTS shift_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text UNIQUE NOT NULL,
  forecast text DEFAULT '£0.00',
  day_shift_forecast text DEFAULT '£0.00',
  night_shift_forecast text DEFAULT '£0.00',
  weather text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sales data table
CREATE TABLE IF NOT EXISTS sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  today_data text DEFAULT '',
  last_week_data text DEFAULT '',
  last_year_data text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SCHEDULE TABLES
-- ============================================================================

-- Shift schedules table
CREATE TABLE IF NOT EXISTS shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL DEFAULT 'KFC',
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text DEFAULT '',
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Schedule employees table
CREATE TABLE IF NOT EXISTS schedule_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES shift_schedules(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Schedule shifts table
CREATE TABLE IF NOT EXISTS schedule_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES shift_schedules(id) ON DELETE CASCADE,
  schedule_employee_id uuid REFERENCES schedule_employees(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  day_of_week text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  shift_classification text NOT NULL,
  auto_assigned_to_deployment boolean DEFAULT false,
  deployment_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TRAINING & RANKING TABLES
-- ============================================================================

-- Staff training stations table
CREATE TABLE IF NOT EXISTS staff_training_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  job_code text,
  is_trained boolean DEFAULT false,
  is_primary_station boolean DEFAULT false,
  trained_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

-- Staff rankings table
CREATE TABLE IF NOT EXISTS staff_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  rating decimal NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comments text DEFAULT '',
  rated_by text,
  rated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

-- Staff sign-offs table
CREATE TABLE IF NOT EXISTS staff_sign_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  signed_off_by text NOT NULL,
  signed_off_at timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

-- ============================================================================
-- SCHEDULE PARSER ENHANCEMENT TABLES
-- ============================================================================

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

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sign_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_default_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_auto_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_capacity ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE POLICIES
-- ============================================================================

CREATE POLICY "Allow all operations on staff" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all operations on positions" ON positions FOR ALL USING (true);
CREATE POLICY "Allow all operations on deployments" ON deployments FOR ALL USING (true);
CREATE POLICY "Allow all operations on shift_info" ON shift_info FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales_data" ON sales_data FOR ALL USING (true);
CREATE POLICY "Allow all operations on shift_schedules" ON shift_schedules FOR ALL USING (true);
CREATE POLICY "Allow all operations on schedule_employees" ON schedule_employees FOR ALL USING (true);
CREATE POLICY "Allow all operations on schedule_shifts" ON schedule_shifts FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_training_stations" ON staff_training_stations FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_rankings" ON staff_rankings FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_sign_offs" ON staff_sign_offs FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_roles" ON staff_roles FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_work_status" ON staff_work_status FOR ALL USING (true);
CREATE POLICY "Allow all operations on station_position_mappings" ON station_position_mappings FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_default_positions" ON staff_default_positions FOR ALL USING (true);
CREATE POLICY "Allow all operations on deployment_auto_assignment_config" ON deployment_auto_assignment_config FOR ALL USING (true);
CREATE POLICY "Allow all operations on position_capacity" ON position_capacity FOR ALL USING (true);

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert default positions
INSERT INTO positions (name, type) VALUES
  ('DT', 'position'),
  ('DT2', 'position'),
  ('Cook', 'position'),
  ('Cook2', 'position'),
  ('Burgers', 'position'),
  ('Fries', 'position'),
  ('Chick', 'position'),
  ('Rst', 'position'),
  ('Lobby', 'position'),
  ('Front', 'position'),
  ('Mid', 'position'),
  ('Transfer', 'position'),
  ('T1', 'position'),
  ('DT Pack', 'pack_position'),
  ('Rst Pack', 'pack_position'),
  ('Deliv Pack', 'pack_position'),
  ('Cooks', 'area'),
  ('DT', 'area'),
  ('Front', 'area'),
  ('Mid', 'area'),
  ('Lobby', 'area'),
  ('Pck Mid', 'area'),
  ('Float / Bottlenecks', 'area'),
  ('Table Service / Lobby', 'area'),
  ('Lobby / Toilets', 'cleaning_area'),
  ('Front', 'cleaning_area'),
  ('Staff Room / Toilet', 'cleaning_area'),
  ('Kitchen', 'cleaning_area')
ON CONFLICT DO NOTHING;

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

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_deployments_date ON deployments(date);
CREATE INDEX IF NOT EXISTS idx_deployments_staff ON deployments(staff_id);
CREATE INDEX IF NOT EXISTS idx_deployments_date_shift ON deployments(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_schedule ON schedule_shifts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_staff ON schedule_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_staff ON staff_training_stations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_rankings_staff ON staff_rankings(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sign_offs_staff ON staff_sign_offs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_staff ON staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_work_status_staff ON staff_work_status(staff_id);
CREATE INDEX IF NOT EXISTS idx_station_mappings_station ON station_position_mappings(station_name);
CREATE INDEX IF NOT EXISTS idx_staff_default_positions_staff ON staff_default_positions(staff_id);
