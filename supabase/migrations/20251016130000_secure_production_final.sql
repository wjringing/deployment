/*
  # Secure Production Database - Final Safe Version

  ## Issue
  Production database has different tables than development.
  Some tables may not exist, causing migration errors.

  ## Solution
  Dynamically identify all tables and policies in the actual database,
  then secure them appropriately. No hardcoded table names.

  ## What This Does
  1. Finds all tables that actually exist in your database
  2. Drops ALL policies (public and authenticated) from each table
  3. Creates fresh authenticated-only policies
  4. Enables RLS on all tables
  5. Verifies the migration succeeded

  ## Security
  After this migration, ALL database access requires authentication.
*/

-- ============================================================================
-- STEP 1: Secure All Tables Dynamically
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    table_count INTEGER := 0;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Production Security Migration';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Loop through all tables that actually exist
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
        ORDER BY tablename
    LOOP
        table_count := table_count + 1;

        -- Enable RLS if not already enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);

        -- Drop ALL existing policies from this table
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = table_record.tablename
        LOOP
            policy_count := policy_count + 1;
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I',
                policy_record.policyname,
                table_record.tablename
            );
        END LOOP;

        -- Create fresh authenticated SELECT policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)',
            'Authenticated users can view ' || table_record.tablename,
            table_record.tablename
        );

        -- Create fresh authenticated ALL policy (INSERT, UPDATE, DELETE)
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            'Authenticated users can manage ' || table_record.tablename,
            table_record.tablename
        );

        RAISE NOTICE '[✓] Secured: % (dropped % policies, created 2 authenticated policies)',
            table_record.tablename,
            (SELECT COUNT(*) FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename = table_record.tablename
               AND policyname = policy_record.policyname);
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables secured: %', table_count;
    RAISE NOTICE 'Old policies removed: %', policy_count;
    RAISE NOTICE 'New authenticated policies created: %', table_count * 2;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Verify Security
-- ============================================================================

DO $$
DECLARE
    public_policy_count INTEGER;
    authenticated_table_count INTEGER;
    total_table_count INTEGER;
    tables_without_policies INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security Verification';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Count remaining public policies (should be 0)
    SELECT COUNT(*) INTO public_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%public%';

    -- Count tables with authenticated policies
    SELECT COUNT(DISTINCT tablename) INTO authenticated_table_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%authenticated%';

    -- Count total tables with RLS enabled
    SELECT COUNT(*) INTO total_table_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND rowsecurity = true;

    -- Count tables without any policies (potential issue)
    SELECT COUNT(*) INTO tables_without_policies
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT LIKE 'pg_%'
      AND t.tablename NOT LIKE 'sql_%'
      AND NOT EXISTS (
          SELECT 1 FROM pg_policies p
          WHERE p.schemaname = 'public'
            AND p.tablename = t.tablename
      );

    RAISE NOTICE 'Public policies remaining: %', public_policy_count;
    RAISE NOTICE 'Tables with authenticated policies: %', authenticated_table_count;
    RAISE NOTICE 'Total tables with RLS enabled: %', total_table_count;
    RAISE NOTICE 'Tables without policies: %', tables_without_policies;
    RAISE NOTICE '';

    IF public_policy_count = 0 AND tables_without_policies = 0 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓✓✓ SUCCESS ✓✓✓';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Database is now SECURE!';
        RAISE NOTICE 'All tables require authentication.';
        RAISE NOTICE 'No public access policies remain.';
        RAISE NOTICE '========================================';
    ELSIF public_policy_count > 0 THEN
        RAISE WARNING '⚠ WARNING: % public policies still exist', public_policy_count;
        RAISE WARNING 'Manual cleanup may be required.';
    ELSIF tables_without_policies > 0 THEN
        RAISE WARNING '⚠ WARNING: % tables have no policies', tables_without_policies;
        RAISE WARNING 'These tables will block all access (including authenticated users).';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Test login to your application';
    RAISE NOTICE '2. Verify Rule Management page works';
    RAISE NOTICE '3. Check that all features load correctly';
    RAISE NOTICE '4. Run verify_production_security.sql for detailed report';
    RAISE NOTICE '========================================';
END $$;
