# Alternative: Build locally and transfer directly to VPS
# No registry needed, but slower for large images

param(
    [string]$VpsHost = "91.98.114.119",
    [string]$VpsUser = "root"
)

Write-Host "🏗️  Building Docker image locally..." -ForegroundColor Green

# Build the image
docker build --target production -t medusa-app:latest .

Write-Host "📦 Saving image to file..." -ForegroundColor Yellow

# Save image to tar file
docker save medusa-app:latest | gzip > medusa-app.tar.gz

Write-Host "📤 Transferring to VPS..." -ForegroundColor Yellow

# Transfer to VPS using SCP
scp medusa-app.tar.gz "${VpsUser}@${VpsHost}:/tmp/"

Write-Host "🚀 Loading image on VPS..." -ForegroundColor Yellow

# SSH to VPS and load image
ssh "${VpsUser}@${VpsHost}" @"
cd /tmp
docker load < medusa-app.tar.gz
rm medusa-app.tar.gz

cd /path/to/your/app
export MEDUSA_IMAGE="medusa-app:latest"
docker-compose up -d medusa
"@

# Clean up local file
Remove-Item medusa-app.tar.gz

Write-Host "✅ Deployment completed!" -ForegroundColor Green
