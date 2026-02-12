import { getConfig } from "./config";
import { getTimerState } from "./timer";
import { getDb, persistDb } from "./store";

let keyboardCount = 0;
let mouseCount = 0;
let activityInterval: ReturnType<typeof setInterval> | null = null;
let uiohookInstance: { start: () => void; stop: () => void } | null = null;

export function getCurrentActivityLevel(): number {
  const config = getConfig();
  const intervalSec = config.activityInterval;
  const totalEvents = keyboardCount + mouseCount;
  const maxEvents = intervalSec * 5;
  return Math.min(100, Math.round((totalEvents / maxEvents) * 100));
}

export function resetActivityCounts() {
  keyboardCount = 0;
  mouseCount = 0;
}

export async function startActivityTracking() {
  try {
    const { uIOhook, UiohookKey: _UiohookKey } = await import("uiohook-napi");

    uIOhook.on("keydown", () => {
      keyboardCount++;
    });

    uIOhook.on("click", () => {
      mouseCount++;
    });

    uIOhook.on("mousemove", () => {
      mouseCount++;
    });

    uIOhook.on("wheel", () => {
      mouseCount++;
    });

    uIOhook.start();
    uiohookInstance = uIOhook;

    console.log("[ACTIVITY] uiohook-napi tracking started");
  } catch (err) {
    console.error("[ACTIVITY] Failed to start uiohook-napi:", err);
    console.log("[ACTIVITY] Falling back to no activity tracking");
    return;
  }

  const config = getConfig();
  activityInterval = setInterval(() => {
    const state = getTimerState();
    if (!state.isRunning) return;

    const intervalEnd = new Date().toISOString();
    const intervalStart = new Date(
      Date.now() - config.activityInterval * 1000
    ).toISOString();

    const activityPercent = getCurrentActivityLevel();

    const db = getDb();
    db.run(
      "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
      ["activity", JSON.stringify({ time_entry_id: state.currentEntryId, interval_start: intervalStart, interval_end: intervalEnd, keyboard_count: keyboardCount, mouse_count: mouseCount, activity_percent: activityPercent })]
    );
    persistDb();

    console.log(
      `[ACTIVITY] Logged: keyboard=${keyboardCount}, mouse=${mouseCount}, activity=${activityPercent}%`
    );

    resetActivityCounts();
  }, config.activityInterval * 1000);
}

export function stopActivityTracking() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }

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
