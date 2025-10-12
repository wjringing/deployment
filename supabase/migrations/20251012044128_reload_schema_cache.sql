/*
  # Force Schema Cache Reload

  This migration forces PostgREST to reload its schema cache by sending a NOTIFY signal.
  This resolves the issue where tables exist in the database but PostgREST returns 404.
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all tables are accessible
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
