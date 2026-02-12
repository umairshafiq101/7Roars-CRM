import fs from "node:fs";
import { getDb, persistDb } from "./store";
import { getConfig } from "./config";
import { getAuthHeaders, getStoredSession } from "./auth";
import { getTimerState } from "./timer";

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startSyncLoop() {
  if (syncInterval) return;

  processQueue();
  sendHeartbeat();

  syncInterval = setInterval(() => {
    processQueue();
    sendHeartbeat();
  }, 30_000);
}

export function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

interface QueueRow {
  id: number;
  type: string;
  payload: string;
  file_path: string | null;
  retries: number;
}

function getQueueItems(): QueueRow[] {
  const db = getDb();
  const results = db.exec("SELECT id, type, payload, file_path, retries FROM offline_queue ORDER BY created_at ASC LIMIT 20");
  if (results.length === 0 || results[0].values.length === 0) return [];
  return results[0].values.map((v) => ({
    id: v[0] as number,
    type: v[1] as string,
    payload: v[2] as string,
    file_path: v[3] as string | null,
    retries: v[4] as number,
  }));
}

async function processQueue() {
  const session = getStoredSession();
  if (!session) return;

  const items = getQueueItems();
  if (items.length === 0) return;

  console.log(`[SYNC] Processing ${items.length} queued items`);
  const db = getDb();

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
        default:
          console.warn(`[SYNC] Unknown queue item type: ${item.type}`);
          success = true;
      }

      if (success) {
        db.run("DELETE FROM offline_queue WHERE id = ?", [item.id]);

        if (item.file_path) {
          try {
            fs.unlinkSync(item.file_path);
          } catch {
            // File may already be deleted
          }
        }
      } else {
        db.run(
          "UPDATE offline_queue SET retries = retries + 1, last_error = ? WHERE id = ?",
          ["Sync failed", item.id]
        );
      }
    } catch (err) {
      console.error(`[SYNC] Error processing item ${item.id}:`, err);
      db.run(
        "UPDATE offline_queue SET retries = retries + 1, last_error = ? WHERE id = ?",
        [err instanceof Error ? err.message : "Unknown error", item.id]
      );
    }
  }

  db.run("DELETE FROM offline_queue WHERE retries > 10");
  persistDb();
}

async function syncTimeEntry(payload: string): Promise<boolean> {
  const config = getConfig();
  const data = JSON.parse(payload);

  if (data.action === "create") {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        start_time: data.start_time,
        end_time: data.end_time || null,
        project_id: data.project_id || null,
        description: data.description || null,
        is_manual: data.is_manual ?? false,
        is_billable: data.is_billable ?? true,
      }),
    });
    return response.ok;
  }

  if (data.action === "stop") {
    const response = await fetch(`${config.serverUrl}/api/v1/time-entries`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        id: data.id,
        action: "stop",
        end_time: data.end_time,
      }),
    });
    return response.ok;
  }

  return false;
}

async function syncScreenshot(
  payload: string,
  filePath: string | null
): Promise<boolean> {
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

  const metadata: Record<string, unknown> = {
    activity_level: data.activity_level || 0,
    captured_at: data.captured_at,
  };
  if (data.time_entry_id && !data.time_entry_id.startsWith("local_")) {
    metadata.time_entry_id = data.time_entry_id;
  }
  formData.append("metadata", JSON.stringify(metadata));

  const headers = getAuthHeaders();
  // Remove Content-Type so fetch sets multipart boundary automatically
  delete headers["Content-Type"];

  console.log(`[SYNC] Uploading screenshot: ${filePath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);
  console.log(`[SYNC] Metadata:`, JSON.stringify(metadata));

  const response = await fetch(`${config.serverUrl}/api/v1/screenshots`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[SYNC] Screenshot upload failed (${response.status}):`, text.substring(0, 300));
  } else {
    console.log(`[SYNC] Screenshot uploaded successfully`);
  }

  return response.ok;
}

async function sendHeartbeat(): Promise<void> {
  const session = getStoredSession();
  if (!session) return;

  const config = getConfig();
  try {
    const timerState = getTimerState();
    await fetch(`${config.serverUrl}/api/v1/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        timerRunning: timerState.isRunning,
        projectId: timerState.projectId,
      }),
    });
  } catch {
    // Heartbeat failure is non-critical
  }
}

async function syncActivity(payload: string): Promise<boolean> {
  const config = getConfig();
  const data = JSON.parse(payload);

  const body: Record<string, unknown> = {
    interval_start: data.interval_start,
    interval_end: data.interval_end,
    keyboard_count: data.keyboard_count,
    mouse_count: data.mouse_count,
    activity_percent: data.activity_percent,
  };

  if (data.time_entry_id && !data.time_entry_id.startsWith("local_")) {
    body.time_entry_id = data.time_entry_id;
  }

  const response = await fetch(`${config.serverUrl}/api/v1/activity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  return response.ok;
}
