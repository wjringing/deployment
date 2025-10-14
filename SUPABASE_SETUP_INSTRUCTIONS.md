# Supabase Setup Instructions

## Quick Start Guide

### Step 1: Apply Database Migration

1. **Log into Supabase Dashboard**
   Go to: https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   Dashboard → Your Project → SQL Editor

3. **Open Migration File**
   In your project: `supabase/migrations/20251014000000_training_ranking_auth_system.sql`

4. **Copy & Paste SQL**
   - Copy the entire file contents
   - Paste into Supabase SQL Editor
   - Click "Run" button

5. **Verify Success**
   Run this query to confirm:
   ```sql
   SELECT COUNT(*) FROM training_stations_master;
   ```
   Should return 9 (the number of stations created)

### Step 2: Enable Email Authentication

1. **Go to Authentication Settings**
   Dashboard → Authentication → Providers

2. **Enable Email Provider**
   - Toggle "Email" to ON
   - Confirm password is enabled

3. **Optional: Disable Email Confirmation (for testing)**
   - Go to Authentication → Settings
   - Under "Email Auth", toggle off "Enable email confirmations"
   - This allows instant login without email verification

### Step 3: Create Your First User

**Option A: Via Supabase Dashboard**
1. Authentication → Users → Add User
2. Enter email and password
3. User can immediately sign in

**Option B: Via App Signup**
1. Start your app: `npm run dev`
2. Navigate to `/auth`
3. Click "Don't have an account? Sign up"
4. Enter email/password
5. If email confirmation enabled, check email

### Step 4: Test the Application

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Access the App**
   Open: http://localhost:5173

3. **Sign In**
   - Should redirect to `/auth` if not logged in
   - Enter your credentials
   - Should redirect to `/training` on success

4. **Test Features**
   - View empty training system
   - Test CSV import (see CSV format below)
   - Add manager sign-offs
   - Submit performance rankings

## CSV Import Format

### Required Columns

```csv
Employee Name,Gem ID,Job Code,BOH Cook,FOH Cashier,FOH Guest Host,FOH Pack,FOH Present,MOH Burgers,MOH Chicken Pack,Freezer to Fryer,MOH Sides
```

### Example Data

```csv
Employee Name,Gem ID,Job Code,BOH Cook,FOH Cashier,FOH Guest Host,FOH Pack,FOH Present,MOH Burgers,MOH Chicken Pack,Freezer to Fryer,MOH Sides
Alice Johnson,1001,FOH TM,0,1.0,1.0,1.0,1.0,0,0,0,0
Bob Smith,1002,MOH TM,0,1.0,0,0,0,1.0,1.0,1.0,1.0
Carol White,1003,BOH TM,1.0,1.0,0,0,0,0,0,0,0
David Brown,1004,Shift Supervisor,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0
Emma Davis,1005,RGM,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0
```

### Column Definitions

- **Employee Name**: Full name (required)
- **Gem ID**: Unique employee ID (required, must be unique)
- **Job Code**: Position (required)
  - Valid values: `FOH TM`, `MOH TM`, `BOH TM`, `Shift Supervisor`, `RGM`, `RGM Trainee`
- **Station Columns**: Training status
  - `1.0` or `1` = Trained
  - `0` = Not trained
  - Anything > 0 counts as trained

### Import Behavior

- **Deduplication**: Employees with same Gem ID are updated, not duplicated
- **Auto Sign-Offs**: Trained stations automatically get sign-offs
- **Training Records**: Created for all stations marked > 0

## Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from:
- Dashboard → Project Settings → API
- Copy "Project URL" and "anon/public key"

## Features Overview

### Training Management
- View all staff members
- Track training status across 9 stations
- Filter by station category (BOH, FOH, MOH)
- Filter by relevance (based on job code)

### Station Categories
- **BOH** (Back of House): Cook
- **FOH** (Front of House): Cashier, Guest Host, Pack, Present
- **MOH** (Middle of House): Burgers, Chicken Pack, Freezer to Fryer, Sides

### Manager Sign-Offs
- Certify training completion
- Shield icon indicates sign-off status
- Accountability via manager tracking
- Optional notes supported

### Performance Rankings
- 1-5 star rating system
- Multiple ratings supported
- Average calculated automatically
- Star icon shows current rating

## Troubleshooting

### "relation does not exist" Error
**Problem**: Database tables not created
**Solution**: Run the migration SQL in Supabase Dashboard

### "permission denied for table" Error
**Problem**: Not authenticated or RLS policy issue
**Solution**:
- Ensure you're logged in
- Check RLS policies are applied correctly
- Verify migration ran successfully

### CSV Import Fails
**Problem**: Invalid CSV format or data
**Solution**:
- Check column names match exactly
- Ensure Gem IDs are unique
- Verify job codes are valid
- Remove special characters from names

### Blank Page / Not Loading
**Problem**: Environment variables not set
**Solution**:
- Create `.env` file with Supabase credentials
- Restart dev server after adding `.env`
- Check browser console for errors

### Can't Sign In
**Problem**: Authentication not configured
**Solution**:
- Verify email provider enabled in Supabase
- Check user exists in Authentication → Users
- Verify password is correct (min 6 characters)
- Check email confirmed (if confirmation required)

## Production Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### Deploy dist/ Folder

Deploy the `dist/` folder to your hosting provider:
- Vercel: Connect GitHub repo, auto-deploy
- Netlify: Drag & drop `dist/` folder
- Custom server: Copy `dist/` to web root

### Environment Variables (Production)

Set these in your hosting provider:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Security Considerations

**Current Setup**: All authenticated users can read/write all data

**Recommended for Production**:

1. **Add Role-Based Access**
   ```sql
   -- Example: Only managers can add sign-offs
   CREATE POLICY "Only managers can sign off"
     ON staff_sign_offs FOR INSERT
     USING (
       EXISTS (
         SELECT 1 FROM staff
         WHERE staff.id = auth.uid()
         AND staff.position IN ('Shift Supervisor', 'RGM')
       )
     );
   ```

2. **Audit Logging**: Track who changed what and when

3. **Soft Deletes**: Mark records as deleted instead of removing

## Testing Checklist

- [ ] Migration applied successfully (9 stations created)
- [ ] Can create new user via signup
- [ ] Can sign in with existing user
- [ ] Redirects to `/auth` when not logged in
- [ ] Redirects to `/training` after login
- [ ] Can view empty staff list
- [ ] Can import staff CSV
- [ ] Training records created correctly
- [ ] Can filter by category (BOH/FOH/MOH)
- [ ] Can toggle "Relevant Only" filter
- [ ] Can add manager sign-offs
- [ ] Shield icon appears after sign-off
- [ ] Can submit performance rankings
- [ ] Star rating displays correctly
- [ ] Logout works
- [ ] Session persists on page refresh

## Support

If you encounter issues:

1. **Check Browser Console**
   Open DevTools (F12) → Console tab → Look for errors

2. **Check Supabase Logs**
   Dashboard → Logs → Look for SQL errors

3. **Verify RLS Policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'staff';
   ```

4. **Test Database Directly**
   Use Supabase SQL Editor to query tables directly

5. **Check Authentication**
   Dashboard → Authentication → Users → Verify user exists

## Next Steps

After successful setup:

1. ✅ Import all staff via CSV
2. ✅ Train managers on sign-off process
3. ✅ Begin performance rankings
4. ✅ Review and tighten RLS policies for production
5. ✅ Set up role-based access control
6. ✅ Configure email templates in Supabase
7. ✅ Enable email confirmation for security
8. ✅ Add backup/export functionality
9. ✅ Set up monitoring and alerts

## Quick Reference

### URLs
- **Auth Page**: `/auth`
- **Training System**: `/training`
- **Deployment System**: `/deployment` (existing system)

### Key Files
- **Migration**: `supabase/migrations/20251014000000_training_ranking_auth_system.sql`
- **Auth Page**: `src/pages/Auth.jsx`
- **Training Page**: `src/pages/Training.jsx`
- **Supabase Client**: `src/lib/supabase.js`

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
```

### Default Stations (9)
1. BOH Cook
2. FOH Cashier
3. FOH Guest Host
4. FOH Pack
5. FOH Present
6. MOH Burgers
7. MOH Chicken Pack
8. Freezer to Fryer
9. MOH Sides

## Done!

Your Training & Ranking System with Supabase Authentication is now set up and ready to use!
