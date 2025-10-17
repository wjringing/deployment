#!/bin/bash

# Configure Nginx for Development Instance
# Run as root or with sudo

set -e

DEV_DOMAIN="${1:-dev.yourdomain.com}"
PROD_DOMAIN="${2:-yourdomain.com}"
DEV_USER="deployapp-dev"
DEV_PATH="/home/$DEV_USER/app"

echo "🔧 Configuring Nginx for Development Instance..."
echo "   Development Domain: $DEV_DOMAIN"
echo "   Production Domain: $PROD_DOMAIN"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Please run as root or with sudo"
   exit 1
fi

# Create nginx config for development
cat > /etc/nginx/sites-available/deployment-dev << EOF
server {
    listen 80;
    server_name $DEV_DOMAIN;
    root $DEV_PATH/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Prevent caching of index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Access and error logs
    access_log /var/log/nginx/deployment-dev-access.log;
    error_log /var/log/nginx/deployment-dev-error.log;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/deployment-dev /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

echo ""
echo "✅ Nginx configuration complete!"
echo ""
echo "📝 Your development site is now available at: http://$DEV_DOMAIN"
echo ""
echo "🔒 To enable HTTPS, run:"
echo "   sudo certbot --nginx -d $DEV_DOMAIN"
echo ""
echo "📋 To check nginx status:"
echo "   sudo systemctl status nginx"
echo ""
echo "📋 To view logs:"
echo "   sudo tail -f /var/log/nginx/deployment-dev-access.log"
echo "   sudo tail -f /var/log/nginx/deployment-dev-error.log"
echo ""
