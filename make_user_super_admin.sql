-- Run this after signing up to make your user a super admin
-- Replace 'will@w-j-lander.uk' with your actual email if different

UPDATE public.user_profiles
SET
  role = 'super_admin',
  status = 'active',
  full_name = 'Will Lander'
WHERE email = 'will@w-j-lander.uk';

-- Verify the update
SELECT id, email, role, status, full_name
FROM public.user_profiles
WHERE email = 'will@w-j-lander.uk';
