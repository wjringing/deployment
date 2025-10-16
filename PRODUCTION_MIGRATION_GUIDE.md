# Production Database Migration Guide

## Current Status

Your production database already has most tables created, including `user_profiles`. However, you need to:
1. Apply the latest migration (20251019000000_sync_production_with_development.sql)
2. Create your first super admin user

## Step 1: Apply Latest Migration

Go to your Supabase Dashboard → SQL Editor and run this migration:

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project: evxrwggutczvmyoutrmm
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the ENTIRE contents of the file:
   - `/supabase/migrations/20251019000000_sync_production_with_development.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Wait for it to complete (may take 30-60 seconds)

**Option B: Via File Upload**

If the file is too large, you can find it in your project at:
```
supabase/migrations/20251019000000_sync_production_with_development.sql
```

## Step 2: Create Super Admin User

After the migration completes, run this SQL to create your super admin:

```sql
-- Step 2a: Create auth user with Supabase Auth
-- Go to: Authentication → Users → Add User
-- Email: admin@kfc-oswestry.com
-- Password: (your secure password)
-- Then copy the User ID and use it below

-- Step 2b: Create user profile with super_admin role
-- REPLACE 'PASTE_USER_ID_HERE' with the actual UUID from Step 2a
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at
)
VALUES (
  'PASTE_USER_ID_HERE',
  'admin@kfc-oswestry.com',
  'System Administrator',
  'super_admin',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = now();
```

## Step 3: Verify Location Exists

Check if your Oswestry location exists:

```sql
SELECT * FROM locations WHERE location_code = '3016';
```

If it doesn't exist, create it:

```sql
INSERT INTO locations (
  location_code,
  location_name,
  address,
  city,
  postcode,
  status,
  created_at,
  updated_at
)
VALUES (
  '3016',
  'KFC Oswestry',
  '1-3 Church Street',
  'Oswestry',
  'SY11 2SP',
  'active',
  now(),
  now()
)
ON CONFLICT (location_code) DO NOTHING;
```

## Step 4: Verify Setup

Run this verification query:

```sql
-- Check user was created correctly
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.status,
  au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'super_admin';

-- Should return one row with your admin user
-- Both up.email and auth_email should match
```

## Step 5: Test Login

1. Go to your application URL
2. You should now see the login page (not stuck on loading)
3. Enter the email/password you created in Step 2a
4. Click Sign In
5. You should be logged in and see the deployment system

## Alternative: Quick Setup Script

If you want to do everything at once, run this complete setup script in SQL Editor:

```sql
-- ============================================================================
-- QUICK SETUP SCRIPT FOR PRODUCTION
-- ============================================================================

-- This assumes you've already created the auth user via Supabase Dashboard
-- Replace 'YOUR_AUTH_USER_ID' with the actual UUID

DO $$
DECLARE
  v_user_id uuid := 'YOUR_AUTH_USER_ID'; -- REPLACE THIS
  v_location_id uuid;
BEGIN
  -- Create or update user profile with super_admin role
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    'admin@kfc-oswestry.com',
    'System Administrator',
    'super_admin',
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    updated_at = now();

  -- Create Oswestry location if it doesn't exist
  INSERT INTO locations (
    location_code,
    location_name,
    address,
    city,
    postcode,
    status,
    created_at,
    updated_at
  )
  VALUES (
    '3016',
    'KFC Oswestry',
    '1-3 Church Street',
    'Oswestry',
    'SY11 2SP',
    'active',
    now(),
    now()
  )
  ON CONFLICT (location_code) DO NOTHING
  RETURNING id INTO v_location_id;

  -- If location already existed, get its ID
  IF v_location_id IS NULL THEN
    SELECT id INTO v_location_id FROM locations WHERE location_code = '3016';
  END IF;

  RAISE NOTICE 'Setup complete!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Location ID: %', v_location_id;
END $$;
```

## Troubleshooting

### Error: relation "user_profiles" does not exist

This means the migrations haven't been applied. Go back to Step 1 and run the migration.

### Error: duplicate key value violates unique constraint

The user already exists. Use this to update their role:

```sql
UPDATE user_profiles
SET role = 'super_admin', status = 'active'
WHERE email = 'admin@kfc-oswestry.com';
```

### Error: insert or update on table "user_profiles" violates foreign key constraint

The auth user doesn't exist. First create the user via:
1. Supabase Dashboard → Authentication → Users → Add User
2. Then create the profile with the user's UUID

### Still Stuck on Loading

Clear your browser cache:
1. Press F12 (open DevTools)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Try logging in again

Check browser console (F12 → Console) for errors.

### Can Login but See "No Access to Locations"

The user is not a super_admin or doesn't have location access. Run:

```sql
-- Make them super admin
UPDATE user_profiles
SET role = 'super_admin', status = 'active'
WHERE email = 'admin@kfc-oswestry.com';
```

OR give them location access:

```sql
INSERT INTO user_location_access (
  user_id,
  location_id,
  role,
  is_primary
)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'admin@kfc-oswestry.com'),
  (SELECT id FROM locations WHERE location_code = '3016'),
  'location_admin',
  true
);
```

## Already Applied Migrations

These migrations are already in your production database:
- 20251014213747_labor_performance_mapping_enhanced_assignment.sql
- 20251015090152_verify_production_schema.sql
- 20251015095543_20251014130000_complete_system_setup.sql
- 20251015105811_add_performance_kpis_table.sql
- 20251016094547_add_fixed_closing_and_training_development.sql
- 20251016110930_fix_auto_assignment_rules_public_access.sql
- 20251016110952_fix_assignment_history_public_access.sql
- 20251016111026_fix_all_authenticated_only_policies.sql
- 20251016111602_secure_all_tables_authenticated_only.sql
- 20251016111623_remove_all_public_policies_final.sql
- 20251016111725_drop_all_public_policies_exact.sql
- 20251016123906_create_multi_location_foundation.sql
- 20251016124019_implement_location_scoped_rls_policies.sql

## Missing Migrations (Need to Apply)

These migrations need to be applied:
- **20251019000000_sync_production_with_development.sql** ← START HERE

## Existing Tables in Production

Your production database has these tables:
- areas
- assignment_history
- audit_logs
- auto_assignment_rules
- break_schedules
- checklist_completions
- checklist_item_completions
- checklist_items
- checklist_templates
- checklists
- cross_training_opportunities
- deployment_auto_assignment_config
- deployments
- handover_notes
- labor_sales_snapshots
- labor_sales_targets
- locations
- mandatory_training_assignments
- performance_kpis
- performance_metrics
- position_capacity
- positions
- regions
- sales_data
- schedule_employees
- schedule_shifts
- shift_info
- shift_performance_scorecards
- shift_schedules
- staff
- staff_default_positions
- staff_fixed_closing_positions
- staff_locations
- staff_rankings
- staff_roles
- staff_sign_offs
- staff_training_stations
- staff_work_status
- station_position_mappings
- stations
- training_effectiveness_metrics
- training_plan_items
- training_plans
- **user_location_access** ← For multi-location access
- **user_profiles** ← This is where you create users
- Views for reporting

## Next Steps After Setup

Once you can log in:

1. **Create More Users**
   - Go to Settings → User Management
   - Add users for your team
   - Assign appropriate roles

2. **Import Staff Data**
   - Go to Staff/Locations page
   - Import your staff CSV

3. **Configure Stations**
   - Go to Settings → Station/Position Mapping
   - Set up your station mappings

4. **Import Schedule**
   - Go to main deployment page
   - Upload your schedule PDF

5. **Start Creating Deployments**
   - Select date and shift
   - Create deployment
   - Assign staff to stations

## Support

If you encounter any issues:
1. Check browser console (F12 → Console)
2. Check Supabase logs (Dashboard → Logs)
3. Verify all environment variables are set correctly
4. Make sure you're using the correct Supabase project URL

---

**Remember:** You MUST create the auth user first via Supabase Dashboard → Authentication → Users, then create the profile in user_profiles table using that user's ID.
