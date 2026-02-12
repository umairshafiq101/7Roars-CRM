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
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
