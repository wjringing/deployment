/*
  # Production Database Schema Verification Script

  Run this script in your Supabase SQL Editor to verify the complete database schema.
  This will output a comprehensive report of all tables, columns, relationships, and settings.

  Save the output to compare with your bolt database.
*/

-- ============================================================================
-- SECTION 1: List all tables with row counts
-- ============================================================================
SELECT '=== TABLES AND ROW COUNTS ===' as section;

SELECT
  tablename as table_name,
  (xpath('/row/count/text()',
    query_to_xml(format('SELECT count(*) as count FROM %I.%I', schemaname, tablename),
    false, true, '')))[1]::text::int as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: All columns with their complete definitions
-- ============================================================================
SELECT '=== COLUMNS ===' as section;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- SECTION 3: Primary Keys
-- ============================================================================
SELECT '=== PRIMARY KEYS ===' as section;

SELECT
  tc.table_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as primary_key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 4: Foreign Key Relationships
-- ============================================================================
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as section;

SELECT
  tc.table_name as from_table,
  kcu.column_name as from_column,
  ccu.table_name as to_table,
  ccu.column_name as to_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SECTION 5: Unique Constraints
-- ============================================================================
SELECT '=== UNIQUE CONSTRAINTS ===' as section;

SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 6: Indexes
-- ============================================================================
SELECT '=== INDEXES ===' as section;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 7: Row Level Security (RLS) Status
-- ============================================================================
SELECT '=== RLS STATUS ===' as section;

SELECT
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 8: RLS Policies
-- ============================================================================
SELECT '=== RLS POLICIES ===' as section;

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 9: Triggers
-- ============================================================================
SELECT '=== TRIGGERS ===' as section;

SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SECTION 10: Functions (User-defined)
-- ============================================================================
SELECT '=== CUSTOM FUNCTIONS ===' as section;

SELECT
  routine_name as function_name,
  routine_type as type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- SECTION 11: Check Constraints
-- ============================================================================
SELECT '=== CHECK CONSTRAINTS ===' as section;

SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 12: Specific Critical Tables Verification
-- ============================================================================
SELECT '=== CRITICAL TABLES VERIFICATION ===' as section;

-- Verify stations table structure
SELECT 'stations table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'stations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify station_position_mappings table structure
SELECT 'station_position_mappings table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'station_position_mappings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any station_name column in station_position_mappings (should NOT exist)
SELECT 'Checking for station_name in station_position_mappings (should be empty):' as info;
SELECT COUNT(*) as station_name_column_exists
FROM information_schema.columns
WHERE table_name = 'station_position_mappings'
  AND column_name = 'station_name'
  AND table_schema = 'public';

-- Verify station_id foreign key exists
SELECT 'Checking station_id foreign key in station_position_mappings:' as info;
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as references_table,
  ccu.column_name as references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'station_position_mappings'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'station_id';

-- ============================================================================
-- SECTION 13: Sample Data from Critical Tables
-- ============================================================================
SELECT '=== SAMPLE DATA ===' as section;

SELECT 'Stations sample:' as info;
SELECT * FROM stations LIMIT 5;

SELECT 'Station Position Mappings sample:' as info;
SELECT * FROM station_position_mappings LIMIT 5;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
SELECT '=== VERIFICATION COMPLETE ===' as section;
SELECT 'Schema verification completed successfully.' as message;
SELECT 'Compare this output with your bolt database schema.' as next_step;
