#!/bin/bash

# ================================================================================
# Ubuntu Installation Script for KFC Deployment Management System
# ================================================================================
# This script installs and configures the complete deployment management system
# including all latest features:
# - Staff and deployment management
# - Schedule PDF parsing with auto-assignment
# - Sales data tracking and forecasting
# - Multi-location support (foundation)
# - GDPR compliance features
# - Automated backup and data protection
#
# Requirements: Ubuntu 20.04+ or Debian 11+
# Run as root: sudo bash install-ubuntu.sh
# ================================================================================

set -e  # Exit on any error

# Configuration Variables
DOMAIN="your-domain.com"
APP_USER="${SUDO_USER:-deployapp}"
APP_DIR="/var/www/deployment-app"
SERVICE_NAME="deployment-system-dev"
GITHUB_REPO="https://github.com/wjlander/deploymentnew.git"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}🚀 $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ================================================================================
# PRE-INSTALLATION CHECKS
# ================================================================================

log_step "Starting KFC Deployment Management System Installation"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      KFC DEPLOYMENT MANAGEMENT SYSTEM - INSTALLER v2.0        ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║  Features Included:                                            ║${NC}"
echo -e "${CYAN}║  • Staff & Deployment Management                              ║${NC}"
echo -e "${CYAN}║  • Schedule PDF Parsing & Auto-Assignment                     ║${NC}"
echo -e "${CYAN}║  • Sales Data Tracking & Forecasting                          ║${NC}"
echo -e "${CYAN}║  • Multi-Location Foundation                                  ║${NC}"
echo -e "${CYAN}║  • GDPR Compliance & Data Protection                          ║${NC}"
echo -e "${CYAN}║  • Automated Backups                                          ║${NC}"
echo -e "${CYAN}║  • Shift Schedule Viewer                                      ║${NC}"
echo -e "${CYAN}║  • Target Management                                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check Ubuntu/Debian version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    log_info "Detected OS: $NAME $VERSION"
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log_warning "This script is designed for Ubuntu/Debian. Continue at your own risk."
        read -p "Continue anyway? (y/N): " CONTINUE
        if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
fi

# ================================================================================
# CONFIGURATION INPUT
# ================================================================================

log_step "Configuration Setup"

# Get domain from user
read -p "Enter your domain name (e.g., deploy.kfc-site.com): " USER_DOMAIN
if [ ! -z "$USER_DOMAIN" ]; then
    DOMAIN="$USER_DOMAIN"
fi

# Get SSL email
read -p "Enter email for SSL certificate (e.g., admin@$DOMAIN): " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
    SSL_EMAIL="admin@$DOMAIN"
fi

# Check for Supabase credentials
read -p "Do you want to configure Supabase credentials now? (y/N): " CONFIGURE_SUPABASE
SUPABASE_URL=""
SUPABASE_ANON_KEY=""

if [[ $CONFIGURE_SUPABASE =~ ^[Yy]$ ]]; then
    read -p "Enter Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
    read -p "Enter Supabase Anon Key: " SUPABASE_ANON_KEY
fi

echo ""
log_info "Installation Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain:              $DOMAIN"
echo "  SSL Email:           $SSL_EMAIL"
echo "  App User:            $APP_USER"
echo "  App Directory:       $APP_DIR"
echo "  Service Name:        $SERVICE_NAME"
echo "  Node.js Version:     $NODE_VERSION.x"
echo "  Supabase Configured: $([ ! -z "$SUPABASE_URL" ] && echo "Yes" || echo "No")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Continue with installation? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    log_warning "Installation cancelled by user"
    exit 0
fi

# ================================================================================
# SYSTEM UPDATE & PACKAGE INSTALLATION
# ================================================================================

log_step "Step 1: System Update & Package Installation"

log_info "Updating system packages..."
apt update && apt upgrade -y

log_info "Installing essential packages..."
apt install -y \
    curl \
    wget \
    gnupg2 \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    lsb-release \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    build-essential \
    rsync \
    htop \
    net-tools

log_success "System packages installed successfully"

# ================================================================================
# NODE.JS INSTALLATION
# ================================================================================

log_step "Step 2: Installing Node.js $NODE_VERSION"

log_info "Adding NodeSource repository..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -

log_info "Installing Node.js..."
apt install -y nodejs

# Verify installation
NODE_VER=$(node --version)
NPM_VER=$(npm --version)

log_success "Node.js installed: $NODE_VER"
log_success "NPM installed: $NPM_VER"

# ================================================================================
# PM2 INSTALLATION
# ================================================================================

log_step "Step 3: Installing PM2 Process Manager"

log_info "Installing PM2 globally..."
npm install -g pm2

PM2_VER=$(pm2 --version)
log_success "PM2 installed: v$PM2_VER"

# ================================================================================
# USER & DIRECTORY SETUP
# ================================================================================

log_step "Step 4: User & Directory Setup"

# Check if user exists, create if needed
if id "$APP_USER" &>/dev/null; then
    log_info "User '$APP_USER' already exists"
else
    log_info "Creating application user: $APP_USER"
    useradd -m -s /bin/bash $APP_USER
fi

# Ensure home directory exists
if [ ! -d "/home/$APP_USER" ]; then
    log_info "Creating home directory for $APP_USER"
    mkdir -p "/home/$APP_USER"
    chown $APP_USER:$APP_USER "/home/$APP_USER"
fi

# Create application directory
log_info "Setting up application directory: $APP_DIR"
mkdir -p $APP_DIR
chown -R $APP_USER:www-data $APP_DIR
chmod -R 755 $APP_DIR

log_success "User and directory setup complete"

# ================================================================================
# APPLICATION DEPLOYMENT
# ================================================================================

log_step "Step 5: Application Deployment"

SOURCE_DIR=""

# Check for local source directory
if [ -f "package.json" ]; then
    SOURCE_DIR="$(pwd)"
    log_info "Found package.json in current directory: $SOURCE_DIR"
elif [ -f "/home/project/package.json" ]; then
    SOURCE_DIR="/home/project"
    log_info "Found package.json in /home/project"
elif [ -f "/tmp/cc-agent/58510352/project/package.json" ]; then
    SOURCE_DIR="/tmp/cc-agent/58510352/project"
    log_info "Found package.json in project directory"
else
    log_warning "No local package.json found"
    SOURCE_DIR=""
fi

# Deploy from source or clone from GitHub
if [ ! -z "$SOURCE_DIR" ]; then
    log_info "Deploying from local source: $SOURCE_DIR"

    # Use rsync to copy files efficiently
    rsync -av \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.env.local' \
        "$SOURCE_DIR/" "$APP_DIR/"

    if [ -f "$APP_DIR/package.json" ]; then
        log_success "Application files deployed successfully"
    else
        log_error "Failed to deploy application files"
        exit 1
    fi
else
    log_info "Cloning from GitHub: $GITHUB_REPO"

    TEMP_DIR="/tmp/deployment-app-$(date +%s)"

    if git clone $GITHUB_REPO $TEMP_DIR; then
        rm -rf $APP_DIR
        mv $TEMP_DIR $APP_DIR
        log_success "Repository cloned successfully"
    else
        log_error "Failed to clone repository"
        log_info "Please check:"
        log_info "  1. Internet connection"
        log_info "  2. Repository URL: $GITHUB_REPO"
        log_info "  3. Repository accessibility"
        exit 1
    fi
fi

# Set proper ownership
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR

# Verify critical files
log_info "Verifying application structure..."
MISSING_FILES=0

if [ ! -f "$APP_DIR/package.json" ]; then
    log_error "Missing: package.json"
    MISSING_FILES=1
fi

if [ ! -f "$APP_DIR/vite.config.js" ]; then
    log_warning "Missing: vite.config.js (may affect build)"
fi

if [ ! -f "$APP_DIR/index.html" ]; then
    log_error "Missing: index.html"
    MISSING_FILES=1
fi

if [ ! -d "$APP_DIR/src" ]; then
    log_error "Missing: src directory"
    MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 1 ]; then
    log_error "Critical application files are missing"
    exit 1
fi

log_success "Application structure verified"

# ================================================================================
# ENVIRONMENT CONFIGURATION
# ================================================================================

log_step "Step 6: Environment Configuration"

# Create .env file if Supabase credentials provided
if [ ! -z "$SUPABASE_URL" ] && [ ! -z "$SUPABASE_ANON_KEY" ]; then
    log_info "Creating .env file with Supabase credentials..."

    cat > "$APP_DIR/.env" << ENV_EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV_EOF

    chown $APP_USER:$APP_USER "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"

    log_success "Environment file created"
else
    if [ -f "$APP_DIR/.env" ]; then
        log_info "Existing .env file found and preserved"
    else
        log_warning "No .env file configured - application may need manual configuration"
        log_info "Create $APP_DIR/.env with your Supabase credentials:"
        log_info "  VITE_SUPABASE_URL=your_supabase_url"
        log_info "  VITE_SUPABASE_ANON_KEY=your_supabase_key"
    fi
fi

# ================================================================================
# DEPENDENCY INSTALLATION
# ================================================================================

log_step "Step 7: Installing Application Dependencies"

cd $APP_DIR

log_info "Installing npm packages..."
log_info "This may take several minutes..."

sudo -u $APP_USER npm install --production=false

if [ $? -eq 0 ]; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# ================================================================================
# APPLICATION BUILD
# ================================================================================

log_step "Step 8: Building Application"

log_info "Building production bundle..."
log_info "This may take several minutes..."

sudo -u $APP_USER npm run build

if [ $? -eq 0 ]; then
    log_success "Application built successfully"
else
    log_error "Build failed"
    log_info "Check build logs above for errors"
    exit 1
fi

# Verify dist directory
if [ ! -d "$APP_DIR/dist" ]; then
    log_error "Build directory (dist) not created"
    exit 1
fi

if [ ! -f "$APP_DIR/dist/index.html" ]; then
    log_error "index.html not found in dist directory"
    exit 1
fi

# Set proper permissions for nginx
chmod -R 755 $APP_DIR/dist
chown -R $APP_USER:www-data $APP_DIR/dist

log_success "Build artifacts verified"

# ================================================================================
# NGINX CONFIGURATION
# ================================================================================

log_step "Step 9: Configuring Nginx Web Server"

log_info "Creating Nginx configuration..."

cat > /etc/nginx/sites-available/$SERVICE_NAME << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    root /var/www/deployment-app/dist;
    index index.html;

    # Logging
    error_log /var/log/nginx/deployment_error.log warn;
    access_log /var/log/nginx/deployment_access.log combined;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Main location - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
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
        image/svg+xml
        font/woff
        font/woff2;
    gzip_disable "msie6";

    # Prevent access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Favicon and robots.txt
    location = /favicon.ico {
        log_not_found off;
        access_log off;
        return 204;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # Hide server tokens
    server_tokens off;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;
}
NGINX_EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$SERVICE_NAME

log_success "Nginx configuration created"

# ================================================================================
# NGINX ACTIVATION
# ================================================================================

log_step "Step 10: Activating Nginx Configuration"

# Remove default site
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    log_info "Removing default Nginx site"
    rm /etc/nginx/sites-enabled/default
fi

# Enable our site
log_info "Enabling deployment site"
ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/

# Test configuration
log_info "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    log_success "Nginx configuration is valid"

    # Restart nginx
    systemctl restart nginx
    systemctl enable nginx

    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx failed to start"
        log_info "Checking error log..."
        tail -20 /var/log/nginx/error.log
        exit 1
    fi
else
    log_error "Nginx configuration test failed"
    nginx -t
    exit 1
fi

# ================================================================================
# FIREWALL CONFIGURATION
# ================================================================================

log_step "Step 11: Configuring Firewall (UFW)"

log_info "Configuring firewall rules..."

# Allow Nginx and SSH
ufw allow 'Nginx Full' >/dev/null 2>&1
ufw allow OpenSSH >/dev/null 2>&1

# Enable firewall
ufw --force enable >/dev/null 2>&1

log_success "Firewall configured and enabled"

# ================================================================================
# SSL CERTIFICATE SETUP
# ================================================================================

log_step "Step 12: SSL Certificate Configuration"

# Check DNS resolution
log_info "Checking DNS resolution for $DOMAIN..."
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | head -1 || echo "")
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "unknown")

log_info "Domain IP:        $DOMAIN_IP"
log_info "Server IP:        $SERVER_IP"

if [ "$DOMAIN_IP" = "$SERVER_IP" ] && [ ! -z "$DOMAIN_IP" ]; then
    log_success "DNS is correctly configured"

    log_info "Obtaining SSL certificate from Let's Encrypt..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL --redirect

    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained successfully"

        # Enable auto-renewal
        systemctl enable certbot.timer
        log_success "SSL auto-renewal enabled"
    else
        log_warning "Failed to obtain SSL certificate automatically"
        log_info "You can try manually later with:"
        log_info "  certbot --nginx -d $DOMAIN"
    fi
else
    log_warning "DNS not configured correctly or domain not resolving"
    log_info "Please update your DNS records to point $DOMAIN to $SERVER_IP"
    log_info "Then run: sudo certbot --nginx -d $DOMAIN"
fi

# ================================================================================
# MANAGEMENT SCRIPTS
# ================================================================================

log_step "Step 13: Creating Management Scripts"

# Update script
log_info "Creating update script..."
cat > /usr/local/bin/update-deployment << 'UPDATE_EOF'
#!/bin/bash

# Update script for KFC Deployment Management System
# Run as root: sudo update-deployment

set -e

APP_DIR="/var/www/deployment-app"
APP_USER="APP_USER_PLACEHOLDER"

echo "🔄 Updating KFC Deployment Management System..."
echo "================================================"

cd $APP_DIR

# Pull latest changes if git repository
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes from repository..."
    sudo -u $APP_USER git pull origin main || sudo -u $APP_USER git pull origin master
else
    echo "⚠️  Not a git repository - manual update required"
    echo "Please copy your latest files to $APP_DIR"
    exit 1
fi

echo "📦 Installing/updating dependencies..."
sudo -u $APP_USER npm install

echo "🔨 Building application..."
sudo -u $APP_USER npm run build

echo "🔧 Setting permissions..."
chown -R $APP_USER:www-data $APP_DIR/dist
chmod -R 755 $APP_DIR/dist

echo "🔄 Reloading nginx..."
systemctl reload nginx

echo "✅ Update complete!"
echo ""
echo "🌐 Visit your site to see the changes"
UPDATE_EOF

sed -i "s/APP_USER_PLACEHOLDER/$APP_USER/g" /usr/local/bin/update-deployment
chmod +x /usr/local/bin/update-deployment

# Status script
log_info "Creating status check script..."
cat > /usr/local/bin/deployment-status << 'STATUS_EOF'
#!/bin/bash

# Status check script for KFC Deployment Management System

DOMAIN_FILE="/etc/nginx/sites-available/deployment-system-dev"
DOMAIN=$(grep "server_name" $DOMAIN_FILE 2>/dev/null | awk '{print $2}' | sed 's/;//' | head -1 || echo "unknown")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 KFC DEPLOYMENT MANAGEMENT SYSTEM - STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 URL: https://$DOMAIN"
echo "📅 Checked: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "📊 Services Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl is-active nginx >/dev/null 2>&1 && echo "✅ Nginx: Running" || echo "❌ Nginx: Not running"
systemctl is-enabled nginx >/dev/null 2>&1 && echo "✅ Nginx: Auto-start enabled" || echo "⚠️  Nginx: Auto-start disabled"

echo ""
echo "🔒 SSL Certificate:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL Certificate: Active"
    EXPIRY=$(certbot certificates 2>/dev/null | grep -A2 "$DOMAIN" | grep "Expiry Date" | awk '{print $3, $4}' | head -1)
    if [ ! -z "$EXPIRY" ]; then
        echo "📅 Expires: $EXPIRY"
    fi
else
    echo "❌ SSL Certificate: Not configured"
fi

echo ""
echo "💻 System Resources:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
echo "🧠 Memory: $(free -m | awk 'NR==2{printf "%d/%dMB (%.1f%%)", $3, $2, $3*100/$2}')"
echo "⚡ Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🔧 Useful Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  update-deployment      # Update application"
echo "  systemctl status nginx # Check nginx status"
echo "  tail -f /var/log/nginx/deployment_error.log  # View logs"
echo "  nginx -t               # Test nginx config"
echo "  certbot renew --dry-run # Test SSL renewal"
STATUS_EOF

chmod +x /usr/local/bin/deployment-status

log_success "Management scripts created"

# ================================================================================
# LOG ROTATION
# ================================================================================

log_step "Step 14: Configuring Log Rotation"

cat > /etc/logrotate.d/deployment-system-dev << 'LOGROTATE_EOF'
/var/log/nginx/deployment_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
LOGROTATE_EOF

log_success "Log rotation configured"

# ================================================================================
# FINAL VERIFICATION
# ================================================================================

log_step "Step 15: Final System Verification"

# Test site accessibility
log_info "Testing site accessibility..."
sleep 2

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "000")

case $HTTP_STATUS in
    200|301|302)
        log_success "Site is accessible (HTTP $HTTP_STATUS)"
        ;;
    000)
        log_warning "Could not connect to site - may need DNS propagation"
        ;;
    *)
        log_warning "Site returned HTTP $HTTP_STATUS"
        ;;
esac

# ================================================================================
# INSTALLATION COMPLETE
# ================================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║        🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉         ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📊 Installation Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Domain:           https://$DOMAIN"
echo "📁 App Directory:    $APP_DIR"
echo "👤 App User:         $APP_USER"
echo "🔒 SSL Status:       $([ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && echo "✅ Enabled" || echo "⚠️  Manual setup required")"
echo "🛡️  Firewall:         $(ufw status | head -1)"
echo "🔧 Nginx Status:     $(systemctl is-active nginx)"
echo ""

echo -e "${BLUE}✨ Features Available:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Staff Management"
echo "✅ Deployment Scheduling"
echo "✅ Schedule PDF Parsing & Auto-Assignment"
echo "✅ Sales Data Tracking"
echo "✅ Shift Schedule Viewer"
echo "✅ Target Management"
echo "✅ GDPR Compliance Features"
echo "✅ Data Protection & Backups"
echo "✅ Export to PDF & Excel"
echo "✅ Drag & Drop Interface"
echo ""

echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "deployment-status              # Check system status"
echo "update-deployment              # Update application"
echo "systemctl status nginx         # Check web server"
echo "tail -f /var/log/nginx/deployment_error.log  # View logs"
echo "certbot certificates           # Check SSL certificates"
echo ""

echo -e "${BLUE}📖 Important Files:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Application:     $APP_DIR"
echo "Environment:     $APP_DIR/.env"
echo "Nginx Config:    /etc/nginx/sites-available/$SERVICE_NAME"
echo "SSL Certs:       /etc/letsencrypt/live/$DOMAIN/"
echo "Error Log:       /var/log/nginx/deployment_error.log"
echo "Access Log:      /var/log/nginx/deployment_access.log"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Visit your site: ${GREEN}https://$DOMAIN${NC}"
echo "2. Complete Supabase setup (if not done during installation)"
echo "3. Configure your first location and staff members"
echo "4. Upload your first schedule PDF"
echo "5. Check system status: ${CYAN}deployment-status${NC}"
echo ""

if [ -z "$SUPABASE_URL" ]; then
    log_warning "Supabase credentials not configured during installation"
    echo ""
    echo "To configure Supabase:"
    echo "1. Create/copy your .env file to: $APP_DIR/.env"
    echo "2. Add your credentials:"
    echo "   VITE_SUPABASE_URL=your_supabase_url"
    echo "   VITE_SUPABASE_ANON_KEY=your_supabase_key"
    echo "3. Rebuild: cd $APP_DIR && sudo -u $APP_USER npm run build"
    echo "4. Reload nginx: sudo systemctl reload nginx"
    echo ""
fi

echo -e "${GREEN}🎯 Your KFC Deployment Management System is ready!${NC}"
echo -e "${GREEN}   Visit: https://$DOMAIN${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
