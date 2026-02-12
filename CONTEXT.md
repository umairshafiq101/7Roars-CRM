# 7Roars Agency OS — Context File

> ⚡ CLAUDE CODE: Read this file FIRST at the start of every session.
> Then read the last 20 lines of CHANGELOG.md for recent progress.

## Project Summary
Internal agency management platform for 7Roars Digital Agency (13-member team).
Starting as time tracker + screenshots, designed to grow into full agency OS.

## Tech Stack — USE THESE EXACT VERSIONS
- Next.js 16.1.6 (App Router) — use proxy.ts NOT middleware.ts
- Prisma 7.3.0 (multi-file schema) + PostgreSQL 17
- Better Auth 1.4.18 (NOT NextAuth — it's merged into Better Auth now)
- Tailwind CSS v4 (CSS-first config, NO tailwind.config.js)
- shadcn/ui for components
- Electron 40 + Electron Forge (NOT electron-builder)
- uiohook-napi (NOT iohook — it's abandoned)
- Socket.io v4
- Cloudflare R2 (S3-compatible)
- Turborepo monorepo
- Zod v4 for validation
- TypeScript everywhere

## ❌ DO NOT USE (Deprecated)
- NextAuth.js / Auth.js → Better Auth
- iohook → uiohook-napi
- electron-builder → Electron Forge
- middleware.ts → proxy.ts (Next.js 16)
- tailwind.config.js → CSS-first in Tailwind v4
- Any Next.js 14/15 patterns

## Prisma 7 Notes (IMPORTANT)
- `datasourceUrl` removed from PrismaClient constructor — use `@prisma/adapter-pg` adapter
- `prismaSchemaFolder` preview feature is deprecated (now GA) — just point schema dir in prisma.config.ts
- `datasource.url` removed from schema files — configure in prisma.config.ts
- prisma.config.ts loads .env manually for CLI commands (Prisma 7 doesn't auto-load .env)

## Code Conventions
- Multi-file Prisma schema: `prisma/modules/*.prisma`
- All tables have: id (cuid), created_at, updated_at
- All tables have organization_id for multi-tenant readiness
- Soft delete via deleted_at (nullable DateTime)
- API responses: use lib/api-response.ts → { success, data?, error?, meta? }
- Audit logging on ALL mutations via lib/audit.ts
- Permission checks via lib/permissions.ts
- Module-based folder structure: components/modules/<module-name>/
- New features register in config/modules.ts
- Server actions in actions/<module>.ts
- REST API for desktop agent: app/api/v1/

## Adding a New Module (FOLLOW THIS PATTERN)
1. Create schema: prisma/modules/<module>.prisma
2. Run migration: npx prisma db push
3. Create route group: app/(dashboard)/<module>/page.tsx
4. Create components: components/modules/<module>/
5. Create server actions: actions/<module>.ts
6. Register in config/modules.ts (set enabled: true)
7. Add nav item in config/navigation.ts
8. Update CHANGELOG.md

## Current Status
- [x] Phase 1: Foundation + Core ✅ COMPLETE
  - [x] 1.1 Turborepo monorepo initialized
  - [x] 1.2 Next.js 16.1.6 app created
  - [x] 1.3 Prisma 7.3.0 multi-file schema set up
  - [x] 1.4 Better Auth configured (email/password + RBAC)
  - [x] 1.5 Core DB schema migrated (16 tables in PostgreSQL)
  - [x] 1.6 Time-tracking schema migrated
  - [x] 1.7 Dashboard layout shell built
  - [x] 1.8 Module registry + dynamic sidebar
  - [x] 1.9 Shared helpers (api-response, audit, permissions, db, storage)
  - [x] 1.10 Docker Compose (PostgreSQL 17 + Redis 7)
  - [x] 1.11 CHANGELOG.md + CONTEXT.md created
- [x] Phase 2: Time Tracking + Screenshot MVP ✅ COMPLETE
  - [x] 2.1 Time entries REST API (GET/POST/PATCH/DELETE)
  - [x] 2.2 Screenshots REST API (GET/POST/DELETE + R2 upload)
  - [x] 2.3 Activity REST API (GET/POST + batch support)
  - [x] 2.4 Timesheet page (daily/weekly toggle, DataTable, filters)
  - [x] 2.5 Screenshot gallery (grid view, lightbox, date/employee filters)
  - [x] 2.6 Team page (member cards, online/offline, role management)
  - [x] 2.7 Dashboard home (summary cards, weekly chart, recent activity)
  - [x] 2.8 Settings page (org config, tracking prefs, work schedule)
  - [x] 2.9 Reports page (grouped data, CSV/PDF export)
  - [x] 2.10 Socket.io real-time status (online/offline indicators)
  - [x] 2.11 CHANGELOG.md + CONTEXT.md updated
- [x] Phase 3: Desktop Agent ✅ COMPLETE
  - [x] 3.1 Electron 40 + Forge + React initialized in apps/desktop
  - [x] 3.2 System tray with start/stop timer
  - [x] 3.3 Timer UI with project selector
  - [x] 3.4 Screenshot capture via desktopCapturer
  - [x] 3.5 Random interval screenshot (5-10 min)
  - [x] 3.6 Compress to WebP via sharp
  - [x] 3.7 Activity tracking via uiohook-napi
  - [x] 3.8 API sync — upload time entries + screenshots
  - [x] 3.9 Offline queue via sql.js (replaced better-sqlite3 — V8 compat)
  - [x] 3.10 Auth flow — login screen in agent
  - [x] 3.11 Windows installer via Forge (verified working)
  - [x] 3.12 CHANGELOG.md + CONTEXT.md updated
- [x] Phase 4: Deploy
  - [x] 4.1 E2E Testing ✅ COMPLETE (41/41 tests run — 30 passed, 10 failed, 1 skipped)
    - [x] 4.1-fix1: PrismaPg adapter — pass config object not raw URL string
    - [x] 4.1-fix2: User schema — add emailVerified/image/camelCase for Better Auth
    - [x] 4.1-fix3: Root page.tsx — auth-aware redirect (was always → /login)
    - [x] 4.1-fix4: Login/Register — window.location.href instead of router.push
    - [x] 4.1-fix5: Desktop login — add Origin header for Better Auth CORS
    - [x] 4.1-fix6: Remote debugging port for desktop E2E testing via CDP
    - 18 bugs found (5 fixed during testing, 13 open) — see BUGS.md
  - [x] 4.2 Fix all critical/high bugs ✅ COMPLETE
    - [x] BUG-005: Registration creates Organization + Member via databaseHooks
    - [x] BUG-006: Dashboard home at /dashboard, sidebar link updated
    - [x] BUG-007: Screenshot upload — local filesystem fallback
    - [x] BUG-008: Registration form has Organization Name field
  - [x] 4.3 Fix medium/low bugs ✅ COMPLETE
    - [x] BUG-009: Sidebar responsive collapse with hamburger menu
    - [x] BUG-010: Topbar loading skeleton while session loads
    - [x] BUG-011: Prisma Decimal → Number() conversion
    - [x] BUG-012: Team page Add Member button + form
    - [x] BUG-013: Socket.io graceful connection handling
    - [x] BUG-014: SVG favicon added
    - [x] BUG-015: Full projects page with CRUD
    - [x] BUG-016: Time entry edit button + inline form
    - [x] BUG-017: API input length validation (.max())
  - [x] 4.4 Regression Testing ✅ PASSED (20/22 tests pass, 2 skipped)
  - [ ] 4.5 Production deploy ← NEXT

### Phase 3 Bug Fixes (Session 3b)
- [x] Fix: package.json `main` → `.vite/build/index.js` (not `main.js`)
- [x] Fix: sql.js externalized in Vite config (WASM can't be bundled)
- [x] Fix: Preload path → `path.join(__dirname, "preload.js")` (same dir as main)
- [x] Fix: `index.html` moved to project root (Forge Vite plugin convention)
- [x] Fix: FusesPlugin asar flags disabled for dev mode

### Phase 4.1 Bug Fixes (Session 4 — E2E Testing)
- [x] Fix: PrismaPg adapter crash — `new PrismaPg({ connectionString: url })` not `new PrismaPg(url)`
- [x] Fix: User model missing `emailVerified`, `image`; `created_at`/`updated_at` → `createdAt`/`updatedAt`
- [x] Fix: Root `app/page.tsx` hardcoded `redirect("/login")` → now checks auth first
- [x] Fix: Login/Register `router.push("/")` → `window.location.href = "/timesheets"` (cookie race)
- [x] Fix: Desktop login "Missing or null Origin" — added `Origin: config.serverUrl` to all fetch calls
- [x] Fix: Added `remote-debugging-port=9222` for desktop E2E testing via Playwright CDP

## Known Issues / Blockers
- 28 total bugs found, **27 fixed**, 1 known cosmetic (see BUGS.md)
- BUG-025: Zod rejected null project_id from desktop agent — **FIXED** in Session 8
- BUG-026: Desktop Sign Out button hidden behind titleBarOverlay — **FIXED** in Session 9
- BUG-027: Screenshot interval ignored web settings (hardcoded) — **FIXED** in Session 9 (desktop fetches from `/api/v1/settings`)
- BUG-028: Team page showed 0 Online despite agent running — **FIXED** in Session 9 (REST heartbeat replaces Socket.io)
- BUG-024: Timesheet edit form shows UTC times instead of local — **KNOWN** (cosmetic, low priority)
- Socket.io server not yet integrated into Next.js dev server — mitigated by REST heartbeat polling
- Rate limiting not yet implemented on API endpoints
- **Full screenshot pipeline verified:** timer start → screenshot capture → sync → web dashboard (10+ screenshots)
- E2E Testing Round 1: **PASSED** (20/22 tests, 2 skipped)
- E2E Testing Round 2: **25/27 passed**, 2 skipped (PDF export, screenshot interval wait)
- All edge cases passed: empty forms, XSS, SQL injection, large upload, duplicate registration
- Desktop agent E2E: login, start/stop timer, project switch, screenshot pipeline all working
- See `LOCAL-SETUP-GUIDE.md` for running both apps locally

## Default Login
- Register a new account via the web app at http://localhost:3000
- Organization + Member records are automatically created on registration
- Use those same credentials in the desktop agent (click "Server Settings" to set URL to http://localhost:3000)

## Environment
- Node: 22.21.1
- pnpm: 9.15.0
- Package Manager: pnpm
- OS: Windows (primary), Mac (secondary)
- DB: PostgreSQL 17 via Docker (localhost:5432, db: agency_os, user: postgres)
