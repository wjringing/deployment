#!/bin/bash

# Ubuntu Installation Script for Deployment Management System
# Run as root: sudo ./install-ubuntu.sh

set -e  # Exit on any error

# Configuration
DOMAIN="your-domain.com"  # Change this to your actual domain
APP_USER="$SUDO_USER"
APP_DIR="/var/www/deployment-app"
SERVICE_NAME="deployment-system"
GITHUB_REPO="https://github.com/wjlander/deploymentnew.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Ubuntu Installation for Deployment Management System${NC}"
echo "=================================================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Get domain from user
echo -e "${YELLOW}📝 Configuration Setup${NC}"
read -p "Enter your domain name (e.g., deploy.example.com): " USER_DOMAIN
if [ ! -z "$USER_DOMAIN" ]; then
    DOMAIN="$USER_DOMAIN"
fi

read -p "Enter email for SSL certificate (e.g., admin@example.com): " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
    SSL_EMAIL="admin@$DOMAIN"
fi

echo ""
echo -e "${BLUE}📍 Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  SSL Email: $SSL_EMAIL"
echo "  App User: $APP_USER"
echo "  App Directory: $APP_DIR"
echo ""

read -p "Continue with installation? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}📦 Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}📦 Step 2: Installing required packages...${NC}"
apt install -y curl wget gnupg2 software-properties-common apt-transport-https \
    ca-certificates lsb-release git nginx certbot python3-certbot-nginx ufw \
    build-essential

echo -e "${BLUE}📦 Step 3: Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo -e "${BLUE}📦 Step 4: Installing PM2 for process management...${NC}"
sudo npm install -g pm2

echo -e "${BLUE}✅ Verifying installations...${NC}"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Nginx version: $(nginx -v 2>&1)"
echo "PM2 version: $(pm2 --version)"

echo -e "${BLUE}👤 Step 5: Creating application user...${NC}"
echo "Using current user: $APP_USER"

# Ensure user's home directory exists
if [ ! -d "/home/$APP_USER" ]; then
    echo "Creating home directory for $APP_USER"
    mkdir -p "/home/$APP_USER"
    chown $APP_USER:$APP_USER "/home/$APP_USER"
fi

echo -e "${BLUE}📁 Step 6: Setting up application directory...${NC}"
mkdir -p $APP_DIR
chown -R $APP_USER:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo -e "${BLUE}📥 Step 7: Setting up application files...${NC}"
# Determine source directory and copy files
SOURCE_DIR=""

# Check multiple possible source locations
if [ -f "package.json" ]; then
    SOURCE_DIR="$(pwd)"
    echo "Found package.json in current directory: $SOURCE_DIR"
elif [ -f "/home/project/package.json" ]; then
    SOURCE_DIR="/home/project"
    echo "Found package.json in /home/project"
elif [ -f "/home/$APP_USER/deployment1/package.json" ]; then
    SOURCE_DIR="/home/$APP_USER/deployment1"
    echo "Found package.json in user's deployment1 directory"
else
    echo "No local package.json found, cloning from GitHub..."
    SOURCE_DIR=""
fi

if [ ! -z "$SOURCE_DIR" ]; then
    echo "Copying application files from: $SOURCE_DIR"
    
    # Ensure target directory exists
    mkdir -p $APP_DIR
    
    # Copy all files except .git directory
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' "$SOURCE_DIR/" "$APP_DIR/"
    
    # Verify package.json was copied
    if [ -f "$APP_DIR/package.json" ]; then
        echo -e "${GREEN}✅ Application files copied successfully${NC}"
    else
        echo -e "${RED}❌ Failed to copy package.json${NC}"
        exit 1
    fi
else
    echo "Cloning from GitHub repository: $GITHUB_REPO"
    # Clone to temporary directory first, then move
    TEMP_DIR="/tmp/deployment-app-$(date +%s)"
    
    if git clone $GITHUB_REPO $TEMP_DIR; then
        # Remove existing app directory if it exists
        rm -rf $APP_DIR
        mv $TEMP_DIR $APP_DIR
        echo -e "${GREEN}✅ Repository cloned successfully${NC}"
    else
        echo -e "${RED}❌ Failed to clone repository${NC}"
        echo "Please check:"
        echo "1. Internet connection"
        echo "2. Repository URL: $GITHUB_REPO"
        echo "3. Repository accessibility"
        exit 1
    fi
fi

# Set proper ownership after copying/cloning
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR

# Verify essential files exist
echo -e "${BLUE}🔍 Verifying application files...${NC}"
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}❌ package.json not found in $APP_DIR${NC}"
    echo "Directory contents:"
    ls -la $APP_DIR/
    exit 1
fi

if [ ! -f "$APP_DIR/src/main.jsx" ] && [ ! -f "$APP_DIR/src/main.js" ]; then
    echo -e "${YELLOW}⚠️ Main application file not found${NC}"
    echo "Directory contents:"
    ls -la $APP_DIR/src/ 2>/dev/null || echo "src directory not found"
fi

echo -e "${GREEN}✅ Application files verified${NC}"

echo -e "${BLUE}📦 Step 8: Installing application dependencies...${NC}"
cd $APP_DIR
sudo -u $APP_USER npm install

echo -e "${BLUE}🔨 Step 9: Building application...${NC}"
sudo -u $APP_USER npm run build

echo -e "${BLUE}🌐 Step 10: Configuring Nginx...${NC}"

# Ensure the dist directory exists and has correct permissions
if [ ! -d "$APP_DIR/dist" ]; then
    echo -e "${YELLOW}⚠️ dist directory not found, creating it...${NC}"
    sudo -u $APP_USER mkdir -p $APP_DIR/dist
    echo "<h1>Deployment Management System</h1><p>Building...</p>" > $APP_DIR/dist/index.html
    chown -R $APP_USER:$APP_USER $APP_DIR/dist
fi

# Set proper permissions for nginx to read files
chmod -R 755 $APP_DIR/dist

cat > /etc/nginx/sites-available/$SERVICE_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $APP_DIR/dist;
    index index.html;
    
    # Error and access logs
    error_log /var/log/nginx/${SERVICE_NAME}_error.log;
    access_log /var/log/nginx/${SERVICE_NAME}_access.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json
        application/xml
        application/rss+xml
        application/atom+xml
        image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Hide server tokens
    server_tokens off;

    # Prevent access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Handle favicon.ico
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        return 204;
    }
}
EOF

echo -e "${BLUE}🔗 Step 11: Enabling Nginx site...${NC}"
# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Enable our site
ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/

echo -e "${BLUE}🧪 Step 12: Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    
    # Check if files exist and permissions are correct
    echo -e "${BLUE}🔍 Checking file permissions...${NC}"
    ls -la $APP_DIR/dist/
    
    systemctl restart nginx
    systemctl enable nginx
    echo -e "${GREEN}🔄 Nginx restarted and enabled${NC}"
    
    # Check nginx status
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx is running${NC}"
    else
        echo -e "${RED}❌ Nginx failed to start${NC}"
        echo "Checking nginx error log:"
        tail -10 /var/log/nginx/error.log
    fi
else
    echo -e "${RED}❌ Nginx configuration error${NC}"
    echo "Nginx configuration test output:"
    nginx -t
    exit 1
fi

echo -e "${BLUE}🛡️ Step 13: Configuring firewall...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo -e "${BLUE}🔍 Step 14: Checking DNS resolution...${NC}"
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null || echo "")
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")

echo "Domain IP: $DOMAIN_IP"
echo "Server IP: $SERVER_IP"

if [ "$DOMAIN_IP" = "$SERVER_IP" ] && [ ! -z "$DOMAIN_IP" ]; then
    echo -e "${GREEN}✅ DNS is correctly configured${NC}"
    
    echo -e "${BLUE}🔒 Step 15: Setting up SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
        systemctl enable certbot.timer
        echo -e "${GREEN}🔄 SSL auto-renewal enabled${NC}"
    else
        echo -e "${YELLOW}⚠️ Failed to obtain SSL certificate automatically${NC}"
        echo "You can try manually later with: certbot --nginx -d $DOMAIN"
    fi
else
    echo -e "${YELLOW}⚠️ DNS not configured correctly or domain not resolving${NC}"
    echo "Please update your DNS records to point $DOMAIN to $SERVER_IP"
    echo "Then run: certbot --nginx -d $DOMAIN"
fi

echo -e "${BLUE}📝 Step 16: Creating management scripts...${NC}"

# Create update script
cat > /usr/local/bin/update-deployment << SCRIPT_EOF
#!/bin/bash

# Update script for deployment management system
# Run as root or with sudo

APP_DIR="/var/www/deployment-app"
GITHUB_REPO="https://github.com/wjlander/deployment1.git"

cd $APP_DIR
APP_USER="$APP_USER"

echo "🔄 Updating Deployment Management System..."
echo "=========================================="

cd \$APP_DIR

echo "📥 Pulling latest changes..."
git remote set-url origin $GITHUB_REPO
git pull origin main
    sudo -u \$APP_USER git pull origin main
else
    echo "Not a git repository - manual update required"
fi

echo "📦 Installing dependencies..."
sudo -u \$APP_USER npm install

echo "🔨 Building application..."
sudo -u \$APP_USER npm run build

echo "🔧 Setting permissions..."
chown -R \$APP_USER:www-data \$APP_DIR/dist
chmod -R 755 \$APP_DIR/dist

echo "🔄 Restarting nginx..."
systemctl reload nginx

echo "✅ Application updated successfully!"
echo "🌐 Visit: https://$DOMAIN"
SCRIPT_EOF

chmod +x /usr/local/bin/update-deployment

# Create status check script
cat > /usr/local/bin/deployment-status << 'STATUS_EOF'
#!/bin/bash

DOMAIN_FILE="/etc/nginx/sites-available/deployment-system"
DOMAIN=$(grep "server_name" $DOMAIN_FILE 2>/dev/null | awk '{print $2}' | sed 's/;//' || echo "unknown")

echo "🚀 Deployment Management System Status"
echo "======================================"
echo "🌐 Domain: https://$DOMAIN"
echo "📅 Last checked: $(date)"
echo ""

echo "Services:"
systemctl is-active nginx >/dev/null 2>&1 && echo "✅ Nginx: Running" || echo "❌ Nginx: Not running"
systemctl is-enabled nginx >/dev/null 2>&1 && echo "✅ Nginx: Auto-start enabled" || echo "❌ Nginx: Auto-start disabled"

echo ""
echo "SSL Certificate:"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL Certificate: Active"
    EXPIRY=$(certbot certificates 2>/dev/null | grep -A2 "$DOMAIN" | grep "Expiry Date" | awk '{print $3, $4}' | head -1)
    if [ ! -z "$EXPIRY" ]; then
        echo "📅 Expires: $EXPIRY"
    fi
else
    echo "❌ SSL Certificate: Not found"
fi

echo ""
echo "System Resources:"
echo "💾 Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
echo "🧠 Memory Usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "⚡ Load Average: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🔧 Useful Commands:"
echo "  - Check nginx status: systemctl status nginx"
echo "  - View nginx logs: tail -f /var/log/nginx/error.log"
echo "  - Test nginx config: nginx -t"
echo "  - Update app: sudo -u $APP_USER /home/$APP_USER/update-app.sh"
echo "  - Renew SSL: certbot renew"
STATUS_EOF

chmod +x /usr/local/bin/deployment-status

# Add deployapp user to sudo for nginx operations

echo -e "${BLUE}🔧 Step 17: Setting up log rotation...${NC}"
cat > /etc/logrotate.d/deployment-system << 'LOGROTATE_EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
LOGROTATE_EOF

echo -e "${BLUE}📊 Step 18: Final system check...${NC}"
echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "=================================================================="
echo ""
echo -e "${BLUE}📊 System Status:${NC}"
echo "=================="
echo "🌐 Domain: https://$DOMAIN"
echo "📁 App Directory: $APP_DIR"
echo "👤 App User: $APP_USER"
echo "🔒 SSL: $(if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then echo "✅ Enabled"; else echo "⚠️ Manual setup required"; fi)"
echo "🛡️ Firewall: $(ufw status | head -1)"
echo ""

echo -e "${BLUE}🔧 Service Status:${NC}"
echo "=================="
systemctl is-active nginx >/dev/null 2>&1 && echo "✅ Nginx: Running" || echo "❌ Nginx: Not running"
systemctl is-enabled nginx >/dev/null 2>&1 && echo "✅ Nginx: Auto-start enabled" || echo "❌ Nginx: Auto-start disabled"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "=============="
echo "1. Test your deployment: https://$DOMAIN"
echo "2. Check system status anytime: deployment-status"
echo "3. Update application: /home/$APP_USER/update-app.sh"
echo ""

echo -e "${BLUE}📁 Important Files:${NC}"
echo "==================="
echo "  - App files: $APP_DIR"
echo "  - Nginx config: /etc/nginx/sites-available/$SERVICE_NAME"
echo "  - SSL certificates: /etc/letsencrypt/live/$DOMAIN/"
echo "  - Update script: /home/$APP_USER/update-app.sh"
echo "  - Status script: /usr/local/bin/deployment-status"
echo ""

echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "==================="
echo "  - deployment-status          # Check system status"
echo "  - systemctl status nginx     # Check nginx status"
echo "  - tail -f /var/log/nginx/error.log  # View nginx logs"
echo "  - nginx -t                   # Test nginx config"
echo "  - certbot certificates       # Check SSL certificates"
echo "  - certbot renew             # Renew SSL certificates"
echo ""

echo -e "${GREEN}🎯 Your Deployment Management System should now be available at:${NC}"
echo -e "${GREEN}   https://$DOMAIN${NC}"
echo ""

# Test the site
echo -e "${BLUE}🧪 Testing site accessibility...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ Site is accessible!${NC}"
else
    echo -e "${YELLOW}⚠️ Site may not be accessible yet (HTTP $HTTP_STATUS)${NC}"
    echo "This could be due to DNS propagation or firewall settings."
fi

echo ""
echo -e "${GREEN}Installation completed successfully! 🎉${NC}"
