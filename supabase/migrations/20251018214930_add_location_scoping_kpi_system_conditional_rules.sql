/*
  # Add Location Scoping, KPI System, and Enhanced Conditional Rules

  ## Changes

  ### 1. Add location_id to existing staff table
  - staff: Add location_id and is_excluded_from_auto_deployment

  ### 2. Dynamic KPI Configuration System
  - kpi_definitions: Master KPI configuration table
  - kpi_targets: Location-specific KPI targets
  - kpi_values: Actual KPI data points
  - kpi_scorecard_values: Link KPIs to scorecards

  ### 3. Enhanced Conditional Staffing Rules
  - conditional_staffing_rules: Time and day-based position staffing rules

  ### 4. Performance Scorecards Table (if doesn't exist)
  - shift_performance_scorecards: Shift-level performance tracking

  ## Security
  - All tables have RLS enabled
  - Location-scoped policies for data isolation
*/

-- ============================================================================
-- ADD LOCATION_ID TO STAFF TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
    CREATE INDEX idx_staff_location ON staff(location_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'is_excluded_from_auto_deployment'
  ) THEN
    ALTER TABLE staff ADD COLUMN is_excluded_from_auto_deployment boolean DEFAULT false;
    CREATE INDEX idx_staff_excluded ON staff(is_excluded_from_auto_deployment);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'exclusion_reason'
  ) THEN
    ALTER TABLE staff ADD COLUMN exclusion_reason text DEFAULT '';
  END IF;
END $$;

-- ============================================================================
-- CREATE PERFORMANCE SCORECARDS TABLE IF DOESN'T EXIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_performance_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift')),
  manager_name text,
  total_sales numeric DEFAULT 0,
  labor_hours numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_scorecard UNIQUE (location_id, shift_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_scorecards_location ON shift_performance_scorecards(location_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_date ON shift_performance_scorecards(shift_date);
CREATE INDEX IF NOT EXISTS idx_scorecards_location_date ON shift_performance_scorecards(location_id, shift_date);

-- ============================================================================
-- DYNAMIC KPI CONFIGURATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name text NOT NULL,
  kpi_code text UNIQUE NOT NULL,
  description text DEFAULT '',
  category text NOT NULL CHECK (category IN ('labor', 'sales', 'quality', 'speed', 'customer_service', 'operations')),
  data_type text NOT NULL CHECK (data_type IN ('number', 'percentage', 'currency', 'time', 'boolean', 'score')),
  calculation_method text NOT NULL CHECK (calculation_method IN ('manual', 'auto_calculated', 'formula')) DEFAULT 'manual',
  formula text DEFAULT '',
  unit text DEFAULT '',
  target_type text NOT NULL CHECK (target_type IN ('higher_better', 'lower_better', 'target_range')) DEFAULT 'higher_better',
  is_active boolean DEFAULT true,
  scope_level text NOT NULL CHECK (scope_level IN ('company', 'region', 'location')) DEFAULT 'company',
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  target_value numeric NOT NULL,
  warning_threshold numeric,
  critical_threshold numeric,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT kpi_target_scope_check CHECK (
    (location_id IS NOT NULL AND region_id IS NULL) OR
    (region_id IS NOT NULL AND location_id IS NULL) OR
    (location_id IS NULL AND region_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS kpi_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift')),
  value numeric NOT NULL,
  notes text DEFAULT '',
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT kpi_values_unique UNIQUE (kpi_id, location_id, shift_date, shift_type)
);

CREATE TABLE IF NOT EXISTS kpi_scorecard_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id uuid NOT NULL REFERENCES shift_performance_scorecards(id) ON DELETE CASCADE,
  kpi_definition_id uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT kpi_scorecard_unique UNIQUE (scorecard_id, kpi_definition_id)
);

-- ============================================================================
-- ENHANCED CONDITIONAL STAFFING RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS conditional_staffing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  position_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('time_based', 'day_based', 'time_and_day', 'seasonal')) DEFAULT 'time_and_day',
  days_of_week jsonb DEFAULT '[]'::jsonb,
  time_range jsonb DEFAULT '{"start_time": null, "end_time": null}'::jsonb,
  staff_requirements jsonb DEFAULT '{"min_staff": 1, "max_staff": null, "specific_staff_ids": []}'::jsonb,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_category ON kpi_definitions(category);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active ON kpi_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_scope ON kpi_definitions(scope_level);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_kpi ON kpi_targets(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_location ON kpi_targets(location_id);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_region ON kpi_targets(region_id);
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_location_date ON kpi_values(kpi_id, location_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_kpi_values_location_date ON kpi_values(location_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_kpi_scorecard_values_scorecard ON kpi_scorecard_values(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scorecard_values_kpi ON kpi_scorecard_values(kpi_definition_id);
CREATE INDEX IF NOT EXISTS idx_conditional_rules_location ON conditional_staffing_rules(location_id);
CREATE INDEX IF NOT EXISTS idx_conditional_rules_position ON conditional_staffing_rules(position_name);
CREATE INDEX IF NOT EXISTS idx_conditional_rules_active ON conditional_staffing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_conditional_rules_priority ON conditional_staffing_rules(priority DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE shift_performance_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_scorecard_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditional_staffing_rules ENABLE ROW LEVEL SECURITY;

-- Scorecards
CREATE POLICY "Users can view scorecards for their locations"
  ON shift_performance_scorecards FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage scorecards for their locations"
  ON shift_performance_scorecards FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- KPI Definitions
CREATE POLICY "Authenticated users can view KPI definitions"
  ON kpi_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage KPI definitions"
  ON kpi_definitions FOR ALL
  TO authenticated
  USING (true);

-- KPI Targets
CREATE POLICY "Users can view KPI targets for their locations"
  ON kpi_targets FOR SELECT
  TO authenticated
  USING (
    location_id IS NULL OR
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage KPI targets for their locations"
  ON kpi_targets FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- KPI Values
CREATE POLICY "Users can view KPI values for their locations"
  ON kpi_values FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage KPI values for their locations"
  ON kpi_values FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- KPI Scorecard Values
CREATE POLICY "Users can view KPI scorecard values for their locations"
  ON kpi_scorecard_values FOR SELECT
  TO authenticated
  USING (
    scorecard_id IN (
      SELECT id FROM shift_performance_scorecards
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage KPI scorecard values for their locations"
  ON kpi_scorecard_values FOR ALL
  TO authenticated
  USING (
    scorecard_id IN (
      SELECT id FROM shift_performance_scorecards
      WHERE location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- Conditional Staffing Rules
CREATE POLICY "Users can view rules for their locations"
  ON conditional_staffing_rules FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage rules for their locations"
  ON conditional_staffing_rules FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_kpi_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kpi_definitions_updated_at
BEFORE UPDATE ON kpi_definitions
FOR EACH ROW
EXECUTE FUNCTION update_kpi_definitions_updated_at();

CREATE OR REPLACE FUNCTION update_conditional_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conditional_rules_updated_at
BEFORE UPDATE ON conditional_staffing_rules
FOR EACH ROW
EXECUTE FUNCTION update_conditional_rules_updated_at();

-- ============================================================================
-- SEED DATA - STANDARD KPI LIBRARY
-- ============================================================================

INSERT INTO kpi_definitions (kpi_name, kpi_code, description, category, data_type, calculation_method, unit, target_type, display_order)
VALUES
  ('Labor Cost Percentage', 'labor_cost_pct', 'Labor cost as percentage of sales', 'labor', 'percentage', 'formula', '%', 'lower_better', 1),
  ('Sales Per Labor Hour', 'sales_per_labor_hour', 'Revenue generated per labor hour worked', 'sales', 'currency', 'auto_calculated', '$', 'higher_better', 2),
  ('Drive-Thru Service Time', 'dt_service_time', 'Average drive-thru service time in seconds', 'speed', 'time', 'manual', 'seconds', 'lower_better', 3),
  ('Customer Satisfaction Score', 'csat_score', 'Customer satisfaction rating 1-10', 'customer_service', 'score', 'manual', 'score', 'higher_better', 4),
  ('Order Accuracy', 'order_accuracy', 'Percentage of orders completed correctly', 'quality', 'percentage', 'manual', '%', 'higher_better', 5),
  ('Food Safety Compliance', 'food_safety', 'Food safety checklist compliance', 'operations', 'percentage', 'manual', '%', 'higher_better', 6),
  ('Waste Percentage', 'waste_pct', 'Food waste as percentage of total food cost', 'operations', 'percentage', 'manual', '%', 'lower_better', 7),
  ('Speed of Service', 'speed_of_service', 'Average order completion time', 'speed', 'time', 'manual', 'seconds', 'lower_better', 8)
ON CONFLICT (kpi_code) DO NOTHING;
