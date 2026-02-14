import { ipcMain } from "electron";
import { getDb, persistDb } from "./store";
import { getConfig } from "./config";
import { getAuthHeaders, getStoredSession } from "./auth";
import { getMainWindow } from "./index";
import { updateTrayMenu, getTray } from "./tray";
import { scheduleNextScreenshot, cancelScreenshotSchedule } from "./screenshot";
import { resetActivityCounts, startActivityLogging, stopActivityLogging, startIdleDetection, stopIdleDetection, getIdleSeconds } from "./activity";
import { startAppTracking, stopAppTracking } from "./app-tracker";
import type { TimerState } from "../shared/types";

let tickInterval: ReturnType<typeof setInterval> | null = null;

export function getTimerState(): TimerState {
  const db = getDb();
  const results = db.exec("SELECT is_running, current_entry_id, project_id, project_name, description, start_time, elapsed FROM timer_state WHERE id = 1");

  if (results.length === 0 || results[0].values.length === 0) {
    return { isRunning: false, currentEntryId: null, projectId: null, projectName: null, description: null, startTime: null, elapsed: 0 };
  }

  const v = results[0].values[0];
  const isRunning = v[0] === 1;
  const startTime = v[5] as string | null;

  return {
    isRunning,
    currentEntryId: v[1] as string | null,
    projectId: v[2] as string | null,
    projectName: v[3] as string | null,
    description: v[4] as string | null,
    startTime,
    elapsed: isRunning && startTime
      ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      : (v[6] as number) || 0,
  };
}

function saveTimerState(state: Partial<TimerState>) {
  const db = getDb();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (state.isRunning !== undefined) {
    sets.push("is_running = ?");
    values.push(state.isRunning ? 1 : 0);
  }
  if (state.currentEntryId !== undefined) {
    sets.push("current_entry_id = ?");
    values.push(state.currentEntryId);
  }
  if (state.projectId !== undefined) {
    sets.push("project_id = ?");
    values.push(state.projectId);
  }
  if (state.projectName !== undefined) {
    sets.push("project_name = ?");
    values.push(state.projectName);
  }
  if (state.description !== undefined) {
    sets.push("description = ?");
    values.push(state.description);
  }
  if (state.startTime !== undefined) {
    sets.push("start_time = ?");
    values.push(state.startTime);
  }
  if (state.elapsed !== undefined) {
    sets.push("elapsed = ?");
    values.push(state.elapsed);
  }

  if (sets.length > 0) {
    db.run(`UPDATE timer_state SET ${sets.join(", ")} WHERE id = 1`, values);
    persistDb();
  }
}

async function startTimer(data: {
  projectId?: string;
  description?: string;
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const state = getTimerState();
  if (state.isRunning) {
    return { success: false, error: "Timer is already running" };
  }

  const session = getStoredSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const config = getConfig();
  const startTime = new Date().toISOString();

  let entryId: string | undefined;
  let projectName: string | null = null;

  try {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        start_time: startTime,
        project_id: data.projectId || null,
        description: data.description || null,
        is_manual: false,
        is_billable: true,
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as {
        data: { id: string; project?: { name: string } | null };
      };
      entryId = result.data.id;
      projectName = result.data.project?.name || null;
    } else {
      const db = getDb();
      db.run(
        "INSERT INTO offline_queue (type, payload) VALUES (?, ?)",
        ["time_entry", JSON.stringify({ action: "create", start_time: startTime, project_id: data.projectId || null, description: data.description || null, is_manual: false, is_billable: true })]
      );
      persistDb();
      entryId = `local_${Date.now()}`;
    }
  } catch {
    const db = getDb();
    db.run(
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
    elapsed: 0,
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

export async function stopTimer(): Promise<{
  success: boolean;
  error?: string;
}> {
  const state = getTimerState();
  if (!state.isRunning) {
    return { success: false, error: "Timer is not running" };
  }

  stopTickLoop();
  cancelScreenshotSchedule();
  stopActivityLogging();
  stopIdleDetection();
  stopAppTracking();

  const endTime = new Date().toISOString();
  const config = getConfig();

  if (state.currentEntryId && !state.currentEntryId.startsWith("local_")) {
    try {
      await fetch(`${config.serverUrl}/api/v1/time-entries`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          id: state.currentEntryId,
          action: "stop",
          end_time: endTime,
        }),
      });
    } catch {
      const db = getDb();
      db.run(
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
    elapsed: 0,
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

    // D3: Live tray tooltip update every tick
    const trayInstance = getTray();
    if (trayInstance) {
      const el = state.elapsed;
      const hours = Math.floor(el / 3600);
      const minutes = Math.floor((el % 3600) / 60);
      const seconds = el % 60;
      trayInstance.setToolTip(
        `7Roars Agent — ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${state.projectName || ""}`
      );
    }
  }, 1000);
}

function stopTickLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export async function startTimerFromTray() {
  await startTimer({});
}

export async function stopTimerFromTray() {
  await stopTimer();
}

export function registerTimerHandlers() {
  ipcMain.handle(
    "timer:start",
    async (_event, data: { projectId?: string; description?: string }) => {
      return startTimer(data);
    }
  );

  ipcMain.handle("timer:stop", async () => {
    return stopTimer();
  });

  ipcMain.handle("timer:get-state", () => {
    return getTimerState();
  });

  // Idle IPC handlers
  ipcMain.handle("idle:dismiss", () => {
    // User chose to keep tracking — just reset idle notification state
    console.log("[TIMER] Idle dismissed by user");
  });

  ipcMain.handle("idle:discard", async () => {
    // User chose to discard idle time — stop timer
    console.log("[TIMER] Idle discard — stopping timer");
    await stopTimer();
  });

  // Resume timer if it was running when app closed
  const state = getTimerState();
  if (state.isRunning) {
    startTickLoop();
    scheduleNextScreenshot();
    startActivityLogging();
    startIdleDetection();
    startAppTracking();
  }
}
