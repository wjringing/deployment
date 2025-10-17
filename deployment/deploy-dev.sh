#!/bin/bash

# Quick deployment script for development environment
# Run this locally to deploy to your dev server

set -e

# Configuration
SERVER="${1:-user@yourserver.com}"
DEV_USER="deployapp-dev"
DEV_PATH="/home/$DEV_USER/app"

echo "🚀 Deploying to Development Server..."
echo "   Server: $SERVER"
echo "   Path: $DEV_PATH"
echo ""

# Build locally
echo "📦 Building application locally..."
npm run build

# Create a tarball of the dist folder and necessary files
echo "📦 Creating deployment package..."
tar -czf deploy-dev.tar.gz dist/ package.json package-lock.json .env

# Copy to server
echo "📤 Uploading to server..."
scp deploy-dev.tar.gz $SERVER:/tmp/

# Deploy on server
echo "🔧 Deploying on server..."
ssh $SERVER << ENDSSH
    set -e

    # Switch to dev user
    sudo su - $DEV_USER << 'INNEREOF'
        set -e
        cd $DEV_PATH

        # Backup current version
        if [ -d "dist" ]; then
            echo "💾 Backing up current version..."
            mkdir -p backups
            tar -czf backups/backup-\$(date +%Y%m%d-%H%M%S).tar.gz dist/ || true
        fi

        # Extract new version
        echo "📦 Extracting new version..."
        tar -xzf /tmp/deploy-dev.tar.gz -C $DEV_PATH

        # Install dependencies if package.json changed
        if [ -f "package.json" ]; then
            echo "📦 Installing dependencies..."
            npm install --production
        fi

        echo "✅ Deployment complete!"
INNEREOF

    # Clean up
    rm /tmp/deploy-dev.tar.gz
ENDSSH

# Clean up local tarball
rm deploy-dev.tar.gz

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your development site should now be updated"
echo ""
