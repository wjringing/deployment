/*
  # Production Schema Verification Script
  
  This script verifies the complete database schema and outputs detailed information
  about all tables, columns, constraints, and relationships.
  
  ## Tables Verified
  1. Core tables (staff, stations, positions, etc.)
  2. Deployment and shift tables
  3. Training and ranking tables
  4. Configuration and settings tables
  5. All relationships and foreign keys
  
  ## Output
  - All table names and row counts
  - Complete column definitions with data types
  - Primary keys and unique constraints
  - Foreign key relationships
  - Indexes
  - RLS policies status
*/

-- Create a temporary function to generate the schema report
CREATE OR REPLACE FUNCTION verify_production_schema()
RETURNS TABLE (
  section text,
  detail text
) AS $$
BEGIN
  -- List all tables with row counts
  RETURN QUERY
  SELECT 
    'TABLE' as section,
    t.table_name || ' (rows: ' || 
    COALESCE((
      SELECT count(*)::text 
      FROM information_schema.tables t2
      WHERE t2.table_schema = 'public' 
      AND t2.table_name = t.table_name
    ), '0') || ')' as detail
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
  
  -- List all columns with their properties
  RETURN QUERY
  SELECT 
    'COLUMN' as section,
    c.table_name || '.' || c.column_name || 
    ' (' || c.data_type || 
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END ||
    ')' as detail
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position;
  
  -- List all primary keys
  RETURN QUERY
  SELECT 
    'PRIMARY_KEY' as section,
    tc.table_name || ' -> ' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as detail
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
  GROUP BY tc.table_name, tc.constraint_name;
  
  -- List all foreign keys
  RETURN QUERY
  SELECT 
    'FOREIGN_KEY' as section,
    tc.table_name || '.' || kcu.column_name || 
    ' -> ' || ccu.table_name || '.' || ccu.column_name as detail
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
  
  -- List all unique constraints
  RETURN QUERY
  SELECT 
    'UNIQUE_CONSTRAINT' as section,
    tc.table_name || ' -> ' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as detail
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
  GROUP BY tc.table_name, tc.constraint_name;
  
  -- List all indexes
  RETURN QUERY
  SELECT 
    'INDEX' as section,
    schemaname || '.' || tablename || ' -> ' || indexname as detail
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname;
  
  -- List RLS status for all tables
  RETURN QUERY
  SELECT 
    'RLS_STATUS' as section,
    tablename || ' (RLS: ' || 
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END || ')' as detail
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  
  -- List all RLS policies
  RETURN QUERY
  SELECT 
    'RLS_POLICY' as section,
    schemaname || '.' || tablename || ' -> ' || policyname || 
    ' (' || cmd || ')' as detail
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
  
END;
$$ LANGUAGE plpgsql;

-- Execute the verification and display results
SELECT * FROM verify_production_schema();

-- Drop the temporary function
DROP FUNCTION verify_production_schema();
