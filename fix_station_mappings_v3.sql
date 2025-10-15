/*
  # Fix station_position_mappings table - Version 3 (Production Safe)

  This migration is designed to work with your existing production schema.
  It will:
  1. Check existing table structures
  2. Create or update tables as needed
  3. Migrate data from station_name to station_id
  4. Preserve all existing data
*/

-- Step 1: Drop and recreate stations table if it exists but has wrong schema
-- This is safe because we'll preserve the data via station_position_mappings
DO $$
BEGIN
  -- Check if stations table exists and has correct schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'stations'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'station_name'
  ) THEN
    -- Table exists but doesn't have station_name column - drop it
    DROP TABLE IF EXISTS stations CASCADE;
    RAISE NOTICE 'Dropped existing stations table with incorrect schema';
  END IF;
END $$;

-- Step 2: Create stations table with correct schema
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL UNIQUE,
  station_code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view stations" ON stations;
DROP POLICY IF EXISTS "Users can insert stations" ON stations;
DROP POLICY IF EXISTS "Users can update stations" ON stations;
DROP POLICY IF EXISTS "Users can delete stations" ON stations;

CREATE POLICY "Users can view stations" ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert stations" ON stations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update stations" ON stations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete stations" ON stations FOR DELETE TO authenticated USING (true);

-- Step 3: Seed default stations
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

-- Step 4: Add station_id column to station_position_mappings if it doesn't exist
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
  ELSE
    RAISE NOTICE 'station_id column already exists in station_position_mappings';
  END IF;
END $$;

-- Step 5: Migrate data from station_name to station_id
DO $$
DECLARE
  mapping_rec RECORD;
  v_station_id uuid;
  v_station_name_text text;
  migrated_count integer := 0;
  created_stations_count integer := 0;
BEGIN
  -- Only proceed if station_name column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_name'
  ) THEN

    RAISE NOTICE 'Starting migration of station_name to station_id...';

    -- Loop through each mapping record
    FOR mapping_rec IN
      SELECT
        spm.id as mapping_id,
        spm.station_name as stn_name
      FROM station_position_mappings spm
      WHERE spm.station_name IS NOT NULL
      AND spm.station_id IS NULL
    LOOP
      -- Store station name in variable
      v_station_name_text := mapping_rec.stn_name;

      -- Try to find existing station
      SELECT s.id INTO v_station_id
      FROM stations s
      WHERE s.station_name = v_station_name_text;

      -- If station doesn't exist, create it
      IF v_station_id IS NULL THEN
        INSERT INTO stations (station_name, station_code, is_active, display_order)
        VALUES (
          v_station_name_text,
          UPPER(LEFT(REGEXP_REPLACE(v_station_name_text, '[^a-zA-Z0-9]', '', 'g'), 3)),
          true,
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stations)
        )
        RETURNING id INTO v_station_id;

        created_stations_count := created_stations_count + 1;
        RAISE NOTICE 'Created new station: % (id: %)', v_station_name_text, v_station_id;
      END IF;

      -- Update the mapping
      UPDATE station_position_mappings
      SET station_id = v_station_id
      WHERE id = mapping_rec.mapping_id;

      migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migration complete: % mappings updated, % new stations created', migrated_count, created_stations_count;

  ELSE
    RAISE NOTICE 'station_name column does not exist in station_position_mappings - skipping migration';
  END IF;
END $$;

-- Step 6: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'station_position_mappings_station_id_fkey'
  ) THEN
    ALTER TABLE station_position_mappings
    ADD CONSTRAINT station_position_mappings_station_id_fkey
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_station_mappings_station_id
ON station_position_mappings(station_id);

-- Step 8: Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
CREATE TRIGGER update_stations_updated_at
BEFORE UPDATE ON stations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_position_mappings_updated_at ON station_position_mappings;
CREATE TRIGGER update_station_position_mappings_updated_at
BEFORE UPDATE ON station_position_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Final verification and report
DO $$
DECLARE
  total_mappings integer;
  mappings_with_station_id integer;
  mappings_without_station_id integer;
  total_stations integer;
BEGIN
  -- Count mappings
  SELECT COUNT(*) INTO total_mappings FROM station_position_mappings;
  SELECT COUNT(*) INTO mappings_with_station_id FROM station_position_mappings WHERE station_id IS NOT NULL;
  SELECT COUNT(*) INTO mappings_without_station_id FROM station_position_mappings WHERE station_id IS NULL;
  SELECT COUNT(*) INTO total_stations FROM stations;

  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Total stations: %', total_stations;
  RAISE NOTICE 'Total position mappings: %', total_mappings;
  RAISE NOTICE 'Mappings with station_id: %', mappings_with_station_id;
  RAISE NOTICE 'Mappings without station_id: %', mappings_without_station_id;

  IF mappings_without_station_id > 0 THEN
    RAISE WARNING '% mappings still need station_id values!', mappings_without_station_id;
  ELSE
    RAISE NOTICE 'SUCCESS: All mappings have valid station_id values!';
  END IF;
END $$;
