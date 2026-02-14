"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("node:path");
const initSqlJs = require("sql.js");
const fs = require("node:fs");
const node_child_process = require("node:child_process");
let db = null;
let dbPath = "";
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}
async function initStore() {
  dbPath = path.join(electron.app.getPath("userData"), "7roars-agent.db");
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys = ON;");
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS auth (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      file_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS timer_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_running INTEGER NOT NULL DEFAULT 0,
      current_entry_id TEXT,
      project_id TEXT,
      project_name TEXT,
      description TEXT,
      start_time TEXT,
      elapsed INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.run("INSERT OR IGNORE INTO timer_state (id) VALUES (1);");
  saveDb();
}
function getDb() {
  if (!db) throw new Error("Database not initialized. Call initStore() first.");
  return db;
}
function persistDb() {
  saveDb();
}
function cleanupOldData() {
  if (!db) return;
  try {
    const { app: app2 } = require("electron");
    const path2 = require("node:path");
    const fs2 = require("node:fs");
    const screenshotsDir = path2.join(app2.getPath("userData"), "screenshots");
    if (fs2.existsSync(screenshotsDir)) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
      const files = fs2.readdirSync(screenshotsDir);
      let deleted = 0;
      for (const file of files) {
        const filePath = path2.join(screenshotsDir, file);
        try {
          const stat = fs2.statSync(filePath);
          if (stat.mtimeMs < sevenDaysAgo) {
            fs2.unlinkSync(filePath);
            deleted++;
          }
        } catch {
        }
      }
      if (deleted > 0) {
        console.log(`[STORE] Cleaned up ${deleted} old screenshot files`);
      }
    }
    const countResult = db.exec("SELECT COUNT(*) FROM offline_queue");
    const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    if (count > 500) {
      const excess = count - 500;
      db.run(
        `DELETE FROM offline_queue WHERE id IN (SELECT id FROM offline_queue ORDER BY created_at ASC LIMIT ${excess})`
      );
      console.log(`[STORE] Trimmed ${excess} excess queue items (was ${count}, now 500)`);
    }
    db.run("DELETE FROM offline_queue WHERE retries > 5 AND created_at < datetime('now', '-1 day')");
    saveDb();
  } catch (err) {
    console.error("[STORE] Cleanup error:", err);
  }
}
let cleanupInterval = null;
function startCleanupLoop() {
  if (cleanupInterval) return;
  cleanupOldData();
  cleanupInterval = setInterval(() => {
    cleanupOldData();
  }, 60 * 60 * 1e3);
}
function getStoredSession() {
  const db2 = getDb();
  const results = db2.exec("SELECT value FROM auth WHERE key = 'session'");
  if (results.length === 0 || results[0].values.length === 0) return null;
  try {
    return JSON.parse(results[0].values[0][0]);
  } catch {
    return null;
  }
}
function storeSession(session) {
  const db2 = getDb();
  db2.run(
    "INSERT OR REPLACE INTO auth (key, value) VALUES (?, ?)",
    ["session", JSON.stringify(session)]
  );
  persistDb();
}
function clearSession() {
  const db2 = getDb();
  db2.run("DELETE FROM auth WHERE key = ?", ["session"]);
  persistDb();
}
function getAuthHeaders() {
  const session = getStoredSession();
  const config = getConfig();
  if (!session) return { Origin: config.serverUrl };
  return {
    Cookie: `better-auth.session_token=${session.token}`,
    Origin: config.serverUrl
  };
}
async function login(credentials) {
  var _a;
  const config = getConfig();
  const url = `${config.serverUrl}/api/auth/sign-in/email`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: config.serverUrl
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });
    if (!response.ok) {
      const data2 = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data2.message || `Login failed (${response.status})`
      };
    }
    const data = await response.json();
    const setCookieHeader = response.headers.get("set-cookie");
    let token = data.token || "";
    if (setCookieHeader) {
      const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) token = match[1];
    }
    if (!token) {
      return { success: false, error: "No session token received" };
    }
    const sessionResponse = await fetch(`${config.serverUrl}/api/auth/get-session`, {
      headers: {
        Cookie: `better-auth.session_token=${token}`,
        Origin: config.serverUrl
      }
    });
    if (!sessionResponse.ok) {
      return { success: false, error: "Failed to verify session" };
    }
    const sessionData = await sessionResponse.json();
    const memberResponse = await fetch(`${config.serverUrl}/api/v1/time-entries?limit=1`, {
      headers: {
        Cookie: `better-auth.session_token=${token}`,
        Origin: config.serverUrl
      }
    });
    let member = {
      id: "",
      organization_id: "",
      role: "EMPLOYEE"
    };
    if (memberResponse.ok) {
      member = {
        id: ((_a = sessionData.user) == null ? void 0 : _a.id) || "",
        organization_id: "",
        role: "EMPLOYEE"
      };
    }
    const session = {
      token,
      user: sessionData.user || data.user,
      member
    };
    storeSession(session);
    fetchServerSettings().catch(() => {
    });
    startSettingsSync();
    return { success: true };
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error"
    };
  }
}
let tokenCheckInterval = null;
async function verifyToken() {
  const session = getStoredSession();
  if (!session) return false;
  const config = getConfig();
  try {
    const response = await fetch(`${config.serverUrl}/api/auth/get-session`, {
      headers: {
        Cookie: `better-auth.session_token=${session.token}`,
        Origin: config.serverUrl
      }
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 401) {
      console.warn("[AUTH] Token expired or invalid — clearing session");
      clearSession();
      const { getMainWindow: getMainWindow2 } = await Promise.resolve().then(() => index);
      const win = getMainWindow2();
      if (win) {
        win.webContents.send("auth:required");
      }
      return false;
    }
    return true;
  } catch {
    return true;
  }
}
function startTokenRefreshLoop() {
  if (tokenCheckInterval) return;
  verifyToken();
  tokenCheckInterval = setInterval(() => {
    verifyToken();
  }, 30 * 60 * 1e3);
}
function registerAuthHandlers() {
  electron.ipcMain.handle("auth:login", async (_event, credentials) => {
    return login(credentials);
  });
  electron.ipcMain.handle("auth:logout", async () => {
    const session = getStoredSession();
    if (session) {
      const config = getConfig();
      try {
        await fetch(`${config.serverUrl}/api/auth/sign-out`, {
          method: "POST",
          headers: {
            Cookie: `better-auth.session_token=${session.token}`,
            Origin: config.serverUrl
          }
        });
      } catch {
      }
    }
    clearSession();
  });
  electron.ipcMain.handle("auth:get-session", () => {
    return getStoredSession();
  });
}
const DEFAULT_CONFIG = {
  serverUrl: "http://localhost:3000",
  screenshotInterval: { min: 5, max: 10 },
  activityInterval: 60,
  blurScreenshots: false,
  screenshotMode: "enabled",
  idleThreshold: 5,
  autoStopThreshold: 15,
  backgroundMode: false,
  appTrackingEnabled: true,
  workdayEnd: "18:00"
};
function getConfig() {
  const db2 = getDb();
  const results = db2.exec("SELECT value FROM config WHERE key = 'app_config'");
  if (results.length === 0 || results[0].values.length === 0) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(results[0].values[0][0]) };
  } catch {
    return DEFAULT_CONFIG;
  }
}
function setConfig(partial) {
  const current = getConfig();
  const merged = { ...current, ...partial };
  const db2 = getDb();
  db2.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
    ["app_config", JSON.stringify(merged)]
  );
  persistDb();
}
async function fetchServerSettings() {
  var _a;
  const session = getStoredSession();
  if (!session) return;
  const config = getConfig();
  try {
    const response = await fetch(`${config.serverUrl}/api/v1/settings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      }
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result.success && ((_a = result.data) == null ? void 0 : _a.settings)) {
      const s = result.data.settings;
      const updates = {};
      if (typeof s.screenshot_interval === "number" && s.screenshot_interval >= 1) {
        updates.screenshotInterval = {
          min: Math.max(1, s.screenshot_interval - 1),
          max: s.screenshot_interval + 1
        };
      }
      if (typeof s.activity_interval === "number" && s.activity_interval >= 10) {
        updates.activityInterval = s.activity_interval;
      }
      if (typeof s.screenshot_blur === "boolean") {
        updates.blurScreenshots = s.screenshot_blur;
      }
      if (typeof s.screenshot_mode === "string" && ["enabled", "blurred", "disabled"].includes(s.screenshot_mode)) {
        updates.screenshotMode = s.screenshot_mode;
      }
      if (typeof s.idle_threshold === "number" && s.idle_threshold >= 1) {
        updates.idleThreshold = s.idle_threshold;
      }
      if (typeof s.auto_stop_threshold === "number" && s.auto_stop_threshold >= 1) {
        updates.autoStopThreshold = s.auto_stop_threshold;
      }
      if (typeof s.background_mode === "boolean") {
        updates.backgroundMode = s.background_mode;
      }
      if (typeof s.app_tracking_enabled === "boolean") {
        updates.appTrackingEnabled = s.app_tracking_enabled;
      }
      if (typeof s.workday_end === "string") {
        updates.workdayEnd = s.workday_end;
      }
      if (Object.keys(updates).length > 0) {
        setConfig(updates);
        console.log("[CONFIG] Synced server settings:", JSON.stringify(updates));
      }
    }
  } catch (err) {
    console.error("[CONFIG] Failed to fetch server settings:", err);
  }
}
let settingsSyncInterval = null;
function startSettingsSync() {
  if (settingsSyncInterval) return;
  fetchServerSettings();
  settingsSyncInterval = setInterval(() => {
    fetchServerSettings();
  }, 5 * 60 * 1e3);
}
function registerConfigHandlers() {
  electron.ipcMain.handle("config:get", () => getConfig());
  electron.ipcMain.handle("config:set", (_event, config) => {
    setConfig(config);
  });
}
let keyboardCount = 0;
let mouseClickCount = 0;
let mouseMoveCount = 0;
let activityInterval = null;
let idleCheckInterval = null;
let uiohookInstance = null;
let activeSlots = /* @__PURE__ */ new Set();
let intervalStartTime = 0;
let lastInputTime = Date.now();
let idleNotified = false;
let lastMouseMoveTime = 0;
const MOUSE_MOVE_THROTTLE_MS = 500;
function markSlotActive() {
  if (intervalStartTime === 0) return;
  const slotIndex = Math.floor((Date.now() - intervalStartTime) / 1e3);
  activeSlots.add(slotIndex);
  lastInputTime = Date.now();
  idleNotified = false;
}
function getCurrentActivityLevel() {
  const config = getConfig();
  const totalSlots = config.activityInterval;
  if (totalSlots === 0) return 0;
  return Math.min(100, Math.round(activeSlots.size / totalSlots * 100));
}
function resetActivityCounts() {
  keyboardCount = 0;
  mouseClickCount = 0;
  mouseMoveCount = 0;
  activeSlots = /* @__PURE__ */ new Set();
  intervalStartTime = Date.now();
}
function getIdleSeconds() {
  return Math.floor((Date.now() - lastInputTime) / 1e3);
}
async function startActivityTracking() {
  if (uiohookInstance) return;
  try {
    const { uIOhook, UiohookKey: _UiohookKey } = await import("uiohook-napi");
    uIOhook.on("keydown", () => {
      keyboardCount++;
      markSlotActive();
    });
    uIOhook.on("click", () => {
      mouseClickCount++;
      markSlotActive();
    });
    uIOhook.on("mousemove", () => {
      const now = Date.now();
      if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE_MS) return;
      lastMouseMoveTime = now;
      mouseMoveCount++;
      markSlotActive();
    });
    uIOhook.on("wheel", () => {
      mouseClickCount++;
      markSlotActive();
    });
    uIOhook.start();
    uiohookInstance = uIOhook;
    lastInputTime = Date.now();
    intervalStartTime = Date.now();
    console.log("[ACTIVITY] uiohook-napi tracking started");
  } catch (err) {
    console.error("[ACTIVITY] Failed to start uiohook-napi:", err);
    console.log("[ACTIVITY] Falling back to no activity tracking");
    return;
  }
}
function startActivityLogging() {
  if (activityInterval) return;
  resetActivityCounts();
  const config = getConfig();
  activityInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;
    const intervalEnd = (/* @__PURE__ */ new Date()).toISOString();
    const intervalStart = new Date(
      Date.now() - config.activityInterval * 1e3
    ).toISOString();
    const activityPercent = getCurrentActivityLevel();
    const totalMouseCount = mouseClickCount + mouseMoveCount;
    const db2 = getDb();
    db2.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      ["activity", JSON.stringify({ time_entry_id: state.currentEntryId, interval_start: intervalStart, interval_end: intervalEnd, keyboard_count: keyboardCount, mouse_count: totalMouseCount, activity_percent: activityPercent })]
    );
    persistDb();
    console.log(
      `[ACTIVITY] Logged: keyboard=${keyboardCount}, clicks=${mouseClickCount}, moves=${mouseMoveCount}, slots=${activeSlots.size}/${config.activityInterval}, activity=${activityPercent}%`
    );
    resetActivityCounts();
  }, config.activityInterval * 1e3);
}
function stopActivityLogging() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
}
function startIdleDetection() {
  if (idleCheckInterval) return;
  idleCheckInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;
    const config = getConfig();
    const idleSec = getIdleSeconds();
    const idleThresholdSec = config.idleThreshold * 60;
    const autoStopSec = config.autoStopThreshold * 60;
    if (idleSec >= autoStopSec) {
      console.log(`[ACTIVITY] Auto-stop threshold reached (${config.autoStopThreshold}min idle)`);
      const win = getMainWindow();
      if (win) {
        win.webContents.send("idle:auto-stop", {
          idleSeconds: idleSec,
          trimSeconds: idleSec
        });
      }
      return;
    }
    if (idleSec >= idleThresholdSec && !idleNotified) {
      idleNotified = true;
      console.log(`[ACTIVITY] Idle detected: ${Math.floor(idleSec / 60)}min`);
      const win = getMainWindow();
      if (win) {
        win.webContents.send("idle:detected", {
          idleSeconds: idleSec
        });
      }
    }
  }, 1e4);
}
function stopIdleDetection() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
  idleNotified = false;
}
function stopActivityTracking() {
  stopActivityLogging();
  stopIdleDetection();
  if (uiohookInstance) {
    try {
      uiohookInstance.stop();
    } catch (err) {
      console.error("[ACTIVITY] Error stopping uiohook:", err);
    }
    uiohookInstance = null;
  }
  console.log("[ACTIVITY] Tracking stopped");
}
let screenshotTimeout = null;
function getRandomInterval() {
  const config = getConfig();
  const min = config.screenshotInterval.min * 60 * 1e3;
  const max = config.screenshotInterval.max * 60 * 1e3;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function scheduleNextScreenshot() {
  cancelScreenshotSchedule();
  const config = getConfig();
  if (config.screenshotMode === "disabled") {
    console.log("[SCREENSHOT] Screenshots disabled in config");
    return;
  }
  const interval = getRandomInterval();
  console.log(
    `[SCREENSHOT] Next capture in ${Math.round(interval / 6e4)} minutes`
  );
  screenshotTimeout = setTimeout(async () => {
    const state = getTimerState();
    if (state.isRunning) {
      await captureScreenshot();
      scheduleNextScreenshot();
    }
  }, interval);
}
function cancelScreenshotSchedule() {
  if (screenshotTimeout) {
    clearTimeout(screenshotTimeout);
    screenshotTimeout = null;
  }
}
async function captureScreenshot() {
  try {
    const config = getConfig();
    if (config.screenshotMode === "disabled") return null;
    const cursorPoint = electron.screen.getCursorScreenPoint();
    const cursorDisplay = electron.screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = cursorDisplay.size;
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height }
    });
    if (sources.length === 0) {
      console.error("[SCREENSHOT] No sources found");
      return null;
    }
    let source = sources[0];
    if (sources.length > 1) {
      const displayId = cursorDisplay.id.toString();
      const matched = sources.find((s) => s.display_id === displayId);
      if (matched) source = matched;
    }
    const thumbnail = source.thumbnail;
    if (thumbnail.isEmpty()) {
      console.error("[SCREENSHOT] Empty thumbnail");
      return null;
    }
    const pngBuffer = thumbnail.toPNG();
    const isBlurred = config.screenshotMode === "blurred";
    let webpBuffer;
    let thumbBuffer = null;
    try {
      const sharp = (await import("sharp")).default;
      let pipeline = sharp(pngBuffer).resize({ width: Math.min(width, 1920), withoutEnlargement: true });
      if (isBlurred) {
        pipeline = pipeline.blur(15);
      }
      webpBuffer = await pipeline.webp({ quality: 70 }).toBuffer();
      let thumbPipeline = sharp(pngBuffer).resize({ width: 320, withoutEnlargement: true });
      if (isBlurred) {
        thumbPipeline = thumbPipeline.blur(15);
      }
      thumbBuffer = await thumbPipeline.webp({ quality: 50 }).toBuffer();
    } catch (err) {
      console.error("[SCREENSHOT] Sharp compression failed, using PNG:", err);
      webpBuffer = pngBuffer;
    }
    const screenshotsDir = path.join(
      electron.app.getPath("userData"),
      "screenshots"
    );
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const ts = Date.now();
    const filename = `screenshot_${ts}.webp`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, webpBuffer);
    let thumbPath = null;
    if (thumbBuffer) {
      const thumbFilename = `thumb_${ts}.webp`;
      thumbPath = path.join(screenshotsDir, thumbFilename);
      fs.writeFileSync(thumbPath, thumbBuffer);
    }
    const activityLevel = getCurrentActivityLevel();
    const state = getTimerState();
    const db2 = getDb();
    db2.run(
      "INSERT INTO offline_queue (type, payload, file_path) VALUES (?, ?, ?)",
      ["screenshot", JSON.stringify({
        time_entry_id: state.currentEntryId,
        activity_level: activityLevel,
        captured_at: (/* @__PURE__ */ new Date()).toISOString(),
        is_blurred: isBlurred,
        thumb_path: thumbPath
      }), filepath]
    );
    persistDb();
    console.log(
      `[SCREENSHOT] Captured: ${filename} (${(webpBuffer.length / 1024).toFixed(1)}KB, activity: ${activityLevel}%${isBlurred ? ", blurred" : ""})`
    );
    const win = getMainWindow();
    if (win) {
      win.webContents.send("screenshot:captured", { path: filepath, thumbPath });
    }
    return filepath;
  } catch (err) {
    console.error("[SCREENSHOT] Capture failed:", err);
    return null;
  }
}
let pollInterval = null;
let flushInterval = null;
let samples = [];
let ps1ScriptPath = null;
const POLL_INTERVAL_MS = 5e3;
function ensurePsScript() {
  const scriptLines = [
    "try {",
    'Add-Type @"',
    "using System;",
    "using System.Runtime.InteropServices;",
    "using System.Text;",
    "public class Win32FG {",
    '  [DllImport("user32.dll")]',
    "  public static extern IntPtr GetForegroundWindow();",
    '  [DllImport("user32.dll", SetLastError=true)]',
    "  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);",
    '  [DllImport("user32.dll", CharSet=CharSet.Auto)]',
    "  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);",
    "}",
    '"@ -ErrorAction SilentlyContinue',
    "} catch {}",
    "$hwnd = [Win32FG]::GetForegroundWindow()",
    "$wpid = 0",
    "[Win32FG]::GetWindowThreadProcessId($hwnd, [ref]$wpid) | Out-Null",
    "$proc = Get-Process -Id $wpid -ErrorAction SilentlyContinue",
    "$sb = New-Object System.Text.StringBuilder 512",
    "[Win32FG]::GetWindowText($hwnd, $sb, 512) | Out-Null",
    'Write-Output "$($proc.ProcessName)|$($sb.ToString())"'
  ];
  const scriptContent = scriptLines.join("\r\n");
  const dir = path.join(electron.app.getPath("userData"), "scripts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  ps1ScriptPath = path.join(dir, "get-active-window.ps1");
  fs.writeFileSync(ps1ScriptPath, scriptContent, "utf-8");
  return ps1ScriptPath;
}
function getActiveWindow() {
  try {
    if (process.platform === "win32") {
      const scriptPath = ensurePsScript();
      const result = node_child_process.execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
        {
          timeout: 5e3,
          encoding: "utf-8",
          windowsHide: true
        }
      ).trim();
      const pipeIndex = result.indexOf("|");
      if (pipeIndex === -1) return null;
      const processName = result.substring(0, pipeIndex).trim();
      const windowTitle = result.substring(pipeIndex + 1).trim();
      if (!processName) return null;
      const appName = mapProcessToAppName(processName);
      return { appName, windowTitle };
    }
    if (process.platform === "darwin") {
      const result = node_child_process.execSync(
        `osascript -e 'tell application "System Events" to get {name, title of first window} of first application process whose frontmost is true'`,
        { timeout: 3e3, encoding: "utf-8", windowsHide: true }
      ).trim();
      const parts = result.split(", ");
      return {
        appName: parts[0] || "Unknown",
        windowTitle: parts.slice(1).join(", ") || ""
      };
    }
    return null;
  } catch {
    return null;
  }
}
function mapProcessToAppName(processName) {
  const map = {
    chrome: "Google Chrome",
    msedge: "Microsoft Edge",
    firefox: "Mozilla Firefox",
    brave: "Brave Browser",
    opera: "Opera",
    Code: "Visual Studio Code",
    devenv: "Visual Studio",
    WINWORD: "Microsoft Word",
    EXCEL: "Microsoft Excel",
    POWERPNT: "Microsoft PowerPoint",
    OUTLOOK: "Microsoft Outlook",
    Teams: "Microsoft Teams",
    slack: "Slack",
    Discord: "Discord",
    Figma: "Figma",
    Postman: "Postman",
    WindowsTerminal: "Windows Terminal",
    cmd: "Command Prompt",
    powershell: "PowerShell",
    explorer: "File Explorer",
    Spotify: "Spotify",
    notepad: "Notepad",
    "notepad++": "Notepad++"
  };
  return map[processName] || processName;
}
function aggregateSamples(samples2, intervalStart, intervalEnd) {
  const appMap = /* @__PURE__ */ new Map();
  for (const sample of samples2) {
    const existing = appMap.get(sample.appName);
    if (existing) {
      existing.duration += POLL_INTERVAL_MS / 1e3;
      if (sample.windowTitle) {
        existing.windowTitle = sample.windowTitle;
      }
    } else {
      appMap.set(sample.appName, {
        windowTitle: sample.windowTitle,
        duration: POLL_INTERVAL_MS / 1e3
      });
    }
  }
  const results = [];
  for (const [appName, data] of appMap) {
    results.push({
      app_name: appName,
      window_title: data.windowTitle || null,
      duration: data.duration,
      interval_start: intervalStart,
      interval_end: intervalEnd
    });
  }
  return results;
}
function startAppTracking() {
  if (pollInterval) return;
  const config = getConfig();
  if (!config.appTrackingEnabled) {
    console.log("[APP-TRACKER] App tracking disabled in config");
    return;
  }
  samples = [];
  pollInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;
    const win = getActiveWindow();
    if (win) {
      samples.push({
        appName: win.appName,
        windowTitle: win.windowTitle,
        timestamp: Date.now()
      });
    }
  }, POLL_INTERVAL_MS);
  flushInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning || samples.length === 0) return;
    const intervalEnd = (/* @__PURE__ */ new Date()).toISOString();
    const intervalStart = new Date(
      Date.now() - config.activityInterval * 1e3
    ).toISOString();
    const aggregated = aggregateSamples(samples, intervalStart, intervalEnd);
    samples = [];
    if (aggregated.length === 0) return;
    const db2 = getDb();
    db2.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      [
        "app_usage",
        JSON.stringify({
          time_entry_id: state.currentEntryId,
          entries: aggregated
        })
      ]
    );
    persistDb();
    const topApp = aggregated.sort((a, b) => b.duration - a.duration)[0];
    console.log(
      `[APP-TRACKER] Flushed ${aggregated.length} apps (top: ${topApp.app_name} ${topApp.duration}s)`
    );
  }, config.activityInterval * 1e3);
  console.log("[APP-TRACKER] Started (poll every 5s, flush every " + config.activityInterval + "s)");
}
function stopAppTracking() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  samples = [];
  console.log("[APP-TRACKER] Stopped");
}
let tickInterval = null;
function getTimerState() {
  const db2 = getDb();
  const results = db2.exec("SELECT is_running, current_entry_id, project_id, project_name, description, start_time, elapsed FROM timer_state WHERE id = 1");
  if (results.length === 0 || results[0].values.length === 0) {
    return { isRunning: false, currentEntryId: null, projectId: null, projectName: null, description: null, startTime: null, elapsed: 0 };
  }
  const v = results[0].values[0];
  const isRunning = v[0] === 1;
  const startTime = v[5];
  return {
    isRunning,
    currentEntryId: v[1],
    projectId: v[2],
    projectName: v[3],
    description: v[4],
    startTime,
    elapsed: isRunning && startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1e3) : v[6] || 0
  };
}
function saveTimerState(state) {
  const db2 = getDb();
  const sets = [];
  const values = [];
  if (state.isRunning !== void 0) {
    sets.push("is_running = ?");
    values.push(state.isRunning ? 1 : 0);
  }
  if (state.currentEntryId !== void 0) {
    sets.push("current_entry_id = ?");
    values.push(state.currentEntryId);
  }
  if (state.projectId !== void 0) {
    sets.push("project_id = ?");
    values.push(state.projectId);
  }
  if (state.projectName !== void 0) {
    sets.push("project_name = ?");
    values.push(state.projectName);
  }
  if (state.description !== void 0) {
    sets.push("description = ?");
    values.push(state.description);
  }
  if (state.startTime !== void 0) {
    sets.push("start_time = ?");
    values.push(state.startTime);
  }
  if (state.elapsed !== void 0) {
    sets.push("elapsed = ?");
    values.push(state.elapsed);
  }
  if (sets.length > 0) {
    db2.run(`UPDATE timer_state SET ${sets.join(", ")} WHERE id = 1`, values);
    persistDb();
  }
}
async function startTimer(data) {
  var _a;
  const state = getTimerState();
  if (state.isRunning) {
    return { success: false, error: "Timer is already running" };
  }
  const session = getStoredSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }
  const config = getConfig();
  const startTime = (/* @__PURE__ */ new Date()).toISOString();
  let entryId;
  let projectName = null;
  try {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        start_time: startTime,
        project_id: data.projectId || null,
        description: data.description || null,
        is_manual: false,
        is_billable: true
      })
    });
    if (response.ok) {
      const result = await response.json();
      entryId = result.data.id;
      projectName = ((_a = result.data.project) == null ? void 0 : _a.name) || null;
    } else {
      const db2 = getDb();
      db2.run(
        "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
        ["time_entry", JSON.stringify({ action: "create", start_time: startTime, project_id: data.projectId || null, description: data.description || null, is_manual: false, is_billable: true })]
      );
      persistDb();
      entryId = `local_${Date.now()}`;
    }
  } catch {
    const db2 = getDb();
    db2.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      ["time_entry", JSON.stringify({ action: "create", start_time: startTime, project_id: data.projectId || null, description: data.description || null, is_manual: false, is_billable: true })]
    );
    persistDb();
    entryId = `local_${Date.now()}`;
  }
  saveTimerState({
    isRunning: true,
    currentEntryId: entryId,
    projectId: data.projectId || null,
    projectName,
    description: data.description || null,
    startTime,
    elapsed: 0
  });
  startTickLoop();
  scheduleNextScreenshot();
  resetActivityCounts();
  startActivityLogging();
  startIdleDetection();
  startAppTracking();
  updateTrayMenu();
  return { success: true, entryId };
}
async function stopTimer() {
  const state = getTimerState();
  if (!state.isRunning) {
    return { success: false, error: "Timer is not running" };
  }
  stopTickLoop();
  cancelScreenshotSchedule();
  stopActivityLogging();
  stopIdleDetection();
  stopAppTracking();
  const endTime = (/* @__PURE__ */ new Date()).toISOString();
  const config = getConfig();
  if (state.currentEntryId && !state.currentEntryId.startsWith("local_")) {
    try {
      await fetch(`${config.serverUrl}/api/v1/time-entries`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          id: state.currentEntryId,
          action: "stop",
          end_time: endTime
        })
      });
    } catch {
      const db2 = getDb();
      db2.run(
        "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
        ["time_entry", JSON.stringify({ action: "stop", id: state.currentEntryId, end_time: endTime })]
      );
      persistDb();
    }
  }
  saveTimerState({
    isRunning: false,
    currentEntryId: null,
    projectId: null,
    projectName: null,
    description: null,
    startTime: null,
    elapsed: 0
  });
  updateTrayMenu();
  const win = getMainWindow();
  if (win) {
    win.webContents.send("timer:stopped");
  }
  return { success: true };
}
function startTickLoop() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) {
      stopTickLoop();
      return;
    }
    const win = getMainWindow();
    if (win) {
      win.webContents.send("timer:tick", state.elapsed);
    }
    const trayInstance = getTray();
    if (trayInstance) {
      const el = state.elapsed;
      const hours = Math.floor(el / 3600);
      const minutes = Math.floor(el % 3600 / 60);
      const seconds = el % 60;
      trayInstance.setToolTip(
        `7Roars Agent — ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${state.projectName || ""}`
      );
    }
  }, 1e3);
}
function stopTickLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}
async function startTimerFromTray() {
  await startTimer({});
}
async function stopTimerFromTray() {
  await stopTimer();
}
function registerTimerHandlers() {
  electron.ipcMain.handle(
    "timer:start",
    async (_event, data) => {
      return startTimer(data);
    }
  );
  electron.ipcMain.handle("timer:stop", async () => {
    return stopTimer();
  });
  electron.ipcMain.handle("timer:get-state", () => {
    return getTimerState();
  });
  electron.ipcMain.handle("idle:dismiss", () => {
    console.log("[TIMER] Idle dismissed by user");
  });
  electron.ipcMain.handle("idle:discard", async () => {
    console.log("[TIMER] Idle discard — stopping timer");
    await stopTimer();
  });
  const state = getTimerState();
  if (state.isRunning) {
    startTickLoop();
    scheduleNextScreenshot();
    startActivityLogging();
    startIdleDetection();
    startAppTracking();
  }
}
let tray = null;
function createTray(mainWindow2) {
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
  let icon;
  try {
    icon = electron.nativeImage.createFromPath(iconPath);
  } catch {
    icon = electron.nativeImage.createEmpty();
  }
  if (icon.isEmpty()) {
    icon = electron.nativeImage.createFromBuffer(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADsSURBVDiNpZMxDoJAEEX/LBZaGBN7E7wBd/AGeAPv4A3wBt7BO3gDSm0sjIUJLOwuYVnUn0wy2Z35M/N3FviXKOAEXIAGaIEbcAYuUsqfBBSQA0fgDmyBFbAGNr7oJ4EEyIADcAJKYAcUwNarfhJQ+yesgb1PcPcEYi9ggAJ4+gRXn+AKlD7BVUr5BWCAG3D2CRqfYA5MPcHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef8A3vF3YRLfwBbpgAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }
  tray = new electron.Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("7Roars Agent");
  updateTrayMenu(mainWindow2);
  tray.on("click", () => {
    mainWindow2.show();
    mainWindow2.focus();
  });
}
function updateTrayMenu(mainWindow2) {
  if (!tray) return;
  const state = getTimerState();
  const isRunning = state.isRunning;
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "7Roars Agent",
      enabled: false
    },
    { type: "separator" },
    {
      label: isRunning ? "⏱ Timer Running" : "⏸ Timer Stopped",
      enabled: false
    },
    {
      label: isRunning ? "Stop Timer" : "Start Timer",
      click: async () => {
        if (isRunning) {
          await stopTimerFromTray();
        } else {
          await startTimerFromTray();
        }
        updateTrayMenu(mainWindow2);
      }
    },
    { type: "separator" },
    {
      label: "Open Dashboard",
      click: () => {
        if (mainWindow2) {
          mainWindow2.show();
          mainWindow2.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Logout",
      click: async () => {
        const timerState = getTimerState();
        if (timerState.isRunning) {
          await stopTimer();
        }
        clearSession();
        if (mainWindow2) {
          mainWindow2.webContents.send("auth:required");
          mainWindow2.show();
          mainWindow2.focus();
        }
        updateTrayMenu(mainWindow2);
      }
    },
    {
      label: "Quit",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  if (isRunning) {
    const elapsed = state.elapsed;
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor(elapsed % 3600 / 60);
    tray.setToolTip(
      `7Roars Agent — ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${state.projectName || ""}`
    );
  } else {
    tray.setToolTip("7Roars Agent — Idle");
  }
}
function getTray() {
  return tray;
}
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
let cachedProjects = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1e3;
async function fetchProjects() {
  const session = getStoredSession();
  if (!session) return [];
  const now = Date.now();
  if (cachedProjects.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedProjects;
  }
  const config = getConfig();
  try {
    const response = await fetch(
      `${config.serverUrl}/api/v1/projects`,
      {
        headers: {
          ...getAuthHeaders()
        }
      }
    );
    if (response.ok) {
      const result = await response.json();
      cachedProjects = result.data || [];
      lastFetch = now;
      console.log(`[PROJECTS] Fetched ${cachedProjects.length} projects`);
    } else {
      const text = await response.text().catch(() => "");
      console.error(`[PROJECTS] Fetch failed (${response.status}):`, text);
    }
  } catch (err) {
    console.error("[PROJECTS] Failed to fetch:", err);
  }
  return cachedProjects;
}
function registerProjectHandlers() {
  electron.ipcMain.handle("projects:list", async () => {
    return fetchProjects();
  });
}
let dailySummaryTimeout = null;
function getTodayStats() {
  const db2 = getDb();
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const results = db2.exec(
    `SELECT payload FROM offline_queue WHERE type = 'activity' AND created_at >= '${todayStart.toISOString()}'`
  );
  let totalActivity = 0;
  let activityCount = 0;
  if (results.length > 0) {
    for (const row of results[0].values) {
      try {
        const data = JSON.parse(row[0]);
        totalActivity += data.activity_percent || 0;
        activityCount++;
      } catch {
      }
    }
  }
  const appResults = db2.exec(
    `SELECT payload FROM offline_queue WHERE type = 'app_usage' AND created_at >= '${todayStart.toISOString()}'`
  );
  const projects = /* @__PURE__ */ new Set();
  if (appResults.length > 0) {
    for (const row of appResults[0].values) {
      try {
        const data = JSON.parse(row[0]);
        if (data.time_entry_id) projects.add(data.time_entry_id);
      } catch {
      }
    }
  }
  const timerResults = db2.exec("SELECT elapsed, start_time FROM timer_state WHERE id = 1");
  let totalSeconds = 0;
  if (timerResults.length > 0 && timerResults[0].values.length > 0) {
    totalSeconds = timerResults[0].values[0][0] || 0;
  }
  return {
    totalSeconds,
    projectCount: Math.max(projects.size, 1),
    avgActivity: activityCount > 0 ? Math.round(totalActivity / activityCount) : 0
  };
}
function scheduleDailySummary() {
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
    dailySummaryTimeout = null;
  }
  const config = getConfig();
  const [hours, minutes] = config.workdayEnd.split(":").map(Number);
  const now = /* @__PURE__ */ new Date();
  const target = /* @__PURE__ */ new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();
  dailySummaryTimeout = setTimeout(() => {
    showDailySummary();
    scheduleDailySummary();
  }, delay);
  console.log(`[NOTIFICATIONS] Daily summary scheduled for ${target.toLocaleTimeString()} (in ${Math.round(delay / 6e4)}min)`);
}
function showDailySummary() {
  try {
    const stats = getTodayStats();
    const hours = Math.floor(stats.totalSeconds / 3600);
    const minutes = Math.floor(stats.totalSeconds % 3600 / 60);
    const notification = new electron.Notification({
      title: "7Roars — Daily Summary",
      body: `Today: ${hours}h ${minutes}m tracked across ${stats.projectCount} project${stats.projectCount !== 1 ? "s" : ""}. Activity: ${stats.avgActivity}%`,
      silent: false
    });
    notification.show();
    console.log(`[NOTIFICATIONS] Daily summary shown: ${hours}h ${minutes}m, ${stats.avgActivity}% activity`);
  } catch (err) {
    console.error("[NOTIFICATIONS] Failed to show daily summary:", err);
  }
}
function startDailySummarySchedule() {
  scheduleDailySummary();
}
let syncInterval = null;
let lastSyncConnected = false;
let lastSyncAt = null;
function startSyncLoop() {
  if (syncInterval) return;
  processQueue();
  sendHeartbeat();
  syncInterval = setInterval(() => {
    processQueue();
    sendHeartbeat();
  }, 3e4);
}
function getSyncStatus() {
  const db2 = getDb();
  const results = db2.exec("SELECT COUNT(*) FROM offline_queue");
  const queueSize = results.length > 0 ? results[0].values[0][0] : 0;
  return {
    connected: lastSyncConnected,
    queueSize,
    lastSyncAt
  };
}
function emitSyncStatus() {
  const win = getMainWindow();
  if (win) {
    win.webContents.send("sync:status", getSyncStatus());
  }
}
function registerSyncHandlers() {
  electron.ipcMain.handle("sync:get-status", () => {
    return getSyncStatus();
  });
}
function getQueueItems() {
  const db2 = getDb();
  const results = db2.exec("SELECT id, type, payload, file_path, retries FROM offline_queue ORDER BY created_at ASC LIMIT 20");
  if (results.length === 0 || results[0].values.length === 0) return [];
  return results[0].values.map((v) => ({
    id: v[0],
    type: v[1],
    payload: v[2],
    file_path: v[3],
    retries: v[4]
  }));
}
async function processQueue() {
  const session = getStoredSession();
  if (!session) return;
  const items = getQueueItems();
  if (items.length === 0) return;
  console.log(`[SYNC] Processing ${items.length} queued items`);
  const db2 = getDb();
  for (const item of items) {
    try {
      let success = false;
      switch (item.type) {
        case "time_entry":
          success = await syncTimeEntry(item.payload);
          break;
        case "screenshot":
          success = await syncScreenshot(item.payload, item.file_path);
          break;
        case "activity":
          success = await syncActivity(item.payload);
          break;
        case "app_usage":
          success = await syncAppUsage(item.payload);
          break;
        default:
          console.warn(`[SYNC] Unknown queue item type: ${item.type}`);
          success = true;
      }
      if (success) {
        db2.run("DELETE FROM offline_queue WHERE id = ?", [item.id]);
        if (item.file_path) {
          try {
            fs.unlinkSync(item.file_path);
          } catch {
          }
        }
      } else {
        db2.run(
          "UPDATE offline_queue SET retries = retries + 1, last_error = ? WHERE id = ?",
          ["Sync failed", item.id]
        );
      }
    } catch (err) {
      console.error(`[SYNC] Error processing item ${item.id}:`, err);
      db2.run(
        "UPDATE offline_queue SET retries = retries + 1, last_error = ? WHERE id = ?",
        [err instanceof Error ? err.message : "Unknown error", item.id]
      );
    }
  }
  db2.run("DELETE FROM offline_queue WHERE retries > 10");
  persistDb();
  lastSyncConnected = true;
  lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
  emitSyncStatus();
}
async function syncTimeEntry(payload) {
  const config = getConfig();
  const data = JSON.parse(payload);
  if (data.action === "create") {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        start_time: data.start_time,
        end_time: data.end_time || null,
        project_id: data.project_id || null,
        description: data.description || null,
        is_manual: data.is_manual ?? false,
        is_billable: data.is_billable ?? true
      })
    });
    return response.ok;
  }
  if (data.action === "stop") {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        id: data.id,
        action: "stop",
        end_time: data.end_time
      })
    });
    return response.ok;
  }
  return false;
}
async function syncScreenshot(payload, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.warn("[SYNC] Screenshot file not found:", filePath);
    return true;
  }
  const config = getConfig();
  const data = JSON.parse(payload);
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/webp" });
  formData.append("file", blob, `screenshot_${Date.now()}.webp`);
  if (data.thumb_path && fs.existsSync(data.thumb_path)) {
    const thumbBuffer = fs.readFileSync(data.thumb_path);
    const thumbBlob = new Blob([thumbBuffer], { type: "image/webp" });
    formData.append("thumbnail", thumbBlob, `thumb_${Date.now()}.webp`);
  }
  const metadata = {
    activity_level: data.activity_level || 0,
    captured_at: data.captured_at,
    is_blurred: data.is_blurred || false
  };
  if (data.time_entry_id && !data.time_entry_id.startsWith("local_")) {
    metadata.time_entry_id = data.time_entry_id;
  }
  formData.append("metadata", JSON.stringify(metadata));
  const headers = getAuthHeaders();
  delete headers["Content-Type"];
  console.log(`[SYNC] Uploading screenshot: ${filePath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);
  console.log(`[SYNC] Metadata:`, JSON.stringify(metadata));
  const response = await fetch(`${config.serverUrl}/api/v1/screenshots`, {
    method: "POST",
    headers,
    body: formData
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[SYNC] Screenshot upload failed (${response.status}):`, text.substring(0, 300));
  } else {
    console.log(`[SYNC] Screenshot uploaded successfully`);
    if (data.thumb_path) {
      try {
        fs.unlinkSync(data.thumb_path);
      } catch {
      }
    }
  }
  return response.ok;
}
async function sendHeartbeat() {
  const session = getStoredSession();
  if (!session) return;
  const config = getConfig();
  try {
    const timerState = getTimerState();
    await fetch(`${config.serverUrl}/api/v1/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        timerRunning: timerState.isRunning,
        projectId: timerState.projectId
      })
    });
  } catch {
  }
}
async function syncAppUsage(payload) {
  const config = getConfig();
  const data = JSON.parse(payload);
  const body = {
    entries: data.entries
  };
  if (data.time_entry_id && !data.time_entry_id.startsWith("local_")) {
    body.time_entry_id = data.time_entry_id;
  }
  const response = await fetch(`${config.serverUrl}/api/v1/app-usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(body)
  });
  return response.ok;
}
async function syncActivity(payload) {
  const config = getConfig();
  const data = JSON.parse(payload);
  const body = {
    interval_start: data.interval_start,
    interval_end: data.interval_end,
    keyboard_count: data.keyboard_count,
    mouse_count: data.mouse_count,
    activity_percent: data.activity_percent
  };
  if (data.time_entry_id && !data.time_entry_id.startsWith("local_")) {
    body.time_entry_id = data.time_entry_id;
  }
  const response = await fetch(`${config.serverUrl}/api/v1/activity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(body)
  });
  return response.ok;
}
electron.app.commandLine.appendSwitch("remote-debugging-port", "9222");
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 380,
    height: 600,
    minWidth: 340,
    minHeight: 500,
    maxWidth: 500,
    resizable: true,
    frame: false,
    transparent: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0f172a",
      symbolColor: "#94a3b8",
      height: 36
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  console.log("[MAIN] __dirname:", __dirname);
  console.log("[MAIN] MAIN_WINDOW_VITE_DEV_SERVER_URL:", "http://localhost:5173");
  console.log("[MAIN] MAIN_WINDOW_VITE_NAME:", "main_window");
  console.log("[MAIN] preload path:", path.join(__dirname, "preload.js"));
  {
    mainWindow.loadURL("http://localhost:5173");
  }
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[MAIN] did-fail-load:", code, desc);
  });
  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow == null ? void 0 : mainWindow.hide();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
function getMainWindow() {
  return mainWindow;
}
function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}
electron.app.on("ready", async () => {
  await initStore();
  const win = createWindow();
  createTray(win);
  registerAuthHandlers();
  registerTimerHandlers();
  registerProjectHandlers();
  registerConfigHandlers();
  registerSyncHandlers();
  startSyncLoop();
  startSettingsSync();
  startTokenRefreshLoop();
  startCleanupLoop();
  startDailySummarySchedule();
  const config = getConfig();
  if (config.serverUrl) {
    startActivityTracking();
  }
  electron.powerMonitor.on("lock-screen", async () => {
    console.log("[POWER] Screen locked — stopping timer");
    const timerState = getTimerState();
    if (timerState.isRunning) {
      await stopTimer();
      if (mainWindow) {
        mainWindow.webContents.send("power:locked");
      }
    }
  });
  electron.powerMonitor.on("suspend", async () => {
    console.log("[POWER] System suspended — stopping timer");
    const timerState = getTimerState();
    if (timerState.isRunning) {
      await stopTimer();
      if (mainWindow) {
        mainWindow.webContents.send("power:suspended");
      }
    }
  });
  electron.powerMonitor.on("unlock-screen", () => {
    console.log("[POWER] Screen unlocked");
    if (mainWindow) {
      mainWindow.webContents.send("power:unlocked");
    }
  });
  electron.powerMonitor.on("resume", () => {
    console.log("[POWER] System resumed");
    if (mainWindow) {
      mainWindow.webContents.send("power:resumed");
    }
  });
  if (config.backgroundMode) {
    electron.app.setLoginItemSettings({ openAtLogin: true });
  } else {
    electron.app.setLoginItemSettings({ openAtLogin: false });
  }
});
electron.app.on("window-all-closed", () => {
});
electron.app.on("before-quit", async () => {
  await stopTimer();
  stopActivityTracking();
  destroyTray();
  mainWindow == null ? void 0 : mainWindow.destroy();
  electron.app.exit(0);
});
electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
electron.ipcMain.handle("app:quit", () => {
  electron.app.quit();
});
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getMainWindow,
  showMainWindow
}, Symbol.toStringTag, { value: "Module" }));
exports.getMainWindow = getMainWindow;
exports.showMainWindow = showMainWindow;
