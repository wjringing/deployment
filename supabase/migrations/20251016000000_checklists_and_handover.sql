/*
  # Opening/Closing Checklists and Shift Handover Notes System

  ## Overview
  Implements Features 1 & 2 for operational continuity:
  - Opening and Closing Duty Checklists with CRUD management
  - Shift Handover Notes for manager-to-manager communication

  ## New Tables

  ### 1. CHECKLIST SYSTEM

  #### checklist_templates
  Master templates for different checklist types
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Template name (e.g., "Morning Opening - Kitchen")
  - `checklist_type` (text) - Type: opening, closing, cleaning, pre_peak
  - `area` (text) - Store area (Kitchen, Front, Lobby, Drive-Thru, All)
  - `description` (text) - Optional description
  - `display_order` (integer) - Sort order for display
  - `is_active` (boolean) - Whether template is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  #### checklist_items
  Individual tasks within each checklist
  - `id` (uuid, primary key) - Unique identifier
  - `checklist_template_id` (uuid, foreign key) - Parent template
  - `item_text` (text) - Task description
  - `display_order` (integer) - Sort order within checklist
  - `is_critical` (boolean) - Whether item is mandatory
  - `estimated_minutes` (integer) - Expected completion time
  - `requires_manager_verification` (boolean) - Needs manager sign-off
  - `created_at` (timestamptz) - Creation timestamp

  #### checklist_completions
  Tracks when checklists are completed
  - `id` (uuid, primary key) - Unique identifier
  - `checklist_template_id` (uuid, foreign key) - Which template
  - `date` (date) - Service date
  - `shift_type` (text) - Day Shift, Night Shift, Both Shifts
  - `completed_by_staff_id` (uuid, foreign key) - Staff who completed
  - `verified_by_staff_id` (uuid, foreign key) - Manager who verified
  - `completion_time` (timestamptz) - When fully completed
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Started timestamp

  #### checklist_item_completions
  Tracks individual item completion
  - `id` (uuid, primary key) - Unique identifier
  - `checklist_completion_id` (uuid, foreign key) - Parent completion
  - `checklist_item_id` (uuid, foreign key) - Which item
  - `is_completed` (boolean) - Completion status
  - `completed_at` (timestamptz) - When completed
  - `completed_by_staff_id` (uuid, foreign key) - Who completed
  - `notes` (text) - Item-specific notes

  ### 2. HANDOVER NOTES SYSTEM

  #### shift_handover_notes
  Manager-to-manager communication between shifts
  - `id` (uuid, primary key) - Unique identifier
  - `date` (date) - Service date
  - `shift_type` (text) - Outgoing shift (Day Shift, Night Shift)
  - `created_by_staff_id` (uuid, foreign key) - Outgoing manager
  - `note_type` (text) - Type: issue, stock, info, equipment, staff
  - `priority` (text) - Priority: low, medium, high, urgent
  - `title` (text) - Note title/summary
  - `content` (text) - Detailed note
  - `is_resolved` (boolean) - Whether addressed
  - `resolved_by_staff_id` (uuid, foreign key) - Who resolved
  - `resolved_at` (timestamptz) - When resolved
  - `resolution_notes` (text) - Resolution details
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Row Level Security enabled on all tables
  - Public access policies for operational use

  ## Performance
  - Indexes on foreign keys
  - Indexes on date and shift_type for filtering
  - Composite indexes for common queries
*/

-- ============================================================================
-- FEATURE 1: OPENING AND CLOSING DUTY CHECKLISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  checklist_type text NOT NULL CHECK (checklist_type IN ('opening', 'closing', 'cleaning', 'pre_peak')),
  area text NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  display_order integer DEFAULT 0,
  is_critical boolean DEFAULT false,
  estimated_minutes integer DEFAULT 5,
  requires_manager_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('Day Shift', 'Night Shift', 'Both Shifts')),
  completed_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  verified_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  completion_time timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_item_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_completion_id uuid NOT NULL REFERENCES checklist_completions(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  notes text DEFAULT ''
);

-- ============================================================================
-- FEATURE 2: SHIFT HANDOVER NOTES SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Public access policies (consistent with existing architecture)
CREATE POLICY "Allow all operations on checklist_templates" ON checklist_templates FOR ALL USING (true);
CREATE POLICY "Allow all operations on checklist_items" ON checklist_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on checklist_completions" ON checklist_completions FOR ALL USING (true);
CREATE POLICY "Allow all operations on checklist_item_completions" ON checklist_item_completions FOR ALL USING (true);
CREATE POLICY "Allow all operations on shift_handover_notes" ON shift_handover_notes FOR ALL USING (true);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Checklist indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_type_area ON checklist_templates(checklist_type, area);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_active ON checklist_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_checklist_items_template ON checklist_items(checklist_template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_date_shift ON checklist_completions(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_template ON checklist_completions(checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_item_completions_completion ON checklist_item_completions(checklist_completion_id);
CREATE INDEX IF NOT EXISTS idx_checklist_item_completions_item ON checklist_item_completions(checklist_item_id);

-- Handover notes indexes
CREATE INDEX IF NOT EXISTS idx_handover_notes_date_shift ON shift_handover_notes(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_handover_notes_priority_resolved ON shift_handover_notes(priority, is_resolved);
CREATE INDEX IF NOT EXISTS idx_handover_notes_type ON shift_handover_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_handover_notes_created ON shift_handover_notes(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update checklist_templates updated_at
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
-- SEED DATA - SAMPLE CHECKLISTS
-- ============================================================================

-- Opening Checklist Templates
INSERT INTO checklist_templates (name, checklist_type, area, description, display_order, is_active)
VALUES
  ('Morning Opening - Kitchen', 'opening', 'Kitchen', 'Essential tasks for opening the kitchen area', 1, true),
  ('Morning Opening - Front Counter', 'opening', 'Front', 'Essential tasks for opening front counter', 2, true),
  ('Pre-Peak Preparation', 'pre_peak', 'Kitchen', 'Preparation tasks before lunch rush', 3, true),
  ('Closing - Kitchen', 'closing', 'Kitchen', 'Kitchen closing procedures', 4, true),
  ('Closing - Front Counter', 'closing', 'Front', 'Front counter closing procedures', 5, true),
  ('Daily Cleaning - Lobby', 'cleaning', 'Lobby', 'Lobby cleaning checklist', 6, true)
ON CONFLICT DO NOTHING;

-- Kitchen Opening checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Turn on fryers and verify oil temperature reaches 350°F', 1, true, 10, true
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Check chicken stock levels in walk-in and prepare first batch', 2, true, 15, false
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Verify all cooking equipment operational (grills, ovens, warmers)', 3, true, 5, true
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Check expiration dates on all products', 4, true, 10, false
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Set up prep stations with clean utensils and containers', 5, false, 10, false
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Verify temperature logs are within acceptable range', 6, true, 5, true
FROM checklist_templates WHERE name = 'Morning Opening - Kitchen' AND checklist_type = 'opening';

-- Front Counter Opening checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Turn on POS systems and verify connectivity', 1, true, 5, true
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Stock cups, lids, straws, napkins, and condiments', 2, true, 10, false
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Fill drink machines and check CO2 levels', 3, true, 10, false
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Clean and sanitize all counter areas and touch points', 4, true, 10, false
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Verify drive-thru headsets operational and batteries charged', 5, true, 5, false
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening'
UNION ALL
SELECT id, 'Check till floats are correct amounts', 6, true, 5, true
FROM checklist_templates WHERE name = 'Morning Opening - Front Counter' AND checklist_type = 'opening';

-- Pre-Peak Preparation checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Drop additional chicken batches for lunch rush', 1, true, 10, false
FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND checklist_type = 'pre_peak'
UNION ALL
SELECT id, 'Prepare extra burger patties and have ready', 2, true, 10, false
FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND checklist_type = 'pre_peak'
UNION ALL
SELECT id, 'Ensure all fries stations fully stocked', 3, true, 5, false
FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND checklist_type = 'pre_peak'
UNION ALL
SELECT id, 'Check drive-thru times and adjust staffing if needed', 4, false, 5, true
FROM checklist_templates WHERE name = 'Pre-Peak Preparation' AND checklist_type = 'pre_peak';

-- Kitchen Closing checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Turn off all cooking equipment and clean thoroughly', 1, true, 20, true
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Store all food products properly and label with dates', 2, true, 15, true
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Clean and sanitize all food prep surfaces', 3, true, 15, false
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Complete temperature logs and file properly', 4, true, 5, true
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Empty and clean all trash bins', 5, true, 10, false
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Verify all walk-in coolers and freezers are secured', 6, true, 5, true
FROM checklist_templates WHERE name = 'Closing - Kitchen' AND checklist_type = 'closing';

-- Front Counter Closing checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Cash up all tills and complete banking paperwork', 1, true, 20, true
FROM checklist_templates WHERE name = 'Closing - Front Counter' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Clean all POS screens and sanitize touch points', 2, true, 10, false
FROM checklist_templates WHERE name = 'Closing - Front Counter' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Clean and sanitize drink machines and nozzles', 3, true, 15, false
FROM checklist_templates WHERE name = 'Closing - Front Counter' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Restock all supplies for morning shift', 4, false, 10, false
FROM checklist_templates WHERE name = 'Closing - Front Counter' AND checklist_type = 'closing'
UNION ALL
SELECT id, 'Verify all doors and windows are secured', 5, true, 5, true
FROM checklist_templates WHERE name = 'Closing - Front Counter' AND checklist_type = 'closing';

-- Lobby Cleaning checklist items
INSERT INTO checklist_items (checklist_template_id, item_text, display_order, is_critical, estimated_minutes, requires_manager_verification)
SELECT id, 'Clean and sanitize all tables and chairs', 1, true, 15, false
FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND checklist_type = 'cleaning'
UNION ALL
SELECT id, 'Sweep and mop entire lobby floor', 2, true, 20, false
FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND checklist_type = 'cleaning'
UNION ALL
SELECT id, 'Clean and restock toilets', 3, true, 15, false
FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND checklist_type = 'cleaning'
UNION ALL
SELECT id, 'Empty and clean all lobby trash bins', 4, true, 10, false
FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND checklist_type = 'cleaning'
UNION ALL
SELECT id, 'Clean glass doors and windows', 5, false, 10, false
FROM checklist_templates WHERE name = 'Daily Cleaning - Lobby' AND checklist_type = 'cleaning';
