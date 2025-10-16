/*
  # Sync Production Database with Development Schema

  ## Overview
  This migration syncs the production database with the latest development schema,
  adding all missing tables, columns, indexes, and RLS policies from recent migrations.

  ## Missing Tables to Add
  1. labor_sales_snapshots - Real-time labor vs sales tracking
  2. labor_sales_targets - Labor percentage targets by shift and day
  3. shift_performance_scorecards - Shift performance metrics
  4. performance_metrics - Detailed performance measurements
  5. auto_assignment_rules - Rules for automatic staff assignment
  6. assignment_history - History of deployment assignments

  ## Missing Columns
  - stations table missing: station_code, description, active fields

  ## Changes from Development
  - Development has separate stations table with different schema
  - Production has basic stations table but needs enhancement
  - Need to reconcile station_position_mappings differences

  ## Security
  - All tables have RLS enabled
  - Authenticated users have full access (will be restricted later for multi-location)
*/

-- ============================================================================
-- FEATURE 5: LABOR HOURS VS. SALES REAL-TIME CALCULATOR
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
-- FEATURE 6: SHIFT PERFORMANCE SCORECARD
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
-- ENHANCE EXISTING STATIONS TABLE
-- ============================================================================

-- Add missing columns to stations table if they don't exist
DO $$
BEGIN
  -- Add station_code if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'station_code'
  ) THEN
    ALTER TABLE stations ADD COLUMN station_code text;
  END IF;

  -- Make station_code unique if not already
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stations_station_code_key'
  ) THEN
    ALTER TABLE stations ADD CONSTRAINT stations_station_code_key UNIQUE (station_code);
  END IF;

  -- Add is_active if missing (but column 'active' exists, so use that)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'is_active'
  ) THEN
    -- Check if 'active' column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'stations' AND column_name = 'active'
    ) THEN
      -- Rename 'active' to 'is_active' for consistency
      ALTER TABLE stations RENAME COLUMN active TO is_active;
    ELSE
      -- Add is_active column
      ALTER TABLE stations ADD COLUMN is_active boolean DEFAULT true;
    END IF;
  END IF;

  -- Add display_order if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE stations ADD COLUMN display_order integer DEFAULT 0;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stations ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update station_position_mappings to have is_primary column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE station_position_mappings ADD COLUMN is_primary boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- FEATURE 8: ENHANCED AUTO-ASSIGNMENT SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  rule_type text NOT NULL,
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
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE labor_sales_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_performance_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES (Authenticated Users Full Access)
-- ============================================================================

-- Labor Sales Snapshots Policies
CREATE POLICY "Authenticated users can view labor_sales_snapshots"
  ON labor_sales_snapshots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage labor_sales_snapshots"
  ON labor_sales_snapshots FOR ALL
  TO authenticated USING (true);

-- Labor Sales Targets Policies
CREATE POLICY "Authenticated users can view labor_sales_targets"
  ON labor_sales_targets FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage labor_sales_targets"
  ON labor_sales_targets FOR ALL
  TO authenticated USING (true);

-- Shift Performance Scorecards Policies
CREATE POLICY "Authenticated users can view shift_performance_scorecards"
  ON shift_performance_scorecards FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage shift_performance_scorecards"
  ON shift_performance_scorecards FOR ALL
  TO authenticated USING (true);

-- Performance Metrics Policies
CREATE POLICY "Authenticated users can view performance_metrics"
  ON performance_metrics FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage performance_metrics"
  ON performance_metrics FOR ALL
  TO authenticated USING (true);

-- Auto Assignment Rules Policies
CREATE POLICY "Authenticated users can view auto_assignment_rules"
  ON auto_assignment_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage auto_assignment_rules"
  ON auto_assignment_rules FOR ALL
  TO authenticated USING (true);

-- Assignment History Policies
CREATE POLICY "Authenticated users can view assignment_history"
  ON assignment_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage assignment_history"
  ON assignment_history FOR ALL
  TO authenticated USING (true);

-- ============================================================================
-- CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_shift_date ON labor_sales_snapshots(shift_date);
CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_snapshot_time ON labor_sales_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_shift_type ON labor_sales_snapshots(shift_type);

CREATE INDEX IF NOT EXISTS idx_labor_sales_targets_shift_type ON labor_sales_targets(shift_type);
CREATE INDEX IF NOT EXISTS idx_labor_sales_targets_day_of_week ON labor_sales_targets(day_of_week);

CREATE INDEX IF NOT EXISTS idx_performance_scorecards_shift_date ON shift_performance_scorecards(shift_date);
CREATE INDEX IF NOT EXISTS idx_performance_scorecards_shift_type ON shift_performance_scorecards(shift_type);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_scorecard_id ON performance_metrics(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_auto_assignment_rules_active ON auto_assignment_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_rules_priority ON auto_assignment_rules(priority);

CREATE INDEX IF NOT EXISTS idx_assignment_history_deployment_id ON assignment_history(deployment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_staff_id ON assignment_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created_at ON assignment_history(created_at);

-- ============================================================================
-- CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Create or replace update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
CREATE TRIGGER update_labor_sales_snapshots_updated_at
  BEFORE UPDATE ON labor_sales_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labor_sales_targets_updated_at
  BEFORE UPDATE ON labor_sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_performance_scorecards_updated_at
  BEFORE UPDATE ON shift_performance_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_station_position_mappings_updated_at
  BEFORE UPDATE ON station_position_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_assignment_rules_updated_at
  BEFORE UPDATE ON auto_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT DATA
-- ============================================================================

-- Seed labor sales targets for all shift types and days of week
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

-- Update existing stations with station_code if they don't have one
UPDATE stations
SET station_code =
  CASE
    WHEN name = 'Front Counter' THEN 'FC'
    WHEN name = 'Drive-Thru Window' THEN 'DTW'
    WHEN name = 'Drive-Thru Order' THEN 'DTO'
    WHEN name = 'Kitchen - Fry' THEN 'KF'
    WHEN name = 'Kitchen - Grill' THEN 'KG'
    WHEN name = 'Kitchen - Prep' THEN 'KP'
    WHEN name = 'Expeditor' THEN 'EXP'
    WHEN name = 'Lobby/Dining' THEN 'LOB'
    WHEN name = 'Manager on Duty' THEN 'MOD'
    WHEN name = 'Cash Office' THEN 'CO'
    ELSE UPPER(SUBSTRING(name FROM 1 FOR 3))
  END
WHERE station_code IS NULL;

-- Seed additional default stations if they don't exist
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

-- Seed default auto-assignment rules
INSERT INTO auto_assignment_rules (rule_name, priority, is_active, rule_type, conditions, actions)
VALUES
  ('Certified Staff Priority', 10, true, 'skill_based',
   '{"requires_certification": true, "positions": ["Kitchen Manager", "Shift Supervisor"]}',
   '{"assign_to_position": "prioritize_certified"}'),
  ('Experience Level Matching', 20, true, 'seniority_based',
   '{"min_months_experience": 6, "positions": ["Team Leader", "Trainer"]}',
   '{"assign_to_position": "match_experience"}'),
  ('Peak Hours Staffing', 30, true, 'time_based',
   '{"hours": ["11:00-14:00", "17:00-20:00"], "min_staff_multiplier": 1.5}',
   '{"increase_staffing": true}'),
  ('Training Requirement', 40, true, 'skill_based',
   '{"requires_training": true, "max_trainees_per_trainer": 2}',
   '{"assign_trainer": true}'),
  ('Break Coverage', 50, true, 'coverage_based',
   '{"ensure_coverage": true, "min_staff_per_station": 1}',
   '{"maintain_minimum_coverage": true}')
ON CONFLICT (rule_name) DO NOTHING;
