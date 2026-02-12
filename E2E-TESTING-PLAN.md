# 7Roars Agency OS — E2E Testing Plan (Pre-Production)

> **Phase:** 4.1 — End-to-End Testing on Localhost
> **Tool:** Playwright MCP Server (installed in Windsurf)
> **Coverage:** Web Dashboard + REST API + Desktop Agent
> **Date:** Feb 2026

---

## OVERVIEW

This document is a complete E2E test plan for Cascade to execute using the Playwright MCP server. It tests every feature built in Phases 1-3 in the exact order a real user would experience them — from first signup to daily usage.

**Test Account:**
- Email: `umairshafiq.cs@gmail.com`
- Password: `Testing12`
- Name: `Umair Shafiq`
- Organization: `7Roars Digital Agency`

**Prerequisites before testing:**
- Web app running on `http://localhost:3000`
- PostgreSQL running via Docker (`docker compose up -d`)
- Database migrated (`npx prisma db push`)
- Desktop agent built and runnable (`cd apps/desktop && npm start`)
- Fresh database (no existing data) — run `npx prisma db push --force-reset` if needed

---

## TEST SUITE 1: AUTH & ONBOARDING

### T1.1 — Registration (First User = OWNER)

```
STEPS:
1. Navigate to http://localhost:3000
2. Verify it redirects to /login (or /register)
3. Click "Create account" / "Register" link
4. Fill in:
   - Name: Umair Shafiq
   - Email: umairshafiq.cs@gmail.com
   - Password: Testing12
   - Organization Name: 7Roars Digital Agency
5. Submit the form
6. Verify redirect to dashboard (/)

EXPECTED:
- Account created successfully
- Organization "7Roars Digital Agency" created
- User role is OWNER (first user)
- Dashboard loads with sidebar navigation
- User name "Umair Shafiq" visible in topbar/avatar

VERIFY IN DB:
- User record exists with email umairshafiq.cs@gmail.com
- Organization record exists with name "7Roars Digital Agency"
- Member record exists linking user to org with role OWNER
```

### T1.2 — Logout

```
STEPS:
1. From dashboard, find logout button (topbar avatar dropdown or sidebar)
2. Click logout
3. Verify redirect to /login

EXPECTED:
- Session destroyed
- Redirected to login page
- Trying to access /timesheets directly returns to /login
```

### T1.3 — Login

```
STEPS:
1. Navigate to http://localhost:3000/login
2. Fill in:
   - Email: umairshafiq.cs@gmail.com
   - Password: Testing12
3. Submit the form

EXPECTED:
- Login successful
- Redirect to dashboard
- Session persists (refresh page, still logged in)
```

### T1.4 — Login with Wrong Password

```
STEPS:
1. Navigate to /login
2. Fill in email: umairshafiq.cs@gmail.com, password: WrongPass123
3. Submit

EXPECTED:
- Error message shown ("Invalid credentials" or similar)
- NOT redirected to dashboard
- No session created
```

### T1.5 — Auth Guard (Protected Routes)

```
STEPS:
1. Logout first
2. Try navigating directly to:
   - http://localhost:3000/ (dashboard)
   - http://localhost:3000/timesheets
   - http://localhost:3000/screenshots
   - http://localhost:3000/team
   - http://localhost:3000/settings
   - http://localhost:3000/reports

EXPECTED:
- ALL routes redirect to /login when not authenticated
- No flash of dashboard content before redirect
```

---

## TEST SUITE 2: DASHBOARD LAYOUT & NAVIGATION

### T2.1 — Sidebar Navigation

```
STEPS:
1. Login and land on dashboard
2. Verify sidebar contains these enabled modules:
   - Dashboard
   - Timesheets
   - Screenshots
   - Team
   - Reports
   - Settings
3. Verify these are NOT visible (disabled in modules.ts):
   - Projects
   - Tasks
   - Clients
   - Invoices
4. Click each sidebar link and verify the correct page loads

EXPECTED:
- Sidebar renders with correct icons and labels
- Active page is highlighted in sidebar
- Each click navigates to the correct route
- Page content loads without errors
```

### T2.2 — Dashboard Home Page

```
STEPS:
1. Navigate to / (dashboard home)
2. Check for summary cards:
   - Total hours today
   - Active employees (online now)
   - Screenshots captured today
   - Activity level average
3. Check for any charts (daily/weekly hours chart)

EXPECTED:
- Page loads without errors
- Summary cards show 0 or empty state (fresh database)
- No JavaScript console errors
```

### T2.3 — Responsive Layout

```
STEPS:
1. Resize browser to tablet width (768px)
2. Check sidebar behavior (should collapse or become hamburger menu)
3. Resize to mobile width (375px)
4. Check all pages are usable

EXPECTED:
- Sidebar collapses on smaller screens
- Content is not cut off or overflowing
- All buttons/forms remain accessible
```

---

## TEST SUITE 3: TEAM MANAGEMENT

### T3.1 — Team Page (Empty State)

```
STEPS:
1. Navigate to /team
2. Verify it shows the current user (Umair Shafiq) as OWNER

EXPECTED:
- Team member list shows at least 1 member (the owner)
- Role badge shows "OWNER"
- Online/offline indicator present
```

### T3.2 — Invite Team Member

```
STEPS:
1. On /team page, click "Add Member" or "Invite" button
2. Fill in:
   - Email: testemployee@7roars.com
   - Name: Test Employee
   - Role: EMPLOYEE
3. Submit

EXPECTED:
- New member appears in the team list
- Role shows "EMPLOYEE"
- (If email invite is implemented, verify invite sent)
- If direct creation, verify account created
```

### T3.3 — Edit Team Member Role

```
STEPS:
1. On /team page, find "Test Employee"
2. Click edit / three-dot menu
3. Change role from EMPLOYEE to MANAGER
4. Save

EXPECTED:
- Role updates to MANAGER
- Change reflected immediately in the list
- Audit log entry created (verify in DB or audit page if exists)
```

### T3.4 — Deactivate Team Member

```
STEPS:
1. Find "Test Employee" in team list
2. Click deactivate/disable
3. Confirm the action

EXPECTED:
- Member marked as inactive
- Visual indicator changes (greyed out, "Inactive" badge)
- Deactivated user cannot login (test this separately)
```

### T3.5 — RBAC — Employee Cannot Access Team Page

```
STEPS:
1. Login as the EMPLOYEE user (if you created one with credentials)
2. Navigate to /team directly via URL

EXPECTED:
- Access denied / redirect away (EMPLOYEE role cannot access /team)
- Only OWNER and ADMIN can see /team per module registry
```

---

## TEST SUITE 4: PROJECT MANAGEMENT (Core — Part of Time Tracking)

### T4.1 — Create Project

```
STEPS:
1. Navigate to /settings or wherever project creation lives
   (or /projects if it's a separate page, or from timesheet UI)
2. Click "Create Project"
3. Fill in:
   - Name: Trade Supplies UK Website
   - Color: pick any
   - Billable: Yes
   - Hourly Rate: 50.00
4. Submit
5. Create a second project:
   - Name: School Of Scape Redesign
   - Color: pick different
   - Billable: Yes
   - Hourly Rate: 75.00

EXPECTED:
- Both projects appear in project list
- Projects are selectable in timesheet/timer dropdowns
```

### T4.2 — Edit Project

```
STEPS:
1. Find "Trade Supplies UK Website" project
2. Edit the hourly rate to 60.00
3. Save

EXPECTED:
- Rate updates to 60.00
- Change reflected in the list
```

---

## TEST SUITE 5: TIME TRACKING (Web Dashboard)

### T5.1 — Manual Time Entry

```
STEPS:
1. Navigate to /timesheets
2. Click "Add Time Entry" or "Manual Entry"
3. Fill in:
   - Project: Trade Supplies UK Website
   - Date: today
   - Start time: 09:00
   - End time: 12:30
   - Description: "Homepage redesign work"
   - Billable: Yes
4. Submit

EXPECTED:
- Time entry appears in the timesheet
- Duration shows 3h 30m (or 3.5 hours)
- Associated with correct project
```

### T5.2 — Multiple Time Entries

```
STEPS:
1. Add another time entry:
   - Project: School Of Scape Redesign
   - Date: today
   - Start: 13:00, End: 17:00
   - Description: "Product page CRO audit"
2. Add one more for yesterday:
   - Project: Trade Supplies UK Website
   - Date: yesterday
   - Start: 10:00, End: 16:00
   - Description: "Collection page development"

EXPECTED:
- All 3 entries visible in timesheet
- Today shows 2 entries totaling 7.5 hours
- Yesterday shows 1 entry totaling 6 hours
```

### T5.3 — Timesheet View Toggling

```
STEPS:
1. On /timesheets, switch between:
   - Daily view → shows entries for selected day
   - Weekly view → shows summary for the week
2. Navigate to different dates using date picker

EXPECTED:
- Daily view shows individual entries with descriptions
- Weekly view shows aggregated hours per day
- Date picker works correctly
- Total hours calculation is accurate
```

### T5.4 — Edit Time Entry

```
STEPS:
1. Click on the "Homepage redesign work" time entry
2. Change end time from 12:30 to 13:00
3. Save

EXPECTED:
- Duration updates to 4h (was 3.5h)
- Total for the day recalculates
```

### T5.5 — Delete Time Entry

```
STEPS:
1. Find the yesterday's entry "Collection page development"
2. Delete it
3. Confirm deletion

EXPECTED:
- Entry removed from view
- Total hours for yesterday becomes 0
- (Soft delete: entry still in DB with deleted_at set)
```

---

## TEST SUITE 6: REST API (For Desktop Agent)

### T6.1 — API Auth

```
STEPS:
1. Make a POST request to /api/v1/time-entries WITHOUT auth token
2. Then authenticate and get a valid session/token
3. Make the same request WITH auth token

EXPECTED:
- Without auth: 401 Unauthorized
- With auth: 200 OK (or appropriate success response)
- Response format: { success: boolean, data?: ..., error?: ... }
```

### T6.2 — POST /api/v1/time-entries (Start Timer)

```
STEPS:
1. POST /api/v1/time-entries with body:
   {
     "project_id": "<trade-supplies-project-id>",
     "start_time": "2026-02-11T09:00:00Z"
   }

EXPECTED:
- Returns { success: true, data: { id: "...", start_time: "...", end_time: null } }
- Time entry created in DB with no end_time (running timer)
```

### T6.3 — PATCH /api/v1/time-entries/:id (Stop Timer)

```
STEPS:
1. PATCH the time entry from T6.2 with:
   {
     "end_time": "2026-02-11T12:00:00Z"
   }

EXPECTED:
- Returns { success: true, data: { ..., end_time: "...", duration: 10800 } }
- Duration calculated as 3 hours (10800 seconds)
```

### T6.4 — POST /api/v1/screenshots (Upload)

```
STEPS:
1. Create a test PNG/WebP image (or use a dummy file)
2. POST /api/v1/screenshots as multipart/form-data:
   - file: test-screenshot.webp
   - time_entry_id: <id from T6.2>
   - activity_level: 78

EXPECTED:
- Returns { success: true, data: { id: "...", image_url: "...", thumbnail_url: "..." } }
- Image uploaded to R2 (or local storage in dev)
- Thumbnail generated
- Screenshot visible in /screenshots gallery on dashboard
```

### T6.5 — POST /api/v1/activity (Log Activity)

```
STEPS:
1. POST /api/v1/activity with body:
   {
     "time_entry_id": "<id>",
     "interval_start": "2026-02-11T09:00:00Z",
     "interval_end": "2026-02-11T09:10:00Z",
     "keyboard_count": 342,
     "mouse_count": 156,
     "activity_percent": 82
   }

EXPECTED:
- Returns { success: true }
- Activity log created in DB
- Activity level visible on dashboard/screenshots
```

---

## TEST SUITE 7: SCREENSHOT GALLERY

### T7.1 — Gallery Loads

```
STEPS:
1. Navigate to /screenshots
2. Verify the screenshot uploaded via API (T6.4) appears

EXPECTED:
- Grid of screenshot thumbnails
- Timestamp shown under each screenshot
- Activity level indicator (percentage or color bar)
```

### T7.2 — Screenshot Lightbox

```
STEPS:
1. Click on a screenshot thumbnail
2. Verify full-size image opens in a lightbox/modal

EXPECTED:
- Full resolution image displayed
- Timestamp, employee name, project name, activity level shown
- Close button works (X or click outside)
- Keyboard escape closes lightbox
```

### T7.3 — Filter by Employee

```
STEPS:
1. On /screenshots, find the employee filter dropdown
2. Select "Umair Shafiq"

EXPECTED:
- Only screenshots from Umair are shown
- Count updates
```

### T7.4 — Filter by Date Range

```
STEPS:
1. Select a date range (today only)
2. Then select a range that includes no data (e.g., last month)

EXPECTED:
- Date filter narrows results correctly
- Empty date range shows "No screenshots found" message
```

---

## TEST SUITE 8: REPORTS & EXPORTS

### T8.1 — Reports Page Loads

```
STEPS:
1. Navigate to /reports
2. Verify report options/filters are available

EXPECTED:
- Page loads with date range selector
- Employee filter
- Project filter
- Export buttons (CSV, PDF)
```

### T8.2 — Export CSV

```
STEPS:
1. Select date range: this week
2. Click "Export CSV"
3. Verify file downloads

EXPECTED:
- CSV file downloads
- Contains columns: Date, Employee, Project, Hours, Description, Billable
- Data matches what was entered in Test Suite 5
```

### T8.3 — Export PDF

```
STEPS:
1. Select same filters
2. Click "Export PDF"
3. Verify file downloads

EXPECTED:
- PDF file downloads
- Formatted timesheet report
- Includes organization name, date range, totals
```

---

## TEST SUITE 9: SETTINGS

### T9.1 — Organization Settings

```
STEPS:
1. Navigate to /settings
2. Verify org name shows "7Roars Digital Agency"
3. Change a setting (e.g., default timezone, screenshot frequency)
4. Save

EXPECTED:
- Settings save successfully
- Changes persist after page reload
```

### T9.2 — Screenshot Frequency Setting

```
STEPS:
1. In settings, find screenshot frequency option
2. Change from default (e.g., 10 min) to 5 min
3. Save

EXPECTED:
- Setting saved
- (This setting should be read by desktop agent on next sync)
```

---

## TEST SUITE 10: DESKTOP AGENT (Electron)

> These tests require the Electron app to be running. Playwright MCP can interact
> with Electron via its DevTools. Launch the desktop agent first: `cd apps/desktop && npm start`

### T10.1 — Desktop Agent Login

```
STEPS:
1. Launch the Electron desktop agent
2. Login screen should appear
3. Enter:
   - Email: umairshafiq.cs@gmail.com
   - Password: Testing12
4. Click Login

EXPECTED:
- Agent authenticates with the web API
- Login screen disappears
- System tray icon appears
- Timer UI shows (either in tray popup or mini window)
```

### T10.2 — Start Timer

```
STEPS:
1. In the desktop agent, select project "Trade Supplies UK Website"
2. Click Start / Play button

EXPECTED:
- Timer starts counting up (00:00:01, 00:00:02, ...)
- Time entry created via API (check /timesheets on web dashboard)
- System tray icon changes to indicate "tracking"
```

### T10.3 — Screenshot Capture

```
STEPS:
1. While timer is running, wait for the screenshot interval
   (or if there's a manual trigger, use that)
2. Check web dashboard /screenshots

EXPECTED:
- Screenshot captured by the agent
- Screenshot uploaded to the server
- Visible in the web dashboard gallery
- Thumbnail generated
- Activity level recorded
```

### T10.4 — Activity Tracking

```
STEPS:
1. While timer is running, type on keyboard and move mouse for 1 minute
2. Then leave the computer idle for 1 minute
3. Check activity logs on web dashboard

EXPECTED:
- Active minute shows high activity percentage (>60%)
- Idle minute shows 0% or very low activity
- Activity logged in the activity_logs table
```

### T10.5 — Stop Timer

```
STEPS:
1. Click Stop button on the desktop agent
2. Check web dashboard /timesheets

EXPECTED:
- Timer stops
- Time entry updated with end_time and duration
- Entry visible on web dashboard with correct duration
- System tray icon returns to "not tracking" state
```

### T10.6 — Project Switching

```
STEPS:
1. Start timer on "Trade Supplies UK Website"
2. After a few seconds, switch project to "School Of Scape Redesign"
3. Stop timer

EXPECTED:
- First time entry stopped and saved
- New time entry started for second project
- Both entries visible on web dashboard
```

### T10.7 — Offline Queue (If Feasible to Test)

```
STEPS:
1. Disconnect internet (disable network adapter or block API host)
2. Start timer on desktop agent
3. Wait for a screenshot to be captured
4. Stop timer
5. Reconnect internet
6. Wait for sync

EXPECTED:
- Agent continues working offline
- Time entry and screenshot queued in local SQLite
- After reconnecting, data syncs to server
- Entries appear on web dashboard
```

---

## TEST SUITE 11: REAL-TIME STATUS (Socket.io)

### T11.1 — Online Indicator

```
STEPS:
1. Open web dashboard /team page in browser
2. Start the desktop agent and login
3. Watch the team page

EXPECTED:
- Employee status changes to "Online" or green indicator
- Status appears without page refresh (real-time via Socket.io)
```

### T11.2 — Offline Indicator

```
STEPS:
1. Close the desktop agent (or logout)
2. Watch the team page on web dashboard

EXPECTED:
- Employee status changes to "Offline" or grey indicator
- Status updates in real-time
```

---

## TEST SUITE 12: EDGE CASES & ERROR HANDLING

### T12.1 — Duplicate Registration

```
STEPS:
1. Navigate to /register
2. Try registering with umairshafiq.cs@gmail.com again

EXPECTED:
- Error: "Email already registered" or similar
- No duplicate user created
```

### T12.2 — Empty Form Submissions

```
STEPS:
1. On login page, submit with empty fields
2. On time entry form, submit with empty fields
3. On project creation, submit with empty name

EXPECTED:
- Validation errors shown inline
- No API calls made with empty data
- Forms don't crash
```

### T12.3 — Overlapping Time Entries

```
STEPS:
1. Create a time entry: today 09:00-12:00
2. Try creating another: today 10:00-11:00 (overlaps)

EXPECTED:
- Either: warning shown and entry created anyway (flexible)
- Or: error preventing overlap (strict)
- Document which behavior is implemented
```

### T12.4 — Large Screenshot Upload

```
STEPS:
1. Via API, try uploading a very large image (>10MB)

EXPECTED:
- Either: rejected with size limit error
- Or: compressed and accepted
- Should NOT crash the server
```

### T12.5 — XSS in Text Fields

```
STEPS:
1. Create a time entry with description: <script>alert('xss')</script>
2. Create a project with name: <img src=x onerror=alert(1)>
3. View them on the dashboard

EXPECTED:
- Script tags NOT executed
- Content escaped/sanitized in the UI
- No alert boxes pop up
```

### T12.6 — SQL Injection in API

```
STEPS:
1. Send API request with description: '; DROP TABLE users; --
2. Check that database is intact

EXPECTED:
- Input sanitized via Prisma (parameterized queries)
- Database tables still intact
- No unexpected behavior
```

---

## TEST RESULTS TEMPLATE

After running all tests, update CHANGELOG.md with this format:

```markdown
### [DATE] — E2E Testing Results

**Environment:** localhost:3000 + Electron desktop agent
**Tester:** Playwright MCP via Windsurf Cascade
**Total Tests:** 41
**Passed:** ??
**Failed:** ??
**Skipped:** ??

#### PASSED ✅
- T1.1 Registration — Account created, OWNER role assigned
- T1.2 Logout — Session destroyed, redirect works
- ...

#### FAILED ❌
- T6.4 Screenshot Upload — Error: R2 bucket not configured for local dev
  - SEVERITY: Medium
  - WORKAROUND: Use local file storage in dev mode
  - FIX NEEDED: Add local storage fallback in lib/storage.ts
- ...

#### SKIPPED ⏭️
- T10.7 Offline Queue — Cannot simulate network disconnect via Playwright
  - NOTE: Must test manually
- ...

#### BUGS FOUND
1. [BUG-001] Timesheet total calculation off by 1 minute on entries crossing midnight
   - Severity: Low
   - File: components/modules/time-tracking/TimesheetTable.tsx
   - Steps to reproduce: Create entry from 23:30 to 00:30 next day

2. [BUG-002] Screenshot lightbox doesn't close on Escape key
   - Severity: Low
   - File: components/modules/screenshots/ScreenshotLightbox.tsx

#### BLOCKERS FOR PRODUCTION
- [ ] Fix all FAILED tests marked as High severity
- [ ] Verify screenshot storage works with R2 (not just local)
- [ ] Verify desktop agent auto-update mechanism
```

---

## WINDSURF PROMPT — PASTE THIS TO START TESTING

```
Read CONTEXT.md and CHANGELOG.md to understand current project state.

I need you to do comprehensive E2E testing of the entire application before we push to production. Use the Playwright MCP server to interact with the web app and desktop agent.

SETUP:
- Web app should be running at http://localhost:3000
- If it's not running, start it: cd apps/web && npm run dev
- If database needs reset for clean testing: npx prisma db push --force-reset
- Desktop agent: cd apps/desktop && npm start

TEST ACCOUNT CREDENTIALS:
- Email: umairshafiq.cs@gmail.com
- Password: Testing12
- Name: Umair Shafiq
- Organization: 7Roars Digital Agency

Read the file E2E-TESTING-PLAN.md for the complete test plan with 12 test suites and 41 test cases.

Execute ALL test suites in order (T1 through T12). For each test:
1. Run the steps exactly as described
2. Record PASS/FAIL/SKIP
3. If a test FAILS, capture:
   - The exact error message or unexpected behavior
   - Screenshot if possible
   - Which file likely needs fixing
   - Severity (High/Medium/Low)
4. If a test requires the desktop Electron app, launch it and interact via DevTools

After all tests are done:
1. Update CHANGELOG.md with the test results using the template at the bottom of E2E-TESTING-PLAN.md
2. Update CONTEXT.md to reflect testing status
3. Create a BUGS.md file listing all bugs found, sorted by severity
4. Give me a summary: total passed, failed, skipped, and what needs fixing before production

Do NOT skip any tests. If a test cannot be run (e.g., need manual network disconnect), mark it SKIPPED with reason.

Start with Test Suite 1 (Auth & Onboarding) — navigate to http://localhost:3000 and begin.
```

---

**Drop the `E2E-TESTING-PLAN.md` file in your project root alongside ARCHITECTURE.md, then paste the prompt above into Windsurf Cascade.**
