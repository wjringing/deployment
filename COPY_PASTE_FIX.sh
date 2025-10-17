#!/bin/bash
# Simple one-command fix for Ubuntu server
# Copy and paste this entire block into your terminal

cd /var/www/deployment-app && \
sudo rm -f .npmrc /home/deployapp/.npmrc /etc/npmrc && \
echo "registry=https://registry.npmjs.org/" | sudo tee .npmrc && \
sudo chown deployapp:deployapp .npmrc && \
sudo -u deployapp npm config delete proxy 2>/dev/null; \
sudo -u deployapp npm config delete https-proxy 2>/dev/null; \
sudo -u deployapp npm config set registry https://registry.npmjs.org/ && \
echo "✓ NPM config fixed" && \
echo "Current registry: $(sudo -u deployapp npm config get registry)" && \
sudo rm -rf node_modules package-lock.json && \
sudo -u deployapp npm cache clean --force && \
echo "✓ Starting npm install..." && \
sudo -u deployapp npm install && \
echo "✓ Building application..." && \
sudo -u deployapp npm run build && \
sudo chown -R deployapp:www-data /var/www/deployment-app && \
sudo chmod -R 755 /var/www/deployment-app && \
sudo chmod -R 775 /var/www/deployment-app/dist && \
sudo systemctl restart nginx && \
echo "" && \
echo "========================================" && \
echo "✓ DEPLOYMENT COMPLETE!" && \
echo "========================================" && \
echo "Your application is now running." && \
echo "Check it at your domain/IP address."
