import { autoUpdater } from "electron";
import { getConfig } from "./config";

let updateReady = false;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let onUpdateReadyCallback: ((releaseName: string) => void) | null = null;

export function isUpdateReady(): boolean {
  return updateReady;
}

export function installUpdate(): void {
  if (updateReady) {
    autoUpdater.quitAndInstall();
  }
}

export function onUpdateReady(cb: (releaseName: string) => void): void {
  onUpdateReadyCallback = cb;
}

export function startAutoUpdater(): void {
  // Only run in packaged production app
  if (process.env.NODE_ENV === "development" || !process.defaultApp === false) {
    // Skip in dev — autoUpdater doesn't work without a signed/packaged app
  }

  const config = getConfig();
  const feedUrl = `${config.serverUrl}/updates/`;

  try {
    autoUpdater.setFeedURL({ url: feedUrl });
  } catch (err) {
    console.error("[UPDATER] Failed to set feed URL:", err);
    return;
  }

  autoUpdater.on("checking-for-update", () => {
    console.log("[UPDATER] Checking for update at", feedUrl);
  });

  autoUpdater.on("update-available", () => {
    console.log("[UPDATER] Update available — downloading...");
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[UPDATER] No update available");
  });

  autoUpdater.on("update-downloaded", (_event, _releaseNotes, releaseName) => {
    console.log(`[UPDATER] Update downloaded: ${releaseName}`);
    updateReady = true;
    if (onUpdateReadyCallback) {
      onUpdateReadyCallback(releaseName);
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("[UPDATER] Auto-update error:", err.message);
  });

  // Check after 15s on startup (give app time to fully initialize)
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error("[UPDATER] checkForUpdates failed:", err);
    }
  }, 15_000);

  // Then check every 4 hours
  updateCheckInterval = setInterval(() => {
    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error("[UPDATER] checkForUpdates failed:", err);
    }
  }, 4 * 60 * 60 * 1000);
}

export function stopAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}
