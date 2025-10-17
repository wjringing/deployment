#!/bin/bash

# Complete NPM Fix and Deployment Script
# This script fixes the npm proxy issue and deploys the application

set -e

echo "=========================================="
echo "NPM Proxy Fix and Deployment"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

APP_DIR="/var/www/deployment-app"
APP_USER="deployapp"

echo -e "${YELLOW}Step 1: Fixing .npmrc files${NC}"

# Fix project .npmrc
if [ -f "$APP_DIR/.npmrc" ]; then
    echo "Fixing $APP_DIR/.npmrc"
    cat > "$APP_DIR/.npmrc" << 'EOF'
registry=https://registry.npmjs.org/
EOF
    chown deployapp:deployapp "$APP_DIR/.npmrc"
fi

# Fix user .npmrc
USER_NPMRC="/home/deployapp/.npmrc"
if [ -f "$USER_NPMRC" ]; then
    echo "Removing $USER_NPMRC"
    rm -f "$USER_NPMRC"
fi

echo -e "${YELLOW}Step 2: Clearing npm config and cache${NC}"

# Clear npm config for deployapp user
sudo -u deployapp npm config delete proxy 2>/dev/null || true
sudo -u deployapp npm config delete https-proxy 2>/dev/null || true
sudo -u deployapp npm config delete http-proxy 2>/dev/null || true
sudo -u deployapp npm config delete registry 2>/dev/null || true
sudo -u deployapp npm config set registry https://registry.npmjs.org/

# Clear npm cache
sudo -u deployapp npm cache clean --force

echo -e "${YELLOW}Step 3: Verifying npm configuration${NC}"
REGISTRY=$(sudo -u deployapp npm config get registry)
echo "Current registry: $REGISTRY"

if [[ "$REGISTRY" != "https://registry.npmjs.org/" ]]; then
    echo -e "${RED}ERROR: Registry is still wrong!${NC}"
    echo "Registry shows: $REGISTRY"
    echo "Let's try a more aggressive fix..."

    # Remove all possible npmrc files
    rm -f /home/deployapp/.npmrc
    rm -f /etc/npmrc
    rm -f /usr/local/etc/npmrc

    # Set it explicitly
    sudo -u deployapp npm config --userconfig /home/deployapp/.npmrc set registry https://registry.npmjs.org/

    REGISTRY=$(sudo -u deployapp npm config get registry)
    echo "New registry: $REGISTRY"
fi

echo -e "${YELLOW}Step 4: Installing dependencies${NC}"
cd "$APP_DIR"

# Remove node_modules and package-lock.json for clean install
echo "Removing old node_modules..."
rm -rf node_modules package-lock.json

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
sudo -u deployapp npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}npm install failed!${NC}"
    echo "Trying with --legacy-peer-deps..."
    sudo -u deployapp npm install --legacy-peer-deps
fi

echo -e "${YELLOW}Step 5: Building the application${NC}"
sudo -u deployapp npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 6: Setting correct permissions${NC}"
chown -R deployapp:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod -R 775 "$APP_DIR/dist"

echo -e "${YELLOW}Step 7: Restarting nginx${NC}"
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx restarted successfully${NC}"
else
    echo -e "${RED}✗ Nginx failed to restart${NC}"
    echo "Checking nginx status..."
    systemctl status nginx
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Your application should now be running."
echo ""
echo "Next steps:"
echo "1. Visit your site to verify it's working"
echo "2. Check nginx logs if there are issues:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "3. Check application logs:"
echo "   sudo journalctl -u nginx -f"
echo ""
