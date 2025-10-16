/*
  # Remove All Public Policies - Final Cleanup

  ## Issue
  Previous migration created authenticated policies but some old public policies remain.
  This leaves a security hole where data is still accessible without authentication.

  ## Solution
  Aggressively remove ALL public policies from ALL tables, leaving only authenticated policies.

  ## Security
  After this migration, ALL database access requires authentication.
*/

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop ALL policies that grant access to public role
    FOR policy_record IN
        SELECT 
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND '{public}' = ANY(roles)
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
        
        RAISE NOTICE 'Dropped public policy: % on table %', 
            policy_record.policyname, 
            policy_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'All public policies removed. Only authenticated access remains.';
END $$;
