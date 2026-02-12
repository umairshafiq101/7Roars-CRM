import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

// Enable remote debugging for E2E testing
app.commandLine.appendSwitch("remote-debugging-port", "9222");

import { createTray, destroyTray } from "./tray";
import { registerAuthHandlers } from "./auth";
import { registerTimerHandlers, stopTimer } from "./timer";
import { registerProjectHandlers } from "./projects";
import { registerConfigHandlers, getConfig, startSettingsSync } from "./config";
import { initStore } from "./store";
import { startSyncLoop } from "./sync";
import { startActivityTracking, stopActivityTracking } from "./activity";

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

  startSyncLoop();
  startSettingsSync();

  const config = getConfig();
  if (config.serverUrl) {
    startActivityTracking();
  }
});

app.on("window-all-closed", () => {
  // Don't quit — keep running in tray
});

app.on("before-quit", async () => {
  await stopTimer();
  stopActivityTracking();
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
