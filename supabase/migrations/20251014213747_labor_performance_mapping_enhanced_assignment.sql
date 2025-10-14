/*
  # Features 5, 6, 7, and 8: Labor Calculator, Performance Scorecard, Station Mapping, and Enhanced Auto-Assignment

  ## 1. New Tables
  - labor_sales_snapshots
  - labor_sales_targets
  - shift_performance_scorecards
  - performance_metrics
  - stations
  - station_position_mappings
  - auto_assignment_rules
  - assignment_history

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users

  ## 3. Indexes
  - Add indexes on foreign keys and date fields
*/

-- Feature 5: Labor Hours vs. Sales Real-Time Calculator

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

-- Feature 6: Shift Performance Scorecard

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

-- Feature 7: Station Position Mapping

CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL UNIQUE,
  station_code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS station_position_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  position text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(station_id, position)
);

-- Feature 8: Enhanced Intelligent Deployment Auto-Assignment

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
  deployment_id uuid,
  staff_id uuid,
  assigned_position text NOT NULL,
  assignment_method text NOT NULL DEFAULT 'manual',
  rule_applied text DEFAULT '',
  assignment_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deployments') THEN
    ALTER TABLE assignment_history
    ADD CONSTRAINT assignment_history_deployment_id_fkey
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
    ALTER TABLE assignment_history
    ADD CONSTRAINT assignment_history_staff_id_fkey
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security

ALTER TABLE labor_sales_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_performance_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_position_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view labor sales snapshots" ON labor_sales_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert labor sales snapshots" ON labor_sales_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update labor sales snapshots" ON labor_sales_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete labor sales snapshots" ON labor_sales_snapshots FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view labor sales targets" ON labor_sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert labor sales targets" ON labor_sales_targets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update labor sales targets" ON labor_sales_targets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete labor sales targets" ON labor_sales_targets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view performance scorecards" ON shift_performance_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert performance scorecards" ON shift_performance_scorecards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update performance scorecards" ON shift_performance_scorecards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete performance scorecards" ON shift_performance_scorecards FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view performance metrics" ON performance_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert performance metrics" ON performance_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update performance metrics" ON performance_metrics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete performance metrics" ON performance_metrics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view stations" ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert stations" ON stations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update stations" ON stations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete stations" ON stations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view station position mappings" ON station_position_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert station position mappings" ON station_position_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update station position mappings" ON station_position_mappings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete station position mappings" ON station_position_mappings FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view auto assignment rules" ON auto_assignment_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert auto assignment rules" ON auto_assignment_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update auto assignment rules" ON auto_assignment_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete auto assignment rules" ON auto_assignment_rules FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view assignment history" ON assignment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert assignment history" ON assignment_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update assignment history" ON assignment_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete assignment history" ON assignment_history FOR DELETE TO authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_shift_date ON labor_sales_snapshots(shift_date);
CREATE INDEX IF NOT EXISTS idx_labor_sales_snapshots_snapshot_time ON labor_sales_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_labor_sales_targets_shift_type ON labor_sales_targets(shift_type);
CREATE INDEX IF NOT EXISTS idx_performance_scorecards_shift_date ON shift_performance_scorecards(shift_date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_scorecard_id ON performance_metrics(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_station_mappings_station_id ON station_position_mappings(station_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_deployment_id ON assignment_history(deployment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_staff_id ON assignment_history(staff_id);

-- Seed data
INSERT INTO labor_sales_targets (shift_type, day_of_week, target_labor_percentage, min_labor_percentage, max_labor_percentage)
VALUES
  ('opening', 0, 18.0, 15.0, 22.0), ('opening', 1, 18.0, 15.0, 22.0), ('opening', 2, 18.0, 15.0, 22.0),
  ('opening', 3, 18.0, 15.0, 22.0), ('opening', 4, 18.0, 15.0, 22.0), ('opening', 5, 20.0, 17.0, 24.0),
  ('opening', 6, 20.0, 17.0, 24.0), ('mid', 0, 16.0, 14.0, 20.0), ('mid', 1, 16.0, 14.0, 20.0),
  ('mid', 2, 16.0, 14.0, 20.0), ('mid', 3, 16.0, 14.0, 20.0), ('mid', 4, 16.0, 14.0, 20.0),
  ('mid', 5, 18.0, 15.0, 22.0), ('mid', 6, 18.0, 15.0, 22.0), ('closing', 0, 19.0, 16.0, 23.0),
  ('closing', 1, 19.0, 16.0, 23.0), ('closing', 2, 19.0, 16.0, 23.0), ('closing', 3, 19.0, 16.0, 23.0),
  ('closing', 4, 19.0, 16.0, 23.0), ('closing', 5, 21.0, 18.0, 25.0), ('closing', 6, 21.0, 18.0, 25.0)
ON CONFLICT (shift_type, day_of_week) DO NOTHING;

INSERT INTO stations (station_name, station_code, is_active, display_order)
VALUES
  ('Front Counter', 'FC', true, 1), ('Drive-Thru Window', 'DTW', true, 2), ('Drive-Thru Order', 'DTO', true, 3),
  ('Kitchen - Fry', 'KF', true, 4), ('Kitchen - Grill', 'KG', true, 5), ('Kitchen - Prep', 'KP', true, 6),
  ('Expeditor', 'EXP', true, 7), ('Lobby/Dining', 'LOB', true, 8), ('Manager on Duty', 'MOD', true, 9),
  ('Cash Office', 'CO', true, 10)
ON CONFLICT (station_name) DO NOTHING;

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

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_labor_sales_snapshots_updated_at BEFORE UPDATE ON labor_sales_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_labor_sales_targets_updated_at BEFORE UPDATE ON labor_sales_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_performance_scorecards_updated_at BEFORE UPDATE ON shift_performance_scorecards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_station_position_mappings_updated_at BEFORE UPDATE ON station_position_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_assignment_rules_updated_at BEFORE UPDATE ON auto_assignment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();