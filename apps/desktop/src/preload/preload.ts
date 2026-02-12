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

  // Events from main process
  onTimerTick: (callback: (elapsed: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, elapsed: number) =>
      callback(elapsed);
    ipcRenderer.on("timer:tick", handler);
    return () => ipcRenderer.removeListener("timer:tick", handler);
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
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
