#!/bin/bash
set -e

# 7Roars Agency OS — Server-side deploy script
# Run this on the VPS after git pull to rebuild and restart

APP_DIR="/opt/7roars"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== 7Roars Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

cd "$APP_DIR"

# Pull latest code
echo "→ Pulling latest code..."
git pull origin main

# Build new image
echo "→ Building Docker image..."
docker compose -f "$COMPOSE_FILE" build web

# Run database migrations
echo "→ Running database migrations..."
docker compose -f "$COMPOSE_FILE" --profile migrate run --rm migrate

# Restart with zero-downtime (recreate only changed services)
echo "→ Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Clean up old images
echo "→ Cleaning up old images..."
docker image prune -f

echo "=== Deploy complete ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
