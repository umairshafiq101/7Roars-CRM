import { ipcMain } from "electron";
import { getDb, persistDb } from "./store";
import { getAuthHeaders, getStoredSession } from "./auth";
import type { AppConfig } from "../shared/types";

const DEFAULT_CONFIG: AppConfig = {
  serverUrl: "http://localhost:3000",
  screenshotInterval: { min: 5, max: 10 },
  activityInterval: 60,
  blurScreenshots: false,
};

export function getConfig(): AppConfig {
  const db = getDb();
  const results = db.exec("SELECT value FROM config WHERE key = 'app_config'");

  if (results.length === 0 || results[0].values.length === 0) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(results[0].values[0][0] as string) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function setConfig(partial: Partial<AppConfig>): void {
  const current = getConfig();
  const merged = { ...current, ...partial };
  const db = getDb();
  db.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
    ["app_config", JSON.stringify(merged)]
  );
  persistDb();
}

export async function fetchServerSettings(): Promise<void> {
  const session = getStoredSession();
  if (!session) return;

  const config = getConfig();
  try {
    const response = await fetch(`${config.serverUrl}/api/v1/settings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) return;

    const result = (await response.json()) as {
      success: boolean;
      data?: { settings: Record<string, unknown> };
    };

    if (result.success && result.data?.settings) {
      const s = result.data.settings;
      const updates: Partial<AppConfig> = {};

      if (typeof s.screenshot_interval === "number" && s.screenshot_interval >= 1) {
        updates.screenshotInterval = {
          min: Math.max(1, s.screenshot_interval - 1),
          max: s.screenshot_interval + 1,
        };
      }
      if (typeof s.activity_interval === "number" && s.activity_interval >= 10) {
        updates.activityInterval = s.activity_interval;
      }
      if (typeof s.screenshot_blur === "boolean") {
        updates.blurScreenshots = s.screenshot_blur;
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

let settingsSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startSettingsSync() {
  if (settingsSyncInterval) return;
  fetchServerSettings();
  settingsSyncInterval = setInterval(() => {
    fetchServerSettings();
  }, 5 * 60 * 1000); // Sync every 5 minutes
}

export function stopSettingsSync() {
  if (settingsSyncInterval) {
    clearInterval(settingsSyncInterval);
    settingsSyncInterval = null;
  }
}

export function registerConfigHandlers() {
  ipcMain.handle("config:get", () => getConfig());
  ipcMain.handle("config:set", (_event: Electron.IpcMainInvokeEvent, config: Partial<AppConfig>) => {
    setConfig(config);
  });
}
