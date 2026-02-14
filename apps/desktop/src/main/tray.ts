import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import path from "node:path";
import { getTimerState, startTimerFromTray, stopTimerFromTray, stopTimer } from "./timer";
import { clearSession } from "./auth";

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");

  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  if (icon.isEmpty()) {
    icon = nativeImage.createFromBuffer(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADsSURBVDiNpZMxDoJAEEX/LBZaGBN7E7wBd/AGeAPv4A3wBt7BO3gDSm0sjIUJLOwuYVnUn0wy2Z35M/N3FviXKOAEXIAGaIEbcAYuUsqfBBSQA0fgDmyBFbAGNr7oJ4EEyIADcAJKYAcUwNarfhJQ+yesgb1PcPcEYi9ggAJ4+gRXn+AKlD7BVUr5BWCAG3D2CRqfYA5MPcHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef4OYT3HyCm09w8wluPsHNJ7j5BDef8A3vF3YRLfwBbpgAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("7Roars Agent");

  updateTrayMenu(mainWindow);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

export function updateTrayMenu(mainWindow?: BrowserWindow) {
  if (!tray) return;

  const state = getTimerState();
  const isRunning = state.isRunning;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "7Roars Agent",
      enabled: false,
    },
    { type: "separator" },
    {
      label: isRunning ? "⏱ Timer Running" : "⏸ Timer Stopped",
      enabled: false,
    },
    {
      label: isRunning ? "Stop Timer" : "Start Timer",
      click: async () => {
        if (isRunning) {
          await stopTimerFromTray();
        } else {
          await startTimerFromTray();
        }
        updateTrayMenu(mainWindow);
      },
    },
    { type: "separator" },
    {
      label: "Open Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
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
        if (mainWindow) {
          mainWindow.webContents.send("auth:required");
          mainWindow.show();
          mainWindow.focus();
        }
        updateTrayMenu(mainWindow);
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  if (isRunning) {
    const elapsed = state.elapsed;
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    tray.setToolTip(
      `7Roars Agent — ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${state.projectName || ""}`
    );
  } else {
    tray.setToolTip("7Roars Agent — Idle");
  }
}

export function getTray(): Tray | null {
  return tray;
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
