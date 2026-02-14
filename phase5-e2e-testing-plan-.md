# Phase 5 E2E Testing Plan — Worktivity-Style Desktop Agent Upgrade

Comprehensive E2E test plan covering all Phase 5 features: activity monitoring improvements (A1-A5), app usage tracking (B1-B6), screenshot enhancements (C1-C5), UX/reliability (D1-D6), and web dashboard pages (E1, E3-E4).

---

## OVERVIEW

**Phase:** 5 — Worktivity-Style Desktop Agent Upgrade
**Tool:** Playwright MCP Server (installed in Windsurf)
**Coverage:** Desktop Agent (Electron) + REST API + Web Dashboard Pages
**Date:** Feb 2026
**Total Test Cases:** 52

**Test Account:**
- Email: `umairshafiq.cs@gmail.com`
- Password: `Testing12`
- Name: `Umair Shafiq`
- Organization: `7Roars Digital Agency`

**Prerequisites:**
- Web app running on `http://localhost:3000`
- PostgreSQL running via Docker (`docker compose up -d`)
- Database migrated with new models (`npx prisma db push`)
- Desktop agent running (`pnpm --filter desktop run start`)
- At least one project created (from Phase 4 testing)
- Some existing time entries + activity logs (from Phase 4 testing or manual creation)

---

## TEST SUITE 13: ACTIVITY TRACKING IMPROVEMENTS (Phase A)

### T13.1 — Activity Lifecycle (Start/Stop with Timer)

```
STEPS:
1. Launch desktop agent, login
2. Start timer on a project
3. Check console logs for "[ACTIVITY] Logged:" messages appearing every 60s
4. Stop timer
5. Verify no more "[ACTIVITY] Logged:" messages appear after stopping

EXPECTED:
- Activity logging starts ONLY when timer starts
- Activity logging stops when timer stops
- uiohook-napi tracking starts once at boot ("[ACTIVITY] uiohook-napi tracking started")
- No activity logging when timer is idle
```

### T13.2 — Throttled Mouse Move Events

```
STEPS:
1. Start timer
2. Move mouse continuously for 10 seconds
3. Wait for activity log (60s interval)
4. Check console log for "moves=" count

EXPECTED:
- Mouse move count should be ~20 (2 events/sec × 10s), NOT hundreds
- Console shows separate "clicks=" and "moves=" counts
- Throttle at 500ms debounce is working
```

### T13.3 — Time-Bucketed Activity Percentage

```
STEPS:
1. Start timer
2. Type and move mouse for 30 seconds, then stop all input for 30 seconds
3. Wait for activity log at 60s mark
4. Check "activity=" percentage in console

EXPECTED:
- Activity should be ~50% (30 active seconds out of 60)
- Console shows "slots=30/60" or similar
- NOT 100% (old behavior counted total events vs max)
```

### T13.4 — Idle Detection Notification

```
STEPS:
1. Start timer
2. Stop all keyboard/mouse input
3. Wait for idle threshold (default 5 minutes)
4. Observe desktop agent UI

EXPECTED:
- After 5 minutes idle, "[ACTIVITY] Idle detected: 5min" in console
- Timer.tsx shows idle detection overlay/dialog
- Dialog shows "You've been idle for X minutes"
- Two buttons visible: "Keep Time" and "Discard & Stop"
```

### T13.5 — Idle Detection — Keep Time

```
STEPS:
1. When idle dialog appears (from T13.4), click "Keep Time" / dismiss
2. Resume typing/moving mouse

EXPECTED:
- Idle dialog closes
- Timer continues running
- Activity tracking resumes normally
- No time is discarded
```

### T13.6 — Idle Detection — Discard & Stop

```
STEPS:
1. Trigger idle detection again (stop input for 5 min)
2. When idle dialog appears, click "Discard & Stop"

EXPECTED:
- Timer stops
- Idle dialog closes
- Timer resets to 00:00:00
- Console shows idle discard action
```

### T13.7 — Auto-Stop on Extended Idle

```
STEPS:
1. Start timer
2. Stop all input for 15 minutes (autoStopThreshold default)

EXPECTED:
- After 15 minutes, "[ACTIVITY] Auto-stop threshold reached" in console
- Timer auto-stops
- "idle:auto-stop" event sent to renderer
- Timer UI resets
- NOTE: Can reduce threshold via settings for faster testing
```

### T13.8 — System Lock Detection (Windows)

```
STEPS:
1. Start timer on desktop agent
2. Lock the Windows screen (Win+L)
3. Unlock the screen

EXPECTED:
- On lock: "[POWER] Screen locked — stopping timer" in console
- Timer stops automatically
- On unlock: "[POWER] Screen unlocked" in console
- Timer.tsx shows "Timer stopped — system locked/suspended" notice
- Notice auto-dismisses after 5 seconds
```

### T13.9 — System Sleep Detection

```
STEPS:
1. Start timer
2. Put computer to sleep (close laptop lid or power menu)
3. Wake computer

EXPECTED:
- On sleep: "[POWER] System suspended — stopping timer"
- Timer stops
- On resume: "[POWER] System resumed"
- Power event notification shown in UI
- NOTE: May need to test manually — Playwright can't trigger sleep
```

---

## TEST SUITE 14: APP USAGE TRACKING (Phase B)

### T14.1 — App Tracker Starts with Timer

```
STEPS:
1. Start timer on desktop agent
2. Check console for "[APP-TRACKER] Started" message

EXPECTED:
- "[APP-TRACKER] Started (poll every 5s, flush every 60s)" in console
- App tracker polls active window every 5 seconds
- No errors about PowerShell or '$' commands
```

### T14.2 — Active Window Detection (Windows)

```
STEPS:
1. While timer is running, switch between different applications:
   - Open Chrome/Edge browser
   - Open VS Code / Windsurf
   - Open File Explorer
   - Open Notepad
2. Wait for flush interval (60s)
3. Check console for "[APP-TRACKER] Flushed" message

EXPECTED:
- Console shows: "[APP-TRACKER] Flushed N apps (top: AppName Xs)"
- Process names mapped to friendly names (e.g., "chrome" → "Google Chrome")
- Multiple apps detected with correct durations
```

### T14.3 — App Usage Queued for Sync

```
STEPS:
1. After app tracker flushes (T14.2), check console for sync activity
2. Wait for next sync cycle (30s)

EXPECTED:
- App usage data queued as "app_usage" type in offline_queue
- Sync processes the app_usage item
- "[SYNC] Processing N queued items" includes app_usage
```

### T14.4 — App Tracker Stops with Timer

```
STEPS:
1. Stop the timer
2. Check console

EXPECTED:
- "[APP-TRACKER] Stopped" in console
- No more polling after timer stops
```

### T14.5 — App Tracking Disabled Config

```
STEPS:
1. In web settings, set app_tracking_enabled to false (or modify config)
2. Restart desktop agent
3. Start timer

EXPECTED:
- "[APP-TRACKER] App tracking disabled in config" in console
- No active window polling occurs
- Timer and screenshots still work normally
```

### T14.6 — POST /api/v1/app-usage (Create Batch)

```
STEPS:
1. Send POST request to /api/v1/app-usage with auth headers:
   {
     "time_entry_id": "<valid-entry-id>",
     "entries": [
       {
         "app_name": "Google Chrome",
         "window_title": "GitHub - Dashboard",
         "duration": 30,
         "interval_start": "2026-02-12T10:00:00Z",
         "interval_end": "2026-02-12T10:01:00Z"
       },
       {
         "app_name": "Visual Studio Code",
         "window_title": "index.ts — project",
         "duration": 25,
         "interval_start": "2026-02-12T10:00:00Z",
         "interval_end": "2026-02-12T10:01:00Z"
       }
     ]
   }

EXPECTED:
- Returns { success: true, data: { created: 2 } }
- Records created in AppUsageLog table
- is_productive set based on org's AppClassification table
- Audit log entry created
```

### T14.7 — POST /api/v1/app-usage — Validation Errors

```
STEPS:
1. POST with empty entries array: { "entries": [] }
2. POST with missing app_name: { "entries": [{ "duration": 10 }] }
3. POST with duration > 86400: { "entries": [{ "app_name": "X", "duration": 100000, ... }] }

EXPECTED:
- All return 422 with validation error messages
- Error messages include field path and description
```

### T14.8 — POST /api/v1/app-usage — No Auth

```
STEPS:
1. POST to /api/v1/app-usage WITHOUT auth headers

EXPECTED:
- Returns 401 Unauthorized
- No records created
```

### T14.9 — GET /api/v1/app-usage

```
STEPS:
1. GET /api/v1/app-usage with auth headers

EXPECTED:
- Returns { success: true, data: [...] }
- Returns last 24 hours of app usage logs for authenticated user
- Each entry has: app_name, window_title, duration, interval_start, interval_end, is_productive
- Dates serialized as ISO strings
- Max 500 results
```

---

## TEST SUITE 15: APP USAGE WEB PAGE (Phase B6)

### T15.1 — App Usage Page Loads

```
STEPS:
1. Navigate to http://localhost:3000/app-usage
2. Verify page renders

EXPECTED:
- Page title: "App Usage"
- Subtitle: "Track which applications your team uses during work hours"
- Date range filters visible (start/end date inputs)
- Three summary cards: Total App Time, Productive, Unproductive
- Applications table section
```

### T15.2 — App Usage Page — Empty State

```
STEPS:
1. Navigate to /app-usage
2. Select a date range with no data (e.g., a month ago)

EXPECTED:
- Summary cards show 0s / 0m
- Table shows: "No app usage data for this period..."
- No JavaScript errors
```

### T15.3 — App Usage Page — With Data

```
STEPS:
1. Ensure desktop agent has been running with app tracking for at least 1 minute
2. Navigate to /app-usage with today's date
3. Verify data appears

EXPECTED:
- Summary cards show non-zero values
- Applications listed in table sorted by duration (highest first)
- Each app row shows: icon initial, app name, user count, duration bar, duration text
- Duration bar colored by classification category
```

### T15.4 — App Usage — Date Range Filter

```
STEPS:
1. On /app-usage, change start date to yesterday
2. Change end date to today
3. Verify data reloads

EXPECTED:
- Loading indicator shown briefly
- Data updates to reflect new date range
- Summary cards recalculate
```

### T15.5 — App Usage — User Filter (Manager Only)

```
STEPS:
1. Login as OWNER/ADMIN/MANAGER
2. Navigate to /app-usage
3. Verify user filter dropdown appears (if >1 team member)
4. Select a specific user

EXPECTED:
- Dropdown shows "All Members" + individual team members
- Selecting a user filters data to that user only
- Summary cards update accordingly
```

### T15.6 — App Classification — Inline Dropdown

```
STEPS:
1. On /app-usage, find an app with "Unclassified" classification
2. Click the classification dropdown
3. Change to "Productive"
4. Wait for data to reload

EXPECTED:
- Dropdown shows: Unclassified, Productive, Unproductive, Neutral
- After selecting "Productive":
  - Dropdown color changes to green
  - Summary cards update (productive time increases)
  - All existing logs for that app updated to is_productive=true
  - Audit log entry created
```

### T15.7 — App Classification — Permission Check

```
STEPS:
1. Login as EMPLOYEE role user
2. Navigate to /app-usage
3. Try to change a classification

EXPECTED:
- Classification dropdown may be visible but change should fail
- Error returned: "Insufficient permissions"
- Only OWNER/ADMIN/MANAGER can classify apps
```

---

## TEST SUITE 16: APP CLASSIFICATIONS REST API (Phase E3-E4)

### T16.1 — GET /api/v1/app-classifications

```
STEPS:
1. GET /api/v1/app-classifications with auth headers

EXPECTED:
- Returns { success: true, data: [...] }
- Each entry: { id, app_name, category, created_at, updated_at }
- Sorted by app_name ascending
- Only returns classifications for authenticated user's organization
```

### T16.2 — PUT /api/v1/app-classifications

```
STEPS:
1. PUT /api/v1/app-classifications with auth headers (OWNER role):
   {
     "app_name": "Spotify",
     "category": "UNPRODUCTIVE"
   }

EXPECTED:
- Returns { success: true, data: { id, app_name: "Spotify", category: "UNPRODUCTIVE" } }
- Classification upserted (created if new, updated if exists)
- Existing AppUsageLog entries for "Spotify" updated: is_productive = false
```

### T16.3 — PUT /api/v1/app-classifications — Validation

```
STEPS:
1. PUT with invalid category: { "app_name": "Test", "category": "INVALID" }
2. PUT with empty app_name: { "app_name": "", "category": "PRODUCTIVE" }

EXPECTED:
- Returns 422 with validation error
```

### T16.4 — PUT /api/v1/app-classifications — Permission Check

```
STEPS:
1. Authenticate as EMPLOYEE role
2. PUT /api/v1/app-classifications with valid body

EXPECTED:
- Returns 403 "Insufficient permissions"
- Only OWNER/ADMIN/MANAGER can update classifications
```

---

## TEST SUITE 17: SCREENSHOT ENHANCEMENTS (Phase C)

### T17.1 — Screenshot Capture (Normal Mode)

```
STEPS:
1. Start timer on desktop agent
2. Wait for screenshot interval (1-2 min in dev)
3. Check console logs

EXPECTED:
- "[SCREENSHOT] Captured: screenshot_XXXXX.webp (XXkB, activity: XX%)"
- Screenshot saved to userData/screenshots/
- Thumbnail saved as thumb_XXXXX.webp
- Both queued for sync
```

### T17.2 — Screenshot Blur Mode

```
STEPS:
1. Set screenshotMode to "blurred" in web settings (or config)
2. Restart desktop agent / wait for settings sync
3. Start timer and wait for screenshot

EXPECTED:
- Console shows: "... activity: XX%, blurred"
- Screenshot file is blurred (sharp.blur(15) applied)
- Thumbnail is also blurred
- is_blurred=true in sync metadata
```

### T17.3 — Screenshot Disabled Mode

```
STEPS:
1. Set screenshotMode to "disabled" in settings
2. Restart desktop agent
3. Start timer

EXPECTED:
- "[SCREENSHOT] Screenshots disabled in config" in console
- No screenshots captured during entire timer session
- Timer and activity tracking still work normally
```

### T17.4 — Multi-Monitor Screenshot

```
STEPS:
1. Connect a second monitor (or use virtual display)
2. Start timer
3. Move cursor to second monitor
4. Wait for screenshot capture

EXPECTED:
- Screenshot captures the display where cursor is located
- Console shows correct resolution for that display
- If only one monitor, captures primary display
- NOTE: Requires multi-monitor setup to fully test
```

### T17.5 — Thumbnail Generation

```
STEPS:
1. After a screenshot is captured, check userData/screenshots/ directory
2. Look for both screenshot_XXXXX.webp and thumb_XXXXX.webp files

EXPECTED:
- Thumbnail file exists alongside full screenshot
- Thumbnail is ~320px wide
- Thumbnail is smaller file size (quality 50 vs 70)
- After successful sync, thumbnail file is deleted (cleanup)
```

### T17.6 — Screenshot Sync with Thumbnail

```
STEPS:
1. Wait for screenshot to be captured and synced
2. Check console for sync logs
3. Check web dashboard /screenshots

EXPECTED:
- "[SYNC] Uploading screenshot: ... (XXkB)" in console
- "[SYNC] Metadata: {..., is_blurred: false}" includes blur flag
- "[SYNC] Screenshot uploaded successfully"
- Screenshot visible on web dashboard with thumbnail
```

---

## TEST SUITE 18: CONNECTION & SYNC STATUS (Phase D1)

### T18.1 — Connection Status Indicator

```
STEPS:
1. Launch desktop agent and login
2. Observe the status bar area in Timer.tsx

EXPECTED:
- Green dot visible when connected (sync successful)
- Sync status updates after each sync cycle (30s)
```

### T18.2 — Queue Size Badge

```
STEPS:
1. Start timer, generate some screenshots/activity
2. Observe status bar for queue count

EXPECTED:
- Queue count shown when items are pending
- Count decreases as items are synced
- When queue is empty, badge disappears or shows 0
```

### T18.3 — Offline Mode Indicator

```
STEPS:
1. Disconnect internet (disable network adapter)
2. Start timer, wait for sync attempt
3. Check status indicator

EXPECTED:
- Sync fails silently (no crash)
- Connection dot turns red/grey
- Queue size increases as items accumulate
- Timer continues working normally
```

### T18.4 — Reconnection Recovery

```
STEPS:
1. From T18.3, reconnect internet
2. Wait for next sync cycle (30s)

EXPECTED:
- Queued items start syncing
- Connection dot turns green
- Queue size decreases to 0
- All offline data synced to server
```

---

## TEST SUITE 19: TOKEN REFRESH (Phase D2)

### T19.1 — Token Refresh Loop Running

```
STEPS:
1. Launch desktop agent
2. Check console for token verification

EXPECTED:
- Token verified on startup (verifyToken called)
- No "[AUTH] Token expired" messages if session is valid
- Loop runs every 30 minutes
```

### T19.2 — Expired Token Handling

```
STEPS:
1. Manually invalidate the session (delete from DB or expire it)
2. Wait for next token check (or restart agent)

EXPECTED:
- "[AUTH] Token expired or invalid — clearing session" in console
- Session cleared from local store
- "auth:required" event sent to renderer
- Agent shows login screen
```

---

## TEST SUITE 20: TRAY & UX (Phase D3-D6)

### T20.1 — Tray Live Tooltip

```
STEPS:
1. Start timer on project "Trade Supplies UK Website"
2. Hover over system tray icon
3. Wait 5 seconds, hover again

EXPECTED:
- Tooltip shows: "HH:MM:SS Trade Supplies UK Website"
- Tooltip updates every second while timer runs
- When timer stops, tooltip returns to default
```

### T20.2 — Queue Cleanup

```
STEPS:
1. Check console for cleanup on startup
2. Verify cleanup runs hourly

EXPECTED:
- "[STORE] Cleaned up X old screenshot files" if old files exist
- "[STORE] Trimmed X excess queue items" if queue > 500
- Screenshots older than 7 days deleted from disk
- Failed items (retries > 5, older than 24h) removed
```

### T20.3 — Auto-Start on Boot

```
STEPS:
1. Set backgroundMode to true in config
2. Restart desktop agent
3. Check Windows startup apps

EXPECTED:
- Agent registered in Windows login items
- app.setLoginItemSettings({ openAtLogin: true }) called
- When backgroundMode is false, login item is removed
```

### T20.4 — Daily Summary Notification

```
STEPS:
1. Launch desktop agent
2. Check console for notification schedule
3. Wait until workdayEnd time (default 18:00)

EXPECTED:
- "[NOTIFICATIONS] Daily summary scheduled for 6:00:00 PM (in Xmin)" on startup
- At scheduled time, native Windows notification appears
- Notification title: "7Roars — Daily Summary"
- Body: "Today: Xh Xm tracked across N projects. Activity: X%"
- Reschedules for next day after showing
```

### T20.5 — Daily Summary — Custom Time

```
STEPS:
1. Set workday_end to a time 2 minutes from now in settings
2. Restart desktop agent
3. Wait for the notification

EXPECTED:
- Notification fires at the configured time
- Correct stats shown (hours, projects, activity)
```

---

## TEST SUITE 21: PRODUCTIVITY ANALYSIS PAGE (Phase E1)

### T21.1 — Productivity Page Loads

```
STEPS:
1. Navigate to http://localhost:3000/productivity
2. Verify page renders

EXPECTED:
- Page title: "Productivity Analysis"
- Subtitle about activity trends
- Date range filters (defaults to last 7 days)
- User filter dropdown (if manager+)
- Three summary cards: Avg Activity, Productive Time, Unproductive Time
```

### T21.2 — Productivity Page — Empty State

```
STEPS:
1. Select a date range with no data

EXPECTED:
- Summary cards show 0% / 0h 0m
- Daily Activity Trend shows "No activity data for this period"
- No JavaScript errors
```

### T21.3 — Productivity Page — With Data

```
STEPS:
1. Ensure activity logs exist (run desktop agent for a few minutes)
2. Navigate to /productivity with today's date range

EXPECTED:
- Summary cards show non-zero values
- Avg Activity card colored by threshold (green ≥70%, yellow ≥40%, red <40%)
- Daily Activity Trend chart shows bar for each day
- Bars colored by activity level
```

### T21.4 — Daily Activity Trend Chart

```
STEPS:
1. On /productivity, verify the daily chart
2. Hover/inspect bars

EXPECTED:
- One bar per day in the date range
- Bar height proportional to activity %
- Percentage label above each bar
- Day label below (Mon, Tue, etc.)
- Color: green (≥70%), yellow (≥40%), red (<40%)
```

### T21.5 — Peak Hours Chart

```
STEPS:
1. On /productivity, scroll to Peak Hours section

EXPECTED:
- Shows bars for each hour with activity data
- Hours labeled (00, 01, ..., 23)
- Bar height = average activity % for that hour
- Identifies when team is most active
```

### T21.6 — Employee Breakdown

```
STEPS:
1. On /productivity, scroll to Team Members section

EXPECTED:
- Lists each team member with activity data
- Shows: avatar initial, name, productive/unproductive hours
- Activity bar (0-100%) with color coding
- Sorted by highest activity first
```

### T21.7 — Productivity — Date Range Filter

```
STEPS:
1. Change date range to last 30 days
2. Verify data reloads

EXPECTED:
- Loading state shown
- Charts update with wider date range
- More daily bars in trend chart
```

### T21.8 — Productivity — User Filter

```
STEPS:
1. Select a specific team member from dropdown
2. Verify data filters

EXPECTED:
- All charts/cards filter to selected user
- Employee breakdown shows only that user
- Summary cards reflect individual stats
```

---

## TEST SUITE 22: SIDEBAR NAVIGATION (New Modules)

### T22.1 — App Usage in Sidebar

```
STEPS:
1. Login to web dashboard
2. Check sidebar navigation

EXPECTED:
- "App Usage" link visible in sidebar
- Clicking navigates to /app-usage
- Active state highlighted when on that page
```

### T22.2 — Productivity in Sidebar

```
STEPS:
1. Check sidebar navigation

EXPECTED:
- "Productivity" link visible in sidebar
- Clicking navigates to /productivity
- Active state highlighted
```

### T22.3 — Auth Guard on New Pages

```
STEPS:
1. Logout
2. Navigate directly to http://localhost:3000/app-usage
3. Navigate directly to http://localhost:3000/productivity

EXPECTED:
- Both redirect to /login when not authenticated
```

---

## TEST SUITE 23: SETTINGS SYNC (Config)

### T23.1 — Server Settings Sync on Login

```
STEPS:
1. Login on desktop agent
2. Check console for config sync

EXPECTED:
- "[CONFIG] Synced server settings: {...}" in console
- Settings include: screenshotInterval, activityInterval, blurScreenshots, workdayEnd
```

### T23.2 — Periodic Settings Sync

```
STEPS:
1. Change a setting on web dashboard (e.g., screenshot_interval)
2. Wait up to 5 minutes for desktop agent to sync

EXPECTED:
- "[CONFIG] Synced server settings: {...}" shows updated value
- Desktop agent behavior changes accordingly
```

### T23.3 — New Config Fields Synced

```
STEPS:
1. Set these settings on the web:
   - screenshot_mode: "blurred"
   - idle_threshold: 3
   - auto_stop_threshold: 10
   - app_tracking_enabled: false
   - workday_end: "17:00"
2. Wait for sync or restart agent

EXPECTED:
- All new config fields synced correctly
- Agent behavior changes: screenshots blurred, idle at 3min, auto-stop at 10min, no app tracking, notification at 17:00
```

---

## TEST SUITE 24: EDGE CASES & ERROR HANDLING

### T24.1 — App Tracker — No Foreground Window

```
STEPS:
1. Start timer
2. Minimize all windows (show desktop)
3. Wait for app tracker poll

EXPECTED:
- App tracker handles null/empty result gracefully
- No crash or error in console
- Sample skipped when no window detected
```

### T24.2 — App Usage API — Invalid time_entry_id

```
STEPS:
1. POST /api/v1/app-usage with non-existent time_entry_id:
   { "time_entry_id": "nonexistent_id", "entries": [...] }

EXPECTED:
- Request succeeds (time_entry_id is optional/nullable)
- Records created with time_entry_id = null
- No crash
```

### T24.3 — App Usage API — local_ Prefix Entry ID

```
STEPS:
1. POST /api/v1/app-usage with local entry ID:
   { "time_entry_id": "local_12345", "entries": [...] }

EXPECTED:
- time_entry_id starting with "local_" is ignored (set to null)
- Records created successfully
```

### T24.4 — Concurrent Timer + App Tracker + Screenshots

```
STEPS:
1. Start timer
2. Let all three systems run simultaneously for 5 minutes:
   - Activity tracking (every 60s)
   - App tracking (poll 5s, flush 60s)
   - Screenshots (random 1-2 min interval)
3. Check console for any errors

EXPECTED:
- All three systems work concurrently without interference
- No race conditions or crashes
- All data synced to server correctly
- Queue processes all item types (activity, app_usage, screenshot)
```

### T24.5 — Classification Update Propagation

```
STEPS:
1. Create app usage data for "Google Chrome" (unclassified)
2. Classify "Google Chrome" as PRODUCTIVE via /app-usage page
3. Check existing logs

EXPECTED:
- All existing AppUsageLog entries for "Google Chrome" updated to is_productive=true
- New entries auto-classified as PRODUCTIVE
- Productivity page reflects updated classification
```

### T24.6 — Large App Usage Batch

```
STEPS:
1. POST /api/v1/app-usage with 100 entries (max allowed)

EXPECTED:
- All 100 records created successfully
- Response: { created: 100 }
```

### T24.7 — App Usage Batch Exceeds Limit

```
STEPS:
1. POST /api/v1/app-usage with 101 entries

EXPECTED:
- Returns 422 validation error (max 100 entries per batch)
```

---

## TEST RESULTS TEMPLATE

```markdown
### [DATE] — Phase 5 E2E Testing Results

**Environment:** localhost:3000 + Electron desktop agent
**Tester:** Playwright MCP via Windsurf Cascade
**Total Tests:** 52
**Passed:** ??
**Failed:** ??
**Skipped:** ??

#### PASSED ✅
- T13.1 Activity Lifecycle — Logging starts/stops with timer
- T13.2 Throttled Mouse — moves count throttled at 500ms
- ...

#### FAILED ❌
- TXXX Description — Error details
  - SEVERITY: High/Medium/Low
  - WORKAROUND: ...
  - FIX NEEDED: ...

#### SKIPPED ⏭️
- T13.9 System Sleep — Cannot trigger sleep via Playwright
- T17.4 Multi-Monitor — Requires physical multi-monitor setup
- ...

#### BUGS FOUND
1. [BUG-029] Description
   - Severity: ...
   - File: ...
   - Steps to reproduce: ...

#### BLOCKERS FOR PRODUCTION
- [ ] Fix all FAILED tests marked as High severity
- [ ] Verify app tracker works on macOS (untested)
- [ ] Verify screenshot blur quality is acceptable
```

---

## WINDSURF PROMPT — PASTE THIS TO START TESTING

```
Read CONTEXT.md and CHANGELOG.md to understand current project state.

I need you to do comprehensive E2E testing of all Phase 5 features (Worktivity-style desktop agent upgrade). Use the Playwright MCP server to interact with the web app and desktop agent.

SETUP:
- Web app running at http://localhost:3000
- Desktop agent running: pnpm --filter desktop run start
- Database has new models applied (prisma db push done)

TEST ACCOUNT:
- Email: umairshafiq.cs@gmail.com
- Password: Testing12

Read the file PHASE5-E2E-TESTING-PLAN.md for the complete test plan with 12 test suites (T13-T24) and 52 test cases.

Execute ALL test suites in order. For each test:
1. Run the steps exactly as described
2. Record PASS/FAIL/SKIP
3. If FAIL, capture: error message, severity, file to fix
4. If requires manual action (sleep, multi-monitor), mark SKIPPED

After all tests:
1. Update CHANGELOG.md with results
2. Update BUGS.md with any new bugs found
3. Summary: total passed, failed, skipped, blockers
```

---

**Save this file as `PHASE5-E2E-TESTING-PLAN.md` in the project root alongside the existing `E2E-TESTING-PLAN.md`.**
