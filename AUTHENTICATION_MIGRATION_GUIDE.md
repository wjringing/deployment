# Authentication Migration Guide

## Overview

This guide covers the migration from custom authentication to Supabase authentication with the new Training & Ranking system.

## What's Changed

### 1. Authentication System
- **OLD**: Custom LoginForm component with local password validation
- **NEW**: Supabase authentication with email/password
- Email verification enabled
- Secure session management
- Auto-refresh tokens

### 2. Database Schema
- **NEW TABLES**:
  - `staff` - Employee records with Gem ID
  - `training_stations_master` - 9 pre-configured stations
  - `staff_training_stations` - Training records
  - `staff_rankings` - Performance ratings (1-5 stars)
  - `staff_sign_offs` - Manager certifications

- **RLS**: All tables require authentication

### 3. New Features
- CSV import for bulk employee/training data
- Manager sign-offs with accountability
- Performance ranking system (1-5 stars)
- Station-based training tracking
- Visual training progress indicators

## Migration Steps

### Step 1: Apply Database Migration

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/20251014000000_training_ranking_auth_system.sql
```

This will:
- Drop old staff/training tables (if any)
- Create new schema with RLS
- Seed 9 training stations
- Create helper functions

### Step 2: Enable Email Auth in Supabase

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Disable email confirmation for testing (optional)

### Step 3: Create First User

**Option A: Via Supabase Dashboard**
1. Authentication → Users → Add User
2. Enter email and password
3. User can immediately log in

**Option B: Via Signup Page**
1. Navigate to `/auth`
2. Click "Don't have an account? Sign up"
3. Enter email and password
4. Check email for verification (if enabled)

### Step 4: Test Authentication Flow

1. Visit your app (will redirect to `/auth`)
2. Sign in with created user
3. Should redirect to main app
4. Test logout functionality

### Step 5: Import Staff Data

1. Navigate to `/training`
2. Click "Import Staff CSV"
3. Upload CSV with format:
   ```
   Employee Name,Gem ID,Job Code,BOH Cook,FOH Cashier,FOH Guest Host,FOH Pack,FOH Present,MOH Burgers,MOH Chicken Pack,Freezer to Fryer,MOH Sides
   John Doe,12345,FOH TM,0,1.0,1.0,1.0,0,0,0,0,0
   ```
4. System will:
   - Create staff records
   - Create training records
   - Auto-generate sign-offs for trained stations

## CSV Import Format

### Columns
1. **Employee Name**: Full name (required)
2. **Gem ID**: Unique employee ID (required)
3. **Job Code**: Position (required)
   - Valid: FOH TM, MOH TM, BOH TM, Shift Supervisor, RGM, RGM Trainee
4. **Station Columns**: Training status (0 or 1.0)
   - 1.0 = Trained
   - 0 = Not trained

### Example CSV

```csv
Employee Name,Gem ID,Job Code,BOH Cook,FOH Cashier,FOH Guest Host,FOH Pack,FOH Present,MOH Burgers,MOH Chicken Pack,Freezer to Fryer,MOH Sides
Alice Johnson,1001,FOH TM,0,1.0,1.0,1.0,1.0,0,0,0,0
Bob Smith,1002,MOH TM,0,1.0,0,0,0,1.0,1.0,1.0,1.0
Carol White,1003,BOH TM,1.0,1.0,0,0,0,0,0,0,0
David Brown,1004,Shift Supervisor,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0
```

## Key Features

### Training Management
- Visual progress indicators
- Station category filtering (BOH, FOH, MOH)
- Relevance filtering by job code
- Training date tracking

### Manager Sign-Offs
- Managers certify training completion
- Shield icon indicates sign-off status
- Notes supported
- Accountability via manager_staff_id

### Performance Rankings
- 1-5 star rating system
- Manager-submitted rankings
- Visual indicator for already-ranked employees
- Average ratings calculated automatically
- Star icon shows current rating

### CSV Operations
- Import: Bulk create employees and training
- Export: Download current data
- Reload: Refresh from database
- Auto-deduplication by Gem ID

## Job Codes & Relevance

The system filters relevant stations based on job code:

- **FOH TM**: FOH stations only
- **MOH TM**: MOH stations only
- **BOH TM**: BOH stations only
- **Shift Supervisor**: All stations
- **RGM / RGM Trainee**: All stations

## Security Notes

### RLS Policies
All tables use:
```sql
TO authenticated USING (true)
```

This means:
- ✅ Any authenticated user can read/write
- ❌ Unauthenticated users have no access
- Consider adding role-based policies for production

### Recommended Enhancements

1. **Role-Based Access**:
   ```sql
   -- Example: Only managers can add sign-offs
   CREATE POLICY "Only managers can sign off"
     ON staff_sign_offs FOR INSERT
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM staff
         WHERE staff.id = auth.uid()
         AND staff.position IN ('Shift Supervisor', 'RGM', 'RGM Trainee')
       )
     );
   ```

2. **Audit Logging**: Track who modified what and when

3. **Soft Deletes**: Don't permanently delete records

## Troubleshooting

### "relation does not exist" Error
- Migration not applied
- Run migration SQL in Supabase Dashboard

### "permission denied for table" Error
- RLS policies not set correctly
- User not authenticated
- Check auth token in browser console

### CSV Import Fails
- Check CSV format matches exactly
- Ensure Gem IDs are unique
- Verify job codes are valid
- Check for special characters in names

### Users Can't Sign In
- Verify email/password auth enabled in Supabase
- Check user exists in Authentication → Users
- Verify user email confirmed (if required)

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Can create new user via signup
- [ ] Can sign in with existing user
- [ ] Protected routes redirect to /auth when not logged in
- [ ] Can import staff CSV
- [ ] Training records created correctly
- [ ] Can add manager sign-offs
- [ ] Can submit performance rankings
- [ ] Can export data to CSV
- [ ] Logout works correctly
- [ ] Session persists on page refresh

## Rollback Plan

If issues occur:

1. **Revert to Old Auth**:
   - Restore old LoginForm component
   - Remove ProtectedRoute wrapper
   - Keep new database tables (they won't interfere)

2. **Keep Both Systems**:
   - Run both auth systems in parallel
   - Migrate users gradually
   - Sunset old system after migration

## Support

For issues:
1. Check browser console for errors
2. Check Supabase logs in Dashboard
3. Verify RLS policies are correct
4. Test with Supabase SQL Editor directly

## Next Steps

After successful migration:
1. Import all staff data via CSV
2. Train managers on sign-off process
3. Begin performance rankings
4. Review and tighten RLS policies for production
5. Set up role-based access control
6. Configure email templates in Supabase
