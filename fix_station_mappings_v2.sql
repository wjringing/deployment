/*
  # Fix station_position_mappings table - Version 2

  This migration adds the station_id column and creates proper relationships
  between stations and position mappings.

  Your current schema has: station_name, station_categ, position_id
  We need to add: station_id and link to stations table
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

-- Seed some default stations first
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

    RAISE NOTICE 'Added station_id column to station_position_mappings';
  END IF;
END $$;

-- Migrate existing data: create stations from station_name column and link them
DO $$
DECLARE
  mapping_record RECORD;
  new_station_id uuid;
  current_station_name text;
BEGIN
  -- Check if station_name column exists in station_position_mappings
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_name'
  ) THEN
    -- For each row in station_position_mappings that has a station_name but no station_id
    FOR mapping_record IN
      SELECT id, station_name AS stn_name
      FROM station_position_mappings
      WHERE station_name IS NOT NULL
      AND station_id IS NULL
    LOOP
      -- Store the station name in a variable to avoid column ambiguity
      current_station_name := mapping_record.stn_name;

      -- Check if station already exists using the variable
      SELECT id INTO new_station_id
      FROM stations
      WHERE station_name = current_station_name;

      -- If station doesn't exist, create it
      IF new_station_id IS NULL THEN
        INSERT INTO stations (station_name, station_code, is_active, display_order)
        VALUES (
          current_station_name,
          UPPER(LEFT(REPLACE(current_station_name, ' ', ''), 3)),
          true,
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stations)
        )
        RETURNING id INTO new_station_id;

        RAISE NOTICE 'Created new station: % with id: %', current_station_name, new_station_id;
      END IF;

      -- Update the mapping with the station_id
      UPDATE station_position_mappings
      SET station_id = new_station_id
      WHERE id = mapping_record.id;

    END LOOP;

    RAISE NOTICE 'Migrated all existing station_name values to station_id';
  ELSE
    RAISE NOTICE 'station_name column does not exist in station_position_mappings, skipping data migration';
  END IF;
END $$;

-- Add foreign key constraint after data migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'station_position_mappings_station_id_fkey'
    AND table_name = 'station_position_mappings'
  ) THEN
    ALTER TABLE station_position_mappings
    ADD CONSTRAINT station_position_mappings_station_id_fkey
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint for station_id';
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

-- Final verification
DO $$
DECLARE
  station_id_exists boolean;
  rows_without_station_id integer;
BEGIN
  -- Check if station_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_id'
  ) INTO station_id_exists;

  IF station_id_exists THEN
    -- Count rows without station_id
    SELECT COUNT(*) INTO rows_without_station_id
    FROM station_position_mappings
    WHERE station_id IS NULL;

    IF rows_without_station_id > 0 THEN
      RAISE NOTICE 'WARNING: % rows in station_position_mappings still have NULL station_id', rows_without_station_id;
    ELSE
      RAISE NOTICE 'SUCCESS: All rows in station_position_mappings have valid station_id values';
    END IF;
  ELSE
    RAISE NOTICE 'WARNING: station_id column was not created';
  END IF;
END $$;
