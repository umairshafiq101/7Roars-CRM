import type { MemberRole } from "@7roars/shared";

export type ModuleGroupId =
  | "dashboard"
  | "tracking"
  | "task-tracking"
  | "leave-management"
  | "insights"
  | "cost-management"
  | "system";

export interface ModuleGroup {
  id: ModuleGroupId;
  label: string;
  order: number;
}

export const moduleGroups: ModuleGroup[] = [
  { id: "dashboard", label: "Dashboard", order: 0 },
  { id: "tracking", label: "Tracking", order: 1 },
  { id: "task-tracking", label: "Task Tracking", order: 2 },
  { id: "leave-management", label: "Leave Management", order: 3 },
  { id: "insights", label: "Insights", order: 4 },
  { id: "cost-management", label: "Cost Management", order: 5 },
  { id: "system", label: "System", order: 6 },
];

export interface Module {
  id: string;
  name: string;
  icon: string;
  href: string;
  enabled: boolean;
  requiredRole: MemberRole[];
  version: string;
  group: ModuleGroupId;
  badge?: string;
}

export const modules: Module[] = [
  // ── Dashboard ──
  {
    id: "dashboard",
    name: "Overview",
    icon: "LayoutDashboard",
    href: "/dashboard",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
    group: "dashboard",
  },
  {
    id: "team",
    name: "Team",
    icon: "Users",
    href: "/team",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
    group: "dashboard",
  },

  // ── Tracking ──
  {
    id: "my-activities",
    name: "My Activities",
    icon: "Activity",
    href: "/my-activities",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.3",
    group: "tracking",
  },
  {
    id: "screenshots",
    name: "Screenshots",
    icon: "Camera",
    href: "/screenshots",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
    group: "tracking",
  },
  {
    id: "timelapse",
    name: "Timelapse Videos",
    icon: "Video",
    href: "/timelapse",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "tracking",
  },
  {
    id: "timesheets",
    name: "Timesheet",
    icon: "Clock",
    href: "/timesheets",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
    group: "tracking",
  },
  {
    id: "manual-entries",
    name: "Manual Time Entries",
    icon: "PenLine",
    href: "/manual-entries",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.3",
    group: "tracking",
  },
  {
    id: "app-usage",
    name: "Review Apps",
    icon: "AppWindow",
    href: "/app-usage",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.1",
    group: "tracking",
  },

  // ── Task Tracking ──
  {
    id: "tasks",
    name: "Tasks",
    icon: "CheckSquare",
    href: "/tasks",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
    group: "task-tracking",
  },
  {
    id: "projects",
    name: "Projects",
    icon: "FolderKanban",
    href: "/projects",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
    group: "task-tracking",
  },
  {
    id: "clients",
    name: "Customers",
    icon: "Building2",
    href: "/clients",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.2",
    group: "task-tracking",
  },

  // ── Leave Management ──
  {
    id: "leave-requests",
    name: "Leave Requests",
    icon: "CalendarCheck",
    href: "/leave-requests",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.3",
    group: "leave-management",
    badge: "BETA",
  },
  {
    id: "leave-rights",
    name: "Leave Rights",
    icon: "Shield",
    href: "/leave-rights",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.3",
    group: "leave-management",
  },

  // ── Insights ──
  {
    id: "work-times",
    name: "Work Times",
    icon: "Timer",
    href: "/work-times",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "insights",
  },
  {
    id: "productivity",
    name: "Productivity",
    icon: "TrendingUp",
    href: "/productivity",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.1",
    group: "insights",
  },
  {
    id: "task-insights",
    name: "Task Insights",
    icon: "BarChart2",
    href: "/task-insights",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "insights",
  },
  {
    id: "apps-summary",
    name: "Apps Summary",
    icon: "LayoutGrid",
    href: "/apps-summary",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "insights",
  },
  {
    id: "advanced-insights",
    name: "Advanced Insights",
    icon: "Sparkles",
    href: "/advanced-insights",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "insights",
  },
  {
    id: "productivity-coach",
    name: "Productivity Coach",
    icon: "Brain",
    href: "/productivity-coach",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.3",
    group: "insights",
  },
  {
    id: "reports",
    name: "Reports",
    icon: "BarChart3",
    href: "/reports",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
    group: "insights",
  },

  // ── Cost Management ──
  {
    id: "invoices",
    name: "Invoices",
    icon: "Receipt",
    href: "/invoices",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.2",
    group: "cost-management",
  },
  {
    id: "payroll",
    name: "Payroll Calculator",
    icon: "Calculator",
    href: "/payroll",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.3",
    group: "cost-management",
  },

  // ── System ──
  {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    href: "/settings",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
    group: "system",
  },
];

export function getEnabledModules(): Module[] {
  return modules.filter((m) => m.enabled);
}

export function getModulesForRole(role: MemberRole): Module[] {
  return modules.filter((m) => m.enabled && m.requiredRole.includes(role));
}
