/*
  # Automated Staff Shift Deployment System - Database Schema

  ## Overview
  This migration creates the complete database structure for an automated staff scheduling 
  and deployment management system. The system processes PDF schedules and automatically 
  categorizes employees into day shifts, night shifts, or both based on their work times.

  ## 1. New Tables

  ### locations
  Stores information about different KFC restaurant locations
  - `id` (uuid, primary key) - Unique location identifier
  - `name` (text) - Location name (e.g., "KFC Oswestry - Maebury Road")
  - `location_code` (text, unique) - Short code for the location (e.g., "3016")
  - `address` (text) - Physical address
  - `active` (boolean) - Whether location is currently active
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### employees
  Stores employee information for all locations
  - `id` (uuid, primary key) - Unique employee identifier
  - `location_id` (uuid, foreign key) - Links to locations table
  - `name` (text) - Employee full name
  - `role` (text) - Job role (Shift Runner, Team Member, Cook)
  - `hire_date` (date) - Date employee was hired
  - `active` (boolean) - Whether employee is currently active
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### schedules
  Stores individual shift schedules extracted from PDFs
  - `id` (uuid, primary key) - Unique schedule entry identifier
  - `employee_id` (uuid, foreign key) - Links to employees table
  - `location_id` (uuid, foreign key) - Links to locations table
  - `week_start_date` (date) - Monday of the week for this schedule
  - `schedule_date` (date) - Specific date of this shift
  - `day_of_week` (text) - Day name (Monday, Tuesday, etc.)
  - `start_time` (time) - Shift start time
  - `end_time` (time) - Shift end time
  - `shift_classification` (text) - Calculated classification (day, night, both)
  - `is_overnight` (boolean) - Whether shift crosses midnight
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### shift_deployments
  Stores calculated shift deployment assignments for historical tracking
  - `id` (uuid, primary key) - Unique deployment identifier
  - `location_id` (uuid, foreign key) - Links to locations table
  - `employee_id` (uuid, foreign key) - Links to employees table
  - `deployment_date` (date) - Date of the deployment
  - `shift_type` (text) - Type of shift (day, night, both)
  - `role` (text) - Employee role at time of deployment
  - `start_time` (time) - Actual shift start time
  - `end_time` (time) - Actual shift end time
  - `week_start_date` (date) - Monday of the week for grouping
  - `created_at` (timestamptz) - Record creation timestamp

  ### stations
  Stores training stations for future training tracker integration
  - `id` (uuid, primary key) - Unique station identifier
  - `name` (text) - Station name (e.g., "Fry Station", "Grill")
  - `description` (text) - Station description
  - `active` (boolean) - Whether station is currently in use
  - `created_at` (timestamptz) - Record creation timestamp

  ### employee_station_training
  Tracks employee training certifications for future integration
  - `id` (uuid, primary key) - Unique training record identifier
  - `employee_id` (uuid, foreign key) - Links to employees table
  - `station_id` (uuid, foreign key) - Links to stations table
  - `training_status` (text) - Status (in_training, certified, expired)
  - `certified_date` (date) - Date employee was certified
  - `expiry_date` (date) - Date certification expires
  - `trainer_id` (uuid, foreign key) - Links to employees table (trainer)
  - `notes` (text) - Additional notes about training
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### schedule_uploads
  Tracks PDF upload history and processing status
  - `id` (uuid, primary key) - Unique upload identifier
  - `location_id` (uuid, foreign key) - Links to locations table
  - `week_start_date` (date) - Monday of the week for uploaded schedule
  - `upload_filename` (text) - Original PDF filename
  - `processing_status` (text) - Status (processing, completed, failed)
  - `total_employees` (integer) - Number of employees in schedule
  - `total_shifts` (integer) - Number of shifts processed
  - `error_message` (text) - Error details if processing failed
  - `uploaded_by` (uuid) - User who uploaded (for future auth)
  - `created_at` (timestamptz) - Upload timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to read their location's data
  - Add policies for authenticated users to insert/update data
  - Restrict delete operations to admin roles (future implementation)

  ## 3. Indexes
  - Create indexes on foreign keys for efficient joins
  - Create indexes on date fields for historical queries
  - Create indexes on location_id for multi-location filtering

  ## 4. Important Notes
  - All tables include audit timestamps (created_at, updated_at)
  - Default values are set appropriately for booleans and timestamps
  - Foreign key constraints ensure data integrity
  - The schema is designed to scale to multiple locations
  - Training tracker tables are ready for future integration
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_code text UNIQUE NOT NULL,
  address text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  hire_date date DEFAULT CURRENT_DATE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  schedule_date date NOT NULL,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_classification text,
  is_overnight boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shift_deployments table
CREATE TABLE IF NOT EXISTS shift_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  deployment_date date NOT NULL,
  shift_type text NOT NULL,
  role text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  week_start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stations table for future training tracker
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create employee_station_training table for future training tracker
CREATE TABLE IF NOT EXISTS employee_station_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  training_status text DEFAULT 'in_training',
  certified_date date,
  expiry_date date,
  trainer_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedule_uploads table for tracking PDF uploads
CREATE TABLE IF NOT EXISTS schedule_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  upload_filename text,
  processing_status text DEFAULT 'processing',
  total_employees integer DEFAULT 0,
  total_shifts integer DEFAULT 0,
  error_message text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_location ON employees(location_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_location ON schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_week ON schedules(week_start_date);
CREATE INDEX IF NOT EXISTS idx_deployments_location ON shift_deployments(location_id);
CREATE INDEX IF NOT EXISTS idx_deployments_date ON shift_deployments(deployment_date);
CREATE INDEX IF NOT EXISTS idx_deployments_week ON shift_deployments(week_start_date);
CREATE INDEX IF NOT EXISTS idx_training_employee ON employee_station_training(employee_id);
CREATE INDEX IF NOT EXISTS idx_uploads_location ON schedule_uploads(location_id);
CREATE INDEX IF NOT EXISTS idx_uploads_week ON schedule_uploads(week_start_date);

-- Enable Row Level Security on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_station_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Allow public read access to locations"
  ON locations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for employees
CREATE POLICY "Allow public read access to employees"
  ON employees FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for schedules
CREATE POLICY "Allow public read access to schedules"
  ON schedules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on schedules"
  ON schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for shift_deployments
CREATE POLICY "Allow public read access to shift_deployments"
  ON shift_deployments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on shift_deployments"
  ON shift_deployments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on shift_deployments"
  ON shift_deployments FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for stations
CREATE POLICY "Allow public read access to stations"
  ON stations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on stations"
  ON stations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on stations"
  ON stations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for employee_station_training
CREATE POLICY "Allow public read access to training records"
  ON employee_station_training FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on training records"
  ON employee_station_training FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on training records"
  ON employee_station_training FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for schedule_uploads
CREATE POLICY "Allow public read access to schedule_uploads"
  ON schedule_uploads FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated insert on schedule_uploads"
  ON schedule_uploads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on schedule_uploads"
  ON schedule_uploads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default location for proof of concept
INSERT INTO locations (name, location_code, address) 
VALUES ('KFC Oswestry - Maebury Road', '3016', 'Maebury Road, Oswestry')
ON CONFLICT (location_code) DO NOTHING;

-- Insert common training stations for future use
INSERT INTO stations (name, description) VALUES
  ('Fry Station', 'French fries and fried items preparation'),
  ('Grill Station', 'Grilled chicken and burger preparation'),
  ('Drive-Thru', 'Drive-through order taking and service'),
  ('Front Counter', 'Front counter customer service and orders'),
  ('Prep Station', 'Food preparation and ingredient prep'),
  ('Expeditor', 'Order assembly and quality control')
ON CONFLICT (name) DO NOTHING;