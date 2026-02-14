# 7Roars Agency OS — Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │         Hostinger VPS (KVM 2)           │
                    │         Ubuntu 24.04 + Docker           │
                    │         2 CPU / 8 GB RAM / 100 GB       │
                    │                                         │
  Desktop Agent     │   ┌───────────────────────────────┐     │
  (Electron .exe)   │   │  Caddy (ports 80/443)         │     │
  ──── HTTPS ──────────→│  Auto-HTTPS via Let's Encrypt  │     │
                    │   └──────────────┬────────────────┘     │
  Browser           │                  │                       │
  ──── HTTPS ──────────→               ▼                       │
                    │   ┌──────────────────────────────┐      │
                    │   │  Next.js 16 (port 3000)      │      │
                    │   │  Web App + REST API           │      │
                    │   └──────────┬───────────────────┘      │
                    │              │                            │
                    │   ┌──────────▼──┐  ┌──────────────┐     │
                    │   │ PostgreSQL  │  │ Local Disk   │     │
                    │   │ 17 (5432)   │  │ /uploads     │     │
                    │   │ (internal)  │  │ Screenshots  │     │
                    │   └─────────────┘  └──────────────┘     │
                    └─────────────────────────────────────────┘
```

**Cost: $0 extra** — everything runs on your existing Hostinger VPS.

---

## Step 1: First-Time VPS Setup

### 1.1 SSH into your VPS

```bash
ssh root@187.77.27.176
# Enter your Hostinger root password (or use SSH key)
```

### 1.2 Clone the repository

```bash
# Create app directory
mkdir -p /opt/7roars
cd /opt/7roars

# Clone your repo (replace with your actual GitHub URL)
git clone https://github.com/YOUR_ORG/7Roars-CRM.git .
```

### 1.3 Create production environment file

```bash
cp .env.production.example .env.production
nano .env.production
```

**Edit these values:**

| Variable | What to set |
|----------|-------------|
| `DOMAIN` | Your domain (e.g. `os.7roars.com`) |
| `DB_PASSWORD` | A strong random password |
| `DATABASE_URL` | `postgresql://postgres:YOUR_DB_PASSWORD@db:5432/agency_os` |
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://os.7roars.com` |
| `NEXT_PUBLIC_APP_URL` | `https://os.7roars.com` |

R2 keys can stay empty — screenshots store on local disk (85 GB free).

### 1.4 Update Caddyfile domain

The Caddyfile reads the `DOMAIN` env var automatically. If you prefer to hardcode it:

```bash
nano Caddyfile
# Replace {$DOMAIN:os.7roars.com} with your actual domain
```

### 1.5 Point your domain DNS

In your domain registrar (Hostinger DNS Manager, Cloudflare, etc.):

| Type | Name | Value |
|------|------|-------|
| A | `os` (or `@`) | `187.77.27.176` |

Wait for DNS propagation (usually 5–30 minutes).

### 1.6 Configure firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 1.7 Start everything

```bash
cd /opt/7roars
docker compose -f docker-compose.prod.yml up -d
```

### 1.8 Run database migrations

```bash
# Wait ~15 seconds for PostgreSQL to initialize, then:
docker compose -f docker-compose.prod.yml run --rm web \
  sh -c "cd apps/web && npx prisma db push --skip-generate"
```

### 1.9 Verify

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f web
```

Visit `https://os.7roars.com` — you should see the login page.

---

## Step 2: Set Up Auto-Deploy (GitHub Actions)

### 2.1 Generate SSH key for GitHub Actions

On your VPS:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f /root/.ssh/github_deploy -N ""
cat /root/.ssh/github_deploy.pub >> /root/.ssh/authorized_keys
cat /root/.ssh/github_deploy
# Copy the PRIVATE key output
```

### 2.2 Add GitHub Secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `187.77.27.176` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | The private key from step 2.1 |

### 2.3 How it works

On every `git push` to `main`:
1. GitHub Actions runs type-checking
2. If it passes, SSHes into VPS
3. Runs `scripts/deploy.sh` which: pulls code → builds Docker image → runs migrations → restarts

**That's it.** Push to main = auto-deploy.

---

## Step 3: Build Desktop Agent (.exe)

### Local Build (Windows)

```bash
# From project root on your Windows machine
pnpm desktop:make
```

Output: `apps/desktop/out/make/squirrel.windows/x64/7RoarsAgentSetup.exe`

### Automated Build via GitHub Actions

Tag a release to trigger an automated build:
```bash
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

GitHub Actions builds the `.exe` on `windows-latest` and attaches it to a GitHub Release.

### Distributing to Team

1. Download `7RoarsAgentSetup.exe` from GitHub Releases (or build locally)
2. Run the installer
3. Launch "7Roars Agent" from Start Menu
4. Click gear icon → set Server URL to `https://os.7roars.com`
5. Login with credentials

---

## Step 4: Post-Deploy Checklist

- [ ] `https://os.7roars.com` loads the login page
- [ ] Can register a new account (creates org + member)
- [ ] Can login and see dashboard
- [ ] Desktop agent connects to `https://os.7roars.com`
- [ ] Desktop agent login works
- [ ] Timer start/stop syncs to web
- [ ] Screenshots appear in gallery
- [ ] Activity data shows on dashboard

---

## Commands Cheat Sheet

```bash
# === Deploy ===
git push origin main                    # Auto-deploys via GitHub Actions

# === Manual deploy on VPS ===
ssh root@187.77.27.176
cd /opt/7roars && bash scripts/deploy.sh

# === Desktop agent ===
pnpm desktop:make                       # Build Windows installer locally
git tag desktop-v1.0.0 && git push origin desktop-v1.0.0  # CI build

# === Database ===
# On VPS:
docker compose -f docker-compose.prod.yml run --rm web \
  sh -c "cd apps/web && npx prisma db push --skip-generate"

# === Logs ===
docker compose -f docker-compose.prod.yml logs -f web      # Web app logs
docker compose -f docker-compose.prod.yml logs -f db       # Database logs
docker compose -f docker-compose.prod.yml logs -f caddy    # Caddy/HTTPS logs

# === Restart ===
docker compose -f docker-compose.prod.yml restart web      # Restart web only
docker compose -f docker-compose.prod.yml down && \
docker compose -f docker-compose.prod.yml up -d            # Full restart

# === Local dev ===
pnpm dev                                # Start web + desktop in dev mode
docker compose up -d db                 # Start local PostgreSQL
```

---

## Cost Summary

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Hostinger VPS | **Already paid** | KVM 2: 2 CPU, 8 GB RAM, 100 GB disk |
| HTTPS (Let's Encrypt) | **$0** | Auto-provisioned by Caddy |
| Screenshot storage | **$0** | Local disk (85 GB free) |
| GitHub Actions | **$0** | 2,000 min/month free for private repos |
| **Total extra** | **$0** | |

---

## Troubleshooting

### Build fails on VPS
```bash
# Check Docker disk space
df -h
# Check build logs
docker compose -f docker-compose.prod.yml logs web
# Rebuild from scratch
docker compose -f docker-compose.prod.yml build --no-cache web
```

### HTTPS not working
- Verify DNS A record points to `187.77.27.176`
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`
- Caddy needs ports 80 AND 443 open for Let's Encrypt challenge

### Desktop agent can't connect
- Verify server URL in agent settings matches your domain exactly
- Check that `BETTER_AUTH_URL` in `.env.production` matches the public URL
- Test API: `curl https://os.7roars.com/api/auth/ok`

### Database issues
```bash
# Connect to PostgreSQL directly
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d agency_os

# Check DB size
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('agency_os'));"
```

### Disk space (screenshots)
```bash
# Check uploads size
du -sh /var/lib/docker/volumes/*uploads*
# Estimate: 13 users × 50 screenshots/day × 100KB ≈ 65 MB/day ≈ 2 GB/month
# 85 GB free = ~3.5 years of screenshots
```

### View running containers
```bash
docker compose -f docker-compose.prod.yml ps
docker stats  # Live resource usage
```
