# Deploy built files without Docker
# Build locally with npm, transfer files to VPS

param(
    [string]$VpsHost = "91.98.114.119",
    [string]$VpsUser = "root",
    [string]$VpsAppPath = "/app"
)

Write-Host "🏗️  Building Medusa locally..." -ForegroundColor Green

# Build the application locally
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
}

Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

# Create a deployment package
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "medusa-build-$timestamp.tar.gz"

# Use tar (available in Windows 10+) or 7zip
tar -czf $packageName dist/ package.json package-lock.json

Write-Host "📤 Uploading to VPS..." -ForegroundColor Yellow

# Transfer to VPS
scp $packageName "${VpsUser}@${VpsHost}:/tmp/"

Write-Host "🚀 Deploying on VPS..." -ForegroundColor Yellow

# Deploy on VPS
ssh "${VpsUser}@${VpsHost}" @"
cd $VpsAppPath

# Backup current version
if [ -d "dist" ]; then
    mv dist dist.backup.$timestamp
fi

# Extract new version
cd /tmp
tar -xzf $packageName
mv dist $VpsAppPath/
mv package*.json $VpsAppPath/

cd $VpsAppPath

# Install production dependencies
npm ci --only=production

# Restart the application (assumes you have pm2 or similar)
pm2 restart medusa || npm start

echo "✅ Deployment completed!"
"@

# Cleanup
Remove-Item $packageName

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
