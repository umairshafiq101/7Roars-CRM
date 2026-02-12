import type { MemberRole } from "@7roars/shared";

export interface Module {
  id: string;
  name: string;
  icon: string;
  href: string;
  enabled: boolean;
  requiredRole: MemberRole[];
  version: string;
}

export const modules: Module[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "LayoutDashboard",
    href: "/dashboard",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
  },
  {
    id: "timesheets",
    name: "Timesheets",
    icon: "Clock",
    href: "/timesheets",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.0",
  },
  {
    id: "screenshots",
    name: "Screenshots",
    icon: "Camera",
    href: "/screenshots",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
  },
  {
    id: "team",
    name: "Team",
    icon: "Users",
    href: "/team",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
  },
  {
    id: "projects",
    name: "Projects",
    icon: "FolderKanban",
    href: "/projects",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: "CheckSquare",
    href: "/tasks",
    enabled: false,
    requiredRole: ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"],
    version: "1.1",
  },
  {
    id: "clients",
    name: "Clients",
    icon: "Building2",
    href: "/clients",
    enabled: false,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.2",
  },
  {
    id: "invoices",
    name: "Invoices",
    icon: "Receipt",
    href: "/invoices",
    enabled: false,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.2",
  },
  {
    id: "reports",
    name: "Reports",
    icon: "BarChart3",
    href: "/reports",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN", "MANAGER"],
    version: "1.0",
  },
  {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    href: "/settings",
    enabled: true,
    requiredRole: ["OWNER", "ADMIN"],
    version: "1.0",
  },
];

export function getEnabledModules(): Module[] {
  return modules.filter((m) => m.enabled);
}

export function getModulesForRole(role: MemberRole): Module[] {
  return modules.filter((m) => m.enabled && m.requiredRole.includes(role));
}
