import { getConfig } from "./config";
import { getTimerState } from "./timer";
import { getDb, persistDb } from "./store";
import { getMainWindow } from "./index";

let keyboardCount = 0;
let mouseClickCount = 0;
let mouseMoveCount = 0;
let activityInterval: ReturnType<typeof setInterval> | null = null;
let idleCheckInterval: ReturnType<typeof setInterval> | null = null;
let uiohookInstance: { start: () => void; stop: () => void } | null = null;

// Time-bucket tracking: 1-second slots
let activeSlots = new Set<number>();
let intervalStartTime = 0;

// Idle detection
let lastInputTime = Date.now();
let idleNotified = false;

// Mousemove throttle (max 2 events/sec = 500ms debounce)
let lastMouseMoveTime = 0;
const MOUSE_MOVE_THROTTLE_MS = 500;

function markSlotActive() {
  if (intervalStartTime === 0) return;
  const slotIndex = Math.floor((Date.now() - intervalStartTime) / 1000);
  activeSlots.add(slotIndex);
  lastInputTime = Date.now();
  idleNotified = false;
}

export function getCurrentActivityLevel(): number {
  const config = getConfig();
  const totalSlots = config.activityInterval;
  if (totalSlots === 0) return 0;
  return Math.min(100, Math.round((activeSlots.size / totalSlots) * 100));
}

export function resetActivityCounts() {
  keyboardCount = 0;
  mouseClickCount = 0;
  mouseMoveCount = 0;
  activeSlots = new Set<number>();
  intervalStartTime = Date.now();
}

export function getLastInputTime(): number {
  return lastInputTime;
}

export function getIdleSeconds(): number {
  return Math.floor((Date.now() - lastInputTime) / 1000);
}

export async function startActivityTracking() {
  if (uiohookInstance) return; // Already running

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

export function startActivityLogging() {
  if (activityInterval) return;

  resetActivityCounts();

  const config = getConfig();
  activityInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;

    const intervalEnd = new Date().toISOString();
    const intervalStart = new Date(
      Date.now() - config.activityInterval * 1000
    ).toISOString();

    const activityPercent = getCurrentActivityLevel();
    const totalMouseCount = mouseClickCount + mouseMoveCount;

    const db = getDb();
    db.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      ["activity", JSON.stringify({ time_entry_id: state.currentEntryId, interval_start: intervalStart, interval_end: intervalEnd, keyboard_count: keyboardCount, mouse_count: totalMouseCount, activity_percent: activityPercent })]
    );
    persistDb();

    console.log(
      `[ACTIVITY] Logged: keyboard=${keyboardCount}, clicks=${mouseClickCount}, moves=${mouseMoveCount}, slots=${activeSlots.size}/${config.activityInterval}, activity=${activityPercent}%`
    );

    resetActivityCounts();
  }, config.activityInterval * 1000);
}

export function stopActivityLogging() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
}

export function startIdleDetection() {
  if (idleCheckInterval) return;

  idleCheckInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;

    const config = getConfig();
    const idleSec = getIdleSeconds();
    const idleThresholdSec = config.idleThreshold * 60;
    const autoStopSec = config.autoStopThreshold * 60;

    if (idleSec >= autoStopSec) {
      // Auto-stop: handled by timer.ts via import
      console.log(`[ACTIVITY] Auto-stop threshold reached (${config.autoStopThreshold}min idle)`);
      const win = getMainWindow();
      if (win) {
        win.webContents.send("idle:auto-stop", {
          idleSeconds: idleSec,
          trimSeconds: idleSec,
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
          idleSeconds: idleSec,
        });
      }
    }
  }, 10_000); // Check every 10 seconds
}

export function stopIdleDetection() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
  idleNotified = false;
}

export function stopActivityTracking() {
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
