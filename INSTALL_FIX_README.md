# Install Script Fix - npm Hanging Issue

## Problem Fixed

The `install-ubuntu.sh` script was hanging during Step 7 (Installing Application Dependencies) when running `npm install`.

## Changes Made

### 1. Added npm Registry Connectivity Test
Before attempting installation, the script now tests if the npm registry is accessible:
```bash
if timeout 10 curl -s https://registry.npmjs.org/ > /dev/null 2>&1; then
    log_success "npm registry is accessible"
else
    log_warning "npm registry may be slow or unreachable"
fi
```

### 2. Configured npm for Better Reliability
Added npm configuration to handle slow or unreliable connections:
```bash
npm config set fetch-retry-maxtimeout 60000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-timeout 300000
npm config set maxsockets 5
```

### 3. Added Timeout Protection
The npm install command now has a 15-minute timeout to prevent indefinite hanging:
```bash
timeout 900 sudo -u $APP_USER npm install --production=false --prefer-offline --no-audit --loglevel=verbose 2>&1 | tee /tmp/npm-install.log
```

### 4. Better Error Handling
The script now:
- Captures the exit code properly using `${PIPESTATUS[0]}`
- Logs verbose output to `/tmp/npm-install.log`
- Shows the last 50 lines of output on failure
- Provides troubleshooting steps
- Detects timeout vs other errors

## What to Do Now

### If Installation is Currently Stuck

1. **Stop the installation:**
   ```bash
   Ctrl+C
   ```

2. **Check npm connectivity manually:**
   ```bash
   curl -v https://registry.npmjs.org/
   ```

3. **Re-run the installation:**
   ```bash
   # Download the updated script from this repository
   sudo bash install-ubuntu.sh
   ```

### If Installation Times Out

If you see "npm install timed out after 15 minutes", it indicates a network issue:

1. **Check your server's internet connection:**
   ```bash
   ping -c 4 registry.npmjs.org
   curl -I https://registry.npmjs.org/
   ```

2. **Check if there's a proxy or firewall blocking npm:**
   ```bash
   # If behind a proxy, configure npm:
   npm config set proxy http://proxy.example.com:8080
   npm config set https-proxy http://proxy.example.com:8080
   ```

3. **Try manual installation to diagnose:**
   ```bash
   cd /var/www/deployment-app
   sudo -u deployapp npm install --loglevel=verbose
   ```

### Alternative: Manual Installation

If automated installation continues to fail, you can install manually:

```bash
# 1. Ensure you're in the app directory
cd /var/www/deployment-app

# 2. Clean npm cache
sudo -u deployapp npm cache clean --force

# 3. Try installing with different options
sudo -u deployapp npm install --production=false --legacy-peer-deps

# 4. If that fails, try installing dependencies in smaller chunks
sudo -u deployapp npm install react react-dom
sudo -u deployapp npm install @supabase/supabase-js
sudo -u deployapp npm install
```

## For the Separate Development Server

Since you're installing on a separate server from production, make sure to:

1. **Use a different domain** (e.g., `dev.yourdomain.com`)

2. **Use the development deployment scripts** instead:
   ```bash
   # Use the new development scripts
   sudo bash deployment/setup-dev-environment.sh dev.yourdomain.com yourdomain.com
   ```

3. **Configure separate Supabase credentials** if using a development database

## Verification After Installation

Once the installation completes successfully:

```bash
# Check the build was created
ls -la /var/www/deployment-app/dist/

# Check nginx status
sudo systemctl status nginx

# Check the site
curl -I http://yourdomain.com

# View logs if issues
sudo tail -f /var/log/nginx/deployment_error.log
```

## Common Issues and Solutions

### Issue: "ECONNRESET" errors
**Cause:** Network connection interrupted during download
**Solution:** Check firewall rules, try again, or use `--prefer-offline` after first attempt

### Issue: Installation very slow but not hanging
**Cause:** Slow network or npm mirror
**Solution:** Wait it out (the 15-minute timeout will catch it), or configure a faster npm mirror:
```bash
npm config set registry https://registry.npmmirror.com/
```

### Issue: "ETIMEOUT" errors
**Cause:** Firewall blocking npm registry
**Solution:** Check firewall, or configure proxy if needed

### Issue: Permissions errors
**Cause:** Running as wrong user
**Solution:** Ensure using `sudo -u deployapp` for npm commands

## Testing the Fix

To test if the fix works without a full installation:

```bash
# Test just the npm install part
cd /var/www/deployment-app
timeout 60 npm install --dry-run --loglevel=verbose
```

This will simulate the installation and show what would be downloaded without actually installing.

## Support

If you continue to experience issues:

1. Check `/tmp/npm-install.log` for detailed error messages
2. Test npm connectivity: `curl https://registry.npmjs.org/`
3. Verify DNS resolution: `nslookup registry.npmjs.org`
4. Check for proxy settings: `npm config list`
5. Try with a fresh npm cache: `npm cache clean --force`
