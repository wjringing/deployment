/*
  # Add Shift Schedule Management Tables

  ## Overview
  Creates tables for storing and managing uploaded shift schedules from TeamLive PDFs.
  Includes automatic staff matching and deployment assignment tracking.

  ## New Tables
  
  ### shift_schedules
  Main table for storing uploaded schedule metadata
  - `id` (uuid, primary key) - Unique schedule identifier
  - `location` (text) - KFC location name
  - `week_start_date` (date) - First day of the schedule week
  - `week_end_date` (date) - Last day of the schedule week
  - `uploaded_at` (timestamptz) - Upload timestamp
  - `uploaded_by` (text) - Username of uploader
  - `raw_data` (jsonb) - Complete parsed schedule data for audit
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### schedule_employees
  Stores employee records from uploaded schedules
  - `id` (uuid, primary key) - Unique employee record identifier
  - `schedule_id` (uuid, foreign key) - Links to shift_schedules
  - `name` (text) - Employee name from TeamLive
  - `role` (text) - Employee role (Cook/Team Member/Shift Runner)
  - `staff_id` (uuid, foreign key, nullable) - Links to staff table when matched
  - `created_at` (timestamptz) - Record creation timestamp

  ### schedule_shifts
  Stores individual shift records with classification and assignment tracking
  - `id` (uuid, primary key) - Unique shift identifier
  - `schedule_id` (uuid, foreign key) - Links to shift_schedules
  - `schedule_employee_id` (uuid, foreign key) - Links to schedule_employees
  - `staff_id` (uuid, foreign key, nullable) - Links to staff table when matched
  - `shift_date` (date) - Date of the shift
  - `day_of_week` (text) - Day name (monday, tuesday, etc.)
  - `start_time` (text) - Shift start time (e.g., "3:00 PM")
  - `end_time` (text) - Shift end time (e.g., "11:00 PM")
  - `shift_classification` (text) - Day Shift, Night Shift, or Both Shifts
  - `auto_assigned_to_deployment` (boolean) - Assignment tracking flag
  - `deployment_id` (uuid, foreign key, nullable) - Links to deployment if assigned
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## Shift Classification Rules
  - **Day Shift**: end_time ≤ 18:00
  - **Night Shift**: start_time > 15:00 AND end_time > 22:00
  - **Both Shifts**: start_time < 15:00 AND 18:01 ≤ end_time ≤ 22:00

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access policies (consistent with existing app architecture)
  - Audit trail via created_at/updated_at timestamps

  ## Performance
  - Indexes on foreign keys for efficient joins
  - Indexes on date fields for date-range queries
  - Index on shift_classification for filtering
  - Composite indexes for common query patterns

  ## Triggers
  - Automatic updated_at timestamp management
*/

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Create shift_schedules table
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

-- Create schedule_employees table
CREATE TABLE IF NOT EXISTS schedule_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Team Member Deployment',
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create schedule_shifts table
CREATE TABLE IF NOT EXISTS schedule_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  schedule_employee_id uuid NOT NULL REFERENCES schedule_employees(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  day_of_week text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  shift_classification text NOT NULL DEFAULT 'Day Shift',
  auto_assigned_to_deployment boolean DEFAULT false,
  deployment_id uuid REFERENCES deployments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- shift_schedules indexes
CREATE INDEX IF NOT EXISTS idx_shift_schedules_dates 
  ON shift_schedules(week_start_date, week_end_date);

CREATE INDEX IF NOT EXISTS idx_shift_schedules_location 
  ON shift_schedules(location);

-- schedule_employees indexes
CREATE INDEX IF NOT EXISTS idx_schedule_employees_schedule 
  ON schedule_employees(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_employees_staff 
  ON schedule_employees(staff_id);

CREATE INDEX IF NOT EXISTS idx_schedule_employees_name 
  ON schedule_employees(name);

-- schedule_shifts indexes
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_date 
  ON schedule_shifts(shift_date);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_schedule 
  ON schedule_shifts(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_employee 
  ON schedule_shifts(schedule_employee_id);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_staff 
  ON schedule_shifts(staff_id);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_classification 
  ON schedule_shifts(shift_classification);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_deployment 
  ON schedule_shifts(deployment_id);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_assigned 
  ON schedule_shifts(auto_assigned_to_deployment);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_date_classification 
  ON schedule_shifts(shift_date, shift_classification);

CREATE INDEX IF NOT EXISTS idx_schedule_shifts_staff_date 
  ON schedule_shifts(staff_id, shift_date) 
  WHERE staff_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for shift_schedules (allow all operations)
DROP POLICY IF EXISTS "Allow all operations on shift_schedules" ON shift_schedules;
CREATE POLICY "Allow all operations on shift_schedules" 
  ON shift_schedules 
  FOR ALL 
  USING (true);

-- Create policies for schedule_employees (allow all operations)
DROP POLICY IF EXISTS "Allow all operations on schedule_employees" ON schedule_employees;
CREATE POLICY "Allow all operations on schedule_employees" 
  ON schedule_employees 
  FOR ALL 
  USING (true);

-- Create policies for schedule_shifts (allow all operations)
DROP POLICY IF EXISTS "Allow all operations on schedule_shifts" ON schedule_shifts;
CREATE POLICY "Allow all operations on schedule_shifts" 
  ON schedule_shifts 
  FOR ALL 
  USING (true);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shift_schedules
DROP TRIGGER IF EXISTS update_shift_schedules_updated_at ON shift_schedules;
CREATE TRIGGER update_shift_schedules_updated_at
  BEFORE UPDATE ON shift_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_updated_at();

-- Trigger for schedule_shifts
DROP TRIGGER IF EXISTS update_schedule_shifts_updated_at ON schedule_shifts;
CREATE TRIGGER update_schedule_shifts_updated_at
  BEFORE UPDATE ON schedule_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS (OPTIONAL)
-- ============================================================================

-- Function to get all shifts for a specific date
CREATE OR REPLACE FUNCTION get_shifts_by_date(target_date date)
RETURNS TABLE (
  shift_id uuid,
  employee_name text,
  employee_role text,
  start_time text,
  end_time text,
  shift_classification text,
  assigned_to_deployment boolean,
  staff_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id as shift_id,
    se.name as employee_name,
    se.role as employee_role,
    ss.start_time,
    ss.end_time,
    ss.shift_classification,
    ss.auto_assigned_to_deployment as assigned_to_deployment,
    ss.staff_id
  FROM schedule_shifts ss
  JOIN schedule_employees se ON ss.schedule_employee_id = se.id
  WHERE ss.shift_date = target_date
  ORDER BY ss.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get schedule summary
CREATE OR REPLACE FUNCTION get_schedule_summary(schedule_uuid uuid)
RETURNS TABLE (
  total_shifts bigint,
  total_employees bigint,
  matched_employees bigint,
  assigned_shifts bigint,
  unassigned_shifts bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ss.id) as total_shifts,
    COUNT(DISTINCT se.id) as total_employees,
    COUNT(DISTINCT CASE WHEN se.staff_id IS NOT NULL THEN se.id END) as matched_employees,
    COUNT(CASE WHEN ss.auto_assigned_to_deployment = true THEN 1 END) as assigned_shifts,
    COUNT(CASE WHEN ss.auto_assigned_to_deployment = false THEN 1 END) as unassigned_shifts
  FROM schedule_employees se
  LEFT JOIN schedule_shifts ss ON ss.schedule_employee_id = se.id
  WHERE se.schedule_id = schedule_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE shift_schedules IS 'Stores uploaded shift schedule metadata and raw data';
COMMENT ON TABLE schedule_employees IS 'Employee records from uploaded schedules with optional staff matching';
COMMENT ON TABLE schedule_shifts IS 'Individual shift records with classification and deployment tracking';

COMMENT ON COLUMN shift_schedules.raw_data IS 'Complete parsed schedule JSON for audit and reprocessing';
COMMENT ON COLUMN schedule_employees.staff_id IS 'Links to staff table when employee name matches';
COMMENT ON COLUMN schedule_shifts.shift_classification IS 'Auto-calculated: Day Shift, Night Shift, or Both Shifts';
COMMENT ON COLUMN schedule_shifts.auto_assigned_to_deployment IS 'Tracks if shift has been converted to deployment';
COMMENT ON COLUMN schedule_shifts.deployment_id IS 'Links to created deployment record if assigned';