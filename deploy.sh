#!/bin/bash

# prox_crm deploy script for crm.prox.uz
# VPS: 45.92.173.33

set -e

echo "🚀 prox-crm deploy boshlandi..."

# 1. Build locally
echo "📦 Build qilinyapti..."
npm run build

# 2. Create deployment package
echo "📁 Deploy paketini tayyorlash..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy necessary files
cp -r dist deploy-package/
cp package.json deploy-package/
cp package-lock.json deploy-package/
cp .env.production deploy-package/.env
cp ecosystem.config.cjs deploy-package/
cp nginx-crm.conf deploy-package/

# 3. Upload to VPS
echo "📤 VPS ga yuklash..."
scp -r deploy-package/* root@45.92.173.33:/var/www/prox-crm/

# 4. Run commands on VPS
echo "🔧 VPS da sozlash..."
ssh root@45.92.173.33 << 'ENDSSH'
cd /var/www/prox-crm

# Install dependencies
npm install --production

# Setup nginx if not exists
if [ ! -f /etc/nginx/sites-available/crm.prox.uz ]; then
    cp nginx-crm.conf /etc/nginx/sites-available/crm.prox.uz
    ln -sf /etc/nginx/sites-available/crm.prox.uz /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
fi

# Restart PM2
pm2 delete prox-crm 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deploy tugadi!"
ENDSSH

# Cleanup
rm -rf deploy-package

echo "🎉 crm.prox.uz ga deploy muvaffaqiyatli!"
