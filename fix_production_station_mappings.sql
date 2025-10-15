/*
  # Fix station_position_mappings table for production database

  This migration adds the station_id column and creates proper relationships
  between stations and position mappings.
*/

-- First, check if stations table exists, if not create it
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL UNIQUE,
  station_code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Create policies for stations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Users can view stations') THEN
    CREATE POLICY "Users can view stations" ON stations FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Users can insert stations') THEN
    CREATE POLICY "Users can insert stations" ON stations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Users can update stations') THEN
    CREATE POLICY "Users can update stations" ON stations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Users can delete stations') THEN
    CREATE POLICY "Users can delete stations" ON stations FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Add station_id column to station_position_mappings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_id'
  ) THEN
    ALTER TABLE station_position_mappings
    ADD COLUMN station_id uuid;
  END IF;
END $$;

-- Migrate existing data: create stations from station_name and link them
DO $$
DECLARE
  station_record RECORD;
  new_station_id uuid;
BEGIN
  -- For each unique station_name in station_position_mappings
  FOR station_record IN
    SELECT DISTINCT station_name
    FROM station_position_mappings
    WHERE station_name IS NOT NULL AND station_id IS NULL
  LOOP
    -- Check if station already exists
    SELECT id INTO new_station_id
    FROM stations
    WHERE station_name = station_record.station_name;

    -- If not, create it
    IF new_station_id IS NULL THEN
      INSERT INTO stations (station_name, station_code, is_active, display_order)
      VALUES (
        station_record.station_name,
        UPPER(LEFT(REPLACE(station_record.station_name, ' ', ''), 3)),
        true,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stations)
      )
      RETURNING id INTO new_station_id;
    END IF;

    -- Update all mappings with this station_name to use the station_id
    UPDATE station_position_mappings
    SET station_id = new_station_id
    WHERE station_name = station_record.station_name AND station_id IS NULL;
  END LOOP;
END $$;

-- Now make station_id NOT NULL and add foreign key constraint
DO $$
BEGIN
  -- Only proceed if all rows have a station_id
  IF NOT EXISTS (SELECT 1 FROM station_position_mappings WHERE station_id IS NULL) THEN
    -- Make column NOT NULL
    ALTER TABLE station_position_mappings
    ALTER COLUMN station_id SET NOT NULL;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'station_position_mappings_station_id_fkey'
      AND table_name = 'station_position_mappings'
    ) THEN
      ALTER TABLE station_position_mappings
      ADD CONSTRAINT station_position_mappings_station_id_fkey
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add index on station_id for better query performance
CREATE INDEX IF NOT EXISTS idx_station_mappings_station_id
ON station_position_mappings(station_id);

-- Add trigger for updating updated_at on stations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_stations_updated_at'
  ) THEN
    CREATE TRIGGER update_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_station_position_mappings_updated_at'
  ) THEN
    CREATE TRIGGER update_station_position_mappings_updated_at
    BEFORE UPDATE ON station_position_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed some default stations if table is empty
INSERT INTO stations (station_name, station_code, is_active, display_order)
VALUES
  ('Front Counter', 'FC', true, 1),
  ('Drive-Thru Window', 'DTW', true, 2),
  ('Drive-Thru Order', 'DTO', true, 3),
  ('Kitchen - Fry', 'KF', true, 4),
  ('Kitchen - Grill', 'KG', true, 5),
  ('Kitchen - Prep', 'KP', true, 6),
  ('Expeditor', 'EXP', true, 7),
  ('Lobby/Dining', 'LOB', true, 8),
  ('Manager on Duty', 'MOD', true, 9),
  ('Cash Office', 'CO', true, 10)
ON CONFLICT (station_name) DO NOTHING;
