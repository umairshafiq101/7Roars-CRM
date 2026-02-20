import { getEnabledModules, moduleGroups } from "./modules";
import type { Module, ModuleGroupId } from "./modules";

export interface NavItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  requiredRole: string[];
  badge?: string;
}

export interface NavGroup {
  id: ModuleGroupId;
  label: string;
  order: number;
  items: NavItem[];
}

export function getNavItems(): NavItem[] {
  return getEnabledModules().map((m: Module) => ({
    id: m.id,
    name: m.name,
    icon: m.icon,
    href: m.href,
    requiredRole: m.requiredRole,
    badge: m.badge,
  }));
}

export function getGroupedNavItems(): NavGroup[] {
  const enabled = getEnabledModules();

  const groupMap = new Map<ModuleGroupId, NavItem[]>();

  for (const m of enabled) {
    const items = groupMap.get(m.group) || [];
    items.push({
      id: m.id,
      name: m.name,
      icon: m.icon,
      href: m.href,
      requiredRole: m.requiredRole,
      badge: m.badge,
    });
    groupMap.set(m.group, items);
  }

  return moduleGroups
    .filter((g) => groupMap.has(g.id))
    .map((g) => ({
      id: g.id,
      label: g.label,
      order: g.order,
      items: groupMap.get(g.id) || [],
    }))
    .sort((a, b) => a.order - b.order);
}
