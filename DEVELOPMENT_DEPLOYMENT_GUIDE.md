# Development Environment Deployment Guide

This guide explains how to set up a development instance of the Deployment Management System alongside your production instance on Ubuntu.

## Overview

This setup allows you to run:
- **Production**: `yourdomain.com` (existing production environment)
- **Development**: `dev.yourdomain.com` (new development environment)

Both instances run side-by-side on the same server with separate:
- User accounts
- Application directories
- Nginx configurations
- Domain names

## Prerequisites

- Ubuntu server with root access
- Two domains/subdomains configured in DNS:
  - `yourdomain.com` → pointing to your server IP (existing production)
  - `dev.yourdomain.com` → pointing to your server IP (new development)
- SSH access to the server
- Node.js environment on your local machine

## Step 1: Initial Server Setup

SSH into your server and run the setup script:

```bash
# Download or copy the setup script
cd /tmp
wget https://your-repo/deployment/setup-dev-environment.sh
# Or upload it via scp

# Make it executable
chmod +x setup-dev-environment.sh

# Run the setup (replace with your domains)
sudo ./setup-dev-environment.sh dev.yourdomain.com yourdomain.com
```

This script will:
- Install Node.js 18 (if not present)
- Install nginx (if not present)
- Install certbot for SSL
- Create a new user `deployapp-dev`
- Set up the directory structure

## Step 2: Deploy Your Application

### Option A: Manual Deployment

From your local machine, upload the application files:

```bash
# From your project directory
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ user@yourserver:/home/deployapp-dev/app/
```

Then SSH into the server and build:

```bash
# SSH to server
ssh user@yourserver

# Switch to dev user
sudo su - deployapp-dev

# Navigate to app directory
cd /home/deployapp-dev/app

# Create .env file with development Supabase credentials
nano .env
# Add your development Supabase URL and keys:
# VITE_SUPABASE_URL=https://your-dev-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Install dependencies
npm install

# Build the application
npm run build
```

### Option B: Automated Deployment

Use the deployment script from your local machine:

```bash
# Make the deploy script executable
chmod +x deployment/deploy-dev.sh

# Deploy (replace with your server details)
./deployment/deploy-dev.sh user@yourserver.com
```

## Step 3: Configure Nginx

Still on the server (as root):

```bash
# Run the nginx configuration script
sudo bash /home/deployapp-dev/app/deployment/configure-nginx-dev.sh \
  dev.yourdomain.com yourdomain.com
```

This will:
- Create nginx configuration for development
- Enable the site
- Test the configuration
- Reload nginx

## Step 4: Set Up SSL Certificate

```bash
# Request SSL certificate for development domain
sudo certbot --nginx -d dev.yourdomain.com
```

Follow the prompts to complete SSL setup.

## Step 5: Verify Installation

1. **Check Nginx Status:**
```bash
sudo systemctl status nginx
```

2. **Check Configuration:**
```bash
sudo nginx -t
```

3. **View Logs:**
```bash
# Access log
sudo tail -f /var/log/nginx/deployment-dev-access.log

# Error log
sudo tail -f /var/log/nginx/deployment-dev-error.log
```

4. **Access Your Development Site:**
Open your browser and navigate to:
```
https://dev.yourdomain.com
```

## Environment Variables

Make sure to create separate `.env` files for development and production:

### Development (.env)
```bash
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

### Production
Keep your existing production `.env` with production Supabase credentials.

## Directory Structure

After setup, your server will have:

```
/home/deployapp/          # Production user
├── app/
    ├── dist/             # Production build
    ├── node_modules/
    └── ...

/home/deployapp-dev/      # Development user
├── app/
    ├── dist/             # Development build
    ├── node_modules/
    ├── backups/          # Automatic backups
    └── ...
```

## Nginx Configuration

```
/etc/nginx/
├── sites-available/
│   ├── deployment        # Production config
│   └── deployment-dev    # Development config
└── sites-enabled/
    ├── deployment        # Production symlink
    └── deployment-dev    # Development symlink
```

## Updating Development Environment

### Quick Update
```bash
# From your local machine
./deployment/deploy-dev.sh user@yourserver.com
```

### Manual Update
```bash
# SSH to server
ssh user@yourserver
sudo su - deployapp-dev
cd /home/deployapp-dev/app

# Pull latest changes (if using git)
git pull

# Or upload new files via rsync

# Rebuild
npm install
npm run build
```

## Troubleshooting

### Site Not Loading

1. Check nginx is running:
```bash
sudo systemctl status nginx
```

2. Check nginx error logs:
```bash
sudo tail -f /var/log/nginx/deployment-dev-error.log
```

3. Verify DNS is pointing to your server:
```bash
nslookup dev.yourdomain.com
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R deployapp-dev:deployapp-dev /home/deployapp-dev/app

# Fix permissions
sudo chmod -R 755 /home/deployapp-dev/app/dist
```

### Build Failures

```bash
# Clean install
cd /home/deployapp-dev/app
rm -rf node_modules package-lock.json
npm install
npm run build
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Rollback

If a deployment causes issues:

```bash
# SSH to server
ssh user@yourserver
sudo su - deployapp-dev
cd /home/deployapp-dev/app

# List available backups
ls -lh backups/

# Restore from backup
tar -xzf backups/backup-YYYYMMDD-HHMMSS.tar.gz
```

## Separating Supabase Instances (Recommended)

For true development/production separation, consider:

1. Create a separate Supabase project for development
2. Use different database instances
3. Set up separate authentication

This ensures:
- No risk of corrupting production data
- Ability to test database migrations safely
- Separate user accounts for testing

## Security Considerations

1. **Firewall**: Ensure ports 80 and 443 are open:
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Keep Systems Updated**:
```bash
sudo apt update && sudo apt upgrade -y
```

3. **Regular Backups**: The deployment script creates automatic backups, but also consider:
```bash
# Backup to external location
rsync -avz /home/deployapp-dev/app/dist/ backup-location/
```

4. **Password Protect Development**: Consider adding basic auth to nginx for dev:
```nginx
location / {
    auth_basic "Development Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    try_files $uri $uri/ /index.html;
}
```

## Support

For issues or questions:
1. Check the logs in `/var/log/nginx/`
2. Verify environment variables in `.env`
3. Test the build locally first with `npm run build`
4. Check Supabase connection and credentials

## Quick Reference Commands

```bash
# Deploy development
./deployment/deploy-dev.sh user@yourserver.com

# Restart nginx
sudo systemctl restart nginx

# View dev logs
sudo tail -f /var/log/nginx/deployment-dev-*.log

# Check nginx config
sudo nginx -t

# Renew SSL
sudo certbot renew

# Switch to dev user
sudo su - deployapp-dev
```
