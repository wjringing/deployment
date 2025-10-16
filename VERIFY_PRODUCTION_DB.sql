-- ============================================================================
-- PRODUCTION DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- Run this in your Supabase SQL Editor to verify you're on the right project
-- and see what tables exist

-- Step 1: Show current project info
SELECT current_database() as database_name;

-- Step 2: List all tables in public schema
SELECT
  table_schema,
  table_name,
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE columns.table_name = tables.table_name
   AND columns.table_schema = tables.table_schema) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Step 3: Check if user_profiles exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
) as user_profiles_exists;

-- Step 4: Check if locations exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'locations'
) as locations_exists;

-- Step 5: If user_profiles exists, show its structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 6: If locations exists, show its structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'locations'
ORDER BY ordinal_position;

-- Step 7: Check which migrations have been applied
SELECT
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
