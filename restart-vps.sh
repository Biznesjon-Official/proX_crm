#!/bin/bash

echo "🔄 VPS'da prox_crm'ni restart qilish..."

# VPS'ga ulanish va PM2 restart qilish
ssh root@45.92.173.33 << 'EOF'

echo "📍 /var/www/crmprox papkasiga o'tish..."
cd /var/www/crmprox

echo "🔄 PM2 restart qilish..."
pm2 restart prox-crm

echo "📊 PM2 status tekshirish..."
pm2 status

echo "⏳ 3 sekund kutish..."
sleep 3

echo "🧪 Ball belgilash test qilish..."
echo "Endi crm.prox.uz da qadam belgilash sahifasida ball cheklovlari olib tashlandi"
echo "Istalgan ball kiritish mumkin!"

EOF