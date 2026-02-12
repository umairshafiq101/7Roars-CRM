import { getEnabledModules } from "./modules";
import type { Module } from "./modules";

export interface NavItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  requiredRole: string[];
}

export function getNavItems(): NavItem[] {
  return getEnabledModules().map((m: Module) => ({
    id: m.id,
    name: m.name,
    icon: m.icon,
    href: m.href,
    requiredRole: m.requiredRole,
  }));
}
