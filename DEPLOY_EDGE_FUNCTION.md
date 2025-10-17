# Deploy Edge Function to Production

## Prerequisites

You need the Supabase CLI installed. If not installed:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or use NPM
npm install -g supabase
```

## Steps to Deploy

### 1. Link to Your Production Project

```bash
# Navigate to project directory
cd /path/to/your/project

# Login to Supabase
supabase login

# Link to your production project
supabase link --project-ref evxrwggutczvmyoutrmm
```

It will ask for your database password.

### 2. Deploy the Edge Function

```bash
# Deploy the create-user function
supabase functions deploy create-user
```

The function will automatically be deployed with these environment variables (already configured in Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Verify Deployment

```bash
# List all deployed functions
supabase functions list
```

You should see `create-user` in the list.

### 4. Test the Function (Optional)

You can test it from the Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/evxrwggutczvmyoutrmm/functions
2. Find `create-user` function
3. Click on it to see logs and test

## Alternative: Deploy via Supabase Dashboard

If you don't want to use CLI:

1. Go to https://supabase.com/dashboard/project/evxrwggutczvmyoutrmm/functions
2. Click "Deploy a new function"
3. Name it: `create-user`
4. Copy the contents of `supabase/functions/create-user/index.ts`
5. Paste into the editor
6. Click "Deploy"

## What This Function Does

The Edge Function allows your frontend to create users securely:

- **Validates** that the caller is a super_admin
- **Creates** the user in `auth.users` using the service role key (server-side)
- **Creates** user profile in `user_profiles` table
- **Assigns** location access if not super_admin
- **Handles** rollback if any step fails

## Using in the App

Once deployed, the frontend will automatically use it when you:
1. Log in as super admin
2. Go to "User Management"
3. Click "Create User"
4. Fill in the form and submit

The function URL is: `https://evxrwggutczvmyoutrmm.supabase.co/functions/v1/create-user`

## Troubleshooting

### Function not found
- Make sure you're linked to the correct project
- Check you deployed to production, not local

### Authorization errors
- Verify the super admin user has `role = 'super_admin'` in `user_profiles` table
- Check the user is logged in with a valid session

### Database errors
- Check the function logs in Supabase Dashboard
- Verify all required tables exist: `user_profiles`, `user_location_access`, `locations`
