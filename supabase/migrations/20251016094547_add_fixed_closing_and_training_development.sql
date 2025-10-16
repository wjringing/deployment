/*
  # Fixed Closing Assignments & Comprehensive Training Development Module

  ## Overview
  This migration adds two major feature enhancements:
  1. Fixed closing position assignments for specific employees
  2. Comprehensive training and development tracking system

  ## Part 1: Fixed Closing Position Assignments

  ### New Table: staff_fixed_closing_positions
  Allows managers to assign specific closing positions to staff members, overriding auto-assignment
  
  ## Part 2: Training and Development Module

  ### New Tables:
  - training_plans: Individual training plans for staff development
  - training_plan_items: Individual training activities within a plan
  - cross_training_opportunities: Identified gaps and cross-training recommendations
  - training_effectiveness_metrics: Track training outcomes and effectiveness
  - mandatory_training_assignments: Track mandatory training compliance

  ## Security
  - Row Level Security (RLS) enabled on all new tables
  - Public read/write access (consistent with existing architecture)

  ## Performance
  - Indexes on all foreign keys
  - Indexes on status and date fields for reporting
*/

-- ============================================================================
-- PART 1: FIXED CLOSING POSITION ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_fixed_closing_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  shift_type text NOT NULL DEFAULT 'Night Shift' CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')),
  day_of_week text CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', NULL)),
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  assigned_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  assigned_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, position_id, shift_type, day_of_week)
);

-- ============================================================================
-- PART 2: TRAINING AND DEVELOPMENT MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('Career Development', 'Compliance', 'Cross-Training', 'Upskilling', 'Onboarding')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled', 'On Hold')),
  start_date date,
  target_completion_date date,
  actual_completion_date date,
  created_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  description text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  item_type text NOT NULL DEFAULT 'Station Training' CHECK (item_type IN ('Station Training', 'Certification', 'Course', 'OJT', 'Assessment', 'Shadowing')),
  is_mandatory boolean DEFAULT false,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Failed', 'Skipped')),
  target_date date,
  completion_date date,
  trainer_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  hours_required numeric DEFAULT 0,
  hours_completed numeric DEFAULT 0,
  assessment_score numeric CHECK (assessment_score >= 0 AND assessment_score <= 100),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cross_training_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  recommended_station text NOT NULL,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('Skill Gap', 'Coverage Need', 'Career Path', 'Succession Planning', 'Business Growth')),
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  business_justification text NOT NULL,
  identified_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Identified' CHECK (status IN ('Identified', 'Approved', 'In Plan', 'Completed', 'Declined')),
  identified_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_effectiveness_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  training_plan_item_id uuid REFERENCES training_plan_items(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('Performance Score', 'Speed Improvement', 'Quality Score', 'Confidence Level', 'Error Rate', 'Customer Satisfaction')),
  baseline_value numeric,
  current_value numeric,
  measurement_date date DEFAULT CURRENT_DATE,
  measured_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mandatory_training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  training_name text NOT NULL,
  training_category text NOT NULL CHECK (training_category IN ('Safety', 'Compliance', 'Operations', 'Customer Service', 'Food Safety', 'HR Policy')),
  assigned_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  completion_date date,
  status text NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed', 'Overdue', 'Waived')),
  assigned_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  completion_verification_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  is_recurring boolean DEFAULT false,
  recurrence_months integer,
  next_due_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fixed_closing_staff ON staff_fixed_closing_positions(staff_id);
CREATE INDEX IF NOT EXISTS idx_fixed_closing_position ON staff_fixed_closing_positions(position_id);
CREATE INDEX IF NOT EXISTS idx_fixed_closing_active ON staff_fixed_closing_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_closing_shift ON staff_fixed_closing_positions(shift_type);

CREATE INDEX IF NOT EXISTS idx_training_plans_staff ON training_plans(staff_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_dates ON training_plans(start_date, target_completion_date);

CREATE INDEX IF NOT EXISTS idx_training_items_plan ON training_plan_items(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_training_items_status ON training_plan_items(status);
CREATE INDEX IF NOT EXISTS idx_training_items_mandatory ON training_plan_items(is_mandatory);

CREATE INDEX IF NOT EXISTS idx_cross_training_staff ON cross_training_opportunities(staff_id);
CREATE INDEX IF NOT EXISTS idx_cross_training_status ON cross_training_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_cross_training_priority ON cross_training_opportunities(priority);

CREATE INDEX IF NOT EXISTS idx_effectiveness_staff ON training_effectiveness_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_effectiveness_item ON training_effectiveness_metrics(training_plan_item_id);
CREATE INDEX IF NOT EXISTS idx_effectiveness_date ON training_effectiveness_metrics(measurement_date);

CREATE INDEX IF NOT EXISTS idx_mandatory_staff ON mandatory_training_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_mandatory_status ON mandatory_training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_mandatory_due ON mandatory_training_assignments(due_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE staff_fixed_closing_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_training_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_effectiveness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatory_training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view fixed closing positions"
  ON staff_fixed_closing_positions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage fixed closing positions"
  ON staff_fixed_closing_positions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view training plans"
  ON training_plans FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage training plans"
  ON training_plans FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view training plan items"
  ON training_plan_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage training plan items"
  ON training_plan_items FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view cross-training opportunities"
  ON cross_training_opportunities FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage cross-training opportunities"
  ON cross_training_opportunities FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view training effectiveness"
  ON training_effectiveness_metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage training effectiveness"
  ON training_effectiveness_metrics FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view mandatory training"
  ON mandatory_training_assignments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage mandatory training"
  ON mandatory_training_assignments FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

CREATE OR REPLACE VIEW v_staff_training_development AS
SELECT 
  s.id AS staff_id,
  s.name AS staff_name,
  COUNT(DISTINCT tp.id) AS total_plans,
  COUNT(DISTINCT CASE WHEN tp.status = 'Active' THEN tp.id END) AS active_plans,
  COUNT(DISTINCT CASE WHEN tp.status = 'Completed' THEN tp.id END) AS completed_plans,
  COUNT(DISTINCT tpi.id) AS total_training_items,
  COUNT(DISTINCT CASE WHEN tpi.status = 'Completed' THEN tpi.id END) AS completed_items,
  COUNT(DISTINCT CASE WHEN tpi.is_mandatory = true THEN tpi.id END) AS mandatory_items,
  COUNT(DISTINCT CASE WHEN tpi.is_mandatory = true AND tpi.status = 'Completed' THEN tpi.id END) AS completed_mandatory,
  COUNT(DISTINCT cto.id) AS cross_training_opportunities,
  COUNT(DISTINCT CASE WHEN cto.status = 'In Plan' THEN cto.id END) AS active_opportunities,
  COUNT(DISTINCT mta.id) AS mandatory_trainings,
  COUNT(DISTINCT CASE WHEN mta.status = 'Overdue' THEN mta.id END) AS overdue_trainings
FROM staff s
LEFT JOIN training_plans tp ON s.id = tp.staff_id
LEFT JOIN training_plan_items tpi ON tp.id = tpi.training_plan_id
LEFT JOIN cross_training_opportunities cto ON s.id = cto.staff_id
LEFT JOIN mandatory_training_assignments mta ON s.id = mta.staff_id
GROUP BY s.id, s.name;

CREATE OR REPLACE VIEW v_training_compliance_report AS
SELECT 
  s.id AS staff_id,
  s.name AS staff_name,
  mta.training_name,
  mta.training_category,
  mta.status,
  mta.assigned_date,
  mta.due_date,
  mta.completion_date,
  CASE 
    WHEN mta.status = 'Completed' THEN 'Compliant'
    WHEN mta.due_date < CURRENT_DATE AND mta.status != 'Completed' THEN 'Overdue'
    WHEN mta.due_date - CURRENT_DATE <= 7 THEN 'Due Soon'
    ELSE 'On Track'
  END AS compliance_status,
  mta.is_recurring,
  mta.next_due_date
FROM staff s
JOIN mandatory_training_assignments mta ON s.id = mta.staff_id
WHERE mta.status != 'Waived'
ORDER BY s.name, mta.due_date;

CREATE OR REPLACE VIEW v_cross_training_summary AS
SELECT 
  recommended_station,
  opportunity_type,
  priority,
  COUNT(*) AS opportunity_count,
  COUNT(CASE WHEN status = 'Identified' THEN 1 END) AS identified_count,
  COUNT(CASE WHEN status = 'Approved' THEN 1 END) AS approved_count,
  COUNT(CASE WHEN status = 'In Plan' THEN 1 END) AS in_plan_count,
  COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed_count
FROM cross_training_opportunities
GROUP BY recommended_station, opportunity_type, priority
ORDER BY 
  CASE priority 
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Low' THEN 4
  END,
  opportunity_count DESC;
