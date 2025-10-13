# KFC Deployment Management System - Installation

## One-Command Installation

Deploy the complete KFC Deployment Management System to your Ubuntu server in minutes.

```bash
sudo bash install-ubuntu.sh
```

## What This Installs

### Complete System
✅ KFC Deployment Management Application
✅ Nginx Web Server with SSL
✅ Node.js 18 Runtime
✅ PM2 Process Manager
✅ Firewall Configuration (UFW)
✅ SSL Certificate (Let's Encrypt)
✅ Automatic SSL Renewal
✅ Log Rotation
✅ Management Scripts

### Application Features
✅ Staff & Deployment Management
✅ Schedule PDF Parsing (Harri TeamLive)
✅ Auto-Assignment Engine
✅ Sales Data Tracking
✅ Shift Schedule Viewer
✅ Target Management
✅ GDPR Compliance
✅ Data Protection & Backups
✅ Export to PDF & Excel
✅ Drag & Drop Interface
✅ Multi-Location Ready

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum (4GB recommended)
- 10GB free disk space
- Root or sudo access

### Before Running
1. **Point your domain to your server IP**
2. **Have Supabase credentials ready** (optional, can configure later)
3. **Ensure SSH access** to your server

## Quick Start

### 1. Connect to Your Server
```bash
ssh root@your-server-ip
```

### 2. Download Project Files
```bash
# Option A: Clone from GitHub
git clone https://github.com/wjlander/deploymentnew.git
cd deploymentnew

# Option B: Upload files via SCP
scp -r /local/path/to/project root@server:/root/deployment-app
cd /root/deployment-app
```

### 3. Run Installer
```bash
chmod +x install-ubuntu.sh
sudo bash install-ubuntu.sh
```

### 4. Follow Prompts
The installer will ask for:
- Your domain name
- SSL email address
- Supabase credentials (optional)

### 5. Wait for Completion
Installation takes 5-10 minutes. The script will:
- Update system packages
- Install all dependencies
- Deploy your application
- Build production bundle
- Configure Nginx & SSL
- Set up management tools

## What You'll Be Asked

### Domain Name
```
Enter your domain name (e.g., deploy.kfc-site.com):
```
Enter the domain you've pointed to your server.

### SSL Email
```
Enter email for SSL certificate (e.g., admin@example.com):
```
Email for Let's Encrypt certificate notifications.

### Supabase Configuration
```
Do you want to configure Supabase credentials now? (y/N):
```
- **Yes**: Enter your Supabase URL and Anon Key
- **No**: Configure manually later in `.env` file

### Confirmation
```
Continue with installation? (y/N):
```
Review the configuration and confirm to proceed.

## After Installation

### Check Status
```bash
deployment-status
```

### Access Application
```
https://your-domain.com
```

### View Logs
```bash
tail -f /var/log/nginx/deployment_error.log
```

### Update Application
```bash
update-deployment
```

## Installation Steps (Detailed)

The installer performs these steps automatically:

### 1. Pre-Installation Checks
- Verifies root access
- Checks OS compatibility
- Detects system version

### 2. System Update
- Updates apt packages
- Upgrades existing software
- Installs prerequisites

### 3. Node.js Installation
- Adds NodeSource repository
- Installs Node.js 18.x
- Verifies installation

### 4. PM2 Installation
- Installs PM2 globally
- Configures process management

### 5. User & Directory Setup
- Creates application user
- Sets up directory structure
- Configures permissions

### 6. Application Deployment
- Copies/clones application files
- Verifies file structure
- Sets proper ownership

### 7. Environment Configuration
- Creates .env file (if credentials provided)
- Preserves existing configuration
- Sets secure permissions

### 8. Dependency Installation
- Installs npm packages
- Handles all dependencies
- Verifies installation

### 9. Application Build
- Builds production bundle
- Optimizes assets
- Verifies build output

### 10. Nginx Configuration
- Creates web server config
- Configures security headers
- Enables gzip compression
- Sets up caching rules

### 11. Nginx Activation
- Removes default site
- Enables deployment site
- Tests configuration
- Restarts Nginx

### 12. Firewall Configuration
- Allows HTTP/HTTPS
- Allows SSH
- Enables firewall

### 13. SSL Certificate
- Checks DNS resolution
- Obtains Let's Encrypt certificate
- Configures auto-renewal
- Updates Nginx config

### 14. Management Scripts
- Creates `deployment-status` command
- Creates `update-deployment` command
- Sets executable permissions

### 15. Log Rotation
- Configures log rotation
- Sets retention policy
- Enables compression

### 16. Final Verification
- Tests site accessibility
- Verifies all services
- Displays summary

## Files & Locations

After installation:

```
/var/www/deployment-app/          # Application files
├── src/                           # Source code
├── dist/                          # Production build
├── .env                           # Environment config
├── package.json                   # Dependencies
└── node_modules/                  # Installed packages

/etc/nginx/sites-available/        # Nginx configs
└── deployment-system              # App configuration

/etc/letsencrypt/live/             # SSL certificates
└── your-domain.com/               # Certificate files

/var/log/nginx/                    # Log files
├── deployment_error.log           # Error logs
└── deployment_access.log          # Access logs

/usr/local/bin/                    # Management scripts
├── deployment-status              # Status checker
└── update-deployment              # Update script
```

## Management Commands

### Check System Status
```bash
deployment-status
```
Shows service status, SSL info, and system resources.

### Update Application
```bash
update-deployment
```
Pulls latest changes, rebuilds, and reloads.

### Nginx Commands
```bash
systemctl status nginx    # Check status
systemctl restart nginx   # Restart service
systemctl reload nginx    # Reload config
nginx -t                  # Test config
```

### View Logs
```bash
# Error logs
tail -f /var/log/nginx/deployment_error.log

# Access logs
tail -f /var/log/nginx/deployment_access.log

# Follow both
tail -f /var/log/nginx/deployment_*.log
```

### SSL Management
```bash
certbot certificates      # Show certificates
certbot renew            # Renew certificates
certbot renew --dry-run  # Test renewal
```

### Firewall Management
```bash
ufw status               # Show status
ufw allow 80/tcp         # Allow HTTP
ufw allow 443/tcp        # Allow HTTPS
```

## Troubleshooting

### Installation Failed

**Check system requirements:**
```bash
cat /etc/os-release      # OS version
free -h                  # RAM available
df -h                    # Disk space
```

**Run installer again:**
The installer is idempotent and safe to re-run.

### Site Not Accessible

**1. Check DNS:**
```bash
dig your-domain.com
```
Should return your server IP.

**2. Check Nginx:**
```bash
systemctl status nginx
nginx -t
```

**3. Check Firewall:**
```bash
ufw status
```

**4. Check Logs:**
```bash
tail -50 /var/log/nginx/deployment_error.log
```

### SSL Certificate Issues

**Verify DNS first:**
```bash
dig your-domain.com
```

**Manually obtain certificate:**
```bash
certbot --nginx -d your-domain.com
```

**Check certificate:**
```bash
certbot certificates
```

### Build Errors

**Clean and rebuild:**
```bash
cd /var/www/deployment-app
rm -rf node_modules package-lock.json
sudo -u deployapp npm install
sudo -u deployapp npm run build
```

### Supabase Connection Issues

**Check .env file:**
```bash
cat /var/www/deployment-app/.env
```

**Update credentials:**
```bash
nano /var/www/deployment-app/.env
```

**Rebuild:**
```bash
cd /var/www/deployment-app
sudo -u deployapp npm run build
systemctl reload nginx
```

## Manual Configuration

### If Supabase Not Configured During Installation

1. **Create .env file:**
```bash
nano /var/www/deployment-app/.env
```

2. **Add credentials:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Rebuild application:**
```bash
cd /var/www/deployment-app
sudo -u deployapp npm run build
systemctl reload nginx
```

### Custom Domain After Installation

1. **Update Nginx config:**
```bash
nano /etc/nginx/sites-available/deployment-system
```

2. **Change server_name:**
```nginx
server_name new-domain.com;
```

3. **Test and reload:**
```bash
nginx -t
systemctl reload nginx
```

4. **Obtain new SSL certificate:**
```bash
certbot --nginx -d new-domain.com
```

## Security Notes

### What's Secured

✅ **Firewall**: Only ports 22, 80, 443 open
✅ **SSL**: HTTPS enforced with Let's Encrypt
✅ **Headers**: Security headers configured
✅ **Permissions**: Proper file ownership
✅ **User**: Application runs as non-root user

### Additional Recommendations

1. **Change SSH port** (optional)
2. **Use SSH keys** instead of passwords
3. **Enable Fail2Ban** for brute force protection
4. **Regular updates**: `apt update && apt upgrade`
5. **Monitor logs** regularly
6. **Backup database** (Supabase provides this)

## Performance Tips

### For Small Servers (2GB RAM)

Monitor resources:
```bash
free -h          # Memory usage
df -h            # Disk usage
htop             # Overall system
```

### For Multiple Deployments

Consider:
- Increasing server size
- Using a CDN for static assets
- Database connection pooling
- Nginx caching

## Support

### Log Files
```bash
# Application errors
/var/log/nginx/deployment_error.log

# Access logs
/var/log/nginx/deployment_access.log

# System logs
journalctl -u nginx
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Site not loading | Check DNS, Nginx, Firewall |
| SSL not working | Verify DNS, run `certbot --nginx` |
| Build fails | Check disk space, Node version |
| Slow performance | Check RAM, consider upgrade |
| Data not loading | Check Supabase credentials |

### Getting Help

1. Check logs first
2. Run `deployment-status`
3. Verify DNS configuration
4. Check Supabase dashboard
5. Review browser console (F12)

## Uninstall

To completely remove:

```bash
# Stop services
systemctl stop nginx

# Remove application
rm -rf /var/www/deployment-app

# Remove configs
rm /etc/nginx/sites-available/deployment-system
rm /etc/nginx/sites-enabled/deployment-system

# Remove scripts
rm /usr/local/bin/deployment-status
rm /usr/local/bin/update-deployment

# Remove SSL (optional)
certbot delete --cert-name your-domain.com
```

## Changelog

### v2.0 - Current
- Complete automated installation
- Enhanced error handling
- Colored output
- Progress tracking
- SSL automation
- Management scripts
- Log rotation
- Security hardening

---

## Quick Reference

### Essential Commands
```bash
deployment-status                              # Check status
update-deployment                              # Update app
systemctl status nginx                         # Nginx status
tail -f /var/log/nginx/deployment_error.log   # View logs
certbot certificates                           # Check SSL
```

### Essential Files
```bash
/var/www/deployment-app/.env                   # Config
/etc/nginx/sites-available/deployment-system   # Nginx
/var/log/nginx/deployment_error.log           # Logs
```

### Post-Installation Steps
1. Visit `https://your-domain.com`
2. Apply Supabase migrations
3. Add staff members
4. Configure positions
5. Upload first schedule

---

**Installation takes 5-10 minutes and requires minimal input.**

**Your deployment will be production-ready with SSL, security, and all latest features enabled.**
