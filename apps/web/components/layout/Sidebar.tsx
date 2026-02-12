"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getNavItems } from "@/config/navigation";
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
};

export function Sidebar() {
  const pathname = usePathname();
  const navItems = getNavItems();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-active)] text-sm font-bold text-white">
            7R
          </div>
          <span className="text-sm font-semibold text-[var(--sidebar-text)]">
            7Roars Agency OS
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-[var(--sidebar-text)] hover:bg-white/10 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--sidebar-active)] text-white"
                      : "text-[var(--sidebar-text)] hover:bg-white/10"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <p className="text-xs text-gray-500">v1.0.0 — Phase 1</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md bg-[var(--sidebar-bg)] p-2 text-[var(--sidebar-text)] shadow-md md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[var(--sidebar-bg)] transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
