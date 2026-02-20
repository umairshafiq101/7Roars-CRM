import { app, BrowserWindow, ipcMain, powerMonitor } from "electron";
import path from "node:path";

// Handle Squirrel installer events (create/remove shortcuts)
if (process.platform === "win32") {
  const { spawn } = require("node:child_process");
  const updateExe = path.resolve(
    path.dirname(process.execPath),
    "..",
    "Update.exe"
  );
  const handleSquirrelEvent = () => {
    const squirrelEvent = process.argv[1];
    if (!squirrelEvent) return false;
    const target = path.basename(process.execPath);
    switch (squirrelEvent) {
      case "--squirrel-install":
      case "--squirrel-updated":
        spawn(updateExe, ["--createShortcut", target], { detached: true });
        app.quit();
        return true;
      case "--squirrel-uninstall":
        spawn(updateExe, ["--removeShortcut", target], { detached: true });
        app.quit();
        return true;
      case "--squirrel-obsolete":
        app.quit();
        return true;
    }
    return false;
  };
  if (handleSquirrelEvent()) {
    process.exit(0);
  }
}

// Enable remote debugging for E2E testing
app.commandLine.appendSwitch("remote-debugging-port", "9222");

import { createTray, destroyTray, updateTrayMenu, getTray } from "./tray";
import { registerAuthHandlers, startTokenRefreshLoop } from "./auth";
import { registerTimerHandlers, stopTimer, getTimerState } from "./timer";
import { registerProjectHandlers } from "./projects";
import { registerConfigHandlers, getConfig, startSettingsSync } from "./config";
import { initStore, startCleanupLoop } from "./store";
import { startDailySummarySchedule } from "./notifications";
import { startSyncLoop, registerSyncHandlers } from "./sync";
import { startActivityTracking, stopActivityTracking } from "./activity";
import { startAutoUpdater, stopAutoUpdater, onUpdateReady } from "./updater";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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
      height: 36,
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log("[MAIN] __dirname:", __dirname);
  console.log("[MAIN] MAIN_WINDOW_VITE_DEV_SERVER_URL:", MAIN_WINDOW_VITE_DEV_SERVER_URL);
  console.log("[MAIN] MAIN_WINDOW_VITE_NAME:", MAIN_WINDOW_VITE_NAME);
  console.log("[MAIN] preload path:", path.join(__dirname, "preload.js"));

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log("[MAIN] loadFile path:", filePath);
    mainWindow.loadFile(filePath);
  }

  // DevTools: open manually with Ctrl+Shift+I (removed auto-open)

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[MAIN] did-fail-load:", code, desc);
  });

  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.on("ready", async () => {
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

  // Auto-update: only in packaged production app
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    onUpdateReady((releaseName: string) => {
      // Refresh tray menu to show "Restart to Update" item
      updateTrayMenu();
      // Show Windows balloon notification
      try {
        const trayInstance = getTray();
        if (trayInstance) {
          trayInstance.displayBalloon({
            title: "7Roars Agent Update Ready",
            content: `Version ${releaseName} downloaded. Right-click tray → "Restart to Update" to install.`,
            iconType: "info",
          });
        }
      } catch {
        // Balloon not supported on all platforms
      }
    });
    startAutoUpdater();
  }

  // Start uiohook global hooks once (always listening for input events)
  // Activity *logging* and idle detection are started/stopped with the timer
  const config = getConfig();
  if (config.serverUrl) {
    startActivityTracking();
  }

  // A5: System lock/sleep detection — auto-stop timer
  powerMonitor.on("lock-screen", async () => {
    console.log("[POWER] Screen locked — stopping timer");
    const timerState = getTimerState();
    if (timerState.isRunning) {
      await stopTimer();
      if (mainWindow) {
        mainWindow.webContents.send("power:locked");
      }
    }
  });

  powerMonitor.on("suspend", async () => {
    console.log("[POWER] System suspended — stopping timer");
    const timerState = getTimerState();
    if (timerState.isRunning) {
      await stopTimer();
      if (mainWindow) {
        mainWindow.webContents.send("power:suspended");
      }
    }
  });

  powerMonitor.on("unlock-screen", () => {
    console.log("[POWER] Screen unlocked");
    if (mainWindow) {
      mainWindow.webContents.send("power:unlocked");
    }
  });

  powerMonitor.on("resume", () => {
    console.log("[POWER] System resumed");
    if (mainWindow) {
      mainWindow.webContents.send("power:resumed");
    }
  });

  // D5: Auto-start on boot (background mode)
  if (config.backgroundMode) {
    app.setLoginItemSettings({ openAtLogin: true });
  } else {
    app.setLoginItemSettings({ openAtLogin: false });
  }
});

app.on("window-all-closed", () => {
  // Don't quit — keep running in tray
});

app.on("before-quit", async () => {
  await stopTimer();
  stopActivityTracking();
  stopAutoUpdater();
  destroyTray();
  mainWindow?.destroy();
  app.exit(0);
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

ipcMain.handle("app:quit", () => {
  app.quit();
});
