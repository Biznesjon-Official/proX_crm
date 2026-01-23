#!/bin/bash

echo "🚀 CRM.PROX.UZ ga tez deploy qilish..."

# Git pull
echo "📥 Yangi o'zgarishlarni olish..."
git pull origin main

# Build
echo "🔨 Build qilish..."
npm run build

# PM2 restart
echo "♻️  PM2 restart..."
pm2 restart prox-crm

# Logs
echo "📋 Loglarni ko'rsatish..."
pm2 logs prox-crm --lines 30
