"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDuration } from "@/lib/format";

const CATEGORY_COLORS: Record<string, string> = {
  PRODUCTIVE: "#5B4FE9",
  UNPRODUCTIVE: "#EF4444",
  NEUTRAL: "#F5A623",
  UNCLASSIFIED: "#94A3B8",
};

interface RecentApp {
  app_name: string;
  users: number;
  total_duration: number;
  last_url: string | null;
  last_title: string | null;
  category: string;
}

interface RecentAppsProps {
  data: RecentApp[];
}

export function RecentApps({ data }: RecentAppsProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Recently Used Apps</h3>
        <Link
          href="/apps-summary"
          className="flex items-center gap-1 text-xs font-medium text-[#5B4FE9] hover:underline"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No app usage today
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.map((app) => {
            const color = CATEGORY_COLORS[app.category] || CATEGORY_COLORS.UNCLASSIFIED;
            const initial = app.app_name.charAt(0).toUpperCase();
            return (
              <div key={app.app_name} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{app.app_name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {app.last_title || app.last_url || "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-gray-700">{formatDuration(app.total_duration)}</p>
                  <p className="text-xs text-gray-400">
                    {app.users} {app.users === 1 ? "user" : "users"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
