"use strict";
const electron = require("electron");
const api = {
  // Auth
  login: (credentials) => electron.ipcRenderer.invoke("auth:login", credentials),
  logout: () => electron.ipcRenderer.invoke("auth:logout"),
  getSession: () => electron.ipcRenderer.invoke("auth:get-session"),
  // Timer
  startTimer: (data) => electron.ipcRenderer.invoke("timer:start", data),
  stopTimer: () => electron.ipcRenderer.invoke("timer:stop"),
  getTimerState: () => electron.ipcRenderer.invoke("timer:get-state"),
  // Projects
  getProjects: () => electron.ipcRenderer.invoke("projects:list"),
  // Config
  getConfig: () => electron.ipcRenderer.invoke("config:get"),
  setConfig: (config) => electron.ipcRenderer.invoke("config:set", config),
  // Idle
  idleDismiss: () => electron.ipcRenderer.invoke("idle:dismiss"),
  idleDiscard: () => electron.ipcRenderer.invoke("idle:discard"),
  // Sync status
  getSyncStatus: () => electron.ipcRenderer.invoke("sync:get-status"),
  // Events from main process
  onTimerTick: (callback) => {
    const handler = (_event, elapsed) => callback(elapsed);
    electron.ipcRenderer.on("timer:tick", handler);
    return () => electron.ipcRenderer.removeListener("timer:tick", handler);
  },
  onTimerStopped: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("timer:stopped", handler);
    return () => electron.ipcRenderer.removeListener("timer:stopped", handler);
  },
  onScreenshotCaptured: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("screenshot:captured", handler);
    return () => electron.ipcRenderer.removeListener("screenshot:captured", handler);
  },
  onAuthRequired: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("auth:required", handler);
    return () => electron.ipcRenderer.removeListener("auth:required", handler);
  },
  onIdleDetected: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("idle:detected", handler);
    return () => electron.ipcRenderer.removeListener("idle:detected", handler);
  },
  onIdleAutoStop: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("idle:auto-stop", handler);
    return () => electron.ipcRenderer.removeListener("idle:auto-stop", handler);
  },
  onSyncStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("sync:status", handler);
    return () => electron.ipcRenderer.removeListener("sync:status", handler);
  },
  onPowerEvent: (callback) => {
    const events = ["power:locked", "power:suspended", "power:unlocked", "power:resumed"];
    const handlers = events.map((evt) => {
      const handler = () => callback(evt);
      electron.ipcRenderer.on(evt, handler);
      return { evt, handler };
    });
    return () => {
      for (const { evt, handler } of handlers) {
        electron.ipcRenderer.removeListener(evt, handler);
      }
    };
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
