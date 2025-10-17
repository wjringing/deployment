# Ubuntu Installation Troubleshooting Guide

## Issues Fixed

Your installation was failing due to three main issues:

### 1. NPM Proxy Misconfiguration
**Error:** `ECONNREFUSED 127.0.0.1:9092`
**Cause:** npm configured to use local proxy at `localhost:9092`
**Fix:** Scripts now remove proxy settings and use official npm registry

### 2. Permission Errors
**Error:** `EACCES: permission denied, rename '/var/www/deployment-app/node_modules/abbrev'`
**Cause:** Mixed file ownership between root and deployapp user
**Fix:** Scripts now properly set ownership before installation

### 3. Vite Not Found
**Error:** `sh: 1: vite: not found`
**Cause:** Incomplete npm installation due to above issues
**Fix:** Clean installation with proper permissions

## Quick Fix - Run This Now

On your Ubuntu server, run these commands:

```bash
# Navigate to app directory
cd /var/www/deployment-app

# Fix npm proxy configuration
sudo -u deployapp npm config delete proxy 2>/dev/null || true
sudo -u deployapp npm config delete https-proxy 2>/dev/null || true
sudo -u deployapp npm config set registry https://registry.npmjs.org/

# Verify npm can connect
sudo -u deployapp npm ping

# Run the automated fix script
sudo bash fix-permissions.sh
```

## Files Updated

Three files have been fixed in your repository:

1. **`install-ubuntu.sh`** - Main installation script with proxy fix
2. **`fix-permissions.sh`** - New automated fix script for existing installations
3. **`NPM_PROXY_FIX.md`** - Detailed proxy troubleshooting guide

## What The Scripts Do Now

### install-ubuntu.sh (Updated)
- ✅ Removes any npm proxy configurations
- ✅ Sets registry to https://registry.npmjs.org/
- ✅ Tests npm connectivity before installation
- ✅ 15-minute timeout to prevent hanging
- ✅ Verbose logging to `/tmp/npm-install.log`
- ✅ Better error messages with troubleshooting steps

### fix-permissions.sh (New)
- ✅ Fixes npm proxy configuration
- ✅ Removes corrupted node_modules
- ✅ Sets proper file ownership
- ✅ Cleans npm cache
- ✅ Reinstalls all dependencies
- ✅ Builds the application
- ✅ Sets nginx permissions
- ✅ Restarts nginx
- ✅ Verifies installation

## Step-by-Step Manual Fix

If you prefer to fix manually or the scripts fail:

```bash
# 1. Fix npm configuration
sudo -u deployapp npm config delete proxy
sudo -u deployapp npm config delete https-proxy
sudo -u deployapp npm config set registry https://registry.npmjs.org/
sudo -u deployapp npm ping

# 2. Fix ownership and clean
cd /var/www/deployment-app
sudo rm -rf node_modules
sudo chown -R deployapp:deployapp /var/www/deployment-app
sudo -u deployapp npm cache clean --force

# 3. Install dependencies
sudo -u deployapp npm install --production=false

# 4. Verify vite is installed
ls -la node_modules/.bin/vite
# Should show the vite executable file

# 5. Build application
sudo -u deployapp npm run build

# 6. Verify build
ls -la dist/index.html dist/assets/
# Should show HTML and multiple JS/CSS files

# 7. Set nginx permissions
sudo chown -R deployapp:www-data dist/
sudo chmod -R 755 dist/

# 8. Restart nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# 9. Test the site
curl -I http://your-domain.com
```

## Verification Commands

After running the fix, verify everything:

```bash
# Check npm config
sudo -u deployapp npm config get registry
# Should show: https://registry.npmjs.org/

# Check file ownership
ls -la /var/www/deployment-app/ | head -10
# Should show deployapp:deployapp for most files

# Check node_modules exists
ls -la /var/www/deployment-app/node_modules/.bin/vite
# Should exist with executable permissions

# Check build exists
ls -la /var/www/deployment-app/dist/
# Should contain index.html and assets directory

# Check nginx is running
sudo systemctl status nginx
# Should show "active (running)"

# Test site
curl http://your-domain.com | head -20
# Should show HTML content
```

## Common Errors and Solutions

### Error: "npm ping fails"
```bash
# Check DNS
nslookup registry.npmjs.org

# Check firewall
sudo ufw status

# Test direct connection
curl -I https://registry.npmjs.org/
```

### Error: "Build fails with module not found"
```bash
# Clean and reinstall
cd /var/www/deployment-app
sudo rm -rf node_modules package-lock.json
sudo -u deployapp npm install
```

### Error: "Permission denied on dist/"
```bash
# Fix dist permissions
sudo chown -R deployapp:www-data /var/www/deployment-app/dist
sudo chmod -R 755 /var/www/deployment-app/dist
```

### Error: "502 Bad Gateway" on site
```bash
# Check if dist exists and has files
ls -la /var/www/deployment-app/dist/

# Check nginx config
sudo nginx -t

# Check nginx error log
sudo tail -50 /var/log/nginx/deployment_error.log
```

## Why Was npm Using localhost:9092?

This typically happens when:
- A private npm registry (like Verdaccio) was previously configured
- Corporate proxy settings were applied
- Development tools (VS Code extensions, etc.) modified npm config
- Previous installation attempts with different configurations

## Next Steps After Installation

Once the installation completes successfully:

1. **Visit your site** at your configured domain
2. **Configure Supabase** if not done during installation
3. **Check logs** for any runtime errors:
   ```bash
   sudo tail -f /var/log/nginx/deployment_error.log
   ```
4. **Test key features:**
   - User login
   - Staff management
   - Schedule upload
   - Deployment creation

## Getting Help

If you continue to have issues:

1. Check the logs in `/tmp/npm-install.log`
2. Run `deployment-status` to see system health
3. Check `/var/log/nginx/deployment_error.log` for runtime errors
4. Verify Supabase credentials in `/var/www/deployment-app/.env`

## Prevention

To avoid these issues on future deployments:

1. Always use the updated `install-ubuntu.sh` script
2. Ensure clean npm configuration before installation
3. Run as root with proper user switching (script handles this)
4. Verify internet connectivity and DNS before starting
5. Check for existing conflicting installations

## Scripts Location

All scripts are in your project root:
- `install-ubuntu.sh` - Fresh installation
- `fix-permissions.sh` - Fix existing installation
- `NPM_PROXY_FIX.md` - Detailed proxy troubleshooting
- This file - Complete troubleshooting guide
