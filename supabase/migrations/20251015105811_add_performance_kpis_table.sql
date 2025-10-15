/*
  # Add Performance KPIs Configuration Table

  1. New Tables
    - `performance_kpis`
      - `id` (uuid, primary key)
      - `kpi_name` (text) - Name of the KPI (e.g., "Sales Target", "Labor Efficiency")
      - `weight` (numeric) - Weight/importance of this KPI (0-100)
      - `target_value` (numeric) - Optional target value
      - `description` (text) - Description of what this KPI measures
      - `is_active` (boolean) - Whether this KPI is currently active
      - `display_order` (integer) - Order in which to display KPIs
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `performance_kpis` table
    - Add policy for authenticated users to read KPIs
    - Add policy for authenticated users to manage KPIs

  3. Initial Data
    - Insert default KPIs with equal weights
*/

CREATE TABLE IF NOT EXISTS performance_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name text NOT NULL,
  weight numeric DEFAULT 20 CHECK (weight >= 0 AND weight <= 100),
  target_value numeric,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE performance_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KPIs"
  ON performance_kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage KPIs"
  ON performance_kpis FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default KPIs
INSERT INTO performance_kpis (kpi_name, weight, description, display_order) VALUES
  ('Sales Performance', 20, 'Measures actual sales against target', 1),
  ('Labor Efficiency', 20, 'Measures labor cost as percentage of sales', 2),
  ('Speed of Service', 20, 'Measures drive-through and counter service times', 3),
  ('Quality Standards', 20, 'Measures food quality and accuracy', 4),
  ('Checklist Completion', 20, 'Measures completion of shift checklists', 5)
ON CONFLICT DO NOTHING;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
