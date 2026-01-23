# prox_crm deploy script for crm.prox.uz
# VPS: 45.92.173.33

Write-Host "🚀 prox-crm deploy boshlandi..." -ForegroundColor Cyan

# 1. Build locally
Write-Host "📦 Build qilinyapti..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build xatolik!" -ForegroundColor Red
    exit 1
}

# 2. Create deployment package
Write-Host "📁 Deploy paketini tayyorlash..." -ForegroundColor Yellow
if (Test-Path "deploy-package") { Remove-Item -Recurse -Force "deploy-package" }
New-Item -ItemType Directory -Path "deploy-package" | Out-Null

# Copy necessary files
Copy-Item -Recurse "dist" "deploy-package/"
Copy-Item "package.json" "deploy-package/"
Copy-Item "package-lock.json" "deploy-package/"
Copy-Item ".env.production" "deploy-package/.env"
Copy-Item "ecosystem.config.cjs" "deploy-package/"
Copy-Item "nginx-crm.conf" "deploy-package/"

# 3. Upload to VPS using scp
Write-Host "📤 VPS ga yuklash..." -ForegroundColor Yellow
scp -r deploy-package/* root@45.92.173.33:/var/www/prox-crm/

# 4. Run commands on VPS
Write-Host "🔧 VPS da sozlash..." -ForegroundColor Yellow
$sshCommands = @"
cd /var/www/prox-crm
npm install --production
pm2 delete prox-crm 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "✅ Deploy tugadi!"
"@

ssh root@45.92.173.33 $sshCommands

# Cleanup
Remove-Item -Recurse -Force "deploy-package"

Write-Host "🎉 crm.prox.uz ga deploy muvaffaqiyatli!" -ForegroundColor Green
