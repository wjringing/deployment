/*
  # Fix station_position_mappings table - Final Version

  This migration handles the complete migration from station_name to station_id
  with proper handling of duplicate station codes.
*/

-- Step 1: Create stations table if needed
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

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view stations" ON stations;
DROP POLICY IF EXISTS "Users can insert stations" ON stations;
DROP POLICY IF EXISTS "Users can update stations" ON stations;
DROP POLICY IF EXISTS "Users can delete stations" ON stations;

CREATE POLICY "Users can view stations" ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert stations" ON stations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update stations" ON stations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete stations" ON stations FOR DELETE TO authenticated USING (true);

-- Step 2: Seed default stations
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

-- Step 3: Add station_id column to station_position_mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_id'
  ) THEN
    ALTER TABLE station_position_mappings ADD COLUMN station_id uuid;
    RAISE NOTICE 'Added station_id column';
  END IF;
END $$;

-- Step 4: Migrate data with unique station code generation
DO $$
DECLARE
  mapping_rec RECORD;
  v_station_id uuid;
  v_station_name_text text;
  v_station_code text;
  v_code_suffix integer;
  v_base_code text;
  migrated_count integer := 0;
  created_stations_count integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'station_position_mappings'
    AND column_name = 'station_name'
  ) THEN

    RAISE NOTICE 'Starting migration...';

    FOR mapping_rec IN
      SELECT
        spm.id as mapping_id,
        spm.station_name as stn_name
      FROM station_position_mappings spm
      WHERE spm.station_name IS NOT NULL
      AND spm.station_id IS NULL
    LOOP
      v_station_name_text := mapping_rec.stn_name;

      -- Try to find existing station by name
      SELECT s.id INTO v_station_id
      FROM stations s
      WHERE s.station_name = v_station_name_text;

      -- If station doesn't exist, create it with a unique code
      IF v_station_id IS NULL THEN
        -- Generate base code from station name
        v_base_code := UPPER(LEFT(REGEXP_REPLACE(v_station_name_text, '[^a-zA-Z0-9]', '', 'g'), 3));
        v_station_code := v_base_code;
        v_code_suffix := 1;

        -- Keep trying until we find a unique code
        WHILE EXISTS (SELECT 1 FROM stations WHERE station_code = v_station_code) LOOP
          v_station_code := v_base_code || v_code_suffix::text;
          v_code_suffix := v_code_suffix + 1;
        END LOOP;

        -- Insert the new station
        INSERT INTO stations (station_name, station_code, is_active, display_order)
        VALUES (
          v_station_name_text,
          v_station_code,
          true,
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stations)
        )
        RETURNING id INTO v_station_id;

        created_stations_count := created_stations_count + 1;
        RAISE NOTICE 'Created station: % (code: %, id: %)', v_station_name_text, v_station_code, v_station_id;
      END IF;

      -- Update the mapping
      UPDATE station_position_mappings
      SET station_id = v_station_id
      WHERE id = mapping_rec.mapping_id;

      migrated_count := migrated_count + 1;
    END LOOP;

    RAISE NOTICE 'Migration complete: % mappings, % new stations', migrated_count, created_stations_count;
  ELSE
    RAISE NOTICE 'No station_name column found - skipping migration';
  END IF;
END $$;

-- Step 5: Add foreign key constraint
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
  END IF;
END $$;

-- Step 6: Create index
CREATE INDEX IF NOT EXISTS idx_station_mappings_station_id
ON station_position_mappings(station_id);

-- Step 7: Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers
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

-- Step 9: Final report
DO $$
DECLARE
  total_stations integer;
  total_mappings integer;
  mappings_with_station_id integer;
  mappings_without_station_id integer;
BEGIN
  SELECT COUNT(*) INTO total_stations FROM stations;
  SELECT COUNT(*) INTO total_mappings FROM station_position_mappings;
  SELECT COUNT(*) INTO mappings_with_station_id FROM station_position_mappings WHERE station_id IS NOT NULL;
  SELECT COUNT(*) INTO mappings_without_station_id FROM station_position_mappings WHERE station_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total stations: %', total_stations;
  RAISE NOTICE 'Total position mappings: %', total_mappings;
  RAISE NOTICE 'Mappings with station_id: %', mappings_with_station_id;
  RAISE NOTICE 'Mappings without station_id: %', mappings_without_station_id;
  RAISE NOTICE '========================================';

  IF mappings_without_station_id = 0 THEN
    RAISE NOTICE 'SUCCESS! All mappings migrated successfully.';
  ELSE
    RAISE WARNING 'WARNING: % mappings still need station_id!', mappings_without_station_id;
  END IF;
END $$;
