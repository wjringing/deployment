/*
  # Create template shifts table

  1. New Tables
    - `template_shifts`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `start_time` (text, not null)
      - `end_time` (text, not null)
      - `shift_type` (text, not null, check constraint)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `template_shifts` table
    - Add policy for public access to read/write template shifts

  3. Default Data
    - Insert default template shifts for Day and Night shifts
*/

CREATE TABLE IF NOT EXISTS template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  shift_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;

-- Add constraint for shift_type
ALTER TABLE template_shifts 
ADD CONSTRAINT template_shifts_shift_type_check 
CHECK (shift_type = ANY (ARRAY['Day Shift'::text, 'Night Shift'::text]));

-- Create policies for public access
CREATE POLICY "Allow all operations on template_shifts"
  ON template_shifts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default template shifts
INSERT INTO template_shifts (name, start_time, end_time, shift_type) VALUES
  ('Morning Shift', '07:00', '16:00', 'Day Shift'),
  ('Afternoon Shift', '12:00', '17:00', 'Day Shift'),
  ('Evening Shift', '16:00', '00:00', 'Night Shift'),
  ('Close Shift', '18:00', '00:00', 'Night Shift')
ON CONFLICT DO NOTHING;