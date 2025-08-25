# PowerShell Build and Deploy Script for Medusa on Hetzner VPS
# This script builds the Docker image locally and deploys to VPS

param(
    [string]$Registry = "ghcr.io/Pcoq",  # Replace with your GitHub username
    [string]$ImageName = "medusa-app",
    [string]$VpsHost = "91.98.114.119",           # Your Hetzner VPS IP
    [string]$VpsUser = "root"                   # Usually 'root' on Hetzner
)

# Stop on any error
$ErrorActionPreference = "Stop"

# Get version from package.json or use timestamp
try {
    $PackageJson = Get-Content "package.json" | ConvertFrom-Json
    $Version = $PackageJson.version
} catch {
    $Version = Get-Date -Format "yyyyMMdd-HHmmss"
}

$FullImageName = "${Registry}/${ImageName}:${Version}"
$LatestImageName = "${Registry}/${ImageName}:latest"

Write-Host "🏗️  Building Medusa Docker image..." -ForegroundColor Green
Write-Host "Image: $FullImageName" -ForegroundColor Yellow

# Build the Docker image locally
docker build `
  --target production `
  --platform linux/amd64 `
  --tag $FullImageName `
  --tag $LatestImageName `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Push to registry
Write-Host "📤 Pushing image to registry..." -ForegroundColor Yellow
docker push $FullImageName
docker push $LatestImageName

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed!"
}

Write-Host "✅ Image pushed successfully!" -ForegroundColor Green

# Deploy to VPS
Write-Host "🚀 Deploying to VPS..." -ForegroundColor Yellow

$DeployScript = @"
set -e

echo "📥 Pulling new image on VPS..."
docker pull "$LatestImageName"

echo "🔄 Updating docker-compose..."
cd /path/to/your/app  # Change this to your app path on VPS

export MEDUSA_IMAGE="$LatestImageName"

echo "🔄 Restarting Medusa service..."
docker-compose pull medusa
docker-compose up -d medusa

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment completed!"

echo "📊 Service status:"
docker-compose ps
"@

# SSH to VPS and execute deployment
ssh "${VpsUser}@${VpsHost}" $DeployScript

if ($LASTEXITCODE -ne 0) {
    Write-Error "VPS deployment failed!"
}

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Your Medusa app should be running at: http://${VpsHost}:9000" -ForegroundColor Cyan
