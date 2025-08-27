#!/bin/bash

# Production deployment script for MedusaJS v2
set -e

echo "🚀 Starting MedusaJS production deployment..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    echo "   Copy .env.production.template to .env.production and configure it."
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("JWT_SECRET" "COOKIE_SECRET" "STORE_CORS" "ADMIN_CORS" "AUTH_CORS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

# Check database connection
if [ -z "$SUPABASE_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo "❌ Missing database configuration (SUPABASE_DATABASE_URL or DATABASE_URL)"
    exit 1
fi

echo "✅ Environment validation passed"

# Build and deploy
echo "🔨 Building Docker containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🏁 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check health
echo "🔍 Checking service health..."
if curl -f http://localhost:9000/health &>/dev/null; then
    echo "✅ MedusaJS is healthy and running!"
    echo "   Admin: http://localhost:9000/app"
    echo "   API: http://localhost:9000"
else
    echo "❌ Health check failed. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 medusa
    exit 1
fi

echo "🎉 Deployment completed successfully!"