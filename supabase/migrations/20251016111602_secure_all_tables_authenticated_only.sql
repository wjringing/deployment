/*
  # Secure All Tables - Authenticated Access Only

  ## Security Issue
  ALL tables currently use "public" RLS policies, which means anyone with the
  Supabase anon key can access data without authentication. This is a critical
  security vulnerability.

  ## Solution
  Replace ALL public RLS policies with authenticated-only policies. This ensures
  only logged-in users can access the database, even if someone obtains the
  Supabase URL and anon key.

  ## Changes
  - Drop all existing "public" RLS policies
  - Create new "authenticated" RLS policies for all tables
  - Maintain same permissions structure (read and write access)
  - Apply to ALL tables in the database

  ## Security Benefits
  - ✅ Prevents unauthorized database access
  - ✅ Requires valid authentication session
  - ✅ Protects against direct API exploitation
  - ✅ Maintains data confidentiality
*/

-- ============================================================================
-- FUNCTION TO UPDATE ALL TABLE POLICIES
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- Loop through all tables with RLS enabled
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
    LOOP
        -- Enable RLS if not already enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        
        -- Drop all existing public policies
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = table_record.tablename
              AND '{public}' = ANY(roles)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                policy_record.policyname, 
                table_record.tablename
            );
        END LOOP;
        
        -- Create authenticated SELECT policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)',
            'Authenticated users can view ' || table_record.tablename,
            table_record.tablename
        );
        
        -- Create authenticated ALL policy (INSERT, UPDATE, DELETE)
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            'Authenticated users can manage ' || table_record.tablename,
            table_record.tablename
        );
        
        RAISE NOTICE 'Updated policies for table: %', table_record.tablename;
    END LOOP;
END $$;
