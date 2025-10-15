/*
  # Diagnostic query to check stations table schema

  Run this first to see what columns exist in your stations table
*/

-- Check if stations table exists and what columns it has
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'stations'
ORDER BY ordinal_position;

-- Also check station_position_mappings columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'station_position_mappings'
ORDER BY ordinal_position;
