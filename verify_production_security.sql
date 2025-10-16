/*
  # Production Security Verification Script

  Run this script BEFORE and AFTER the migration to verify security status.
*/

-- ============================================================================
-- CHECK 1: Count public policies (should be 0 after migration)
-- ============================================================================
SELECT
    '=== PUBLIC POLICIES CHECK ===' as check_name,
    COUNT(*) as public_policy_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ SECURE: No public access'
        ELSE '⚠ INSECURE: Public access exists'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%public%';

-- ============================================================================
-- CHECK 2: List all public policies (should be empty after migration)
-- ============================================================================
SELECT
    '=== PUBLIC POLICIES DETAIL ===' as check_name,
    tablename,
    policyname,
    roles::text as roles
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%public%'
ORDER BY tablename, policyname
LIMIT 20;

-- ============================================================================
-- CHECK 3: Count authenticated policies (should match table count)
-- ============================================================================
SELECT
    '=== AUTHENTICATED POLICIES CHECK ===' as check_name,
    COUNT(DISTINCT tablename) as tables_with_auth_policies,
    COUNT(*) as total_auth_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%authenticated%';

-- ============================================================================
-- CHECK 4: Tables with RLS enabled
-- ============================================================================
SELECT
    '=== RLS STATUS CHECK ===' as check_name,
    COUNT(*) as tables_with_rls,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as rls_enabled,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as rls_disabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';

-- ============================================================================
-- CHECK 5: Tables without any policies (potential security issue)
-- ============================================================================
SELECT
    '=== TABLES WITHOUT POLICIES ===' as check_name,
    t.tablename,
    t.rowsecurity as rls_enabled,
    CASE
        WHEN p.tablename IS NULL AND t.rowsecurity = true
        THEN '⚠ WARNING: RLS enabled but no policies (all access blocked)'
        WHEN p.tablename IS NULL AND t.rowsecurity = false
        THEN '⚠ WARNING: No RLS (public access allowed)'
        ELSE '✓ OK'
    END as status
FROM pg_tables t
LEFT JOIN (
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  AND p.tablename IS NULL
ORDER BY t.tablename;

-- ============================================================================
-- CHECK 6: Sample of policy configuration per table
-- ============================================================================
SELECT
    '=== POLICY CONFIGURATION SAMPLE ===' as check_name,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT roles::text, ', ') as roles_used,
    CASE
        WHEN STRING_AGG(DISTINCT roles::text, ', ') LIKE '%public%'
        THEN '⚠ INSECURE: Has public access'
        WHEN STRING_AGG(DISTINCT roles::text, ', ') = '{authenticated}'
        THEN '✓ SECURE: Authenticated only'
        ELSE 'ℹ INFO: Mixed or other roles'
    END as security_status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY
    CASE
        WHEN STRING_AGG(DISTINCT roles::text, ', ') LIKE '%public%' THEN 1
        ELSE 2
    END,
    tablename
LIMIT 20;

-- ============================================================================
-- CHECK 7: Critical tables security check
-- ============================================================================
SELECT
    '=== CRITICAL TABLES SECURITY ===' as check_name,
    table_name,
    has_rls,
    policy_count,
    roles_used,
    CASE
        WHEN NOT has_rls THEN '⚠ CRITICAL: No RLS enabled'
        WHEN policy_count = 0 THEN '⚠ CRITICAL: No policies (access blocked)'
        WHEN roles_used LIKE '%public%' THEN '⚠ INSECURE: Public access'
        WHEN roles_used = '{authenticated}' THEN '✓ SECURE'
        ELSE 'ℹ INFO: Review manually'
    END as security_status
FROM (
    SELECT
        t.tablename as table_name,
        t.rowsecurity as has_rls,
        COUNT(p.policyname) as policy_count,
        STRING_AGG(DISTINCT p.roles::text, ', ') as roles_used
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
      AND t.tablename IN (
          'staff', 'deployments', 'positions', 'sales_data',
          'auto_assignment_rules', 'assignment_history',
          'staff_training_stations', 'staff_rankings'
      )
    GROUP BY t.tablename, t.rowsecurity
) critical_tables
ORDER BY
    CASE security_status
        WHEN '⚠ CRITICAL: No RLS enabled' THEN 1
        WHEN '⚠ CRITICAL: No policies (access blocked)' THEN 2
        WHEN '⚠ INSECURE: Public access' THEN 3
        WHEN '✓ SECURE' THEN 4
        ELSE 5
    END,
    table_name;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT
    '=== FINAL SECURITY SUMMARY ===' as summary,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND roles::text LIKE '%public%') as public_policies,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public' AND roles::text LIKE '%authenticated%') as tables_with_auth,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%') as tables_with_rls,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND roles::text LIKE '%public%') = 0
        THEN '✓ DATABASE IS SECURE - All access requires authentication'
        ELSE '⚠ DATABASE IS INSECURE - Public access policies exist'
    END as overall_status;
