# Ubuntu Server NPM Proxy Fix

## The Problem

Your `.npmrc` file in the project directory is forcing npm to use a proxy at `localhost:9092`, which doesn't exist. This is why npm commands fail.

## Quick Fix

On your Ubuntu server, run these commands **in order**:

```bash
# 1. Go to the project directory
cd /var/www/deployment-app

# 2. Fix the .npmrc file in the project
sudo bash -c 'cat > .npmrc << EOF
registry=https://registry.npmjs.org/
EOF'

# 3. Remove user-level npmrc files
sudo rm -f /home/deployapp/.npmrc
sudo rm -f ~/.npmrc

# 4. Clear npm config
sudo -u deployapp npm config delete proxy 2>/dev/null || true
sudo -u deployapp npm config delete https-proxy 2>/dev/null || true
sudo -u deployapp npm config delete registry 2>/dev/null || true
sudo -u deployapp npm config set registry https://registry.npmjs.org/

# 5. Verify the fix
sudo -u deployapp npm config get registry
```

**Expected output:** `https://registry.npmjs.org/`

If it still shows `http://localhost:9092/npm-registry`, continue to the next step.

## If Quick Fix Doesn't Work

```bash
# Remove ALL npmrc files
sudo rm -f /home/deployapp/.npmrc
sudo rm -f /etc/npmrc
sudo rm -f /usr/local/etc/npmrc
sudo rm -f /var/www/deployment-app/.npmrc

# Create new clean .npmrc in project
cd /var/www/deployment-app
echo "registry=https://registry.npmjs.org/" | sudo tee .npmrc
sudo chown deployapp:deployapp .npmrc

# Verify
sudo -u deployapp npm config get registry
```

## Install and Build

Once the registry is fixed:

```bash
cd /var/www/deployment-app

# Clean install
sudo rm -rf node_modules package-lock.json
sudo -u deployapp npm cache clean --force
sudo -u deployapp npm install

# If install fails, try with legacy peer deps
sudo -u deployapp npm install --legacy-peer-deps

# Build
sudo -u deployapp npm run build

# Set permissions
sudo chown -R deployapp:www-data /var/www/deployment-app
sudo chmod -R 755 /var/www/deployment-app
sudo chmod -R 775 /var/www/deployment-app/dist

# Restart nginx
sudo systemctl restart nginx
```

## Using the Automated Script

I've created a script that does all this automatically:

```bash
cd /var/www/deployment-app
sudo chmod +x fix-npm-and-deploy.sh
sudo ./fix-npm-and-deploy.sh
```

## Preview Site Issues

The spinning line in the preview is caused by:

1. **Browser cache** - Hard refresh with `Ctrl+Shift+R`
2. **Service worker cache** - Clear site data in DevTools:
   - Open DevTools (F12)
   - Application tab → Clear storage → Clear site data
   - Refresh page

3. **React StrictMode** - "Loading user data..." appearing 3 times is normal in development mode

## Verify It's Working

After the fix, test:

```bash
# Check registry
sudo -u deployapp npm config get registry

# Should output: https://registry.npmjs.org/

# Try a simple npm command
sudo -u deployapp npm --version

# Check if build succeeded
ls -lh /var/www/deployment-app/dist/index.html

# Check nginx
sudo systemctl status nginx
```

## Common Errors and Fixes

### Error: "registry is still localhost:9092"

The project `.npmrc` file is being stubborn. Try:

```bash
cd /var/www/deployment-app
sudo rm -f .npmrc
sudo echo "registry=https://registry.npmjs.org/" > .npmrc
sudo chown deployapp:deployapp .npmrc
sudo -u deployapp cat .npmrc  # Verify contents
```

### Error: "ECONNRESET" during npm install

This means it's still trying to use the proxy. Double-check:

```bash
# Check all possible npmrc locations
cat /var/www/deployment-app/.npmrc
cat /home/deployapp/.npmrc 2>/dev/null
cat /etc/npmrc 2>/dev/null
cat /usr/local/etc/npmrc 2>/dev/null

# All should either not exist or show: registry=https://registry.npmjs.org/
```

### Error: "Permission denied" on npm install

```bash
sudo chown -R deployapp:deployapp /var/www/deployment-app
sudo chown -R deployapp:deployapp /home/deployapp
```

### Error: Build succeeds but site doesn't load

```bash
# Check nginx config
sudo nginx -t

# Check nginx error log
sudo tail -50 /var/log/nginx/error.log

# Check if nginx is serving from correct directory
cat /etc/nginx/sites-enabled/deployment-app
```

## Files Changed

1. **`.npmrc`** - Fixed to use correct npm registry
2. **`fix-npm-and-deploy.sh`** - Automated fix script
3. **This guide** - Step-by-step troubleshooting

## Support

If you're still having issues after following these steps, check:

1. **Network connectivity**: `ping registry.npmjs.org`
2. **Firewall**: Make sure outbound HTTPS (port 443) is allowed
3. **DNS**: Make sure DNS resolution works: `nslookup registry.npmjs.org`

## What the Script Does

The `fix-npm-and-deploy.sh` script:

1. ✅ Fixes all `.npmrc` files
2. ✅ Clears npm config and cache
3. ✅ Verifies registry is correct
4. ✅ Removes old node_modules
5. ✅ Installs dependencies cleanly
6. ✅ Builds the application
7. ✅ Sets correct permissions
8. ✅ Restarts nginx

It's the most reliable way to fix everything at once.
