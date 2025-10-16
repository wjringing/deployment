# Production Database Security Migration Guide

## Overview

This guide will help you securely migrate your production database from public access to authenticated-only access, fixing the 404 errors and securing your data.

## ⚠️ Critical Information

**Problem:** Your production database currently has public access policies, which means:
- Anyone with your Supabase URL and anon key can access all data
- 404 errors occur when policies are inconsistent
- Data is vulnerable to unauthorized access

**Solution:** Apply a safe migration that removes all public policies and requires authentication

## 📋 Pre-Migration Checklist

- [ ] **Backup verified** - Supabase automatically backs up, but confirm in dashboard
- [ ] **Maintenance window scheduled** - Migration takes ~30 seconds
- [ ] **Users notified** - They may need to refresh/re-login after migration
- [ ] **Test environment validated** - Already done ✅
- [ ] **Rollback plan ready** - Keep this guide and SQL files

## 🔍 Step 1: Verify Current Security Status

Run the verification script **BEFORE** the migration:

```sql
-- Copy and paste contents of: verify_production_security.sql
-- Run in Supabase SQL Editor
```

**Expected Output:**
- Will show PUBLIC policies exist (insecure)
- Will show which tables have public access
- Will identify security vulnerabilities

**Save these results** to compare after migration.

## 🔧 Step 2: Run the Safe Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `20251016120000_secure_production_database_safe.sql`
4. Paste into the SQL Editor
5. Click **Run**

### Option B: Via Supabase CLI

```bash
# Ensure you're connected to production
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### What This Migration Does

1. **Loops through ALL tables** in your database
2. **Drops ALL existing policies** (both public and authenticated)
3. **Creates fresh authenticated-only policies** for each table
4. **Enables RLS** on any tables that don't have it
5. **Verifies the migration** and shows results

### Expected Output

```
NOTICE:  Secured table: staff (all old policies removed, authenticated policies created)
NOTICE:  Secured table: deployments (all old policies removed, authenticated policies created)
NOTICE:  Secured table: positions (all old policies removed, authenticated policies created)
...
NOTICE:  === MIGRATION COMPLETE ===
NOTICE:  All tables now require authentication for access.
NOTICE:
NOTICE:  === SECURITY VERIFICATION ===
NOTICE:  Public policies remaining: 0
NOTICE:  Tables with authenticated policies: 35
NOTICE:  Total tables with RLS enabled: 35
NOTICE:  ✓ SUCCESS: No public policies remain - database is secure!
```

## ✅ Step 3: Verify Migration Success

Run the verification script **AFTER** the migration:

```sql
-- Copy and paste contents of: verify_production_security.sql
-- Run in Supabase SQL Editor
```

**Expected Results:**
- ✅ Public policies: **0**
- ✅ Tables with authenticated policies: **35+** (matches your table count)
- ✅ Overall status: **"DATABASE IS SECURE"**

**Compare with pre-migration results** to confirm changes.

## 🧪 Step 4: Test the Application

### Test Authentication

1. **Log out completely** from your application
2. **Try to access the app** without logging in
   - Should redirect to login page
3. **Log in** with valid credentials
   - Should succeed and load normally

### Test Core Functionality

1. **Rule Management Page**
   - Navigate to Conditional Staffing Rules
   - Create a new rule
   - Save the rule
   - ✅ Should save without 404 errors

2. **Assignment History**
   - View assignment history
   - ✅ Should load without 404 errors

3. **Other Pages**
   - Test deployments, staff, positions, etc.
   - ✅ All should work normally

### Test Negative Cases

1. **Without authentication:**
   - Open browser dev tools (F12)
   - Try to query Supabase directly without auth
   - ✅ Should be rejected with auth error

2. **Expired session:**
   - Let session expire (or clear localStorage)
   - Try to use the app
   - ✅ Should redirect to login

## 🔄 Rollback Plan (If Needed)

If something goes wrong and you need to rollback:

### Immediate Rollback (Restore Public Access)

**⚠️ WARNING:** This restores INSECURE public access. Only use if absolutely necessary.

```sql
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
    LOOP
        -- Create temporary public access policies
        EXECUTE format(
            'CREATE POLICY IF NOT EXISTS %I ON %I FOR ALL TO public USING (true) WITH CHECK (true)',
            'TEMP_PUBLIC_ACCESS_' || table_record.tablename,
            table_record.tablename
        );

        RAISE NOTICE 'Restored public access to: %', table_record.tablename;
    END LOOP;
END $$;
```

**Then immediately:**
1. Investigate what went wrong
2. Re-plan the migration
3. Remove temporary public access as soon as possible

## 🐛 Troubleshooting

### Issue: Users Can't Access Data After Migration

**Symptoms:**
- Error: "permission denied for table"
- Data not loading
- Empty screens

**Causes:**
1. User not logged in
2. Session expired
3. Auth state not properly managed

**Solutions:**
1. **Check if user is logged in:**
   - Open browser dev tools → Console
   - Look for auth errors
   - Have user log out and log back in

2. **Clear browser storage:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   // Then refresh page and log in again
   ```

3. **Verify session:**
   ```javascript
   // In browser console
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   // Should show valid session with user data
   ```

### Issue: Specific Table Still Has 404 Errors

**Symptoms:**
- Most features work
- One specific feature returns 404

**Solution:**
1. Run verification script to identify the table
2. Manually check policies:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'your_table_name';
   ```
3. If no policies exist, create them:
   ```sql
   CREATE POLICY "Authenticated users can view your_table_name"
     ON your_table_name FOR SELECT TO authenticated USING (true);

   CREATE POLICY "Authenticated users can manage your_table_name"
     ON your_table_name FOR ALL TO authenticated USING (true) WITH CHECK (true);
   ```

### Issue: Migration Takes Too Long

**Symptoms:**
- Migration doesn't complete after 5 minutes
- Database becomes unresponsive

**Solution:**
1. **Cancel the migration** (if possible)
2. **Check for locks:**
   ```sql
   SELECT * FROM pg_locks WHERE granted = false;
   ```
3. **Run migration during low-traffic period**
4. **Contact Supabase support** if issue persists

## 📊 Expected Performance Impact

- **Migration time:** 10-30 seconds (depends on table count)
- **Downtime:** None (RLS updates are non-blocking)
- **Performance:** No change (authenticated vs public has same performance)
- **Active sessions:** Unaffected (existing logged-in users continue working)

## 🔒 Security Validation Checklist

After migration, verify:

- [ ] Public policies count: **0**
- [ ] All tables have authenticated policies
- [ ] RLS is enabled on all tables
- [ ] Login page works
- [ ] Authenticated users can access all features
- [ ] Non-authenticated users are blocked from data access
- [ ] Rule Management page works (no 404s)
- [ ] Assignment History works (no 404s)
- [ ] All CRUD operations work normally

## 📞 Support

If you encounter issues:

1. **Check Supabase logs:**
   - Dashboard → Logs → API
   - Look for auth or RLS errors

2. **Check browser console:**
   - F12 → Console
   - Look for 401/403 errors

3. **Run verification script:**
   - Identifies specific security issues

4. **Review this guide:**
   - Check troubleshooting section

## 📝 Migration Completion Report

After successful migration, document:

```
Migration Date: _______________
Migration Time: _______________
Tables Migrated: _______________
Public Policies Removed: _______________
Authenticated Policies Created: _______________
Issues Encountered: _______________
Post-Migration Testing Complete: [ ]
```

---

## Summary

**Before Migration:**
- ❌ Database has public access (insecure)
- ❌ 404 errors on Rule Management
- ❌ Anyone with API key can access data

**After Migration:**
- ✅ Database requires authentication (secure)
- ✅ 404 errors fixed
- ✅ Only logged-in users can access data
- ✅ All features work normally

**Files Provided:**
1. `20251016120000_secure_production_database_safe.sql` - The migration
2. `verify_production_security.sql` - Verification script
3. This guide - Step-by-step instructions

**Next Steps:**
1. Run verification script (before)
2. Run migration
3. Run verification script (after)
4. Test application
5. Celebrate secure database! 🎉
