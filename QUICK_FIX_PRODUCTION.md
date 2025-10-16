# Quick Fix: Production Database Setup

## The Problem

You're getting "relation does not exist" errors because you're either:
1. Connected to the wrong Supabase project in the dashboard, OR
2. The SQL Editor has a session/cache issue

## The Solution

### Step 1: Verify You're On The Correct Project

1. Check your `.env` file - it shows:
   ```
   VITE_SUPABASE_URL=https://evxrwggutczvmyoutrmm.supabase.co
   ```

2. In Supabase Dashboard, verify the URL at the top shows: `evxrwggutczvmyoutrmm`

3. Run the verification script:
   - Open Supabase Dashboard SQL Editor
   - Copy the entire contents of `VERIFY_PRODUCTION_DB.sql`
   - Paste and run it
   - It will show you what tables exist

### Step 2: Create Super Admin User

**2a. Create Auth User**

1. Go to: https://supabase.com/dashboard/project/evxrwggutczvmyoutrmm
2. Click **Authentication** in left sidebar
3. Click **Users**
4. Click **Add User** (green button)
5. Select **Create New User**
6. Enter:
   - Email: `admin@kfc-oswestry.com`
   - Password: `(choose a secure password - you'll use this to log in)`
   - Check "Auto Confirm User" if available
7. Click **Create User**
8. **IMPORTANT:** Copy the UUID shown (looks like: `12345678-abcd-1234-abcd-123456789abc`)

**2b. Create User Profile**

1. Still in Supabase Dashboard, click **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `CREATE_SUPER_ADMIN_SIMPLE.sql`
4. **IMPORTANT:** Replace `'PASTE_USER_UUID_HERE'` with the UUID you copied
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "✅ Super admin user created successfully!"

### Step 3: Create Oswestry Location

Run this in SQL Editor:

```sql
INSERT INTO public.locations (
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
ON CONFLICT (location_code) DO UPDATE SET
  location_name = EXCLUDED.location_name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postcode = EXCLUDED.postcode,
  updated_at = now();

-- Verify it was created
SELECT * FROM public.locations WHERE location_code = '3016';
```

### Step 4: Test Login

1. Go to your application URL
2. Enter the email and password from Step 2a
3. Click Sign In
4. You should be logged in!

## Troubleshooting

### "relation does not exist" Error

**Option A: You're on the wrong project**
- Check the project reference in the Supabase Dashboard URL
- It should be: `evxrwggutczvmyoutrmm`
- If it's different, switch to the correct project

**Option B: SQL Editor needs refresh**
- Close the SQL Editor tab
- Open a new SQL Editor tab
- Try again

**Option C: Explicitly use public schema**
- Add `public.` before table names:
  ```sql
  INSERT INTO public.user_profiles (...)
  ```

### "duplicate key value" Error

The user already exists. To update their role:

```sql
UPDATE public.user_profiles
SET role = 'super_admin', status = 'active'
WHERE email = 'admin@kfc-oswestry.com';
```

### "foreign key constraint" Error

The auth user doesn't exist. Go back to Step 2a and create the auth user first.

### Still Can't Log In

1. Clear browser cache (Ctrl+Shift+Delete)
2. Open browser console (F12 → Console tab)
3. Look for error messages
4. Common issues:
   - Wrong password (use the password from Step 2a)
   - User not confirmed (check Authentication → Users, status should be "Confirmed")
   - Wrong email (check it matches exactly)

### App Still Shows Loading Screen

This means:
1. No users exist at all, OR
2. The user exists but isn't confirmed, OR
3. There's a JavaScript error (check browser console)

## Complete Example

Here's a complete working example with all steps:

```sql
-- Step 1: Verify tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_profiles', 'locations');
-- Should return both tables

-- Step 2: Create user profile (replace UUID!)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  status
)
VALUES (
  '12345678-abcd-1234-abcd-123456789abc', -- REPLACE THIS
  'admin@kfc-oswestry.com',
  'System Administrator',
  'super_admin',
  'active'
);

-- Step 3: Create location
INSERT INTO public.locations (
  location_code,
  location_name,
  address,
  city,
  postcode,
  status
)
VALUES (
  '3016',
  'KFC Oswestry',
  '1-3 Church Street',
  'Oswestry',
  'SY11 2SP',
  'active'
)
ON CONFLICT (location_code) DO NOTHING;

-- Step 4: Verify everything
SELECT 'Users:' as check_type, count(*)::text as count FROM public.user_profiles WHERE role = 'super_admin'
UNION ALL
SELECT 'Locations:', count(*)::text FROM public.locations;
```

## After Successful Login

Once logged in as super admin, you can:
1. Access all features
2. Create more users via Settings → User Management
3. Import staff data
4. Upload schedules
5. Create deployments

---

**Key Points:**
- Always create the auth user FIRST via Supabase Dashboard
- Then create the profile using that user's UUID
- Use the exact same email in both places
- Add `public.` prefix if you get "relation does not exist" errors
