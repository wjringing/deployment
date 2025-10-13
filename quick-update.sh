#!/bin/bash

###############################################################################
# Quick Update Script for KFC Deployment Management System
#
# This script updates an existing installation with the latest code changes
# without requiring a full reinstallation.
#
# Usage: sudo bash quick-update.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/deployment-app"
BACKUP_DIR="/var/backups/deployment-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  KFC Deployment Management System - Quick Update          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}Error: Application directory not found at $APP_DIR${NC}"
  echo -e "${YELLOW}Please run the full installation script first${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Step 1/5: Creating backup...${NC}"
# Backup current installation (exclude node_modules and dist)
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  -C /var/www deployment-app
echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
echo ""

echo -e "${YELLOW}Step 2/5: Copying updated files...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Copy updated source files
echo "  - Copying src/ files..."
rsync -av --delete "$SCRIPT_DIR/src/" "$APP_DIR/src/"

# Copy updated utility files
echo "  - Copying public files..."
if [ -d "$SCRIPT_DIR/public" ]; then
  rsync -av "$SCRIPT_DIR/public/" "$APP_DIR/public/"
fi

# Copy configuration files
echo "  - Copying configuration files..."
cp -f "$SCRIPT_DIR/index.html" "$APP_DIR/index.html" 2>/dev/null || true
cp -f "$SCRIPT_DIR/package.json" "$APP_DIR/package.json" 2>/dev/null || true
cp -f "$SCRIPT_DIR/vite.config.js" "$APP_DIR/vite.config.js" 2>/dev/null || true
cp -f "$SCRIPT_DIR/tailwind.config.js" "$APP_DIR/tailwind.config.js" 2>/dev/null || true
cp -f "$SCRIPT_DIR/postcss.config.js" "$APP_DIR/postcss.config.js" 2>/dev/null || true

# Preserve .env file (don't overwrite)
if [ ! -f "$APP_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  echo "  - Creating .env file..."
  cp "$SCRIPT_DIR/.env" "$APP_DIR/.env"
fi

echo -e "${GREEN}✓ Files copied successfully${NC}"
echo ""

echo -e "${YELLOW}Step 3/5: Installing dependencies...${NC}"
cd "$APP_DIR"
npm install --production
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 4/5: Building application...${NC}"
npm run build
echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 5/5: Restarting services...${NC}"
# Reload nginx to pick up any changes
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               Update Completed Successfully!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Update Summary:${NC}"
echo -e "  • Backup location: ${GREEN}$BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
echo -e "  • Application directory: ${GREEN}$APP_DIR${NC}"
echo -e "  • Build output: ${GREEN}$APP_DIR/dist${NC}"
echo ""

echo -e "${BLUE}What was updated:${NC}"
echo -e "  ✓ Fixed NaN hours display issue"
echo -e "  ✓ Improved time calculation with better error handling"
echo -e "  ✓ Updated shift classification logic"
echo -e "  ✓ All source code and utilities updated"
echo ""

echo -e "${BLUE}Your application is now running with the latest updates!${NC}"
echo ""

# Show application URL
if [ -f /etc/nginx/sites-enabled/deployment-app ]; then
  SERVER_NAME=$(grep -m1 'server_name' /etc/nginx/sites-enabled/deployment-app | awk '{print $2}' | sed 's/;//')
  if [ ! -z "$SERVER_NAME" ] && [ "$SERVER_NAME" != "_" ]; then
    echo -e "${GREEN}Access your application at: https://$SERVER_NAME${NC}"
  else
    echo -e "${GREEN}Access your application at: http://$(hostname -I | awk '{print $1}')${NC}"
  fi
else
  echo -e "${GREEN}Access your application at: http://$(hostname -I | awk '{print $1}')${NC}"
fi
echo ""

echo -e "${YELLOW}Note: If you need to rollback, restore from:${NC}"
echo -e "${YELLOW}  $BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
echo ""
