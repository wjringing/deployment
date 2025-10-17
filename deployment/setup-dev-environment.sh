#!/bin/bash

# Development Environment Setup Script
# This script sets up a development instance alongside production
# Run as root or with sudo

set -e

echo "🚀 Setting up Development Environment for Deployment Management System..."

# Configuration
DEV_DOMAIN="${1:-dev.yourdomain.com}"
PROD_DOMAIN="${2:-yourdomain.com}"
DEV_USER="deployapp-dev"
DEV_PATH="/home/$DEV_USER/app"

echo "📋 Configuration:"
echo "   Development Domain: $DEV_DOMAIN"
echo "   Production Domain: $PROD_DOMAIN"
echo "   Development Path: $DEV_PATH"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Please run as root or with sudo"
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18 if not already installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt install -y nginx
else
    echo "✅ Nginx already installed"
fi

# Install certbot for SSL
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot for SSL..."
    apt install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed"
fi

# Create development application user
if id "$DEV_USER" &>/dev/null; then
    echo "✅ User $DEV_USER already exists"
else
    echo "👤 Creating development user: $DEV_USER"
    useradd -m -s /bin/bash $DEV_USER
fi

# Create application directory
echo "📁 Creating development application directory..."
mkdir -p $DEV_PATH
chown -R $DEV_USER:$DEV_USER $DEV_PATH

echo ""
echo "✅ Server setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Copy your application files to the dev server:"
echo "   rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@yourserver:$DEV_PATH/"
echo ""
echo "2. SSH into your server and run:"
echo "   sudo su - $DEV_USER"
echo "   cd $DEV_PATH"
echo "   npm install"
echo "   npm run build"
echo ""
echo "3. Create nginx configuration (as root):"
echo "   sudo bash deployment/configure-nginx-dev.sh $DEV_DOMAIN $PROD_DOMAIN"
echo ""
echo "4. Set up SSL certificates:"
echo "   sudo certbot --nginx -d $DEV_DOMAIN"
echo ""
