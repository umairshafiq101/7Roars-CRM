#!/bin/bash
set -e

# 7Roars Agency OS — One-time VPS setup script
# Run as root on a fresh Ubuntu 24.04 VPS with Docker pre-installed
#
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_ORG/7Roars-CRM/main/scripts/setup-vps.sh | bash
# Or: ssh root@your-vps 'bash -s' < scripts/setup-vps.sh

APP_DIR="/opt/7roars"
REPO_URL="${REPO_URL:-https://github.com/YOUR_ORG/7Roars-CRM.git}"

echo "=== 7Roars VPS Setup ==="

# 1. Install Docker Compose plugin (if not already installed)
echo "→ Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

docker --version
docker compose version

# 2. Configure firewall
echo "→ Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw --force enable
    echo "Firewall configured (SSH + HTTP + HTTPS only)"
fi

# 3. Clone repository
echo "→ Cloning repository..."
if [ -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR already exists. Pulling latest..."
    cd "$APP_DIR" && git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Create .env.production from template
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo "→ Creating .env.production..."
    cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"

    # Generate a random auth secret
    AUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s|CHANGE-ME-generate-a-strong-random-secret|$AUTH_SECRET|g" "$APP_DIR/.env.production"

    # Generate a random DB password
    DB_PASS=$(openssl rand -base64 16 | tr -d '=/+')
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASS|g" "$APP_DIR/.env.production"

    # Update DATABASE_URL with the generated password
    sed -i "s|postgresql://postgres:postgres@|postgresql://postgres:$DB_PASS@|g" "$APP_DIR/.env.production"

    echo ""
    echo "⚠️  IMPORTANT: Edit .env.production before starting!"
    echo "   nano $APP_DIR/.env.production"
    echo ""
    echo "   - Set DOMAIN to your domain (e.g. os.7roars.com)"
    echo "   - Verify BETTER_AUTH_URL matches your domain"
    echo "   - Verify NEXT_PUBLIC_APP_URL matches your domain"
    echo ""
fi

# 5. Start services
echo "→ Starting services..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d

# 6. Wait for DB to be ready
echo "→ Waiting for PostgreSQL to be ready..."
sleep 10

# 7. Run database migrations
echo "→ Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm web sh -c "cd apps/web && npx prisma db push --skip-generate"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services running:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to this server's IP"
echo "  2. Edit $APP_DIR/.env.production with your domain"
echo "  3. Restart: cd $APP_DIR && docker compose -f docker-compose.prod.yml restart"
echo "  4. Visit https://your-domain.com to register"
echo ""
