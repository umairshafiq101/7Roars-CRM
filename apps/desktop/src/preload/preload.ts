import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    ipcRenderer.invoke("auth:login", credentials),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getSession: () => ipcRenderer.invoke("auth:get-session"),

  // Timer
  startTimer: (data: { projectId?: string; description?: string }) =>
    ipcRenderer.invoke("timer:start", data),
  stopTimer: () => ipcRenderer.invoke("timer:stop"),
  getTimerState: () => ipcRenderer.invoke("timer:get-state"),

  // Projects
  getProjects: () => ipcRenderer.invoke("projects:list"),

  // Config
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke("config:set", config),

  // Idle
  idleDismiss: () => ipcRenderer.invoke("idle:dismiss"),
  idleDiscard: () => ipcRenderer.invoke("idle:discard"),

  // Sync status
  getSyncStatus: () => ipcRenderer.invoke("sync:get-status"),

  // Events from main process
  onTimerTick: (callback: (elapsed: number, isRunning: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, elapsed: number, isRunning: boolean) =>
      callback(elapsed, isRunning);
    ipcRenderer.on("timer:tick", handler);
    return () => ipcRenderer.removeListener("timer:tick", handler);
  },
  onTimerStarted: (callback: (data: { entryId?: string; projectId?: string | null; projectName?: string | null; description?: string | null }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { entryId?: string; projectId?: string | null; projectName?: string | null; description?: string | null }) =>
      callback(data);
    ipcRenderer.on("timer:started", handler);
    return () => ipcRenderer.removeListener("timer:started", handler);
  },
  onTimerStopped: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("timer:stopped", handler);
    return () => ipcRenderer.removeListener("timer:stopped", handler);
  },
  onScreenshotCaptured: (callback: (data: { path: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { path: string }) =>
      callback(data);
    ipcRenderer.on("screenshot:captured", handler);
    return () => ipcRenderer.removeListener("screenshot:captured", handler);
  },
  onAuthRequired: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("auth:required", handler);
    return () => ipcRenderer.removeListener("auth:required", handler);
  },
  onIdleDetected: (callback: (data: { idleSeconds: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { idleSeconds: number }) =>
      callback(data);
    ipcRenderer.on("idle:detected", handler);
    return () => ipcRenderer.removeListener("idle:detected", handler);
  },
  onIdleAutoStop: (callback: (data: { idleSeconds: number; trimSeconds: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { idleSeconds: number; trimSeconds: number }) =>
      callback(data);
    ipcRenderer.on("idle:auto-stop", handler);
    return () => ipcRenderer.removeListener("idle:auto-stop", handler);
  },
  onSyncStatus: (callback: (data: { connected: boolean; queueSize: number; lastSyncAt: string | null }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { connected: boolean; queueSize: number; lastSyncAt: string | null }) =>
      callback(data);
    ipcRenderer.on("sync:status", handler);
    return () => ipcRenderer.removeListener("sync:status", handler);
  },
  onPowerEvent: (callback: (event: string) => void) => {
    const events = ["power:locked", "power:suspended", "power:unlocked", "power:resumed"];
    const handlers = events.map((evt) => {
      const handler = () => callback(evt);
      ipcRenderer.on(evt, handler);
      return { evt, handler };
    });
    return () => {
      for (const { evt, handler } of handlers) {
        ipcRenderer.removeListener(evt, handler);
      }
    };
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
