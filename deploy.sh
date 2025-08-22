#!/bin/bash

# Medusa Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}🚀 Starting Medusa Production Deployment${NC}"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file $ENV_FILE not found!${NC}"
    echo "Please copy env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup current database if running
if docker ps | grep -q "medusa-db-prod"; then
    echo -e "${YELLOW}📦 Creating database backup...${NC}"
    docker exec medusa-db-prod pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
    echo -e "${GREEN}✅ Database backup created: backup_$TIMESTAMP.sql${NC}"
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down || true

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
    git pull origin main || echo "Warning: Could not pull latest changes"
fi

# Build and start containers
echo -e "${YELLOW}🔨 Building and starting containers...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if Medusa is responding
echo -e "${YELLOW}🔍 Checking application health...${NC}"
for i in {1..10}; do
    if curl -f http://localhost:9000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy!${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Application failed to start properly${NC}"
        echo -e "${YELLOW}📋 Container logs:${NC}"
        docker-compose -f $COMPOSE_FILE logs medusa
        exit 1
    fi
    echo "Attempt $i/10 - waiting for application to start..."
    sleep 10
done

# Run database migrations if needed
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE exec -T medusa yarn medusa migrations run || echo "Warning: Migrations failed or not needed"

# Show container status
echo -e "${GREEN}📊 Container Status:${NC}"
docker-compose -f $COMPOSE_FILE ps

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application is running on: http://localhost:9000${NC}"
echo -e "${YELLOW}📝 Don't forget to configure Nginx and SSL certificates${NC}"
