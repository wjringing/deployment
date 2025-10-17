# Quick Start: User Management for Production

You have **two options** to enable user management in your production database:

---

## ⚡ RECOMMENDED: Deploy Edge Function (5 minutes)

This enables the UI to work properly.

### Steps:

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login and link to production**:
   ```bash
   supabase login
   supabase link --project-ref evxrwggutczvmyoutrmm
   ```

3. **Deploy the function**:
   ```bash
   supabase functions deploy create-user
   ```

4. **Done!** Now you can:
   - Log in as super admin
   - Go to "User Management"
   - Click "Create User" and it will work

📄 See [DEPLOY_EDGE_FUNCTION.md](./DEPLOY_EDGE_FUNCTION.md) for detailed instructions.

---

## 🔧 ALTERNATIVE: Manual SQL (Temporary)

Use this if you can't deploy the Edge Function right now.

### Steps:

1. **Create user in Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/evxrwggutczvmyoutrmm/auth
   - Click "Add User" > "Create new user"
   - Enter email/password
   - Enable "Auto Confirm User"
   - Copy the user's ID

2. **Create profile and assign location**:
   - Go to: https://supabase.com/dashboard/project/evxrwggutczvmyoutrmm/sql
   - Open `create_oswestry_admin.sql`
   - Replace `USER_ID_HERE` with the actual user ID
   - Replace email, name, phone with real values
   - Run the SQL

3. **User can now log in** with the credentials you created

---

## 🎯 Which Option to Choose?

| Scenario | Recommended Option |
|----------|-------------------|
| Need to create multiple users | **Deploy Edge Function** |
| Setting up for long-term use | **Deploy Edge Function** |
| One-time emergency access | Manual SQL |
| Don't have CLI access | Manual SQL |

---

## ✅ Testing

After setup, test by:

1. Logging in as the new location admin
2. Verifying they can only see Oswestry data
3. Checking they can manage deployments, staff, etc.

---

## 📝 What's Next?

Once user management works:

1. Create location admins for each store
2. Set up regional managers (if needed)
3. Import staff data
4. Configure location-specific settings

See [MULTI_LOCATION_ROLLOUT_IMPLEMENTATION.md](./MULTI_LOCATION_ROLLOUT_IMPLEMENTATION.md) for the full rollout plan.
