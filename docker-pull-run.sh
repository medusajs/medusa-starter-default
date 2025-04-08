#!/bin/bash

# /home/ec2-user/mesera/docker-pull-run.sh
# Docker Pull and Run Script for Mesera with Medusa, Postgres and redis servers
# This script pulls the latest Docker images and runs them with proper configuration
# Can be run manually or via cron job in the following steps...
# 1) crontab -e		#to open vim session.
# 2) 0 2 * * 0 /home/ec2-user/mesera/docker-pull-run.sh >> /home/ec2-user/docker-cron.log 2>&1
# 3) :wq 			#to close vim session.
# 4) crontab -l  	#to confirm
# To run manually...
# 1) cd /home/ec2-user/mesera
# 2) ./docker-pull-run.sh

# Configuration
APP_NAME="mesera"
APP_PATH="$HOME/$APP_NAME"
LOG_FILE="$APP_PATH/docker-deploy.log"
MEDUSAJS_CONTAINER_NAME="${APP_NAME}-medusajs"
REDIS_CONTAINER_NAME="${APP_NAME}-redis"
POSTGRES_CONTAINER_NAME="${APP_NAME}-postgres"
# NETWORK_NAME="${APP_NAME}-network"
NETWORK_NAME="mesera"
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-"eumeadi"}  # Set your Docker Hub username or use environment variable
MEDUSAJS_IMAGE="${DOCKERHUB_USERNAME}/${APP_NAME}-medusajs:latest"
REDIS_IMAGE="redis"  # Using the official Redis image directly
POSTGRES_IMAGE="postgres"  # Using the official Postgres image directly
ENV_FILE="$APP_PATH/.env.docker"
DB_NAME="mesera"
DATA_DIR="$APP_PATH/postgres/db-data"
PORT=9000

# Create log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create error handling function
handle_error() {
  log "ERROR: $1"
  exit 1
}

# Start logging
log "Starting Docker pull and run script for $APP_NAME on Medusa, Redis and Postgres"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  handle_error "Docker is not running or not accessible"
fi

# Create necessary directories
mkdir -p "$DATA_DIR" "$APP_PATH/logs"


# Check if .env file exists, create if it doesn't
if [ ! -f "$ENV_FILE" ]; then
  log "Creating $ENV_FILE file as it doesn't exist..."
  cat > "$ENV_FILE" << EOF
# Environment Variables for Medusa
# Created by docker-build-run.sh on $(date '+%Y-%m-%d %H:%M:%S')

MEDUSA_ADMIN_ONBOARDING_TYPE=default
STORE_CORS=http://localhost:8000,https://docs.medusajs.com
ADMIN_CORS=http://localhost:5173,http://localhost:9000,https://docs.medusajs.com
AUTH_CORS=http://localhost:5173,http://localhost:9000,https://docs.medusajs.com

REDIS_URL=redis://mesera-redis:6379 # On Docker containers, use IP returned by Docker command: docker network inspect <NETWORK> 

JWT_SECRET=supersecret # Replace supersecret by generating with:  openssl rand -base64 32
COOKIE_SECRET=supersecret # Replace supersecret by generating with:  openssl rand -base64 32

DB_NAME=example
DATABASE_URL=postgres://example:******@mesera-postgres/$DB_NAME
#DATABASE_URL=postgres://mesera:******@mesera-postgres:5432/$DB_NAME?ssl_mode=disable

STRIPE_API_KEY= # The secret key of the stripe payment.
PAYSTACK_SECRET_KEY= # The secret key of the paystack payment.
SANITY_API_TOKEN= # The API token of the Sanity project.
SANITY_PROJECT_ID= # The ID of the Sanity project.
SANITY_STUDIO_URL=http://localhost:8000/studio

# Application configuration
PORT=$PORT

# Add your custom environment variables below
# etc.
EOF
  log "$ENV_FILE file created successfully."
  chmod 600 "$ENV_FILE"
else
  log "$ENV_FILE file already exists, skipping creation."
fi

# Pull the latest images
log "Pulling latest Docker images"
docker pull "$MEDUSAJS_IMAGE" || handle_error "Failed to pull Next.js image"
docker pull "$REDIS_IMAGE" || handle_error "Failed to pull Redis image"
docker pull "$POSTGRES_IMAGE" || handle_error "Failed to pull Postgres image"
log "Successfully pulled latest Docker images"

# Stop and remove existing containers
log "Stopping and removing existing containers if they exist"
docker stop "$MEDUSAJS_CONTAINER_NAME" 2>/dev/null || true
docker stop "$REDIS_CONTAINER_NAME" 2>/dev/null || true
docker stop "$POSTGRES_CONTAINER_NAME" 2>/dev/null || true
docker rm "$MEDUSAJS_CONTAINER_NAME" 2>/dev/null || true
docker rm "$REDIS_CONTAINER_NAME" 2>/dev/null || true
docker rm "$POSTGRES_CONTAINER_NAME" 2>/dev/null || true

# Create Docker network if it doesn't exist
if ! docker network inspect "$NETWORK_NAME" &>/dev/null; then
  log "Creating Docker network: $NETWORK_NAME"
  sudo docker network create "$NETWORK_NAME" || handle_error "Failed to create Docker network"
fi

# Start Postgres container
log "Starting Postgres container"
docker run -d \
  --name "$POSTGRES_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  -p 5432:5432 \
  -v "$DATA_DIR:/var/lib/postgresql/data" \
  -e "POSTGRES_DB=$DB_NAME" \
  -e "POSTGRES_USER=$APP_NAME" \
  -e "POSTGRES_PASSWORD=supersecret" \
  -e "PGDATA='/var/lib/postgresql/data'" \
  "$POSTGRES_IMAGE" \
  || handle_error "Failed to start Postgres container"

# Start Redis container
log "Starting Redis container"
docker run -d \
  --name "$REDIS_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  -p 6379:6379 \
  "$REDIS_IMAGE" \
  || handle_error "Failed to start Redis container"

# Start Medusa container
log "Starting Medusa container"
docker run -d \
  --name "$MEDUSAJS_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  -v "$ENV_FILE:/application/.env" \
  -v "$APP_PATH/docker-bootstrap.sh:/application/docker-bootstrap.sh:ro" \
  -e "PORT=$PORT" \
  "$MEDUSAJS_IMAGE" \
  || handle_error "Failed to start Medusa container"

# Wait for containers to initialize
log "Waiting for containers to initialize..."
sleep 10

# Verify containers are running
if ! docker ps | grep -q "$MEDUSAJS_CONTAINER_NAME"; then
  log "Next.js container failed to start. Checking logs:"
  docker logs "$MEDUSAJS_CONTAINER_NAME"
  handle_error "Next.js container is not running"
fi

if ! docker ps | grep -q "$REDIS_CONTAINER_NAME"; then
  log "Redis container failed to start. Checking logs:"
  docker logs "$REDIS_CONTAINER_NAME"
  handle_error "Redis container is not running"
fi

if ! docker ps | grep -q "$POSTGRES_CONTAINER_NAME"; then
  log "Postgres container failed to start. Checking logs:"
  docker logs "$POSTGRES_CONTAINER_NAME"
  handle_error "Postgres container is not running"
fi

# Clean up old images
log "Cleaning up old Docker images"
docker system prune -f

# Success message
log "Deployment completed successfully!"
log "Your $APP_NAME is now running  on Medusa, Redis and Postgres"
log "Access it at: http://localhost:$PORT or https://localhost:$PORT"

exit 0

