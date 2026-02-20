"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getGroupedNavItems } from "@/config/navigation";
import type { NavGroup } from "@/config/navigation";
import {
  LayoutDashboard,
  Clock,
  Camera,
  Users,
  FolderKanban,
  CheckSquare,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  Activity,
  Video,
  PenLine,
  AppWindow,
  CalendarCheck,
  Shield,
  Timer,
  TrendingUp,
  BarChart2,
  LayoutGrid,
  Sparkles,
  Brain,
  Calculator,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Clock,
  Camera,
  Users,
  FolderKanban,
  CheckSquare,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  Activity,
  Video,
  PenLine,
  AppWindow,
  CalendarCheck,
  Shield,
  Timer,
  TrendingUp,
  BarChart2,
  LayoutGrid,
  Sparkles,
  Brain,
  Calculator,
};

function SidebarGroupSection({
  group,
  pathname,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const hasActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
          hasActive
            ? "text-[var(--sidebar-text-active)]"
            : "text-[var(--sidebar-group-text)]"
        )}
      >
        {group.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isExpanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {isExpanded && (
        <ul className="space-y-0.5 pb-2">
          {group.items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active)] border-l-[3px] border-[var(--sidebar-active)] ml-0 pl-[9px]"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-[var(--sidebar-active)]" : ""
                      )}
                    />
                  )}
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge && (
                    <span className="rounded-full bg-[var(--accent-orange)] px-2 py-0.5 text-[10px] font-bold text-white leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const groups = getGroupedNavItems();
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      groups.forEach((g) => {
        initial[g.id] = true;
      });
      return initial;
    }
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] shadow-sm">
            <svg
              width="22"
              height="22"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 6L26 16L8 26V6Z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M8 6L20 16L8 12V6Z"
                fill="#F5A623"
              />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              7Roars
            </span>
            <span className="ml-1 text-[11px] font-medium text-[var(--sidebar-group-text)]">
              OS
            </span>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation groups */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <SidebarGroupSection
            key={group.id}
            group={group}
            pathname={pathname}
            isExpanded={expandedGroups[group.id] ?? true}
            onToggle={() => toggleGroup(group.id)}
            onNavigate={() => setOpen(false)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] px-4 py-3">
        <p className="text-[11px] font-medium text-[var(--sidebar-group-text)]">
          7Roars Agency OS v1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-4 z-40 rounded-lg bg-white p-2 text-[var(--foreground)] shadow-md border border-[var(--border)] md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--sidebar-bg)] shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
