/*
  # Remove unassigned positions

  1. Changes
    - Delete all positions that have no area_id (unassigned positions)
    - Keep positions that are assigned to areas
    - Keep area and cleaning_area type positions

  2. Security
    - No RLS changes needed as we're only removing data

  3. Notes
    - This will clean up positions that cannot be properly categorized
    - Only affects positions with type='position' and area_id IS NULL
*/

-- Remove unassigned positions (positions with no area_id)
DELETE FROM positions 
WHERE type = 'position' 
AND area_id IS NULL;