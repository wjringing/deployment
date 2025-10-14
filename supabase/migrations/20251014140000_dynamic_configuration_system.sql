/*
  # Dynamic Configuration and Rule Management System

  This migration implements a flexible configuration system for auto-deployment
  that allows administrators to:
  - Configure operational parameters (DT type, number of cooks, etc.)
  - Define core positions that must always be filled
  - Create conditional staffing rules
  - Manage position requirements dynamically

  ## New Tables

  1. `shift_configuration_rules`
     - Stores operational parameters for auto-deployment
     - Includes DT type (DT1/DT2), number of cooks, and other settings
     - Configurable per shift type and date

  2. `core_positions`
     - Defines positions that must always be filled
     - Priority-based ordering for assignment
     - Can be shift-specific or applicable to both shifts

  3. `conditional_staffing_rules`
     - Flexible rule system for conditional position requirements
     - Supports conditions like "IF dt_type = DT1 THEN require DT Presenter"
     - JSON-based rule definitions for extensibility

  4. `position_requirements`
     - Links positions to specific conditions
     - Defines minimum and maximum staff counts
     - Can be activated/deactivated without deletion

  ## Security

  - All tables have RLS enabled
  - Authenticated users can read all configuration data
  - Only authenticated users can create/update/delete configuration rules
*/

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Shift configuration rules table
CREATE TABLE IF NOT EXISTS shift_configuration_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text NOT NULL DEFAULT 'default',
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',
  effective_date date DEFAULT NULL,

  -- Operational parameters
  dt_type text CHECK (dt_type IN ('DT1', 'DT2', 'None')) DEFAULT 'DT1',
  num_cooks integer DEFAULT 1 CHECK (num_cooks >= 0 AND num_cooks <= 5),
  num_pack_stations integer DEFAULT 2 CHECK (num_pack_stations >= 0 AND num_pack_stations <= 5),
  require_shift_runner boolean DEFAULT true,
  require_manager boolean DEFAULT true,

  -- Additional settings as JSON for extensibility
  additional_settings jsonb DEFAULT '{}'::jsonb,

  -- Metadata
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure only one active config per shift type per date
  UNIQUE(config_name, shift_type, effective_date)
);

-- Core positions table
CREATE TABLE IF NOT EXISTS core_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 100),
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both')) DEFAULT 'Both',

  -- Position requirements
  min_count integer DEFAULT 1 CHECK (min_count >= 0),
  max_count integer DEFAULT 1 CHECK (max_count >= min_count),

  -- Conditions
  is_mandatory boolean DEFAULT true,
  description text DEFAULT '',

  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(position_id, shift_type)
);

-- Conditional staffing rules table
CREATE TABLE IF NOT EXISTS conditional_staffing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('require_position', 'exclude_position', 'adjust_count', 'custom')),

  -- Condition definition (JSON for flexibility)
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  /*
    Example conditions:
    {"dt_type": "DT1"}
    {"num_cooks": {"gte": 2}}
    {"forecast": {"gte": 5000}}
    {"day_of_week": "Saturday"}
    {"and": [{"dt_type": "DT1"}, {"shift_type": "Night Shift"}]}
  */

  -- Action to take when condition is met
  action jsonb NOT NULL DEFAULT '{}'::jsonb,
  /*
    Example actions:
    {"require_position": "DT Presenter", "count": 1}
    {"exclude_position": "Lobby"}
    {"adjust_position_count": {"Cook": 2}}
    {"custom_logic": "special_handler_name"}
  */

  -- Priority for rule execution order
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 1000),

  -- Metadata
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Position requirements table (detailed requirements per position)
CREATE TABLE IF NOT EXISTS position_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,

  -- Requirement details
  requires_training boolean DEFAULT true,
  requires_sign_off boolean DEFAULT false,
  min_rating decimal DEFAULT NULL CHECK (min_rating IS NULL OR (min_rating >= 0 AND min_rating <= 5)),
  min_age integer DEFAULT NULL CHECK (min_age IS NULL OR min_age >= 16),

  -- Conditional requirements
  condition_rule_id uuid REFERENCES conditional_staffing_rules(id) ON DELETE SET NULL,

  -- Metadata
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(position_id)
);

-- Configuration audit log
CREATE TABLE IF NOT EXISTS configuration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate')),
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  changed_by text DEFAULT '',
  changed_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shift_config_rules_active
  ON shift_configuration_rules(config_name, shift_type, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shift_config_rules_date
  ON shift_configuration_rules(effective_date)
  WHERE effective_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_positions_priority
  ON core_positions(priority, shift_type, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conditional_rules_active
  ON conditional_staffing_rules(priority, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_position_requirements_active
  ON position_requirements(position_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_config_audit_table_record
  ON configuration_audit_log(table_name, record_id);

-- ============================================================================
-- INSERT DEFAULT CONFIGURATION
-- ============================================================================

-- Insert default shift configuration
INSERT INTO shift_configuration_rules (
  config_name,
  shift_type,
  dt_type,
  num_cooks,
  num_pack_stations,
  require_shift_runner,
  require_manager,
  notes
) VALUES
  ('default', 'Both', 'DT1', 1, 2, true, true, 'Default configuration for all shifts')
ON CONFLICT (config_name, shift_type, effective_date) DO NOTHING;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE shift_configuration_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditional_staffing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Shift configuration rules policies
CREATE POLICY "Authenticated users can read shift configuration"
  ON shift_configuration_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shift configuration"
  ON shift_configuration_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift configuration"
  ON shift_configuration_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shift configuration"
  ON shift_configuration_rules FOR DELETE
  TO authenticated
  USING (true);

-- Core positions policies
CREATE POLICY "Authenticated users can read core positions"
  ON core_positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create core positions"
  ON core_positions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update core positions"
  ON core_positions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete core positions"
  ON core_positions FOR DELETE
  TO authenticated
  USING (true);

-- Conditional staffing rules policies
CREATE POLICY "Authenticated users can read conditional rules"
  ON conditional_staffing_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create conditional rules"
  ON conditional_staffing_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update conditional rules"
  ON conditional_staffing_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete conditional rules"
  ON conditional_staffing_rules FOR DELETE
  TO authenticated
  USING (true);

-- Position requirements policies
CREATE POLICY "Authenticated users can read position requirements"
  ON position_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create position requirements"
  ON position_requirements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update position requirements"
  ON position_requirements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete position requirements"
  ON position_requirements FOR DELETE
  TO authenticated
  USING (true);

-- Configuration audit log policies
CREATE POLICY "Authenticated users can read audit log"
  ON configuration_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create audit log entries"
  ON configuration_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_configuration_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO configuration_audit_log (
      table_name, record_id, action, old_values, changed_by
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), current_user
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO configuration_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), current_user
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO configuration_audit_log (
      table_name, record_id, action, new_values, changed_by
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), current_user
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ATTACH AUDIT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS audit_shift_configuration_changes ON shift_configuration_rules;
CREATE TRIGGER audit_shift_configuration_changes
  AFTER INSERT OR UPDATE OR DELETE ON shift_configuration_rules
  FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();

DROP TRIGGER IF EXISTS audit_core_positions_changes ON core_positions;
CREATE TRIGGER audit_core_positions_changes
  AFTER INSERT OR UPDATE OR DELETE ON core_positions
  FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();

DROP TRIGGER IF EXISTS audit_conditional_rules_changes ON conditional_staffing_rules;
CREATE TRIGGER audit_conditional_rules_changes
  AFTER INSERT OR UPDATE OR DELETE ON conditional_staffing_rules
  FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();

DROP TRIGGER IF EXISTS audit_position_requirements_changes ON position_requirements;
CREATE TRIGGER audit_position_requirements_changes
  AFTER INSERT OR UPDATE OR DELETE ON position_requirements
  FOR EACH ROW EXECUTE FUNCTION audit_configuration_changes();
