/*
  # Secure Production Database - Safe Version

  ## Issue
  Production database may have a mix of authenticated and public policies.
  We need to safely transition to authenticated-only access.

  ## Solution
  1. Drop ALL existing policies (both public and authenticated)
  2. Create fresh authenticated-only policies
  3. Handle policy name conflicts gracefully

  ## Security
  After this migration, ALL database access requires authentication.
*/

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- Loop through all tables in the public schema
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
    LOOP
        -- Enable RLS if not already enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);

        -- Drop ALL existing policies (both public and authenticated)
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = table_record.tablename
        LOOP
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

        RAISE NOTICE 'Secured table: % (all old policies removed, authenticated policies created)', table_record.tablename;
    END LOOP;

    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'All tables now require authentication for access.';
END $$;

-- Verify the migration
DO $$
DECLARE
    public_policy_count INTEGER;
    authenticated_table_count INTEGER;
    total_table_count INTEGER;
BEGIN
    -- Count remaining public policies
    SELECT COUNT(*) INTO public_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%public%';

    -- Count tables with authenticated policies
    SELECT COUNT(DISTINCT tablename) INTO authenticated_table_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%authenticated%';

    -- Count total tables with RLS
    SELECT COUNT(*) INTO total_table_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND rowsecurity = true;

    RAISE NOTICE '';
    RAISE NOTICE '=== SECURITY VERIFICATION ===';
    RAISE NOTICE 'Public policies remaining: %', public_policy_count;
    RAISE NOTICE 'Tables with authenticated policies: %', authenticated_table_count;
    RAISE NOTICE 'Total tables with RLS enabled: %', total_table_count;

    IF public_policy_count = 0 THEN
        RAISE NOTICE '✓ SUCCESS: No public policies remain - database is secure!';
    ELSE
        RAISE WARNING '⚠ WARNING: % public policies still exist - manual cleanup may be needed', public_policy_count;
    END IF;
END $$;
