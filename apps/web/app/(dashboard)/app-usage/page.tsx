"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAppUsageData, classifyApp, getTeamMembersForFilter } from "@/actions/app-usage";

type AppCategory = "PRODUCTIVE" | "UNPRODUCTIVE" | "NEUTRAL" | "UNCLASSIFIED";

interface AppUsageRow {
  app_name: string;
  total_duration: number;
  productive_duration: number;
  unproductive_duration: number;
  neutral_duration: number;
  unclassified_duration: number;
  is_productive: boolean | null;
  users: number;
  category: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "PRODUCTIVE": return "#22c55e";
    case "UNPRODUCTIVE": return "#ef4444";
    case "NEUTRAL": return "#eab308";
    default: return "#64748b";
  }
}

function getCategoryBg(category: string): string {
  switch (category) {
    case "PRODUCTIVE": return "rgba(34, 197, 94, 0.1)";
    case "UNPRODUCTIVE": return "rgba(239, 68, 68, 0.1)";
    case "NEUTRAL": return "rgba(234, 179, 8, 0.1)";
    default: return "rgba(100, 116, 139, 0.1)";
  }
}

export default function AppUsagePage() {
  const [apps, setApps] = useState<AppUsageRow[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      start: today.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAppUsageData({
        startDate: new Date(dateRange.start).toISOString(),
        endDate: new Date(dateRange.end + "T23:59:59").toISOString(),
        userId: selectedUser || undefined,
      });
      setApps(result.apps || []);
      setTotalDuration(result.totalDuration || 0);
    } catch (err) {
      console.error("Failed to load app usage:", err);
    }
    setLoading(false);
  }, [dateRange, selectedUser]);

  useEffect(() => {
    loadData();
    getTeamMembersForFilter().then(setMembers).catch(() => {});
  }, [loadData]);

  async function handleClassify(appName: string, category: AppCategory) {
    const result = await classifyApp(appName, category);
    if (result.success) {
      loadData();
    }
  }

  const productiveTime = apps.reduce((sum, a) => sum + a.productive_duration, 0);
  const unproductiveTime = apps.reduce((sum, a) => sum + a.unproductive_duration, 0);
  const productivePercent = totalDuration > 0 ? Math.round((productiveTime / totalDuration) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">App Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track which applications your team uses during work hours
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {members.length > 1 && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total App Time</div>
          <div className="text-2xl font-bold text-foreground mt-1">{formatDuration(totalDuration)}</div>
          <div className="text-xs text-muted-foreground mt-1">{apps.length} apps tracked</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Productive</div>
          <div className="text-2xl font-bold text-green-500 mt-1">{formatDuration(productiveTime)}</div>
          <div className="text-xs text-muted-foreground mt-1">{productivePercent}% of total</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Unproductive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">{formatDuration(unproductiveTime)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalDuration > 0 ? Math.round((unproductiveTime / totalDuration) * 100) : 0}% of total
          </div>
        </div>
      </div>

      {/* App Usage Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Applications</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : apps.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No app usage data for this period. Make sure the desktop agent is running with app tracking enabled.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map((app) => (
              <div key={app.app_name} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-primary/10 text-primary shrink-0">
                    {app.app_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{app.app_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.users} user{app.users !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Duration bar */}
                  <div className="w-32 hidden sm:block">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (app.total_duration / (apps[0]?.total_duration || 1)) * 100)}%`,
                          backgroundColor: getCategoryColor(app.category),
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-sm font-medium text-foreground w-16 text-right">
                    {formatDuration(app.total_duration)}
                  </div>

                  {/* Classification dropdown */}
                  <select
                    value={app.category}
                    onChange={(e) => handleClassify(app.app_name, e.target.value as AppCategory)}
                    className="text-xs rounded-md border border-border px-2 py-1 w-28"
                    style={{
                      backgroundColor: getCategoryBg(app.category),
                      color: getCategoryColor(app.category),
                    }}
                  >
                    <option value="UNCLASSIFIED">Unclassified</option>
                    <option value="PRODUCTIVE">Productive</option>
                    <option value="UNPRODUCTIVE">Unproductive</option>
                    <option value="NEUTRAL">Neutral</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
