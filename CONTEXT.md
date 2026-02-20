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
  - [x] 4.5 Production deploy config ✅ COMPLETE (Hostinger VPS)
    - [x] 4.5.1 Docker Compose production stack (web + db + caddy + redis)
    - [x] 4.5.2 Caddy reverse proxy with auto-HTTPS (Let's Encrypt)
    - [x] 4.5.3 GitHub Actions CI/CD (typecheck + SSH deploy to VPS)
    - [x] 4.5.4 GitHub Actions desktop .exe build on tagged releases
    - [x] 4.5.5 Deploy scripts (setup-vps.sh, deploy.sh)
    - [x] 4.5.6 .env.production.example + DEPLOYMENT-GUIDE.md
    - [x] 4.5.7 Desktop build scripts + app icon
    - [x] 4.5.8 VPS setup ✅ COMPLETE — deployed at https://os.7roars.com
    - [x] 4.5.9 DNS A record ✅ COMPLETE — os.7roars.com → 187.77.27.176
    - [x] 4.5.10 Production auth fixes (NEXT_PUBLIC_APP_URL build-time, secure cookies, proxy headers)
    - [x] 4.5.11 Desktop agent production config (server URL, secure cookie names)
- [x] Phase 5: Worktivity-Style Desktop Agent Upgrade ✅ COMPLETE
  - [x] 5.A1 Fix activity tracking lifecycle (start/stop with timer)
  - [x] 5.A2 Throttle mouse move events (500ms debounce, separate click/move counts)
  - [x] 5.A3 Time-bucketed activity % (1-second slot tracking via Set)
  - [x] 5.A4 Idle detection + auto-pause (configurable thresholds, idle dialog UI)
  - [x] 5.A5 System lock/sleep detection (powerMonitor auto-stop)
  - [x] 5.B1-B2 AppUsageLog + AppClassification Prisma models
  - [x] 5.B3 Desktop app-tracker.ts (active window polling via PowerShell)
  - [x] 5.B4-B5 App usage REST API + sync
  - [x] 5.B6 Web App Usage page (/app-usage) with classification UI
  - [x] 5.C1 Screenshot blur (sharp.blur(15) when screenshotMode=blurred)
  - [x] 5.C2 Screenshot disable (screenshotMode=disabled)
  - [x] 5.C3 Multi-monitor screenshots (cursor display detection)
  - [x] 5.C4 Thumbnail generation (320px WebP, separate upload)
  - [x] 5.C5 Recent screenshots helper for review panel
  - [x] 5.D1 Connection status indicator (sync dot + queue badge)
  - [x] 5.D2 Token refresh (30-min session validation loop)
  - [x] 5.D3 Tray live tooltip (HH:MM:SS + project name)
  - [x] 5.D4 Queue cleanup (hourly: 7-day screenshots, 500-item cap)
  - [x] 5.D5 Auto-start on boot (backgroundMode config)
  - [x] 5.D6 Daily summary notification (native Notification at workdayEnd)
  - [x] 5.E1 Productivity analysis page (/productivity)
  - [x] 5.E3-E4 App classifications API (GET/PUT /api/v1/app-classifications)
  - [ ] 5.E2 Dashboard enhancements (productivity widget) ← OPTIONAL NEXT
  - [x] 5.E2E Phase 5 E2E Testing ✅ COMPLETE (37/52 passed, 0 failed, 14 skipped)
- [x] Phase 6: UI Branding + Sidebar Overhaul ✅ COMPLETE
  - [x] 6.1 Branded color palette (purple #5B4FE9, orange #F5A623, navy #1E1B4B from 7Roars logo)
  - [x] 6.2 Module registry with group field + 14 new modules across 7 groups
  - [x] 6.3 Grouped navigation system (NavGroup, getGroupedNavItems)
  - [x] 6.4 Light-mode sidebar with collapsible sections, SVG logo, 23 icons
  - [x] 6.5 Topbar redesign (light theme, search placeholder, gradient avatar)
  - [x] 6.6 ComingSoon shared component (gradient icon, orange badge)
  - [x] 6.7 14 Coming Soon placeholder pages
  - [x] 6.8 Auth pages rebranded (logo, gradient background, modern cards)
- [x] Phase 7: Overview Dashboard Redesign ✅ COMPLETE
  - [x] 7.1 New server action: getOverviewData() with 6 parallel queries + heartbeat
  - [x] 7.2 DonutChart.tsx SVG component (pure SVG, no charting library)
  - [x] 7.3 StatusCards.tsx (6 colored employee status cards)
  - [x] 7.4 ClockInOutTable.tsx (team clock-in/out + activity bars)
  - [x] 7.5 RecentApps.tsx (top 8 apps with category colors)
  - [x] 7.6 AppCategoryChart.tsx (donut + table by AI classification)
  - [x] 7.7 WebsiteCategoryChart.tsx (donut + table by domain)
  - [x] 7.8 RecentScreenshots.tsx (horizontal scrollable gallery)
  - [x] 7.9 AlertConditions.tsx (3 expandable alert rows)
  - [x] 7.10 Dashboard page.tsx rewrite (Worktivity-style overview)
- [x] Phase 8: Team Page Redesign ✅ COMPLETE
  - [x] 8.1 Enhanced getTeamMembers() with status derivation + new getTeamMemberDetail() action
  - [x] 8.2 TeamStatusFilter.tsx (6 colored filter pills with counts)
  - [x] 8.3 TeamCard.tsx (Worktivity-style member card with status border + activity %)
  - [x] 8.4 TeamMemberDrawer.tsx (slide-in panel: Stats/Activities/Screenshots tabs, date range picker, productivity donuts)
  - [x] 8.5 Team page.tsx rewrite (filter tabs + card grid + drawer integration)
- [x] Phase 9: Customers, Projects Redesign, Tasks Pages ✅ COMPLETE
- [x] Phase 10: Tracking Pages Full Implementation ✅ COMPLETE
  - [x] 10.1 ManualEntryStatus enum + manual_status field on TimeEntry (db push)
  - [x] 10.2 actions/manual-entries.ts (getManualEntries, create, update, approve, reject, delete)
  - [x] 10.3 actions/my-activities.ts (getMyActivitySummary, getMyProjects)
  - [x] 10.4 getTimesheetSummary() added to actions/time-entries.ts
  - [x] 10.5 getTimelapseSessions() added to actions/screenshots.ts
  - [x] 10.6 ActivityBar.tsx + ActivitySummaryCards.tsx components
  - [x] 10.7 TimelapseGrid.tsx + TimelapsePlayer.tsx components
  - [x] 10.8 ManualEntriesTable.tsx + ManualEntryModal.tsx components
  - [x] 10.9 Timesheet page redesign (grouped by employee, expandable rows, export CSV)
  - [x] 10.10 My Activities page (activity bar, stat cards, donut charts, activity history)
  - [x] 10.11 Timelapse Videos page (screenshot-based grid + cycling player modal)
  - [x] 10.12 Manual Time Entries page (CRUD table, approve/reject, add/edit modal)
- [x] Phase 11: Review Apps Redesign ✅ COMPLETE
  - [x] 11.1 getReviewAppsData() action — per-entry rows grouped by app+URL, tab/search/pagination support
  - [x] 11.2 /app-usage page full redesign — Worktivity-style with tabs, table, 3-button classify workflow

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
- 26 total bugs found, **25 fixed**, 1 known cosmetic (see BUGS.md)
- **Only open bug:** BUG-024 — Timesheet edit form shows UTC times instead of local (cosmetic, low priority)

### Recently Fixed (Session 6c — 2026-02-17)
- BUG-029: Screenshots showed 0% activity — **FIXED + DEPLOYED** (desktop rebuild + server redeployed)
  - Desktop: `lastCompletedActivityLevel` + `powerMonitor.getSystemIdleTime()` fallback
  - Server: `is_blurred` added to Zod schema + thumbnail from FormData
  - Verified working: activity logs show 53-60% during active use
- BUG-025: Timer UI showed "Start" while timer running — **FIXED**
- BUG-026: Screenshots broken on web dashboard — **FIXED**

### Remaining Technical Debt
- Socket.io server not yet integrated into Next.js dev server — mitigated by REST heartbeat polling
- Rate limiting not yet implemented on API endpoints
- Pre-existing lint: `WebkitAppRegion` in Timer.tsx — cosmetic, works at runtime
- App tracker uses PowerShell on Windows — macOS support via AppleScript (untested)
- Sharp fails to load in packaged Electron app — falls back to PNG (larger file size, screenshots still work)

### Verified Working
- **Full screenshot pipeline:** timer start → screenshot capture → activity % attached → sync → web dashboard
- **Activity tracking:** uiohook-napi primary + powerMonitor fallback, 53-60% during active use
- **Production deployment:** `https://os.7roars.com` — Docker Compose (web + db + caddy + redis)
- **Dashboard UI:** Light-mode branded theme (7Roars purple/orange), grouped sidebar with 7 sections, 25+ nav items, collapsible groups
- **Overview page:** Worktivity-style dashboard with 6 status cards, clock-in/out table, recent apps, app/website category charts (SVG donut), screenshot gallery, alert conditions — all backed by real database queries
- **Team page:** Worktivity-style team view with status filter tabs (All/Working/On break/Idle/Stopped work/Yet to start), redesigned member cards with status-colored borders and activity %, slide-in member detail drawer with Stats/Activities/Screenshots tabs, date range picker, productivity donut charts — fully integrated with database
- **Customers page:** Worktivity-style customer management with table (Company/Name/Website), search, add/edit modal (all fields), row actions (create invoice, edit, delete) — backed by Client model with CRUD actions
- **Projects page:** Worktivity-style project management with expandable rows (time spent, budget, cost, billable), customer dropdown, employee assignment via ProjectMember, color picker — backed by enhanced getProjects() with time/cost aggregations
- **Tasks page:** Worktivity-style task management with filter bar (7 filters + assigned-to-me), paginated table, quick create modal, slide-in detail drawer (form, assignees, description, attachments with upload, comments) — backed by getTasks() with pagination + full CRUD
- **Auth pages:** Branded login/register with 7Roars logo and gradient background
- E2E Testing: 25/27 passed, 2 skipped (PDF export, screenshot interval wait)
- All edge cases passed: empty forms, XSS, SQL injection, large upload, duplicate registration
- Desktop agent E2E: login, start/stop timer, project switch, screenshot pipeline all working
- See `LOCAL-SETUP-GUIDE.md` for running both apps locally

## New Files Added in Phase 5
### Desktop Agent
- `apps/desktop/src/main/app-tracker.ts` — Active window tracking (PowerShell)
- `apps/desktop/src/main/notifications.ts` — Daily summary notification

### Web Application
- `apps/web/app/api/v1/app-usage/route.ts` — App usage REST API
- `apps/web/app/api/v1/app-classifications/route.ts` — App classification REST API
- `apps/web/app/(dashboard)/app-usage/page.tsx` — App Usage dashboard page
- `apps/web/app/(dashboard)/productivity/page.tsx` — Productivity analysis page
- `apps/web/actions/app-usage.ts` — App usage server actions
- `apps/web/actions/productivity.ts` — Productivity server actions
- `apps/web/lib/validations/app-usage.ts` — Zod schemas for app usage

## New Files Added in Phase 6
### Web Application (UI Branding + Sidebar Overhaul)
- `apps/web/components/shared/ComingSoon.tsx` — Shared Coming Soon placeholder component
- `apps/web/app/(dashboard)/my-activities/page.tsx` — My Activities (Coming Soon)
- `apps/web/app/(dashboard)/timelapse/page.tsx` — Timelapse Videos (Coming Soon)
- `apps/web/app/(dashboard)/manual-entries/page.tsx` — Manual Time Entries (Coming Soon)
- `apps/web/app/(dashboard)/tasks/page.tsx` — Tasks (Coming Soon)
- `apps/web/app/(dashboard)/clients/page.tsx` — Customers (Coming Soon)
- `apps/web/app/(dashboard)/leave-requests/page.tsx` — Leave Requests (Coming Soon)
- `apps/web/app/(dashboard)/leave-rights/page.tsx` — Leave Rights (Coming Soon)
- `apps/web/app/(dashboard)/work-times/page.tsx` — Work Times (Coming Soon)
- `apps/web/app/(dashboard)/task-insights/page.tsx` — Task Insights (Coming Soon)
- `apps/web/app/(dashboard)/apps-summary/page.tsx` — Apps Summary (Coming Soon)
- `apps/web/app/(dashboard)/advanced-insights/page.tsx` — Advanced Insights (Coming Soon)
- `apps/web/app/(dashboard)/productivity-coach/page.tsx` — Productivity Coach (Coming Soon)
- `apps/web/app/(dashboard)/invoices/page.tsx` — Invoices (Coming Soon)
- `apps/web/app/(dashboard)/payroll/page.tsx` — Payroll Calculator (Coming Soon)

## New Files Added in Phase 7
### Web Application (Overview Dashboard Redesign)
- `apps/web/actions/overview.ts` — getOverviewData() server action with parallel queries
- `apps/web/components/modules/overview/DonutChart.tsx` — Pure SVG donut chart component
- `apps/web/components/modules/overview/StatusCards.tsx` — 6 colored employee status cards
- `apps/web/components/modules/overview/ClockInOutTable.tsx` — Team clock-in/out table
- `apps/web/components/modules/overview/RecentApps.tsx` — Top 8 recently used apps
- `apps/web/components/modules/overview/AppCategoryChart.tsx` — Apps by AI categorization (donut + table)
- `apps/web/components/modules/overview/WebsiteCategoryChart.tsx` — Websites by domain (donut + table)
- `apps/web/components/modules/overview/RecentScreenshots.tsx` — Horizontal screenshot gallery
- `apps/web/components/modules/overview/AlertConditions.tsx` — Expandable alert condition rows

## New Files Added in Phase 10
### Web Application (Tracking Pages Full Implementation)
- `apps/web/actions/manual-entries.ts` — Manual entry CRUD + approve/reject server actions
- `apps/web/actions/my-activities.ts` — Activity summary + projects server actions
- `apps/web/components/modules/activities/ActivityBar.tsx` — 24h timeline bar visualization
- `apps/web/components/modules/activities/ActivitySummaryCards.tsx` — Working/activity/break/idle stat cards
- `apps/web/components/modules/timelapse/TimelapseGrid.tsx` — 4-column screenshot session grid
- `apps/web/components/modules/timelapse/TimelapsePlayer.tsx` — Cycling screenshot player modal
- `apps/web/components/modules/manual-entries/ManualEntriesTable.tsx` — CRUD table with status badges
- `apps/web/components/modules/manual-entries/ManualEntryModal.tsx` — Add/edit form modal

### Files Modified in Phase 10
- `apps/web/prisma/modules/time-tracking.prisma` — Added ManualEntryStatus enum + manual_status field
- `apps/web/actions/time-entries.ts` — Added getTimesheetSummary() action
- `apps/web/actions/screenshots.ts` — Added getTimelapseSessions() action
- `apps/web/app/(dashboard)/timesheets/page.tsx` — Full redesign: grouped-by-employee, expandable rows, export
- `apps/web/app/(dashboard)/my-activities/page.tsx` — Full implementation from Coming Soon
- `apps/web/app/(dashboard)/timelapse/page.tsx` — Full implementation from Coming Soon
- `apps/web/app/(dashboard)/manual-entries/page.tsx` — Full implementation from Coming Soon

## New Files Added in Phase 9
### Web Application (Customers, Projects Redesign, Tasks)
- `apps/web/actions/clients.ts` — Client CRUD server actions with search
- `apps/web/actions/tasks.ts` — Task CRUD + comments, assignees, attachments server actions
- `apps/web/app/api/v1/task-attachments/route.ts` — File upload API for task attachments
- `apps/web/components/modules/tasks/TaskDetailDrawer.tsx` — Slide-in task detail panel

### Schema Files Modified in Phase 9 (additive only)
- `apps/web/prisma/modules/clients.prisma` — Added surname, website, tax_office, tax_number
- `apps/web/prisma/modules/time-tracking.prisma` — Added ProjectMember model + Project.members relation
- `apps/web/prisma/modules/tasks.prisma` — Added TaskAssignee, TaskComment, TaskAttachment models
- `apps/web/prisma/modules/core.prisma` — Added reverse relations on User and Member

### Files Modified in Phase 9
- `apps/web/actions/projects.ts` — Enhanced with client/member/time queries, addProjectMember, removeProjectMember, getOrgMembers
- `apps/web/app/(dashboard)/clients/page.tsx` — Full rewrite from Coming Soon to Worktivity-style customer management
- `apps/web/app/(dashboard)/projects/page.tsx` — Full redesign with expandable rows, customer/member management
- `apps/web/app/(dashboard)/tasks/page.tsx` — Full rewrite from Coming Soon to Worktivity-style task management

## New Files Added in Phase 8
### Web Application (Team Page Redesign)
- `apps/web/components/modules/team/TeamStatusFilter.tsx` — Status filter pill buttons with counts
- `apps/web/components/modules/team/TeamCard.tsx` — Worktivity-style member card with status border
- `apps/web/components/modules/team/TeamMemberDrawer.tsx` — Slide-in detail panel (Stats/Activities/Screenshots)

### Files Modified in Phase 8
- `apps/web/actions/team.ts` — Enhanced getTeamMembers() + new getTeamMemberDetail() action
- `apps/web/app/(dashboard)/team/page.tsx` — Complete rewrite with filter tabs, card grid, drawer

### Files Modified in Phase 7
- `apps/web/app/(dashboard)/dashboard/page.tsx` — Complete rewrite with Worktivity-style overview layout

### Files Modified in Phase 6
- `apps/web/app/globals.css` — Branded color palette, removed dark mode
- `apps/web/config/modules.ts` — Group field + 14 new modules
- `apps/web/config/navigation.ts` — Grouped navigation system
- `apps/web/components/layout/Sidebar.tsx` — Light-mode grouped sidebar rewrite
- `apps/web/components/layout/Topbar.tsx` — Light theme redesign
- `apps/web/app/(auth)/layout.tsx` — Logo + gradient branding
- `apps/web/app/(auth)/login/page.tsx` — Branded login page
- `apps/web/app/(auth)/register/page.tsx` — Branded register page

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
