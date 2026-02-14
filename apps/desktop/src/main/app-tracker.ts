import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { getConfig } from "./config";
import { getTimerState } from "./timer";
import { getDb, persistDb } from "./store";
import type { AppUsageSample, AppUsageInterval } from "../shared/types";

let pollInterval: ReturnType<typeof setInterval> | null = null;
let flushInterval: ReturnType<typeof setInterval> | null = null;
let samples: AppUsageSample[] = [];
let ps1ScriptPath: string | null = null;

const POLL_INTERVAL_MS = 5_000; // Sample active window every 5 seconds

// Write the PowerShell script to a temp file once so we can invoke it reliably
function ensurePsScript(): string {

  // PowerShell here-string requires "@ at column 0 — build lines explicitly
  const scriptLines = [
    'try {',
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'using System.Text;',
    'public class Win32FG {',
    '  [DllImport("user32.dll")]',
    '  public static extern IntPtr GetForegroundWindow();',
    '  [DllImport("user32.dll", SetLastError=true)]',
    '  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);',
    '  [DllImport("user32.dll", CharSet=CharSet.Auto)]',
    '  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);',
    '}',
    '"@ -ErrorAction SilentlyContinue',
    '} catch {}',
    '$hwnd = [Win32FG]::GetForegroundWindow()',
    '$wpid = 0',
    '[Win32FG]::GetWindowThreadProcessId($hwnd, [ref]$wpid) | Out-Null',
    '$proc = Get-Process -Id $wpid -ErrorAction SilentlyContinue',
    '$sb = New-Object System.Text.StringBuilder 512',
    '[Win32FG]::GetWindowText($hwnd, $sb, 512) | Out-Null',
    'Write-Output "$($proc.ProcessName)|$($sb.ToString())"',
  ];
  const scriptContent = scriptLines.join('\r\n');

  const dir = path.join(app.getPath("userData"), "scripts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  ps1ScriptPath = path.join(dir, "get-active-window.ps1");
  fs.writeFileSync(ps1ScriptPath, scriptContent, "utf-8");
  return ps1ScriptPath;
}

function getActiveWindow(): { appName: string; windowTitle: string } | null {
  try {
    // Windows: Execute .ps1 script file
    if (process.platform === "win32") {
      const scriptPath = ensurePsScript();
      const result = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
        {
          timeout: 5000,
          encoding: "utf-8",
          windowsHide: true,
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

    // macOS: Use AppleScript
    if (process.platform === "darwin") {
      const result = execSync(
        `osascript -e 'tell application "System Events" to get {name, title of first window} of first application process whose frontmost is true'`,
        { timeout: 3000, encoding: "utf-8", windowsHide: true }
      ).trim();
      const parts = result.split(", ");
      return {
        appName: parts[0] || "Unknown",
        windowTitle: parts.slice(1).join(", ") || "",
      };
    }

    return null;
  } catch {
    return null;
  }
}

function mapProcessToAppName(processName: string): string {
  const map: Record<string, string> = {
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
    "notepad++": "Notepad++",
  };
  return map[processName] || processName;
}

function aggregateSamples(
  samples: AppUsageSample[],
  intervalStart: string,
  intervalEnd: string
): AppUsageInterval[] {
  // Group by appName, accumulate duration (each sample = 5 seconds)
  const appMap = new Map<string, { windowTitle: string; duration: number }>();

  for (const sample of samples) {
    const existing = appMap.get(sample.appName);
    if (existing) {
      existing.duration += POLL_INTERVAL_MS / 1000;
      // Keep the most recent window title
      if (sample.windowTitle) {
        existing.windowTitle = sample.windowTitle;
      }
    } else {
      appMap.set(sample.appName, {
        windowTitle: sample.windowTitle,
        duration: POLL_INTERVAL_MS / 1000,
      });
    }
  }

  const results: AppUsageInterval[] = [];
  for (const [appName, data] of appMap) {
    results.push({
      app_name: appName,
      window_title: data.windowTitle || null,
      duration: data.duration,
      interval_start: intervalStart,
      interval_end: intervalEnd,
    });
  }

  return results;
}

export function startAppTracking() {
  if (pollInterval) return;

  const config = getConfig();
  if (!config.appTrackingEnabled) {
    console.log("[APP-TRACKER] App tracking disabled in config");
    return;
  }

  samples = [];

  // Poll active window every 5 seconds
  pollInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;

    const win = getActiveWindow();
    if (win) {
      samples.push({
        appName: win.appName,
        windowTitle: win.windowTitle,
        timestamp: Date.now(),
      });
    }
  }, POLL_INTERVAL_MS);

  // Flush aggregated data every activity interval (default 60s)
  flushInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning || samples.length === 0) return;

    const intervalEnd = new Date().toISOString();
    const intervalStart = new Date(
      Date.now() - config.activityInterval * 1000
    ).toISOString();

    const aggregated = aggregateSamples(samples, intervalStart, intervalEnd);
    samples = [];

    if (aggregated.length === 0) return;

    const db = getDb();
    db.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      [
        "app_usage",
        JSON.stringify({
          time_entry_id: state.currentEntryId,
          entries: aggregated,
        }),
      ]
    );
    persistDb();

    const topApp = aggregated.sort((a, b) => b.duration - a.duration)[0];
    console.log(
      `[APP-TRACKER] Flushed ${aggregated.length} apps (top: ${topApp.app_name} ${topApp.duration}s)`
    );
  }, config.activityInterval * 1000);

  console.log("[APP-TRACKER] Started (poll every 5s, flush every " + config.activityInterval + "s)");
}

export function stopAppTracking() {
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
