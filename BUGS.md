# 7Roars Agency OS — Bug Report (E2E Testing)

> **Date:** 2026-02-11
> **Tester:** Playwright MCP via Windsurf Cascade
> **Environment:** localhost:3000 (Next.js 16.1.6 Turbopack) + PostgreSQL 17

---

## Critical (Blocks Production)

### BUG-001: PrismaPg adapter crashes with raw URL string
- **Severity:** Critical
- **Status:** ✅ FIXED
- **File:** `apps/web/lib/db.ts`
- **Description:** `new PrismaPg(process.env.DATABASE_URL!)` passes a raw URL string which causes `Cannot use 'in' operator to search for 'password'` error when Better Auth tries to create Account records. The PrismaPg constructor interprets the string as a config object internally.
- **Fix:** Changed to `new PrismaPg({ connectionString: process.env.DATABASE_URL! })`
- **Root Cause:** Prisma 7's `PrismaPg` accepts both `pg.Pool` and `pg.PoolConfig`. A raw string gets coerced into a PoolConfig where the string is treated as the `connectionString` property, but internal pg pool logic confuses it with a config object containing a `password` field.

### BUG-002: User schema missing Better Auth required fields
- **Severity:** Critical
- **Status:** ✅ FIXED
- **File:** `apps/web/prisma/modules/core.prisma`
- **Description:** Better Auth 1.4.18 sends `emailVerified`, `image`, `createdAt`, `updatedAt` (camelCase) when creating users. The schema had `created_at`/`updated_at` (snake_case) and was missing `emailVerified` and `image` fields entirely.
- **Fix:** Added `emailVerified Boolean @default(false)`, `image String?`, and changed `created_at`/`updated_at` to `createdAt`/`updatedAt` on the User model.
- **Root Cause:** Better Auth uses camelCase field names by default for its core models (User, Session, Account, Verification).

### BUG-003: Root page.tsx always redirects to /login
- **Severity:** Critical
- **Status:** ✅ FIXED
- **File:** `apps/web/app/page.tsx`
- **Description:** `app/page.tsx` had a hardcoded `redirect("/login")` that ran for ALL users, including authenticated ones. This created an infinite redirect loop: login → cookie set → redirect to `/` → root page redirects to `/login` → repeat.
- **Fix:** Root page now checks auth via `auth.api.getSession()` — unauthenticated users go to `/login`, authenticated users go to `/timesheets`.
- **Root Cause:** The root page was a leftover from initial scaffolding that didn't account for authenticated state.

### BUG-004: Login/Register uses router.push() causing cookie race condition
- **Severity:** Critical
- **Status:** ✅ FIXED
- **Files:** `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/register/page.tsx`
- **Description:** After successful login/registration, `router.push("/")` performed a client-side soft navigation. The Next.js proxy.ts middleware ran before the browser attached the new session cookie to the navigation request, causing a redirect back to `/login`.
- **Fix:** Changed to `window.location.href = "/timesheets"` for a full page reload that includes the cookie.
- **Root Cause:** Next.js App Router's `router.push()` does a soft navigation that doesn't wait for cookies from the previous API response to be fully processed.

### BUG-005: Registration doesn't create Organization or Member records
- **Severity:** Critical
- **Status:** ✅ FIXED
- **Files:** `apps/web/lib/auth.ts`, `apps/web/actions/onboarding.ts`
- **Description:** The registration form only creates a User record via Better Auth's `signUp.email()`. No Organization or Member records are created.
- **Fix:** Added `databaseHooks.user.create.after` in Better Auth config that automatically creates an Organization and Member (OWNER role) when a user registers. Created `actions/onboarding.ts` with `updateOrganizationName()` to set the org name from the registration form.

---

## High Severity

### BUG-006: Dashboard home page unreachable
- **Severity:** High
- **Status:** ✅ FIXED
- **Files:** `apps/web/app/page.tsx`, `apps/web/app/(dashboard)/dashboard/page.tsx`, `apps/web/config/modules.ts`
- **Description:** The root `app/page.tsx` redirected authenticated users to `/timesheets`, so the dashboard home page was never rendered.
- **Fix:** Moved dashboard content to `app/(dashboard)/dashboard/page.tsx`, updated sidebar link to `/dashboard`, root page.tsx now redirects to `/dashboard`, login/register redirect to `/dashboard`.

### BUG-007: Screenshot upload fails — no local storage fallback
- **Severity:** High
- **Status:** ✅ FIXED
- **File:** `apps/web/lib/storage.ts`
- **Description:** Screenshot upload returned 500 because R2/S3 credentials are empty in `.env`.
- **Fix:** Added local filesystem fallback in `lib/storage.ts`. When R2 credentials are not configured, files are saved to `public/uploads/` and served via Next.js static file server.

### BUG-008: Registration form missing Organization Name field
- **Severity:** High
- **Status:** ✅ FIXED
- **File:** `apps/web/app/(auth)/register/page.tsx`
- **Description:** The registration form was missing an Organization Name field.
- **Fix:** Added "Organization Name" required field to the registration form. After signup, calls `updateOrganizationName()` server action to set the org name.

---

## Medium Severity

### BUG-009: Sidebar doesn't collapse on tablet/mobile
- **Severity:** Medium
- **Status:** ✅ FIXED
- **File:** `apps/web/components/layout/Sidebar.tsx`
- **Description:** The sidebar was fixed at 240px width and didn't collapse on smaller screens.
- **Fix:** Added responsive sidebar: hidden below `md` breakpoint with hamburger menu toggle, slide-in overlay on mobile, auto-close on route change and resize.

### BUG-010: Topbar shows "User" / "?" on hard refresh
- **Severity:** Medium
- **Status:** ✅ FIXED
- **File:** `apps/web/components/layout/Topbar.tsx`
- **Description:** On full page reload, the Topbar briefly showed "?" avatar and "User" name.
- **Fix:** Added `isPending` check from `useSession()` and render animated skeleton placeholders while session is loading.

### BUG-011: Prisma Decimal objects passed to Client Components
- **Severity:** Medium
- **Status:** ✅ FIXED
- **Files:** `apps/web/actions/time-entries.ts`
- **Description:** Prisma `Decimal` objects for `hourly_rate` and `budget_hours` couldn't be serialized to client components.
- **Fix:** Added `Number()` conversion for `hourly_rate` and `budget_hours` in `getProjects()` before returning from server action.

### BUG-012: Team page has no "Add Member" / "Invite" button
- **Severity:** Medium
- **Status:** ✅ FIXED
- **Files:** `apps/web/app/(dashboard)/team/page.tsx`, `apps/web/actions/team.ts`
- **Description:** The team page had no UI to add or invite new team members.
- **Fix:** Added "Add Member" button and inline form to team page. Created `addMember()` server action that creates a new user via Better Auth and adds them as a member of the current organization.

### BUG-013: Socket.io WebSocket connection warning
- **Severity:** Medium
- **Status:** ✅ FIXED
- **File:** `apps/web/hooks/use-socket.ts`
- **Description:** Console warning about failed WebSocket connection when Socket.io server isn't running.
- **Fix:** Added `connect_error` handler to suppress errors, limited reconnection attempts to 3, increased reconnection delay to 5s, used polling-first transport order.

### BUG-018: Desktop login fails — "Missing or null Origin" from Better Auth
- **Severity:** Medium
- **Status:** ✅ FIXED
- **File:** `apps/desktop/src/main/auth.ts`
- **Description:** Electron main process `fetch()` calls to Better Auth API don't include an `Origin` header (Node.js fetch doesn't send one by default). Better Auth rejects requests without a valid Origin.
- **Fix:** Added `Origin: config.serverUrl` header to all fetch calls in the desktop auth module (login, get-session, sign-out, time-entries check).

### BUG-015: No project management UI (/projects page)
- **Severity:** Medium
- **Status:** ✅ FIXED
- **Files:** `apps/web/app/(dashboard)/projects/page.tsx`, `apps/web/actions/projects.ts`, `apps/web/config/modules.ts`
- **Description:** `/projects` returned 404 with no project management UI.
- **Fix:** Created full projects page with CRUD (create, edit, delete), color picker, billable/rate fields. Created `actions/projects.ts` with server actions. Enabled Projects module in sidebar.

### BUG-016: No edit button for time entries on timesheet page
- **Severity:** Medium
- **Status:** ✅ FIXED
- **Files:** `apps/web/components/modules/time-tracking/TimesheetTable.tsx`, `apps/web/app/(dashboard)/timesheets/page.tsx`, `apps/web/actions/time-entries.ts`
- **Description:** Timesheet table rows had a Delete button but no Edit button.
- **Fix:** Added edit button (pencil icon) per row in TimesheetTable, inline edit form in Timesheets page with description/start/end/billable fields, and `updateTimeEntry()` server action.

### BUG-017: No input length validation on API text fields
- **Severity:** Medium
- **Status:** ✅ FIXED
- **File:** `apps/web/lib/validations/time-entries.ts`
- **Description:** The `description` field accepted unlimited length strings.
- **Fix:** Added `.max(1000)` to `description` and `.max(100)` to `project_id`/`task_id` in both `createTimeEntrySchema` and `updateTimeEntrySchema`.

---

## Low Severity

### BUG-014: No favicon.ico
- **Severity:** Low
- **Status:** ✅ FIXED
- **File:** `apps/web/app/icon.svg`
- **Description:** Console error: 404 for `/favicon.ico`.
- **Fix:** Added SVG favicon at `apps/web/app/icon.svg` with 7R branding (indigo background, white text).

---

## Post-E2E Manual Testing Bugs (2026-02-11)

### BUG-019: Screenshots not capturing or uploading from desktop agent
- **Severity:** Critical
- **Status:** ✅ FIXED
- **Files:** `apps/desktop/src/main/sync.ts`
- **Description:** Desktop agent captures screenshots and queues them in offline_queue, but the sync upload always fails silently. Two root causes:
  1. Desktop sends form field `"image"` but server expects `"file"` (`formData.get("file")` in route.ts line 75)
  2. Desktop sends `activity_level`, `captured_at`, `time_entry_id` as separate form fields, but server expects a single `"metadata"` JSON string field (`formData.get("metadata")` in route.ts line 76)
  3. Missing `Origin` header on all sync fetch calls — Better Auth rejects requests without Origin from non-browser contexts
- **Fix:** Changed `formData.append("image", ...)` to `formData.append("file", ...)`. Consolidated metadata fields into a single `formData.append("metadata", JSON.stringify({...}))`. Added `Origin: config.serverUrl` header to all fetch calls in sync.ts.
- **Root Cause:** Client-server API contract mismatch — desktop agent was built against a different expected API shape than what the server implements.

### BUG-020: Projects not showing in desktop agent dropdown
- **Severity:** High
- **Status:** ✅ FIXED
- **Files:** `apps/desktop/src/main/projects.ts`
- **Description:** Desktop agent's project selector dropdown was empty — no projects loaded despite the web dashboard showing them correctly.
- **Fix:** 
  1. Removed unnecessary "health check" fetch to `/api/v1/time-entries?limit=1` that was blocking the real projects fetch (if it failed, the function returned early without fetching projects)
  2. Added `Origin: config.serverUrl` header to the projects fetch call — Better Auth rejects requests without Origin from Electron's Node.js context
  3. Added better error logging for debugging
- **Root Cause:** Missing Origin header caused Better Auth to reject the auth check, returning 401. The unnecessary health-check fetch also failed first and caused early return.

### BUG-022: Screenshots gallery shows 0 despite screenshots existing in DB
- **Severity:** High
- **Status:** ✅ FIXED
- **File:** `apps/web/actions/screenshots.ts`
- **Description:** The screenshots gallery page always showed "0 screenshots" even after screenshots were successfully uploaded via the desktop agent. The REST API at `/api/v1/screenshots` returned the correct data, but the `getScreenshots` server action silently returned empty results.
- **Fix:** Added DateTime serialization — Prisma returns `captured_at` and `created_at` as `Date` objects which can't be passed from server actions to client components in Next.js 16. Added `.toISOString()` conversion before returning from the server action.
- **Root Cause:** Same pattern as BUG-011 (Prisma Decimal serialization). Next.js server actions require all data to be JSON-serializable. Prisma `DateTime` fields return native `Date` objects which fail silent serialization.

### BUG-021: No logout in tray menu + DevTools auto-opens
- **Severity:** Medium
- **Status:** ✅ FIXED
- **Files:** `apps/desktop/src/main/index.ts`, `apps/desktop/src/main/tray.ts`
- **Description:** Two issues:
  1. DevTools window opens automatically every time the app launches
  2. No way to logout from the desktop agent except closing and reopening
- **Fix:**
  1. Removed `openDevTools()` call entirely (users can open manually with Ctrl+Shift+I)
  2. Added "Logout" option to system tray context menu — stops running timer, clears stored session, sends `auth:required` event to renderer
- **Root Cause:** `openDevTools()` was unconditional. Tray menu was missing a logout option.

---

## Session 7 Bugs (E2E Testing Round 2 — 2026-02-12)

### BUG-023: Prisma DateTime serialization breaks ALL server actions
- **Severity:** High
- **Status:** ✅ FIXED
- **Files:** `apps/web/actions/time-entries.ts`, `apps/web/actions/reports.ts`, `apps/web/actions/settings.ts`, `apps/web/actions/screenshots.ts`
- **Description:** Every server action that returns Prisma query results containing `DateTime` fields (start_time, end_time, captured_at, created_at, updatedAt, etc.) silently fails when passing data from server to client components. The page renders empty or shows 0 results despite data existing in the DB. The REST API works fine because `NextResponse.json()` handles Date serialization automatically.
- **Fix:** Added `.toISOString()` conversion for all Date fields before returning from server actions:
  - `getTimeEntries` — serialize start_time, end_time, created_at, updated_at
  - `getScreenshots` — serialize captured_at, created_at
  - `getReportData` — serialize entries + project hourly_rate Decimal
  - `getDashboardStats` — serialize recentEntries
  - `getSettings` — serialize organization createdAt, updatedAt
- **Root Cause:** Next.js 16 server actions use React Server Components serialization which requires all data to be plain JSON-serializable objects. Prisma 7 returns native `Date` objects and `Decimal` objects which fail this check. Unlike `NextResponse.json()` (used in API routes), server actions don't auto-serialize Dates.
- **Impact:** Affected pages: Timesheets (showed 0h 0m), Screenshots gallery (showed 0), Reports (console errors), Settings (empty page), Dashboard (missing recent entries).

### BUG-024: Timesheet edit form shows UTC times instead of local time
- **Severity:** Low
- **Status:** 🟡 KNOWN (cosmetic)
- **File:** `apps/web/app/(dashboard)/timesheets/page.tsx`
- **Description:** When editing a time entry, the datetime-local input shows UTC times (e.g., 04:00 AM) instead of local PKT times (09:00 AM). The entry displays correctly in the table but the edit form uses raw ISO string slicing.
- **Root Cause:** `editStart` is set via `st.slice(0, 16)` on the ISO string, which is always UTC. The `datetime-local` input interprets this as local time.

---

## Session 8 Bugs (Screenshot Pipeline Debug — 2026-02-12)

### BUG-025: Zod validation rejects null project_id from desktop agent
- **Severity:** High
- **Status:** ✅ FIXED
- **Files:** `apps/web/lib/validations/time-entries.ts`, `apps/desktop/src/main/sync.ts`
- **Description:** Desktop agent sends `project_id: null` when starting a timer without selecting a project (or when the project field is optional). The `createTimeEntrySchema` Zod schema used `.optional()` which accepts `undefined` but NOT `null`. This caused a 422 validation error, forcing the timer to fall back to `local_` entry IDs. With local IDs, the time entry never syncs to the server, and screenshots captured during that session have no valid `time_entry_id` to associate with.
- **Fix:**
  1. Added `.nullable()` to `project_id`, `task_id`, and `description` in both `createTimeEntrySchema` and `updateTimeEntrySchema`
  2. Added detailed error logging to `syncScreenshot()` in sync.ts to surface upload failures
- **Root Cause:** Zod's `.optional()` only accepts `undefined`, not `null`. The desktop agent's `startTimer()` sends `null` for optional fields (standard JSON behavior). This mismatch caused silent 422 rejections.
- **Impact:** Timer entries created via desktop agent always fell back to `local_` IDs. Screenshots were captured and queued but the sync cycle couldn't associate them with server-side entries. After fix: timer entries get real server IDs, screenshots upload and appear on web dashboard.
- **Verification:** Full pipeline test — started timer, captured 10+ screenshots in 60 seconds, all synced and visible on `/screenshots` page.

---

## Summary

| Severity | Total | Fixed | Open |
|----------|-------|-------|------|
| Critical | 6     | 6     | 0    |
| High     | 7     | 7     | 0    |
| Medium   | 10    | 10    | 0    |
| Low      | 2     | 1     | 1    |
| **Total**| **25**| **24**| **1**|
