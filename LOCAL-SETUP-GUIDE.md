# 7Roars Agency OS — Local Setup Guide

> How to run the **Web Dashboard** and **Desktop Agent** locally for development and manual testing.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | https://nodejs.org |
| pnpm | 9.x | `npm i -g pnpm` |
| Docker Desktop | Latest | https://docker.com |
| Git | Latest | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone <repo-url> 7roars-crm
cd 7roars-crm
pnpm install
```

> The root `.npmrc` has `shamefully-hoist=true` which is required for Electron Forge + pnpm compatibility.

---

## 2. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 17** on `localhost:5432` (db: `agency_os`, user: `postgres`, password: `postgres`)
- **Redis** on `localhost:6379` (for future Socket.io adapter)

Verify it's running:
```bash
docker ps
```

---

## 3. Configure Environment

The web app needs a `.env` file at `apps/web/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agency_os"
BETTER_AUTH_SECRET="your-secret-key-here-min-32-chars-long"
BETTER_AUTH_URL="http://localhost:3000"
```

> If this file already exists, no changes needed.

---

## 4. Push Database Schema

```bash
cd apps/web
npx prisma db push
cd ../..
```

This creates all tables in PostgreSQL without affecting existing data.

---

## 4.1. Reset Database (Full Wipe)

Use this when you want to **completely wipe all data** and start fresh — all users, organizations, time entries, screenshots, and settings will be deleted.

### Step 1: Reset PostgreSQL

```bash
cd apps/web
npx prisma db push --force-reset --accept-data-loss
cd ../..
```

This drops all tables and recreates them from the Prisma schema. You'll see:
```
The PostgreSQL database "agency_os" schema "public" was successfully reset.
Your database is now in sync with your Prisma schema.
```

### Step 2: Clear Desktop Agent Local DB

The desktop agent stores its session, timer state, and offline queue in a local SQLite file. After resetting the server DB, you **must** clear this too — otherwise the agent will try to use a stale session token.

**Windows:**
```powershell
Remove-Item "$env:APPDATA\@7roars\desktop\7roars-agent.db" -Force
```

**macOS/Linux:**
```bash
rm -f ~/.config/@7roars/desktop/7roars-agent.db
```

### Step 3: Clear Uploaded Screenshots

Screenshots are stored locally in the web app's `public/uploads/` directory:

```bash
# Windows
Remove-Item -Recurse -Force "apps\web\public\uploads\screenshots" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\public\uploads\thumbnails" -ErrorAction SilentlyContinue

# macOS/Linux
rm -rf apps/web/public/uploads/screenshots apps/web/public/uploads/thumbnails
```

### Step 4: Restart Both Apps

1. Stop the web app (Ctrl+C in its terminal) and restart: `pnpm --filter web run dev`
2. Stop the desktop agent (Ctrl+C or close the window) and restart: `pnpm --filter desktop run start`
3. Register a new account at http://localhost:3000 — this creates a fresh organization

### Quick One-Liner (Windows PowerShell)

```powershell
cd apps/web; npx prisma db push --force-reset --accept-data-loss; cd ../..; Remove-Item "$env:APPDATA\@7roars\desktop\7roars-agent.db" -Force -ErrorAction SilentlyContinue; Remove-Item -Recurse -Force "apps\web\public\uploads\screenshots","apps\web\public\uploads\thumbnails" -ErrorAction SilentlyContinue; echo "Database reset complete. Restart both apps and register a new account."
```

---

## 5. Start the Web App

```bash
pnpm --filter web run dev
```

The web dashboard starts at **http://localhost:3000**.

### First-time setup:
1. Open http://localhost:3000
2. Click "Create account"
3. Register with your email, password, and organization name
4. You'll be redirected to the dashboard as the **OWNER**

### Test credentials (if DB already has data):
- Email: `umairshafiq.cs@gmail.com`
- Password: `Testing12`

---

## 6. Start the Desktop Agent

In a **separate terminal**:

```bash
pnpm --filter desktop run start
```

This launches the Electron app via Electron Forge with Vite HMR.

### Desktop Agent Login:
1. The login screen appears automatically
2. Click **Server Settings** (gear icon) to verify the server URL is `http://localhost:3000`
3. Enter the same email/password you registered with on the web app
4. After login, the timer UI appears and a system tray icon is created

### Desktop Agent Features:
- **Start/Stop Timer** — Select a project, click play/stop
- **Screenshot Capture** — Automatic every 5-10 minutes while timer is running
- **Activity Tracking** — Keyboard/mouse activity logged via uiohook-napi
- **System Tray** — Right-click tray icon for: Open Dashboard, Logout, Quit
- **Offline Queue** — Data syncs when connection is restored

---

## 7. Running Both Apps Together

Open **two terminals**:

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `pnpm --filter web run dev` | http://localhost:3000 |
| Terminal 2 | `pnpm --filter desktop run start` | Electron window |

### Verification Checklist:
1. Web app loads at http://localhost:3000 with sidebar navigation
2. Desktop agent shows login screen (or timer if already logged in)
3. Start timer in desktop agent → entry appears on web `/timesheets`
4. Screenshots captured by agent → visible on web `/screenshots`
5. Team members visible on web `/team`

---

## 8. Useful Commands

| Action | Command |
|--------|---------|
| Start everything | `docker compose up -d && pnpm --filter web run dev` (terminal 1) + `pnpm --filter desktop run start` (terminal 2) |
| Reset database | `cd apps/web && npx prisma db push --force-reset` |
| View DB in browser | `cd apps/web && npx prisma studio` → http://localhost:5555 |
| Restart Electron main process | Type `rs` in the desktop terminal |
| Open DevTools in Electron | Press `Ctrl+Shift+I` in the Electron window |
| Check Docker containers | `docker ps` |
| Stop Docker | `docker compose down` |
| Install new dependency | `pnpm --filter <web\|desktop> add <package>` |

---

## 9. Troubleshooting

### Web app won't start
- Check Docker is running: `docker ps` should show `7roarscrm-db-1`
- Check `.env` exists at `apps/web/.env` with correct `DATABASE_URL`
- Run `cd apps/web && npx prisma db push` to ensure schema is up to date

### Desktop agent login fails
- Ensure web app is running at http://localhost:3000
- Check Server Settings in the desktop agent (gear icon) — URL must be `http://localhost:3000`
- If you get "Missing or null Origin" error, the `Origin` header fix is already applied in `auth.ts`
- Delete the local SQLite DB to clear stale sessions: `del %APPDATA%\@7roars\desktop\7roars-agent.db`

### Screenshots not appearing on web dashboard
- Ensure timer is running in the desktop agent (screenshots only capture during active timer)
- Check `apps/web/uploads/screenshots/` for local file storage
- Verify the date filter on `/screenshots` matches when screenshots were captured

### Timesheets show 0h 0m
- Switch to **Weekly** view — the daily view uses local timezone which may not match UTC-stored entries
- Verify entries exist: open browser console and run `fetch('/api/v1/time-entries?limit=5').then(r=>r.json()).then(console.log)`

### Electron main process changes not taking effect
- Type `rs` in the desktop terminal to restart the main process
- If that doesn't work, kill all `electron.exe` processes and restart: `taskkill /f /im electron.exe` then `pnpm --filter desktop run start`
- Clear the Vite build cache: `rmdir /s /q apps\desktop\.vite` then restart

---

## 10. Architecture Quick Reference

```
7roars-crm/
├── apps/
│   ├── web/                    # Next.js 16 (App Router, Turbopack)
│   │   ├── app/(dashboard)/    # Dashboard pages (timesheets, screenshots, team, etc.)
│   │   ├── app/api/v1/         # REST API for desktop agent
│   │   ├── actions/            # Server actions for web UI
│   │   ├── prisma/modules/     # Multi-file Prisma schema
│   │   └── lib/                # Auth, DB, storage, utilities
│   └── desktop/                # Electron 40 + Forge 7 + Vite
│       ├── src/main/           # Main process (timer, screenshots, sync, auth, tray)
│       ├── src/renderer/       # React 19 UI (Login, Timer, App)
│       └── src/preload/        # contextBridge API
├── docker-compose.yml          # PostgreSQL 17 + Redis
├── CONTEXT.md                  # Current project state
├── CHANGELOG.md                # Development history
├── BUGS.md                     # All bugs found and fixed
└── E2E-TESTING-PLAN.md         # Full test plan (41 test cases)
```

### Tech Stack:
- **Web:** Next.js 16, Prisma 7, Better Auth, Tailwind CSS v4, shadcn/ui
- **Desktop:** Electron 40, Electron Forge 7, Vite, React 19, sql.js, uiohook-napi
- **Database:** PostgreSQL 17 (Docker), SQLite (desktop offline queue)
- **Monorepo:** pnpm workspaces + Turborepo
