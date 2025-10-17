/*
  # Complete System Setup - Core Tables for Development Database
  
  Creates all necessary tables for the KFC Deployment Management System.
  This migration adds all missing core tables needed for the app to function.
  
  ## New Tables
  1. stations - Physical work stations
  2. station_position_mappings - Maps positions to stations
  3. shift_schedules - Weekly schedule uploads
  4. schedule_employees - Employees in uploaded schedules
  5. schedule_shifts - Individual shifts from schedules
  6. staff_training_stations - Staff training records
  7. staff_rankings - Staff performance ratings
  8. staff_sign_offs - Station sign-off certifications
  9. labor_sales_snapshots - Real-time labor vs sales tracking
  10. labor_sales_targets - Labor percentage targets
  11. shift_performance_scorecards - Shift performance metrics
  12. performance_metrics - Detailed performance measurements
  13. auto_assignment_rules - Rules for automatic staff assignment
  14. assignment_history - History of deployment assignments
  15. training_modules - Training course modules
  16. staff_training_records - Training completion records
  17. staff_certifications - Staff certifications
  18. checklists - Checklist templates
  19. checklist_items - Individual checklist items
  20. handover_notes - Shift handover notes
  
  ## Security
  - All tables have RLS enabled
  - Authenticated users have full access (will be restricted later for multi-location)
*/

-- ============================================================================
-- STATIONS AND MAPPINGS
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  position_name text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SCHEDULE TABLES
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS schedule_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES shift_schedules(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS staff_sign_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  signed_off_by text NOT NULL,
  signed_off_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

-- ============================================================================
-- TRAINING DEVELOPMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL UNIQUE,
  module_name text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  duration_minutes integer DEFAULT 0,
  required_for_positions text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  completion_date date,
  expiry_date date,
  score integer CHECK (score >= 0 AND score <= 100),
  trainer_name text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, module_id)
);

CREATE TABLE IF NOT EXISTS staff_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  certification_name text NOT NULL,
  certification_number text DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  issuing_body text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- LABOR SALES TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS labor_sales_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  snapshot_time timestamptz NOT NULL DEFAULT now(),
  total_labor_hours numeric(10,2) NOT NULL DEFAULT 0,
  total_sales numeric(10,2) NOT NULL DEFAULT 0,
  labor_percentage numeric(5,2) NOT NULL DEFAULT 0,
  target_labor_percentage numeric(5,2) NOT NULL DEFAULT 0,
  variance numeric(5,2) NOT NULL DEFAULT 0,
  staff_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor_sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  target_labor_percentage numeric(5,2) NOT NULL DEFAULT 18.0,
  min_labor_percentage numeric(5,2) NOT NULL DEFAULT 15.0,
  max_labor_percentage numeric(5,2) NOT NULL DEFAULT 22.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shift_type, day_of_week)
);

-- ============================================================================
-- PERFORMANCE SCORECARD
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_performance_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  sales_target numeric(10,2) NOT NULL DEFAULT 0,
  actual_sales numeric(10,2) NOT NULL DEFAULT 0,
  sales_score integer NOT NULL DEFAULT 0 CHECK (sales_score >= 0 AND sales_score <= 100),
  labor_efficiency_score integer NOT NULL DEFAULT 0 CHECK (labor_efficiency_score >= 0 AND labor_efficiency_score <= 100),
  speed_of_service_score integer NOT NULL DEFAULT 0 CHECK (speed_of_service_score >= 0 AND speed_of_service_score <= 100),
  quality_score integer NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  checklist_completion_score integer NOT NULL DEFAULT 0 CHECK (checklist_completion_score >= 0 AND checklist_completion_score <= 100),
  overall_score integer NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  shift_manager text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shift_date, shift_type)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id uuid NOT NULL REFERENCES shift_performance_scorecards(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  target_value numeric(10,2) NOT NULL DEFAULT 0,
  actual_value numeric(10,2) NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- AUTO ASSIGNMENT SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  rule_type text NOT NULL CHECK (rule_type IN ('skill_based', 'seniority_based', 'time_based', 'coverage_based')),
  conditions jsonb NOT NULL DEFAULT '{}',
  actions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  assigned_position text NOT NULL,
  assignment_method text NOT NULL DEFAULT 'manual',
  rule_applied text DEFAULT '',
  assignment_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CHECKLISTS AND HANDOVER
-- ============================================================================

CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  shift_type text NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES checklists(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  is_critical boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  outgoing_manager text NOT NULL,
  incoming_manager text DEFAULT '',
  sales_summary text DEFAULT '',
  issues_concerns text DEFAULT '',
  action_items text DEFAULT '',
  staff_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shift_date, shift_type)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sign_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_sales_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_performance_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Stations
CREATE POLICY "Authenticated users can view stations"
  ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage stations"
  ON stations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Station Position Mappings
CREATE POLICY "Authenticated users can view station_position_mappings"
  ON station_position_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage station_position_mappings"
  ON station_position_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shift Schedules
CREATE POLICY "Authenticated users can view shift_schedules"
  ON shift_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage shift_schedules"
  ON shift_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Schedule Employees
CREATE POLICY "Authenticated users can view schedule_employees"
  ON schedule_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage schedule_employees"
  ON schedule_employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Schedule Shifts
CREATE POLICY "Authenticated users can view schedule_shifts"
  ON schedule_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage schedule_shifts"
  ON schedule_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Training Stations
CREATE POLICY "Authenticated users can view staff_training_stations"
  ON staff_training_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage staff_training_stations"
  ON staff_training_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Rankings
CREATE POLICY "Authenticated users can view staff_rankings"
  ON staff_rankings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage staff_rankings"
  ON staff_rankings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Sign-offs
CREATE POLICY "Authenticated users can view staff_sign_offs"
  ON staff_sign_offs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage staff_sign_offs"
  ON staff_sign_offs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Training Modules
CREATE POLICY "Authenticated users can view training_modules"
  ON training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage training_modules"
  ON training_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Training Records
CREATE POLICY "Authenticated users can view staff_training_records"
  ON staff_training_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage staff_training_records"
  ON staff_training_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Certifications
CREATE POLICY "Authenticated users can view staff_certifications"
  ON staff_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage staff_certifications"
  ON staff_certifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Labor Sales Snapshots
CREATE POLICY "Authenticated users can view labor_sales_snapshots"
  ON labor_sales_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage labor_sales_snapshots"
  ON labor_sales_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Labor Sales Targets
CREATE POLICY "Authenticated users can view labor_sales_targets"
  ON labor_sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage labor_sales_targets"
  ON labor_sales_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shift Performance Scorecards
CREATE POLICY "Authenticated users can view shift_performance_scorecards"
  ON shift_performance_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage shift_performance_scorecards"
  ON shift_performance_scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Performance Metrics
CREATE POLICY "Authenticated users can view performance_metrics"
  ON performance_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage performance_metrics"
  ON performance_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto Assignment Rules
CREATE POLICY "Authenticated users can view auto_assignment_rules"
  ON auto_assignment_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage auto_assignment_rules"
  ON auto_assignment_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Assignment History
CREATE POLICY "Authenticated users can view assignment_history"
  ON assignment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage assignment_history"
  ON assignment_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checklists
CREATE POLICY "Authenticated users can view checklists"
  ON checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage checklists"
  ON checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checklist Items
CREATE POLICY "Authenticated users can view checklist_items"
  ON checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage checklist_items"
  ON checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Handover Notes
CREATE POLICY "Authenticated users can view handover_notes"
  ON handover_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage handover_notes"
  ON handover_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_station_position_mappings_station ON station_position_mappings(station_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_week ON shift_schedules(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_date ON schedule_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_training_stations_staff ON staff_training_stations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_rankings_staff ON staff_rankings(staff_id);
CREATE INDEX IF NOT EXISTS idx_training_records_staff ON staff_training_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_date ON labor_sales_snapshots(shift_date);
CREATE INDEX IF NOT EXISTS idx_performance_scorecards_date ON shift_performance_scorecards(shift_date);
CREATE INDEX IF NOT EXISTS idx_assignment_history_deployment ON assignment_history(deployment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_staff ON assignment_history(staff_id);

-- ============================================================================
-- SEED DEFAULT DATA
-- ============================================================================

-- Seed default stations
INSERT INTO stations (name, station_code, description, is_active, display_order)
VALUES
  ('Front Counter', 'FC', 'Front of house cashier and customer service', true, 1),
  ('Drive-Thru Window', 'DTW', 'Drive-thru window presenter', true, 2),
  ('Drive-Thru Order', 'DTO', 'Drive-thru order taker', true, 3),
  ('Kitchen - Fry', 'KF', 'Fry station operator', true, 4),
  ('Kitchen - Grill', 'KG', 'Grill station operator', true, 5),
  ('Kitchen - Prep', 'KP', 'Kitchen prep station', true, 6),
  ('Expeditor', 'EXP', 'Order expeditor', true, 7),
  ('Lobby/Dining', 'LOB', 'Lobby and dining area service', true, 8),
  ('Manager on Duty', 'MOD', 'Shift manager', true, 9),
  ('Cash Office', 'CO', 'Cash handling and reconciliation', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Seed labor sales targets
INSERT INTO labor_sales_targets (shift_type, day_of_week, target_labor_percentage, min_labor_percentage, max_labor_percentage)
VALUES
  ('opening', 0, 18.0, 15.0, 22.0),
  ('opening', 1, 18.0, 15.0, 22.0),
  ('opening', 2, 18.0, 15.0, 22.0),
  ('opening', 3, 18.0, 15.0, 22.0),
  ('opening', 4, 18.0, 15.0, 22.0),
  ('opening', 5, 20.0, 17.0, 24.0),
  ('opening', 6, 20.0, 17.0, 24.0),
  ('mid', 0, 16.0, 14.0, 20.0),
  ('mid', 1, 16.0, 14.0, 20.0),
  ('mid', 2, 16.0, 14.0, 20.0),
  ('mid', 3, 16.0, 14.0, 20.0),
  ('mid', 4, 16.0, 14.0, 20.0),
  ('mid', 5, 18.0, 15.0, 22.0),
  ('mid', 6, 18.0, 15.0, 22.0),
  ('closing', 0, 19.0, 16.0, 23.0),
  ('closing', 1, 19.0, 16.0, 23.0),
  ('closing', 2, 19.0, 16.0, 23.0),
  ('closing', 3, 19.0, 16.0, 23.0),
  ('closing', 4, 19.0, 16.0, 23.0),
  ('closing', 5, 21.0, 18.0, 25.0),
  ('closing', 6, 21.0, 18.0, 25.0)
ON CONFLICT (shift_type, day_of_week) DO NOTHING;
