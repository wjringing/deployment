# KFC Deployment Management System - Deployment Guide

## Quick Start Deployment

This guide will help you deploy the complete KFC Deployment Management System to your Ubuntu server with all the latest features.

## Features Included

✅ **Staff & Deployment Management** - Complete workforce scheduling
✅ **Schedule PDF Parsing** - Automatic import from Harri TeamLive PDFs
✅ **Auto-Assignment** - Intelligent shift-to-staff matching
✅ **Sales Data Tracking** - Hourly sales forecasting and analysis
✅ **Shift Schedule Viewer** - Multiple view modes (by day, by employee)
✅ **Target Management** - Performance goals and KPIs
✅ **GDPR Compliance** - Data protection and privacy features
✅ **Data Backups** - Automated backup system
✅ **Export Functions** - PDF and Excel export capabilities
✅ **Drag & Drop Interface** - Intuitive staff deployment
✅ **Multi-Location Foundation** - Ready for multi-location expansion

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 10GB free space
- **Access**: Root or sudo access
- **Domain**: A registered domain pointed to your server

### Before Installation
1. **Point your domain to your server IP**
   - Update DNS A record: `your-domain.com` → `your.server.ip.address`
   - Wait 5-10 minutes for DNS propagation

2. **Have your Supabase credentials ready**
   - Supabase URL: `https://xxx.supabase.co`
   - Supabase Anon Key: `eyJ...`
   - Get these from your Supabase project dashboard

3. **Ensure server is accessible via SSH**
   ```bash
   ssh root@your.server.ip.address
   ```

---

## Installation Steps

### Step 1: Connect to Your Server
```bash
ssh root@your.server.ip.address
```

### Step 2: Download the Installer

**Option A: If you have the files locally**
```bash
# Upload the install script to your server
scp install-ubuntu.sh root@your.server.ip.address:/root/

# Or upload the entire project directory
scp -r /path/to/project root@your.server.ip.address:/root/deployment-app/
```

**Option B: Clone from GitHub**
```bash
cd /root
git clone https://github.com/wjlander/deploymentnew.git
cd deploymentnew
```

### Step 3: Make the Script Executable
```bash
chmod +x install-ubuntu.sh
```

### Step 4: Run the Installer
```bash
sudo bash install-ubuntu.sh
```

### Step 5: Follow the Installation Prompts

The installer will ask for:

1. **Domain Name**
   ```
   Enter your domain name (e.g., deploy.kfc-site.com): deploy.example.com
   ```

2. **SSL Email**
   ```
   Enter email for SSL certificate: admin@example.com
   ```

3. **Supabase Configuration (Optional)**
   ```
   Do you want to configure Supabase credentials now? (y/N): y
   Enter Supabase URL: https://xxx.supabase.co
   Enter Supabase Anon Key: eyJ...
   ```

4. **Confirmation**
   ```
   Continue with installation? (y/N): y
   ```

### Step 6: Wait for Installation
The installer will automatically:
- Update system packages
- Install Node.js 18
- Install Nginx web server
- Install PM2 process manager
- Deploy your application
- Install dependencies
- Build the production bundle
- Configure Nginx
- Set up firewall (UFW)
- Obtain SSL certificate (if DNS is configured)
- Create management scripts

This process takes approximately 5-10 minutes.

---

## What the Installer Does

### System Configuration
1. Updates Ubuntu/Debian packages
2. Installs required dependencies
3. Installs Node.js 18.x
4. Installs and configures Nginx
5. Installs PM2 for process management
6. Configures firewall rules (HTTP, HTTPS, SSH)

### Application Deployment
1. Creates application user and directories
2. Deploys application files to `/var/www/deployment-app`
3. Installs npm dependencies
4. Builds production bundle
5. Sets proper file permissions

### Security & SSL
1. Configures Nginx with security headers
2. Obtains Let's Encrypt SSL certificate
3. Sets up automatic SSL renewal
4. Enables firewall protection

### Management Tools
1. Creates `deployment-status` command
2. Creates `update-deployment` command
3. Configures log rotation
4. Sets up monitoring tools

---

## Post-Installation

### 1. Verify Installation

Check system status:
```bash
deployment-status
```

You should see:
```
✅ Nginx: Running
✅ Nginx: Auto-start enabled
✅ SSL Certificate: Active
```

### 2. Access Your Application

Open your browser and visit:
```
https://your-domain.com
```

You should see the KFC Deployment Management System login page.

### 3. Configure Supabase (If Not Done During Installation)

If you skipped Supabase configuration during installation:

```bash
# Navigate to app directory
cd /var/www/deployment-app

# Create .env file
nano .env
```

Add your credentials:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Save and rebuild:
```bash
sudo -u deployapp npm run build
sudo systemctl reload nginx
```

### 4. Apply Database Migrations

Your Supabase database needs the migration files applied:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file from `supabase/migrations/`
3. Execute them in chronological order:
   - `20250918155442_old_night.sql`
   - `20250919123038_warm_bird.sql`
   - `20250920074124_jolly_base.sql`
   - `20250920134302_curly_cell.sql`
   - `20250920155851_floral_hat.sql`
   - `20250922210248_polished_wood.sql`
   - `20250922211254_twilight_tower.sql`
   - `20250922213629_withered_block.sql`
   - `20250923160344_maroon_paper.sql`
   - `20250923162120_late_lab.sql`
   - `20251012183008_add_shift_schedule_tables.sql`
   - `20251012192122_fix_gdpr_audit_trigger.sql`
   - `20251012213017_fix_gdpr_audit_staff_trigger.sql`

### 5. Initial Setup in Application

1. **Login** (default credentials from your database setup)
2. **Add Staff Members** - Go to Settings → Staff Management
3. **Configure Positions** - Go to Settings → Position Management
4. **Set Targets** - Go to Settings → Targets
5. **Upload First Schedule** - Go to Upload Schedule

---

## Management Commands

### Check System Status
```bash
deployment-status
```

### Update Application
```bash
update-deployment
```

### Check Nginx Status
```bash
systemctl status nginx
```

### View Application Logs
```bash
# Error logs
tail -f /var/log/nginx/deployment_error.log

# Access logs
tail -f /var/log/nginx/deployment_access.log
```

### Restart Nginx
```bash
systemctl restart nginx
```

### Test Nginx Configuration
```bash
nginx -t
```

### Check SSL Certificate
```bash
certbot certificates
```

### Renew SSL Certificate Manually
```bash
certbot renew
```

### Check Firewall Status
```bash
ufw status
```

---

## File Locations

| Purpose | Location |
|---------|----------|
| Application Files | `/var/www/deployment-app` |
| Environment Config | `/var/www/deployment-app/.env` |
| Production Build | `/var/www/deployment-app/dist` |
| Nginx Config | `/etc/nginx/sites-available/deployment-system` |
| SSL Certificates | `/etc/letsencrypt/live/your-domain.com/` |
| Error Logs | `/var/log/nginx/deployment_error.log` |
| Access Logs | `/var/log/nginx/deployment_access.log` |
| Update Script | `/usr/local/bin/update-deployment` |
| Status Script | `/usr/local/bin/deployment-status` |

---

## Troubleshooting

### Site Not Accessible

1. **Check DNS**
   ```bash
   dig your-domain.com
   ```
   Ensure it points to your server IP.

2. **Check Nginx**
   ```bash
   systemctl status nginx
   nginx -t
   ```

3. **Check Firewall**
   ```bash
   ufw status
   ```
   Ensure ports 80 and 443 are open.

4. **Check Logs**
   ```bash
   tail -50 /var/log/nginx/deployment_error.log
   ```

### SSL Certificate Not Working

1. **Verify DNS is correctly configured**
   ```bash
   dig your-domain.com
   ```

2. **Manually obtain certificate**
   ```bash
   certbot --nginx -d your-domain.com
   ```

3. **Check certificate status**
   ```bash
   certbot certificates
   ```

### Application Not Loading Data

1. **Check Supabase credentials in .env**
   ```bash
   cat /var/www/deployment-app/.env
   ```

2. **Verify migrations are applied** in Supabase Dashboard

3. **Check browser console** for errors (F12)

4. **Rebuild application**
   ```bash
   cd /var/www/deployment-app
   sudo -u deployapp npm run build
   systemctl reload nginx
   ```

### Build Failed

1. **Check Node.js version**
   ```bash
   node --version
   ```
   Should be v18.x or higher.

2. **Clean install dependencies**
   ```bash
   cd /var/www/deployment-app
   rm -rf node_modules package-lock.json
   sudo -u deployapp npm install
   sudo -u deployapp npm run build
   ```

3. **Check available disk space**
   ```bash
   df -h
   ```

---

## Updating the Application

### Method 1: Using the Update Script (Recommended)
```bash
update-deployment
```

### Method 2: Manual Update
```bash
cd /var/www/deployment-app

# Pull latest changes
sudo -u deployapp git pull origin main

# Install dependencies
sudo -u deployapp npm install

# Build production bundle
sudo -u deployapp npm run build

# Set permissions
chown -R deployapp:www-data dist
chmod -R 755 dist

# Reload nginx
systemctl reload nginx
```

### Method 3: Upload New Files
```bash
# From your local machine
scp -r /path/to/updated/project/* root@your-server:/var/www/deployment-app/

# On the server
cd /var/www/deployment-app
chown -R deployapp:deployapp .
sudo -u deployapp npm install
sudo -u deployapp npm run build
systemctl reload nginx
```

---

## Security Best Practices

1. **Keep System Updated**
   ```bash
   apt update && apt upgrade -y
   ```

2. **Monitor Logs Regularly**
   ```bash
   tail -f /var/log/nginx/deployment_error.log
   ```

3. **Backup Database** - Use Supabase automatic backups

4. **Use Strong Passwords** - For application login

5. **Keep SSL Certificate Updated** - Auto-renewal is configured

6. **Restrict SSH Access** - Use SSH keys instead of passwords

7. **Enable Fail2Ban** (Optional)
   ```bash
   apt install fail2ban
   systemctl enable fail2ban
   ```

---

## Performance Optimization

### Enable Nginx Caching (Optional)
```bash
nano /etc/nginx/sites-available/deployment-system
```

Add inside server block:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### Monitor System Resources
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU load
htop
```

---

## Support & Resources

### Documentation
- Installation issues: Check logs at `/var/log/nginx/deployment_error.log`
- Application issues: Check browser console (F12)
- Database issues: Check Supabase Dashboard

### Useful Commands Reference
```bash
# System status
deployment-status

# Update application
update-deployment

# Nginx management
systemctl status nginx
systemctl restart nginx
systemctl reload nginx
nginx -t

# View logs
tail -f /var/log/nginx/deployment_error.log
tail -f /var/log/nginx/deployment_access.log

# SSL management
certbot certificates
certbot renew
certbot renew --dry-run

# Firewall
ufw status
ufw allow 'Nginx Full'

# Application files
cd /var/www/deployment-app
ls -la dist/
```

---

## Uninstallation (If Needed)

To completely remove the application:

```bash
# Stop and disable nginx
systemctl stop nginx
systemctl disable nginx

# Remove application files
rm -rf /var/www/deployment-app

# Remove nginx config
rm /etc/nginx/sites-available/deployment-system
rm /etc/nginx/sites-enabled/deployment-system

# Remove management scripts
rm /usr/local/bin/deployment-status
rm /usr/local/bin/update-deployment

# Remove SSL certificates (optional)
certbot delete --cert-name your-domain.com

# Remove nginx (optional)
apt remove nginx

# Remove Node.js (optional)
apt remove nodejs
```

---

## Changelog

### Version 2.0 (Current)
- Complete automated installation script
- All latest features included
- Enhanced security configuration
- Management scripts for easy maintenance
- Comprehensive error handling

### Features Included
- Staff & Deployment Management
- Schedule PDF Parsing & Auto-Assignment
- Sales Data Tracking & Forecasting
- Shift Schedule Viewer
- Target Management
- GDPR Compliance Features
- Data Protection & Backups
- Export to PDF & Excel
- Drag & Drop Interface
- Multi-Location Foundation

---

## Next Steps After Installation

1. ✅ Complete initial setup in the application
2. ✅ Add your staff members
3. ✅ Configure positions and areas
4. ✅ Set performance targets
5. ✅ Upload your first schedule PDF
6. ✅ Review auto-assigned deployments
7. ✅ Export your first shift plan
8. ✅ Monitor system with `deployment-status`

---

**Your KFC Deployment Management System is now ready for production use!**

For additional support or feature requests, consult your system administrator.
