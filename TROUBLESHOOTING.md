# Installation Script Troubleshooting Guide

## Error: "syntax error near unexpected token `newline'" or "<!DOCTYPE html>"

### Problem
When you try to run `./install-ubuntu.sh`, you get an error like:
```
./install-ubuntu.sh: line 7: syntax error near unexpected token `newline'
./install-ubuntu.sh: line 7: `<!DOCTYPE html>'
```

### Root Cause
This error means the install-ubuntu.sh file has been corrupted or you're trying to run the wrong file. The error message shows HTML content (`<!DOCTYPE html>`), which should not be in a bash script.

### Solutions

#### Solution 1: Verify You Have the Correct File

Run the verification script:
```bash
cd /path/to/project
bash verify-install.sh
```

This will check if the install script is valid.

#### Solution 2: Check File Contents

View the first few lines of the file:
```bash
head -20 install-ubuntu.sh
```

**Correct output should be:**
```bash
#!/bin/bash

# ================================================================================
# Ubuntu Installation Script for KFC Deployment Management System
# ================================================================================
```

**Incorrect output (corrupted) might show:**
```html
<!DOCTYPE html>
<html>
...
```

#### Solution 3: Re-download the File

If the file is corrupted, you need to re-download it:

**Option A: From your local machine**
```bash
# On your local machine
cd /path/to/original/project
scp install-ubuntu.sh root@your-server:/root/

# On the server
cd /root
chmod +x install-ubuntu.sh
bash install-ubuntu.sh
```

**Option B: From GitHub (if available)**
```bash
wget https://raw.githubusercontent.com/wjlander/deploymentnew/main/install-ubuntu.sh
chmod +x install-ubuntu.sh
bash install-ubuntu.sh
```

#### Solution 4: Check Upload Method

If you're uploading files, ensure you're using binary mode or the correct transfer method:

**Using SCP (recommended):**
```bash
scp -r /local/path/to/project root@server-ip:/root/deployment-app
```

**Using SFTP:**
```bash
sftp root@server-ip
put -r /local/path/to/project /root/deployment-app
```

**NOT recommended:** Copy-paste file contents, as this can corrupt the file.

#### Solution 5: Check Line Endings

If you edited the file on Windows, it might have Windows line endings:

```bash
# Check line endings
file install-ubuntu.sh

# Convert Windows to Unix line endings (if needed)
dos2unix install-ubuntu.sh

# Or use sed
sed -i 's/\r$//' install-ubuntu.sh
```

#### Solution 6: Verify File Integrity

Check the file type:
```bash
file install-ubuntu.sh
```

Should show:
```
install-ubuntu.sh: Bourne-Again shell script, UTF-8 Unicode text executable
```

Check syntax without running:
```bash
bash -n install-ubuntu.sh
```

No output = good. Errors = syntax problems.

---

## Other Common Installation Errors

### Error: "Permission denied"

**Problem:**
```
bash: ./install-ubuntu.sh: Permission denied
```

**Solution:**
```bash
# Make the script executable
chmod +x install-ubuntu.sh

# Or run with bash directly
bash install-ubuntu.sh
```

### Error: "This script must be run as root"

**Problem:**
```
❌ This script must be run as root (use sudo)
```

**Solution:**
```bash
# Run with sudo
sudo bash install-ubuntu.sh

# Or become root first
sudo su -
bash install-ubuntu.sh
```

### Error: "No such file or directory"

**Problem:**
```
bash: install-ubuntu.sh: No such file or directory
```

**Solution:**
```bash
# Check current directory
pwd

# List files
ls -la

# Navigate to correct directory
cd /path/to/project

# Try again
bash install-ubuntu.sh
```

### Error: DNS not resolving

**Problem:**
```
⚠️ DNS not configured correctly or domain not resolving
```

**Solution:**
1. Check DNS records:
   ```bash
   dig your-domain.com
   ```

2. Wait for DNS propagation (5-10 minutes)

3. Update DNS A record to point to your server IP

4. Run SSL setup manually after DNS is configured:
   ```bash
   certbot --nginx -d your-domain.com
   ```

### Error: Build failed

**Problem:**
```
❌ Build failed
```

**Solution:**

1. Check Node.js version:
   ```bash
   node --version  # Should be v18.x or higher
   ```

2. Check disk space:
   ```bash
   df -h  # Need at least 5GB free
   ```

3. Check memory:
   ```bash
   free -h  # Need at least 2GB RAM
   ```

4. Try manual build:
   ```bash
   cd /var/www/deployment-app
   npm install
   npm run build
   ```

### Error: Nginx failed to start

**Problem:**
```
❌ Nginx failed to start
```

**Solution:**

1. Check nginx configuration:
   ```bash
   nginx -t
   ```

2. Check for port conflicts:
   ```bash
   netstat -tulpn | grep :80
   netstat -tulpn | grep :443
   ```

3. Check nginx logs:
   ```bash
   tail -50 /var/log/nginx/error.log
   ```

4. Try starting manually:
   ```bash
   systemctl start nginx
   systemctl status nginx
   ```

---

## Prevention Tips

### Before Installation

1. **Verify file integrity:**
   ```bash
   bash verify-install.sh
   ```

2. **Check prerequisites:**
   - Ubuntu 20.04+ or Debian 11+
   - 2GB RAM minimum
   - 10GB free disk space
   - Root access

3. **Prepare domain:**
   - Domain registered
   - DNS A record pointing to server IP
   - Wait 5-10 minutes for propagation

4. **Have credentials ready:**
   - Supabase URL
   - Supabase Anon Key

### During Installation

1. **Don't interrupt the installer**
   - Let it complete fully (5-10 minutes)
   - Don't close terminal or SSH connection

2. **Watch for errors**
   - Read error messages carefully
   - Note which step failed

3. **Keep terminal output**
   - Copy any error messages
   - Useful for troubleshooting

### After Installation

1. **Verify deployment:**
   ```bash
   deployment-status
   ```

2. **Check all services:**
   ```bash
   systemctl status nginx
   systemctl status certbot.timer
   ```

3. **Test site:**
   - Visit https://your-domain.com
   - Check SSL certificate (green padlock)

---

## Getting Help

### Check These First

1. **Logs:**
   ```bash
   tail -100 /var/log/nginx/deployment_error.log
   tail -100 /var/log/nginx/deployment_access.log
   journalctl -u nginx --since "10 minutes ago"
   ```

2. **System status:**
   ```bash
   deployment-status
   ```

3. **Service status:**
   ```bash
   systemctl status nginx
   systemctl status certbot.timer
   ```

4. **File verification:**
   ```bash
   bash verify-install.sh
   ```

### Information to Provide

When seeking help, provide:

1. **Error message** (exact text)
2. **Installation step** that failed
3. **Operating system:**
   ```bash
   cat /etc/os-release
   ```
4. **System resources:**
   ```bash
   free -h
   df -h
   ```
5. **File verification output:**
   ```bash
   bash verify-install.sh
   ```

---

## Quick Fix Commands

### Reinstall After Failed Attempt

```bash
# Clean up partial installation
rm -rf /var/www/deployment-app
rm -f /etc/nginx/sites-available/deployment-system
rm -f /etc/nginx/sites-enabled/deployment-system

# Run installer again
cd /path/to/project
sudo bash install-ubuntu.sh
```

### Fix Corrupted Install Script

```bash
# Re-download from source
cd /path/to/original/files
scp install-ubuntu.sh root@server:/root/

# On server
cd /root
chmod +x install-ubuntu.sh
bash -n install-ubuntu.sh  # Verify syntax
sudo bash install-ubuntu.sh
```

### Manual Nginx Restart

```bash
# Test configuration
nginx -t

# Restart if config is valid
systemctl restart nginx
systemctl status nginx
```

### Manual SSL Setup

```bash
# After DNS is configured
certbot --nginx -d your-domain.com

# Enable auto-renewal
systemctl enable certbot.timer
```

---

## Contact & Support

### Documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `INSTALL_README.md` - Quick start guide
- `INSTALLATION_SUMMARY.txt` - Overview

### Commands
- `deployment-status` - Check system status
- `update-deployment` - Update application
- `bash verify-install.sh` - Verify install script

### Logs
- `/var/log/nginx/deployment_error.log` - Application errors
- `/var/log/nginx/deployment_access.log` - Access logs
- `journalctl -u nginx` - System logs

---

## Success Checklist

After successful installation, verify:

✅ `deployment-status` shows all services running
✅ Site accessible at `https://your-domain.com`
✅ SSL certificate active (green padlock in browser)
✅ Login page loads without errors
✅ Browser console shows no critical errors
✅ Can navigate through application pages
✅ `systemctl status nginx` shows active (running)

If all checks pass, your installation is successful!
