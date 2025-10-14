/*
  # Add position ordering system

  1. Schema Changes
    - Add `display_order` column to positions table
    - Add index for efficient ordering queries
  
  2. Data Migration
    - Set initial display_order values based on current position names
    - Ensure all positions have a valid display_order
  
  3. Purpose
    - Allow custom ordering of positions in the interactive deployment builder
    - Maintain consistent position display across the application
*/

-- Add display_order column to positions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE positions ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Set initial display_order values based on position names
-- Kitchen positions (1-10)
UPDATE positions SET display_order = 1 WHERE name = 'Cook' AND display_order = 0;
UPDATE positions SET display_order = 2 WHERE name = 'Cook2' AND display_order = 0;
UPDATE positions SET display_order = 3 WHERE name = 'Burgers' AND display_order = 0;
UPDATE positions SET display_order = 4 WHERE name = 'Fries' AND display_order = 0;
UPDATE positions SET display_order = 5 WHERE name = 'Chick' AND display_order = 0;
UPDATE positions SET display_order = 6 WHERE name = 'Transfer' AND display_order = 0;

-- Front of House positions (11-20)
UPDATE positions SET display_order = 11 WHERE name = 'DT' AND display_order = 0;
UPDATE positions SET display_order = 12 WHERE name = 'DT2' AND display_order = 0;
UPDATE positions SET display_order = 13 WHERE name = 'Rst' AND display_order = 0;
UPDATE positions SET display_order = 14 WHERE name = 'Front' AND display_order = 0;
UPDATE positions SET display_order = 15 WHERE name = 'Mid' AND display_order = 0;
UPDATE positions SET display_order = 16 WHERE name = 'Lobby' AND display_order = 0;

-- Packing positions (21-30)
UPDATE positions SET display_order = 21 WHERE name = 'DT Pack' AND display_order = 0;
UPDATE positions SET display_order = 22 WHERE name = 'Rst Pack' AND display_order = 0;
UPDATE positions SET display_order = 23 WHERE name = 'Deliv Pack' AND display_order = 0;

-- Management positions (31-40)
UPDATE positions SET display_order = 31 WHERE name = 'Manager' AND display_order = 0;
UPDATE positions SET display_order = 32 WHERE name = 'Shift Leader' AND display_order = 0;
UPDATE positions SET display_order = 33 WHERE name = 'Team Leader' AND display_order = 0;

-- Set default order for any remaining positions without display_order
UPDATE positions 
SET display_order = 999 
WHERE display_order = 0;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_positions_display_order 
ON positions (area_id, display_order, name);