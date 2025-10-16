# Production Server Update Guide

## Critical: Database Setup Required

Your application is stuck on loading because there are no users in the database. You need to create an initial super admin user first.

## Step 1: Create Initial Super Admin User

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **Add User** → **Create New User**
5. Enter email and password (e.g., admin@kfc-oswestry.com)
6. Click **Create User**
7. Copy the User ID that appears

**Option B: Via SQL Editor**

```sql
-- This creates an auth user and profile in one step
-- Replace with your desired email/password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@kfc-oswestry.com',
  crypt('YourSecurePassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
)
RETURNING id;
```

## Step 2: Create User Profile with Super Admin Role

After creating the auth user, run this SQL (replace USER_ID with the ID from Step 1):

```sql
-- Insert user profile with super_admin role
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  status
)
VALUES (
  'USER_ID_FROM_STEP_1',
  'admin@kfc-oswestry.com',
  'System Administrator',
  'super_admin',
  'active'
);
```

## Step 3: Verify Location Exists

Check if Oswestry location exists:

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
  status
)
VALUES (
  '3016',
  'KFC Oswestry',
  '1-3 Church Street',
  'Oswestry',
  'SY11 2SP',
  'active'
);
```

## Step 4: Update Your Production Server

### Option A: Manual File Upload

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Upload the entire `dist/` directory to your production server

3. Replace the contents of your web root with the dist/ contents

### Option B: Using Git + Build on Server

1. SSH into your production server:
   ```bash
   ssh root@your-server-ip
   ```

2. Navigate to your project directory:
   ```bash
   cd /var/www/deployment-system
   ```

3. Pull latest changes:
   ```bash
   git pull origin main
   ```

4. Install dependencies (if needed):
   ```bash
   npm install
   ```

5. Build the project:
   ```bash
   npm run build
   ```

6. Copy build to web root:
   ```bash
   cp -r dist/* /var/www/html/
   ```

### Option C: Automated Deployment Script

Create this script on your server as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/deployment-system

# Pull latest code
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

# Backup current deployment
echo "💾 Backing up current deployment..."
if [ -d "/var/www/html_backup" ]; then
  rm -rf /var/www/html_backup
fi
cp -r /var/www/html /var/www/html_backup

# Deploy new build
echo "🎯 Deploying new build..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

# Restart nginx (if needed)
echo "🔄 Restarting nginx..."
systemctl reload nginx

echo "✅ Deployment complete!"
echo "📍 Site available at: https://your-domain.com"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Step 5: Test the Login

1. Navigate to your production site: `https://your-domain.com`
2. You should see the login page (not stuck on loading)
3. Enter the email/password you created in Step 1
4. Click **Sign In**
5. You should be logged in and see the deployment system

## Troubleshooting

### Still Stuck on Loading

**Check browser console for errors:**
- Press F12 → Console tab
- Look for red error messages
- Common issues:
  - CORS errors → Check Supabase project settings
  - Auth errors → Verify user was created correctly
  - Network errors → Check .env variables

**Verify environment variables on server:**

Your `.env` file should contain:
```env
VITE_SUPABASE_URL=your-actual-supabase-url
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

**After changing .env, you MUST rebuild:**
```bash
npm run build
```

### Can't Login - Invalid Credentials

Check if user exists:
```sql
SELECT id, email FROM auth.users WHERE email = 'admin@kfc-oswestry.com';
```

Check if profile exists:
```sql
SELECT * FROM user_profiles WHERE email = 'admin@kfc-oswestry.com';
```

### Login Works But See "No Access" Message

The user needs either:
- super_admin role in user_profiles, OR
- An entry in user_location_access table

For super admin:
```sql
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'admin@kfc-oswestry.com';
```

For location access:
```sql
INSERT INTO user_location_access (
  user_id,
  location_id,
  role,
  is_primary
)
VALUES (
  'USER_ID',
  (SELECT id FROM locations WHERE location_code = '3016'),
  'location_admin',
  true
);
```

## Step 6: Migrate Existing Data (If Needed)

If you had data in the old system without location_id:

```sql
-- Get Oswestry location ID
DO $$
DECLARE
  oswestry_id uuid;
BEGIN
  SELECT id INTO oswestry_id FROM locations WHERE location_code = '3016';

  -- Update all tables to assign to Oswestry
  UPDATE staff SET location_id = oswestry_id WHERE location_id IS NULL;
  UPDATE shifts SET location_id = oswestry_id WHERE location_id IS NULL;
  UPDATE deployments SET location_id = oswestry_id WHERE location_id IS NULL;
  UPDATE stations SET location_id = oswestry_id WHERE location_id IS NULL;
  UPDATE daily_sales SET location_id = oswestry_id WHERE location_id IS NULL;
  -- Add more tables as needed

  RAISE NOTICE 'Data migration complete for Oswestry';
END $$;
```

## Quick Start Commands Summary

```bash
# On your production server
cd /var/www/deployment-system
git pull origin main
npm install
npm run build
cp -r dist/* /var/www/html/
systemctl reload nginx
```

## Environment Check

Before deploying, verify these are set correctly:

```bash
# Check .env file exists
cat .env

# Should show:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJxxxx...
```

## Post-Deployment Verification

1. ✅ Site loads (not blank/stuck)
2. ✅ Login page appears
3. ✅ Can log in with super admin credentials
4. ✅ Dashboard loads after login
5. ✅ Can see Oswestry location in header
6. ✅ Existing data (staff, shifts, etc.) is visible
7. ✅ Can create/edit/delete data
8. ✅ Exports work (PDF/Excel)

## Need Help?

If you encounter issues:

1. Check browser console (F12 → Console)
2. Check Supabase logs (Dashboard → Logs)
3. Check nginx error logs: `tail -f /var/log/nginx/error.log`
4. Verify database connectivity: Try running a simple query in Supabase SQL editor

## Next Steps After Successful Login

Once you can log in as super admin:

1. Go to **Settings** → **User Management**
2. Create additional user accounts
3. Assign users to locations
4. Set appropriate roles (location_admin, location_operator)
5. Test location switching if you have multiple locations
6. Verify data isolation between locations

---

**Important:** After following these steps, your production site should work exactly like the development version, with proper authentication and no more infinite loading screen.
