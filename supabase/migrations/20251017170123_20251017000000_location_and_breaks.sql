/*
  # Real-Time Staff Location Board and Break Rotation Scheduler

  ## Overview
  Implements Features 3 & 4 for operational visibility and UK labor compliance

  ## New Tables

  ### staff_current_locations - Real-time staff location tracking
  ### staff_location_history - Historical movement records
  ### break_schedules - Automated break scheduling
  ### break_coverage_gaps - Coverage monitoring

  ## Security
  - Row Level Security enabled
  - Public access policies
*/

-- ============================================================================
-- FEATURE 3: REAL-TIME STAFF LOCATION BOARD
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_current_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE,
  current_position text NOT NULL,
  assigned_area text DEFAULT '',
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working', 'on_break', 'offline')),
  started_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  notes text DEFAULT '',
  UNIQUE(staff_id)
);

CREATE TABLE IF NOT EXISTS staff_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  deployment_id uuid REFERENCES deployments(id) ON DELETE SET NULL,
  position text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer,
  moved_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  reason text DEFAULT ''
);

-- ============================================================================
-- FEATURE 4: STAFF BREAK ROTATION SCHEDULER
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES deployments(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift')),
  break_type text NOT NULL CHECK (break_type IN ('rest_break', 'meal_break', 'rest_period')),
  break_duration_minutes integer NOT NULL,
  scheduled_start_time text NOT NULL,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')),
  coverage_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  uk_compliance_checked boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS break_coverage_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift')),
  position text NOT NULL,
  time_slot text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  identified_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text DEFAULT ''
);

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'is_on_break'
  ) THEN
    ALTER TABLE deployments ADD COLUMN is_on_break boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deployments' AND column_name = 'break_schedule_id'
  ) THEN
    ALTER TABLE deployments ADD COLUMN break_schedule_id uuid REFERENCES break_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'current_location_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN current_location_id uuid REFERENCES staff_current_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE staff_current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_coverage_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on staff_current_locations" ON staff_current_locations FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff_location_history" ON staff_location_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on break_schedules" ON break_schedules FOR ALL USING (true);
CREATE POLICY "Allow all operations on break_coverage_gaps" ON break_coverage_gaps FOR ALL USING (true);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_current_locations_staff ON staff_current_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_current_locations_deployment ON staff_current_locations(deployment_id);
CREATE INDEX IF NOT EXISTS idx_staff_current_locations_status ON staff_current_locations(status);
CREATE INDEX IF NOT EXISTS idx_location_history_staff ON staff_location_history(staff_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_deployment ON staff_location_history(deployment_id);
CREATE INDEX IF NOT EXISTS idx_location_history_dates ON staff_location_history(started_at, ended_at);

CREATE INDEX IF NOT EXISTS idx_break_schedules_staff_date ON break_schedules(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_break_schedules_deployment ON break_schedules(deployment_id);
CREATE INDEX IF NOT EXISTS idx_break_schedules_date_shift ON break_schedules(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_break_schedules_status ON break_schedules(status);
CREATE INDEX IF NOT EXISTS idx_break_gaps_date_shift ON break_coverage_gaps(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_break_gaps_resolved ON break_coverage_gaps(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_location_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_last_updated
BEFORE UPDATE ON staff_current_locations
FOR EACH ROW
EXECUTE FUNCTION update_location_last_updated();

CREATE OR REPLACE FUNCTION calculate_location_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_location_duration
BEFORE INSERT OR UPDATE ON staff_location_history
FOR EACH ROW
EXECUTE FUNCTION calculate_location_duration();

CREATE OR REPLACE FUNCTION sync_deployment_break_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' THEN
    UPDATE deployments
    SET is_on_break = true, break_schedule_id = NEW.id
    WHERE id = NEW.deployment_id;
  ELSIF NEW.status = 'completed' OR NEW.status = 'skipped' THEN
    UPDATE deployments
    SET is_on_break = false, break_schedule_id = NULL
    WHERE id = NEW.deployment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_deployment_break_status
AFTER UPDATE ON break_schedules
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_deployment_break_status();