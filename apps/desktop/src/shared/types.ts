export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  member: {
    id: string;
    organization_id: string;
    role: string;
  };
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  is_manual: boolean;
  is_billable: boolean;
  project?: Project | null;
}

export interface ActivityData {
  keyboard_count: number;
  mouse_count: number;
  interval_start: string;
  interval_end: string;
  activity_percent: number;
}

export interface ScreenshotData {
  filepath: string;
  activity_level: number;
  captured_at: string;
  time_entry_id: string | null;
}

export interface QueueItem {
  id: number;
  type: "time_entry" | "screenshot" | "activity";
  payload: string;
  created_at: string;
  retries: number;
}

export interface TimerState {
  isRunning: boolean;
  currentEntryId: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  startTime: string | null;
  elapsed: number;
}

export interface AppConfig {
  serverUrl: string;
  screenshotInterval: { min: number; max: number };
  activityInterval: number;
  blurScreenshots: boolean;
}

export type IpcChannels = {
  // Auth
  "auth:login": (credentials: AuthCredentials) => Promise<{ success: boolean; error?: string }>;
  "auth:logout": () => Promise<void>;
  "auth:get-session": () => Promise<AuthSession | null>;

  // Timer
  "timer:start": (data: { projectId?: string; description?: string }) => Promise<{ success: boolean; entryId?: string; error?: string }>;
  "timer:stop": () => Promise<{ success: boolean; error?: string }>;
  "timer:get-state": () => Promise<TimerState>;

  // Projects
  "projects:list": () => Promise<Project[]>;

  // Config
  "config:get": () => Promise<AppConfig>;
  "config:set": (config: Partial<AppConfig>) => Promise<void>;
};
