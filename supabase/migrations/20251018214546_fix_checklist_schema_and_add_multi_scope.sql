/*
  # Checklist Schema Consolidation and Multi-Level Scope System

  ## Problem Solved
  This migration resolves the checklist schema conflict where two different migrations
  created incompatible table structures:
  - Old: `checklists` table with title, shift_type, day_of_week columns
  - New: `checklist_templates` table with name, area columns
  
  ## Solution
  Standardizes on `checklist_templates` as the single source of truth and adds:
  - Missing columns from old schema (shift_type, day_of_week) for DeploymentPage compatibility
  - Multi-level scope support (location/region/area/company) for hierarchical checklists
  - Location tracking for all completion records

  ## New Tables
  
  ### checklist_templates
  Master templates with multi-level scope support
  - All columns including name, checklist_type, area, shift_type, day_of_week
  - Scope support: location_id, region_id, area_id, scope_type

  ### checklist_items
  Individual tasks with both is_critical and is_required for compatibility

  ### checklist_completions
  Completion tracking with location_id

  ### checklist_item_completions
  Item-level completion with location_id

  ### shift_handover_notes
  Manager communication with location_id

  ## Security
  - Row Level Security enabled on all tables
  - Location-scoped access for data isolation
*/

-- ============================================================================
-- DROP OLD CONFLICTING TABLES IF THEY EXIST
-- ============================================================================

DROP TABLE IF EXISTS checklist_item_completions CASCADE;
DROP TABLE IF EXISTS checklist_completions CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS shift_handover_notes CASCADE;

-- ============================================================================
-- CREATE UNIFIED CHECKLIST SYSTEM WITH MULTI-LEVEL SCOPE
-- ============================================================================

CREATE TABLE checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  checklist_type text NOT NULL CHECK (checklist_type IN ('opening', 'closing', 'cleaning', 'pre_peak')),
  area text NOT NULL DEFAULT 'All',
  shift_type text CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both Shifts')) DEFAULT 'Both Shifts',
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  scope_type text NOT NULL DEFAULT 'location' CHECK (scope_type IN ('location', 'region', 'area', 'company')),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  area_id uuid REFERENCES areas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT checklist_scope_check CHECK (
    (scope_type = 'location' AND location_id IS NOT NULL AND region_id IS NULL AND area_id IS NULL) OR
    (scope_type = 'region' AND region_id IS NOT NULL AND location_id IS NULL AND area_id IS NULL) OR
    (scope_type = 'area' AND area_id IS NOT NULL AND location_id IS NULL AND region_id IS NULL) OR
    (scope_type = 'company' AND location_id IS NULL AND region_id IS NULL AND area_id IS NULL)
  )
);

CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  display_order integer DEFAULT 0,
  is_critical boolean DEFAULT false,
  is_required boolean DEFAULT true,
  estimated_minutes integer DEFAULT 5,
  requires_manager_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both Shifts')),
  completed_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  verified_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  completion_time timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE checklist_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_completion_id uuid NOT NULL REFERENCES checklist_completions(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  notes text DEFAULT ''
);

CREATE TABLE shift_handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift')),
  created_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  note_type text NOT NULL CHECK (note_type IN ('issue', 'stock', 'info', 'equipment', 'staff')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title text NOT NULL,
  content text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_item_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handover_notes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all templates
CREATE POLICY "Authenticated users can view checklist templates"
  ON checklist_templates FOR SELECT
  TO authenticated
  USING (true);

-- Users can create templates for their locations
CREATE POLICY "Users can create templates for their locations"
  ON checklist_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    scope_type = 'location' AND
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates for their locations"
  ON checklist_templates FOR UPDATE
  TO authenticated
  USING (
    scope_type = 'location' AND
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates for their locations"
  ON checklist_templates FOR DELETE
  TO authenticated
  USING (
    scope_type = 'location' AND
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- Checklist items
CREATE POLICY "Authenticated users can view checklist items"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage items for their templates"
  ON checklist_items FOR ALL
  TO authenticated
  USING (
    checklist_template_id IN (
      SELECT id FROM checklist_templates
      WHERE scope_type = 'location' AND location_id IN (
        SELECT location_id FROM user_locations WHERE user_id = auth.uid()
      )
    )
  );

-- Completions
CREATE POLICY "Users can view completions for their locations"
  ON checklist_completions FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage completions for their locations"
  ON checklist_completions FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- Item completions
CREATE POLICY "Users can view item completions for their locations"
  ON checklist_item_completions FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage item completions for their locations"
  ON checklist_item_completions FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- Handover notes
CREATE POLICY "Users can view handover notes for their locations"
  ON shift_handover_notes FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage handover notes for their locations"
  ON shift_handover_notes FOR ALL
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_checklist_templates_type_area ON checklist_templates(checklist_type, area);
CREATE INDEX idx_checklist_templates_active ON checklist_templates(is_active);
CREATE INDEX idx_checklist_templates_shift_type ON checklist_templates(shift_type);
CREATE INDEX idx_checklist_templates_location ON checklist_templates(location_id);
CREATE INDEX idx_checklist_templates_region ON checklist_templates(region_id);
CREATE INDEX idx_checklist_templates_area ON checklist_templates(area_id);
CREATE INDEX idx_checklist_templates_scope ON checklist_templates(scope_type);
CREATE INDEX idx_checklist_items_template ON checklist_items(checklist_template_id, display_order);
CREATE INDEX idx_checklist_completions_date_shift ON checklist_completions(date, shift_type);
CREATE INDEX idx_checklist_completions_template ON checklist_completions(checklist_template_id);
CREATE INDEX idx_checklist_completions_location ON checklist_completions(location_id);
CREATE INDEX idx_checklist_item_completions_completion ON checklist_item_completions(checklist_completion_id);
CREATE INDEX idx_checklist_item_completions_item ON checklist_item_completions(checklist_item_id);
CREATE INDEX idx_checklist_item_completions_location ON checklist_item_completions(location_id);
CREATE INDEX idx_handover_notes_date_shift ON shift_handover_notes(date, shift_type);
CREATE INDEX idx_handover_notes_location ON shift_handover_notes(location_id);
CREATE INDEX idx_handover_notes_priority_resolved ON shift_handover_notes(priority, is_resolved);
CREATE INDEX idx_handover_notes_type ON shift_handover_notes(note_type);
CREATE INDEX idx_handover_notes_created ON shift_handover_notes(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_checklist_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checklist_templates_updated_at
BEFORE UPDATE ON checklist_templates
FOR EACH ROW
EXECUTE FUNCTION update_checklist_templates_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

DO $$
DECLARE
  oswestry_location_id uuid;
BEGIN
  SELECT id INTO oswestry_location_id FROM locations WHERE location_name = 'KFC Oswestry' LIMIT 1;
  
  IF oswestry_location_id IS NOT NULL THEN
    INSERT INTO checklist_templates (name, checklist_type, area, shift_type, description, display_order, is_active, scope_type, location_id)
    VALUES
      ('Morning Opening - Kitchen', 'opening', 'Kitchen', 'Day Shift', 'Essential tasks for opening the kitchen area', 1, true, 'location', oswestry_location_id),
      ('Morning Opening - Front Counter', 'opening', 'Front', 'Day Shift', 'Essential tasks for opening front counter', 2, true, 'location', oswestry_location_id),
      ('Pre-Peak Preparation', 'pre_peak', 'Kitchen', 'Both Shifts', 'Preparation tasks before rush', 3, true, 'location', oswestry_location_id),
      ('Closing - Kitchen', 'closing', 'Kitchen', 'Night Shift', 'Kitchen closing procedures', 4, true, 'location', oswestry_location_id),
      ('Closing - Front Counter', 'closing', 'Front', 'Night Shift', 'Front counter closing procedures', 5, true, 'location', oswestry_location_id),
      ('Daily Cleaning - Lobby', 'cleaning', 'Lobby', 'Both Shifts', 'Lobby cleaning checklist', 6, true, 'location', oswestry_location_id);

    INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, is_required, estimated_minutes, requires_manager_verification)
    SELECT id, 'Turn on fryers and verify oil temperature reaches 350°F', 1, true, true, 10, true FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Check chicken stock levels in walk-in', 2, true, true, 15, false FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Verify all cooking equipment operational', 3, true, true, 5, true FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Check expiration dates on all products', 4, true, true, 10, false FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Turn on POS systems and verify connectivity', 1, true, true, 5, true FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Stock cups, lids, straws, napkins', 2, true, true, 10, false FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Fill drink machines and check CO2 levels', 3, true, true, 10, false FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Drop additional chicken batches for rush', 1, true, true, 10, false FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Prepare extra burger patties', 2, true, true, 10, false FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Turn off all cooking equipment and clean thoroughly', 1, true, true, 20, true FROM checklist_templates WHERE name = 'Closing - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Store all food products properly with dates', 2, true, true, 15, true FROM checklist_templates WHERE name = 'Closing - Kitchen' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Cash up all tills and complete banking', 1, true, true, 20, true FROM checklist_templates WHERE name = 'Closing - Front Counter' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Clean all POS screens and sanitize', 2, true, true, 10, false FROM checklist_templates WHERE name = 'Closing - Front Counter' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Clean and sanitize all tables and chairs', 1, true, true, 15, false FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND location_id = oswestry_location_id
    UNION ALL SELECT id, 'Sweep and mop entire lobby floor', 2, true, true, 20, false FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND location_id = oswestry_location_id;
  END IF;
END $$;
