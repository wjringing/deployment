#!/bin/bash

# Fix Permissions and Installation Issues
# Run as root: sudo bash fix-permissions.sh

set -e

APP_DIR="/var/www/deployment-app"
APP_USER="deployapp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 Fixing Installation Permissions and Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Step 1: Fix directory ownership
log_info "Step 1: Fixing directory ownership..."

if [ ! -d "$APP_DIR" ]; then
    log_error "Directory $APP_DIR does not exist"
    exit 1
fi

# Remove any existing node_modules with wrong permissions
if [ -d "$APP_DIR/node_modules" ]; then
    log_info "Removing existing node_modules..."
    rm -rf "$APP_DIR/node_modules"
    log_success "Removed old node_modules"
fi

# Fix ownership of entire directory
log_info "Setting ownership to $APP_USER:$APP_USER..."
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR

# Ensure user can write to the directory
chmod -R u+w $APP_DIR

log_success "Ownership fixed"

# Step 2: Fix npm configuration and clean cache
log_info "Step 2: Fixing npm configuration..."

# Remove any proxy settings that might be misconfigured
sudo -u $APP_USER npm config delete proxy 2>/dev/null || true
sudo -u $APP_USER npm config delete https-proxy 2>/dev/null || true
sudo -u $APP_USER npm config delete http-proxy 2>/dev/null || true

# Set registry to official npm
sudo -u $APP_USER npm config set registry https://registry.npmjs.org/

# Clean npm cache
log_info "Cleaning npm cache..."
sudo -u $APP_USER npm cache clean --force

log_success "npm configuration fixed and cache cleaned"

# Step 3: Install dependencies
log_info "Step 3: Installing dependencies..."
log_info "This may take several minutes..."

cd $APP_DIR

# Install with proper user
sudo -u $APP_USER npm install --production=false 2>&1 | while IFS= read -r line; do
    echo "$line"
    # Show progress for key packages
    if echo "$line" | grep -q "added\|removed\|changed\|audited"; then
        log_info "$line"
    fi
done

NPM_EXIT=${PIPESTATUS[0]}

if [ $NPM_EXIT -eq 0 ]; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    log_info "Trying with legacy peer deps..."
    sudo -u $APP_USER npm install --production=false --legacy-peer-deps

    if [ $? -eq 0 ]; then
        log_success "Dependencies installed with legacy-peer-deps"
    else
        log_error "Installation failed. Please check errors above."
        exit 1
    fi
fi

# Verify vite is installed
if [ -f "$APP_DIR/node_modules/.bin/vite" ]; then
    log_success "Vite installed correctly"
else
    log_error "Vite not found in node_modules"
    log_info "Attempting to install vite explicitly..."
    sudo -u $APP_USER npm install vite --save-dev
fi

# Step 4: Build the application
log_info "Step 4: Building application..."

cd $APP_DIR
sudo -u $APP_USER npm run build

if [ $? -eq 0 ]; then
    log_success "Build completed successfully"
else
    log_error "Build failed"
    exit 1
fi

# Step 5: Set proper permissions for nginx
log_info "Step 5: Setting nginx permissions..."

if [ -d "$APP_DIR/dist" ]; then
    chown -R $APP_USER:www-data $APP_DIR/dist
    chmod -R 755 $APP_DIR/dist
    log_success "Permissions set for nginx"
else
    log_error "dist directory not found"
    exit 1
fi

# Step 6: Verify installation
log_info "Step 6: Verifying installation..."

VERIFICATION_ERRORS=0

# Check critical files
if [ ! -f "$APP_DIR/dist/index.html" ]; then
    log_error "Missing: dist/index.html"
    VERIFICATION_ERRORS=$((VERIFICATION_ERRORS + 1))
else
    log_success "Found: dist/index.html"
fi

# Check for CSS
CSS_COUNT=$(find "$APP_DIR/dist/assets" -name "*.css" 2>/dev/null | wc -l)
if [ $CSS_COUNT -gt 0 ]; then
    log_success "Found: $CSS_COUNT CSS file(s)"
else
    log_warning "No CSS files found"
fi

# Check for JS
JS_COUNT=$(find "$APP_DIR/dist/assets" -name "*.js" 2>/dev/null | wc -l)
if [ $JS_COUNT -gt 0 ]; then
    log_success "Found: $JS_COUNT JavaScript file(s)"
else
    log_error "No JavaScript files found"
    VERIFICATION_ERRORS=$((VERIFICATION_ERRORS + 1))
fi

if [ $VERIFICATION_ERRORS -gt 0 ]; then
    log_error "Verification failed with $VERIFICATION_ERRORS error(s)"
    exit 1
fi

# Step 7: Restart nginx
log_info "Step 7: Restarting nginx..."
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    log_success "Nginx restarted successfully"
else
    log_error "Nginx failed to restart"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation Fixed Successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

log_info "Summary:"
echo "  App Directory:   $APP_DIR"
echo "  Build Directory: $APP_DIR/dist"
echo "  Owner:           $APP_USER"
echo "  Nginx Status:    $(systemctl is-active nginx)"
echo ""

log_info "Next Steps:"
echo "  1. Check your site is working"
echo "  2. Run: deployment-status"
echo "  3. Check logs: tail -f /var/log/nginx/deployment_error.log"
echo ""
