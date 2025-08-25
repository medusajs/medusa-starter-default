#!/bin/bash

# Build and Deploy Script for Medusa on Hetzner VPS
# This script builds the Docker image locally and deploys to VPS

set -e

# Configuration
REGISTRY="your-registry"  # Change to your Docker registry (docker.io, ghcr.io, etc.)
IMAGE_NAME="medusa-app"
VPS_HOST="your-vps-host"  # Change to your VPS IP/hostname
VPS_USER="your-vps-user"  # Change to your VPS username

# Get version from package.json or use timestamp
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || date +%Y%m%d-%H%M%S)
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:latest"

echo "🏗️  Building Medusa Docker image..."
echo "Image: ${FULL_IMAGE_NAME}"

# Build the Docker image locally (where you have enough resources)
docker build \
  --target production \
  --platform linux/amd64 \
  --tag "${FULL_IMAGE_NAME}" \
  --tag "${LATEST_IMAGE_NAME}" \
  .

echo "✅ Build completed successfully!"

# Push to registry
echo "📤 Pushing image to registry..."
docker push "${FULL_IMAGE_NAME}"
docker push "${LATEST_IMAGE_NAME}"

echo "✅ Image pushed successfully!"

# Deploy to VPS
echo "🚀 Deploying to VPS..."

# SSH to VPS and pull + restart
ssh "${VPS_USER}@${VPS_HOST}" << EOF
  set -e
  
  echo "📥 Pulling new image on VPS..."
  docker pull "${LATEST_IMAGE_NAME}"
  
  echo "🔄 Updating docker-compose..."
  cd /path/to/your/app  # Change this to your app path on VPS
  
  export MEDUSA_IMAGE="${LATEST_IMAGE_NAME}"
  
  echo "🔄 Restarting Medusa service..."
  docker-compose pull medusa
  docker-compose up -d medusa
  
  echo "🧹 Cleaning up old images..."
  docker image prune -f
  
  echo "✅ Deployment completed!"
  
  echo "📊 Service status:"
  docker-compose ps
EOF

echo "🎉 Deployment completed successfully!"
echo "🌐 Your Medusa app should be running at: http://${VPS_HOST}:9000"
