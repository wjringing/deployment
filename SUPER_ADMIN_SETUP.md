# Super Admin Setup Guide

## Issue Fixed

The session timeout errors have been resolved by removing the problematic 5-second timeout in `UserContext.jsx`.

## Making Yourself a Super Admin

### Step 1: Find Your Email

You need to know which email address you used to log in. Check your login screen or browser console for your authenticated email.

### Step 2: Add Super Admin Access

Go to your Supabase dashboard:

1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Run this SQL (replace `your-email@example.com` with your actual email):

```sql
-- Check your user ID and email
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- Add yourself as super admin (replace the email)
INSERT INTO super_admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verify you're now a super admin
SELECT sa.*, u.email as auth_email
FROM super_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id;
```

### Step 3: Refresh Your Browser

After running the SQL:

1. Go back to your application
2. Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) to hard refresh
3. Or log out and log back in

You should now see the Super Admin Portal link in your navigation.

## Quick SQL Script

I've created `add_super_admin.sql` with pre-written queries. Just:

1. Open it
2. Replace `your-email@example.com` with your email
3. Copy and paste into Supabase SQL Editor
4. Run it

## Checking Super Admin Status

### In the Browser Console

After logging in, check the console. You should see:
```
Super admin check: { id: ..., user_id: ..., email: "your-email@example.com" }
```

If it shows `null`, you're not a super admin yet.

### In Supabase

Run this query in SQL Editor:
```sql
SELECT * FROM super_admins;
```

You should see your email and user_id in the results.

## Troubleshooting

### "I don't see the Super Admin Portal link"

1. **Check the console** - Look for "Super admin check: null"
2. **Verify in database** - Run: `SELECT * FROM super_admins WHERE email = 'your-email@example.com';`
3. **Check your email** - Make sure you're using the exact email from `auth.users`
4. **Hard refresh** - Press `Ctrl+Shift+R`
5. **Re-login** - Log out completely and log back in

### "Session timeout" errors

This has been fixed. If you still see them:
1. Pull the latest code
2. Rebuild: `npm run build`
3. Clear your browser cache
4. Hard refresh the page

### "I'm in the database but still no portal"

Check the browser console for the super admin check result:

```javascript
// Open browser console (F12) and paste:
console.log('Is super admin?', window.location.href);
```

If you see the check returning your super admin record but the link doesn't appear, check:
1. The `App.jsx` file for the super admin route
2. Your browser's React DevTools to see the `isSuperAdmin` value

## What Super Admin Access Gives You

Once you're a super admin, you can:

1. **Access Super Admin Portal** - Full system administration
2. **Manage All Locations** - See and control all restaurant locations
3. **Manage Users** - Create, edit, delete users across all locations
4. **Assign Permissions** - Grant or revoke any permission
5. **View Audit Logs** - See all system activity
6. **System Settings** - Configure global system settings
7. **Bypass All Restrictions** - All permission checks return true

## Security Note

Super admin access is powerful. Only grant it to trusted users who need full system access.

## Alternative: Add via Migration

If you prefer to add super admin access via migration:

```sql
-- Create a migration file: supabase/migrations/YYYYMMDDHHMMSS_add_my_super_admin.sql

-- Add your super admin access
INSERT INTO super_admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

Then apply the migration in your Supabase dashboard.

## Files Changed

1. **`src/contexts/UserContext.jsx`** - Removed 5-second timeout causing session errors
2. **`add_super_admin.sql`** - SQL script to add super admin access
3. **This file** - Setup guide

## Next Steps

1. Add yourself as super admin using the SQL above
2. Refresh your browser
3. You should see "Super Admin Portal" in the navigation
4. Click it to access system administration

If you still have issues, check the browser console for error messages and let me know what you see.
