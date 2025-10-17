# NPM Proxy Fix - localhost:9092 Issue

## Problem Identified

Your npm is configured to use a local proxy at `http://localhost:9092/npm-registry` which is not running, causing all npm operations to fail with:

```
npm error FetchError: request to http://localhost:9092/npm-registry/vite failed, reason: connect ECONNREFUSED 127.0.0.1:9092
```

## Quick Fix - Run This On Your Server

```bash
# Fix npm configuration for the deployapp user
sudo -u deployapp npm config delete proxy
sudo -u deployapp npm config delete https-proxy
sudo -u deployapp npm config delete http-proxy
sudo -u deployapp npm config set registry https://registry.npmjs.org/

# Verify the fix
sudo -u deployapp npm config get registry
# Should output: https://registry.npmjs.org/

# Test npm connectivity
sudo -u deployapp npm ping

# Now run the fix script
cd /var/www/deployment-app
sudo bash fix-permissions.sh
```

## Alternative: Manual Fix

If the fix script still has issues, do this manually:

```bash
cd /var/www/deployment-app

# 1. Fix npm config
sudo -u deployapp npm config delete proxy
sudo -u deployapp npm config delete https-proxy
sudo -u deployapp npm config set registry https://registry.npmjs.org/

# 2. Fix permissions
sudo rm -rf node_modules
sudo chown -R deployapp:deployapp /var/www/deployment-app

# 3. Clean and install
sudo -u deployapp npm cache clean --force
sudo -u deployapp npm install --production=false

# 4. Build
sudo -u deployapp npm run build

# 5. Set nginx permissions
sudo chown -R deployapp:www-data /var/www/deployment-app/dist
sudo chmod -R 755 /var/www/deployment-app/dist

# 6. Restart nginx
sudo systemctl restart nginx
```

## Root Cause

Someone (or some tool) configured npm to use a local registry proxy at port 9092. This is common when:
- Using Verdaccio or similar private npm registry
- Corporate proxy settings
- Development tool configurations

## Updated Scripts

Both `install-ubuntu.sh` and `fix-permissions.sh` have been updated to:
1. Remove any proxy configurations
2. Set the registry to the official npm registry
3. Test connectivity before installation

## Verification

After running the fix, verify everything works:

```bash
# Check npm config
sudo -u deployapp npm config list

# Should show:
# registry = "https://registry.npmjs.org/"

# Test npm
sudo -u deployapp npm ping

# Should output:
# npm notice PING https://registry.npmjs.org/
# npm notice PONG 200ms

# Check if vite exists
ls -la /var/www/deployment-app/node_modules/.bin/vite

# Should show the vite executable

# Test build
cd /var/www/deployment-app
sudo -u deployapp npm run build

# Should complete successfully
```

## If Issues Persist

If you still have npm connectivity issues:

1. **Check firewall:**
   ```bash
   sudo ufw status
   # Ensure outbound HTTPS is allowed
   ```

2. **Check DNS:**
   ```bash
   nslookup registry.npmjs.org
   # Should resolve to npm's servers
   ```

3. **Test direct connection:**
   ```bash
   curl -I https://registry.npmjs.org/
   # Should return HTTP 200
   ```

4. **Check for system-wide proxy:**
   ```bash
   env | grep -i proxy
   # Should be empty or show valid proxy settings
   ```

5. **Check npmrc files:**
   ```bash
   cat ~/.npmrc
   cat /home/deployapp/.npmrc
   cat /var/www/deployment-app/.npmrc
   # Delete any proxy settings found
   ```

## Prevention

To prevent this in the future, add to your deployment scripts:

```bash
# Always ensure clean npm config during deployment
npm config delete proxy 2>/dev/null || true
npm config delete https-proxy 2>/dev/null || true
npm config set registry https://registry.npmjs.org/
```

Both installation scripts now include this fix automatically.
