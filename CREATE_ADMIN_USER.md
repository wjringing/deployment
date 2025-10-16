# Create First Admin User

To use the application, you need to create the first admin user account. Follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://evxrwggutczvmyoutrmm.supabase.co

2. Navigate to **Authentication** > **Users** in the left sidebar

3. Click the **"Add user"** or **"Invite"** button

4. Create a user with these credentials:
   - **Email**: admin@kfc.com (or your preferred email)
   - **Password**: Admin123! (or your preferred secure password)
   - **Auto Confirm User**: Yes (check this box)

5. Click **"Send Invitation"** or **"Create User"**

6. The user profile will be automatically created in the `user_profiles` table via database trigger

## Option 2: Using SQL (Alternative)

If you prefer using SQL, you can run this in the Supabase SQL Editor:

```sql
-- This creates the user in the auth system
-- Note: Password will be hashed automatically
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
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@kfc.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
);
```

## After Creating the User

1. Open the application in your browser
2. Go to the login page
3. Sign in with the credentials you created
4. You should now have full access to the system

## Troubleshooting

If you're having issues:

1. Make sure the user's email is confirmed (check the `email_confirmed_at` field)
2. Verify the user profile was created in the `user_profiles` table
3. Check that RLS policies allow authenticated users to access data
4. Try signing out and back in

## Important Notes

- The "Don't have an account? Sign up" button has been removed from the login page
- Only administrators can create new user accounts through the Supabase Dashboard
- All users must be created manually by an administrator
- Auto-deployment will only work when you're signed in with a valid user account
