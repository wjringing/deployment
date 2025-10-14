# Quick Update Guide

This guide explains how to update your deployed KFC Deployment Management System without running the full installation script.

## What This Update Fixes

### 1. ✅ Fixed NaN Hours Display Issue
**Problem:** Deployments showed "NaNh" instead of actual hours worked.

**Solution:** Improved the `calculateWorkHours` function across all components to:
- Validate time inputs before processing
- Handle null, undefined, or malformed time values
- Return 0 hours instead of NaN for invalid data
- Properly parse time strings in "HH:MM" format

**Files Updated:**
- `src/components/DeploymentCard.jsx`
- `src/utils/pdfExport.js`
- `src/utils/enhancedPdfExport.js`
- `src/utils/enhancedExcelExport.js`

**Impact:**
- ✓ Hours now display correctly as "8.0h" instead of "NaNh"
- ✓ Break calculations work properly
- ✓ PDF and Excel exports show accurate hours
- ✓ Total labor hours calculate correctly

### 2. ✅ Dynamic PDF Targets (Already Working!)
**Status:** The targets in PDF exports are ALREADY dynamic!

**How It Works:**
- PDF targets are read from the "Current Targets" section in settings
- When you update targets in the app, PDFs automatically use the new values
- No hardcoded targets exist in the PDF generation

**To Update Targets:**
1. Go to Settings → Current Targets
2. Modify any target (Labor %, TAPL, etc.)
3. Click Save
4. Export PDF - it will use your updated targets

**Note:** If you're seeing old targets in PDFs, just update them in the Current Targets settings page.

### 3. ✅ Updated Shift Classification
**New Rules Applied:**
- **Day Shift:** Start > 05:00 AND End < 18:00
- **Both Shifts:** Start > 05:00 AND Start < 14:00 AND End between 18:00-22:00
- **Night Shift:** Start > 13:59 AND End > 03:00 (after midnight) OR anything else

**Impact:**
- Staff finishing at midnight or later correctly assigned to Night Shift
- Day shift properly bounded by 5 AM start and 6 PM end
- Accurate auto-assignment from schedule PDFs

## Quick Update Method

### Option 1: Using the Quick Update Script (Recommended)

1. **Upload the project files to your server:**
   ```bash
   # On your local machine, create a zip (exclude node_modules and dist)
   cd /path/to/project
   zip -r deployment-update.zip . -x "node_modules/*" "dist/*" ".git/*"

   # Upload to server
   scp deployment-update.zip user@your-server:/tmp/
   ```

2. **On your Ubuntu server, extract and run the update:**
   ```bash
   cd /tmp
   unzip deployment-update.zip -d deployment-update
   cd deployment-update
   sudo bash quick-update.sh
   ```

3. **The script will automatically:**
   - ✓ Create a backup of your current installation
   - ✓ Copy updated files to `/var/www/deployment-app`
   - ✓ Install dependencies
   - ✓ Build the application
   - ✓ Reload nginx

4. **Done!** Your application is now updated with all fixes.

### Option 2: Manual Update

If you prefer to update manually:

```bash
# 1. Backup current installation
sudo tar -czf /var/backups/deployment-app/backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude='node_modules' --exclude='dist' -C /var/www deployment-app

# 2. Copy updated files (from your project directory)
sudo rsync -av --delete /path/to/project/src/ /var/www/deployment-app/src/
sudo cp /path/to/project/package.json /var/www/deployment-app/

# 3. Install dependencies and build
cd /var/www/deployment-app
sudo npm install --production
sudo npm run build

# 4. Reload nginx
sudo systemctl reload nginx
```

## Verification

After updating, verify the fixes:

### 1. Check Hours Display
1. Go to Deployment page
2. Check existing deployments
3. Verify hours show as "8.0h" instead of "NaNh"
4. Create a new deployment and verify hours calculate correctly

### 2. Check PDF Exports
1. Export a deployment to PDF
2. Verify hours column shows correct values (not NaN)
3. Check that targets section shows your configured targets
4. Verify shift notes display properly

### 3. Check Shift Classification
1. Upload a schedule PDF with late-night shifts
2. Verify staff ending at midnight or later are in Night Shift
3. Check that day shift only contains staff ending before 6 PM
4. Verify auto-assignment works correctly

## Rollback

If you need to rollback to the previous version:

```bash
# Find your backup
ls -lh /var/backups/deployment-app/

# Restore from backup
cd /var/www
sudo rm -rf deployment-app
sudo tar -xzf /var/backups/deployment-app/backup_YYYYMMDD_HHMMSS.tar.gz

# Rebuild and reload
cd deployment-app
sudo npm install --production
sudo npm run build
sudo systemctl reload nginx
```

## Troubleshooting

### Issue: "NaNh" still showing after update

**Possible causes:**
1. Old deployment records in database have invalid time formats
2. Browser cache showing old version
3. Build didn't complete successfully

**Solutions:**
```bash
# Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

# Verify build completed
cd /var/www/deployment-app
ls -lh dist/

# Check nginx is serving latest files
sudo systemctl status nginx
curl -I http://localhost
```

### Issue: Update script fails

**Check permissions:**
```bash
# Ensure you're running as root
sudo bash quick-update.sh

# Check file ownership
ls -la /var/www/deployment-app
sudo chown -R www-data:www-data /var/www/deployment-app
```

### Issue: Build errors

**Fix dependencies:**
```bash
cd /var/www/deployment-app
sudo rm -rf node_modules package-lock.json
sudo npm install
sudo npm run build
```

## What's Updated

### Files Modified:
```
src/components/DeploymentCard.jsx           - Fixed hours calculation
src/utils/pdfExport.js                      - Fixed hours in basic PDF export
src/utils/enhancedPdfExport.js              - Fixed hours in enhanced PDF export
src/utils/enhancedExcelExport.js            - Fixed hours in Excel export
src/utils/scheduleParser.js                 - Updated shift classification rules
```

### New Files:
```
quick-update.sh                             - Quick update script
QUICK_UPDATE_GUIDE.md                       - This guide
SHIFT_CLASSIFICATION_UPDATE.md              - Shift classification documentation
```

## Summary

### Before Update:
- ❌ Hours displayed as "NaNh"
- ❌ Breaks didn't work due to NaN hours
- ❌ Midnight shifts assigned to wrong shift type
- ✓ PDF targets were already dynamic (no change needed)

### After Update:
- ✅ Hours display correctly (e.g., "8.0h")
- ✅ Break calculations work properly
- ✅ Midnight shifts correctly classified as Night Shift
- ✅ Day shift properly bounded by 5 AM - 6 PM
- ✅ All exports (PDF, Excel) show accurate data
- ✅ PDF targets remain dynamic from settings

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application console for JavaScript errors
4. Verify database connectivity
5. Restore from backup if needed

## Next Steps

After updating:
1. ✓ Clear your browser cache
2. ✓ Test deployment creation and editing
3. ✓ Export a PDF to verify hours and targets
4. ✓ Upload a schedule to test shift classification
5. ✓ Update your Current Targets if needed

Your KFC Deployment Management System is now running with all the latest fixes!
