/*
  COMPLETE PRODUCTION DATABASE SETUP

  This creates ALL essential tables needed for the system.
  Run this in Supabase SQL Editor if you're missing core tables.
*/

-- ============================================================================
-- CORE TABLES (From September migrations)
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

-- Targets table
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type text NOT NULL CHECK (shift_type IN ('opening', 'mid', 'closing')),
  day_type text NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  position_name text NOT NULL,
  target_hours numeric(4,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shift_type, day_type, position_name)
);

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  station_code text UNIQUE,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- GDPR COMPLIANCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  consent_given boolean DEFAULT false,
  consent_date timestamptz DEFAULT now(),
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  changes jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SCHEDULE MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date date NOT NULL,
  shift_type text NOT NULL,
  pdf_url text DEFAULT '',
  parsed_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES schedule_employees(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  position text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TRAINING AND RANKING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_stations_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL UNIQUE,
  category text NOT NULL,
  requires_certification boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_training_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_id uuid REFERENCES training_stations_master(id) ON DELETE CASCADE,
  training_level text NOT NULL CHECK (training_level IN ('not_trained', 'in_training', 'competent', 'advanced', 'expert')),
  last_assessment_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_id)
);

CREATE TABLE IF NOT EXISTS staff_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_id uuid REFERENCES training_stations_master(id) ON DELETE CASCADE,
  rank_position integer NOT NULL DEFAULT 1,
  is_preferred boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_id, rank_position)
);

CREATE TABLE IF NOT EXISTS staff_sign_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_id uuid REFERENCES training_stations_master(id) ON DELETE CASCADE,
  signed_off_by text NOT NULL,
  sign_off_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- POSITION MAPPING AND CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_work_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
  role_id uuid REFERENCES staff_roles(id) ON DELETE SET NULL,
  employment_status text DEFAULT 'active',
  hire_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  position_name text NOT NULL,
  is_primary boolean DEFAULT false,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_default_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  position_name text NOT NULL,
  priority integer DEFAULT 0,
  is_preferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- MULTI-LOCATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  address text DEFAULT '',
  timezone text DEFAULT 'UTC',
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'viewer',
  default_location_id uuid REFERENCES locations(id),
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_location_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'read',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- ============================================================================
-- BREAK SCHEDULING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  break_type text NOT NULL,
  scheduled_start time NOT NULL,
  scheduled_end time NOT NULL,
  actual_start time,
  actual_end time,
  status text DEFAULT 'scheduled',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CHECKLISTS AND HANDOVER
-- ============================================================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shift_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES checklist_templates(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  completed_by text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid REFERENCES checklist_completions(id) ON DELETE CASCADE,
  item_id uuid REFERENCES checklist_items(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  handover_from text NOT NULL,
  handover_to text DEFAULT '',
  notes text NOT NULL,
  priority text DEFAULT 'normal',
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TRAINING DEVELOPMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_fixed_closing_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  position_name text NOT NULL,
  assigned_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_name)
);

CREATE TABLE IF NOT EXISTS training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  start_date date NOT NULL,
  target_completion_date date,
  actual_completion_date date,
  status text DEFAULT 'active',
  priority text DEFAULT 'normal',
  notes text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES training_plans(id) ON DELETE CASCADE,
  station_id uuid REFERENCES training_stations_master(id),
  target_level text NOT NULL,
  current_status text DEFAULT 'not_started',
  completion_date date,
  display_order integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_stations_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sign_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_default_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_item_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handover_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_fixed_closing_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE BASIC RLS POLICIES (Authenticated users have access)
-- ============================================================================

CREATE POLICY "Authenticated users full access staff" ON staff FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access positions" ON positions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access deployments" ON deployments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access shift_info" ON shift_info FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access sales_data" ON sales_data FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access targets" ON targets FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access stations" ON stations FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access gdpr_consent_records" ON gdpr_consent_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access gdpr_audit_logs" ON gdpr_audit_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access shift_schedules" ON shift_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access schedule_employees" ON schedule_employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access schedule_shifts" ON schedule_shifts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access training_stations_master" ON training_stations_master FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_training_stations" ON staff_training_stations FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_rankings" ON staff_rankings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_sign_offs" ON staff_sign_offs FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_roles" ON staff_roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_work_status" ON staff_work_status FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access station_position_mappings" ON station_position_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_default_positions" ON staff_default_positions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access locations" ON locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access user_profiles" ON user_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access user_location_access" ON user_location_access FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access break_schedules" ON break_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access checklist_templates" ON checklist_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access checklist_items" ON checklist_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access checklist_completions" ON checklist_completions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access checklist_item_completions" ON checklist_item_completions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access shift_handover_notes" ON shift_handover_notes FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access staff_fixed_closing_positions" ON staff_fixed_closing_positions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access training_plans" ON training_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access training_plan_items" ON training_plan_items FOR ALL TO authenticated USING (true);

-- ============================================================================
-- SEED DEFAULT DATA
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
  ('T1', 'position')
ON CONFLICT DO NOTHING;

-- Insert default stations
INSERT INTO stations (name, station_code, is_active, display_order, description)
VALUES
  ('Front Counter', 'FC', true, 1, 'Front of house cashier and customer service'),
  ('Drive-Thru Window', 'DTW', true, 2, 'Drive-thru window presenter'),
  ('Drive-Thru Order', 'DTO', true, 3, 'Drive-thru order taker'),
  ('Kitchen - Fry', 'KF', true, 4, 'Fry station operator'),
  ('Kitchen - Grill', 'KG', true, 5, 'Grill station operator'),
  ('Kitchen - Prep', 'KP', true, 6, 'Kitchen prep station'),
  ('Expeditor', 'EXP', true, 7, 'Order expeditor'),
  ('Lobby/Dining', 'LOB', true, 8, 'Lobby and dining area service'),
  ('Manager on Duty', 'MOD', true, 9, 'Shift manager'),
  ('Cash Office', 'CO', true, 10, 'Cash handling and reconciliation')
ON CONFLICT (name) DO NOTHING;
