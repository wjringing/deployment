-- Diagnose why profile query is hanging

-- 1. Check if user exists
SELECT 'User exists:', id, email, role, status
FROM public.user_profiles
WHERE id = 'b0c66e5c-3535-4feb-91be-a9491cdbf53c';

-- 2. Check all RLS policies on user_profiles
SELECT
    policyname,
    cmd,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 3. Test if the policy would allow this specific query
-- (Run this as the authenticated user in Supabase SQL Editor)
SET request.jwt.claims.sub = 'b0c66e5c-3535-4feb-91be-a9491cdbf53c';
SELECT * FROM public.user_profiles WHERE id = 'b0c66e5c-3535-4feb-91be-a9491cdbf53c';

-- 4. Check if there are any triggers that might be slow
SELECT
    tgname as trigger_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.user_profiles'::regclass;
