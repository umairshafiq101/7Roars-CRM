export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export type ProjectStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export type ClientStatus = "LEAD" | "ACTIVE" | "PAUSED" | "CHURNED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Member {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  hourly_rate: number | null;
  is_active: boolean;
  joined_at: Date;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  start_time: Date;
  end_time: Date | null;
  duration: number | null;
  is_manual: boolean;
  is_billable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Screenshot {
  id: string;
  user_id: string;
  time_entry_id: string | null;
  image_url: string;
  thumbnail_url: string;
  activity_level: number;
  is_blurred: boolean;
  captured_at: Date;
  created_at: Date;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  time_entry_id: string | null;
  interval_start: Date;
  interval_end: Date;
  keyboard_count: number;
  mouse_count: number;
  activity_percent: number;
  created_at: Date;
}
