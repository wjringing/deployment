# Quick Migration Reference Card

## 🚀 The One Migration You Need

**File:** `20251016120000_secure_production_database_safe.sql`

This single migration handles everything:
- ✅ Drops ALL old policies (public and authenticated)
- ✅ Creates fresh authenticated-only policies
- ✅ Handles name conflicts automatically
- ✅ Works regardless of current database state
- ✅ Includes built-in verification

## 📋 Quick Steps

1. **Backup** (verify in Supabase dashboard)
2. **Run** `20251016120000_secure_production_database_safe.sql`
3. **Verify** using `verify_production_security.sql`
4. **Test** login and Rule Management page

## ✅ Success Criteria

Run this query to verify:

```sql
SELECT COUNT(*) as public_policies FROM pg_policies
WHERE schemaname = 'public' AND roles::text LIKE '%public%';
```

**Expected:** `0`

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Policy already exists" error | The new migration handles this automatically |
| 404 errors persist | Run verification script to find issue |
| Users can't access data | Have them log out and log back in |
| Data not loading | Check browser console for auth errors |

## 🔄 Quick Rollback (Emergency Only)

```sql
-- ⚠️ INSECURE - Only use in emergency
DO $$
DECLARE t RECORD;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' LOOP
        EXECUTE format('CREATE POLICY "TEMP_PUBLIC_%s" ON %I
        FOR ALL TO public USING (true) WITH CHECK (true)',
        t.tablename, t.tablename);
    END LOOP;
END $$;
```

## 📞 Need Help?

1. Check `PRODUCTION_SECURITY_MIGRATION_GUIDE.md` for full details
2. Run `verify_production_security.sql` to diagnose issues
3. Check Supabase Dashboard → Logs → API

## 🎯 What This Fixes

✅ Fixes 404 errors in Rule Management
✅ Fixes 404 errors in Assignment History
✅ Secures all 35+ database tables
✅ Requires authentication for all access
✅ Protects against unauthorized API access

---

**Remember:** After migration, users just need to be logged in. Everything else works exactly the same!
