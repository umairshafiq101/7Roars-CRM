"use client";

import { useState, useEffect } from "react";
import { getDashboardStats } from "@/actions/reports";
import { StatCard } from "@/components/shared/StatCard";
import { BarChart } from "@/components/shared/BarChart";
import { formatDuration, formatDurationShort, formatRelativeTime } from "@/lib/format";
import { Clock, Timer, Users, Camera } from "lucide-react";

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getDashboardStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diff);

  const chartData = dayNames.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const seconds = stats?.dailyTotals?.[key] || 0;
    return {
      label,
      value: seconds / 3600,
      color: "var(--primary)",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Overview of your agency&apos;s activity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hours Today"
          value={formatDuration(stats?.todaySeconds || 0)}
          subtitle={`${stats?.todayEntries || 0} entries`}
          icon={Clock}
        />
        <StatCard
          title="Hours This Week"
          value={formatDuration(stats?.weekSeconds || 0)}
          icon={Timer}
        />
        <StatCard
          title="Active Members"
          value={String(stats?.activeMembers || 0)}
          subtitle="tracked today"
          icon={Users}
        />
        <StatCard
          title="Screenshots Today"
          value={String(stats?.todayScreenshots || 0)}
          icon={Camera}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Hours Chart */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
          <h2 className="text-lg font-semibold">Weekly Hours</h2>
          <p className="mb-4 text-xs text-[var(--muted-foreground)]">
            Hours tracked per day this week
          </p>
          <BarChart
            data={chartData}
            height={180}
            formatValue={(v) => (v > 0 ? formatDurationShort(v * 3600) : "")}
          />
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="mb-4 text-xs text-[var(--muted-foreground)]">
            Latest time entries across the team
          </p>
          {stats?.recentEntries?.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {stats.recentEntries.slice(0, 6).map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-medium text-white">
                    {entry.user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {entry.user?.name || "Unknown"}
                      </span>
                      {entry.project && (
                        <div className="flex items-center gap-1">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.project.color }}
                          />
                          <span className="text-xs text-[var(--muted-foreground)] truncate">
                            {entry.project.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {entry.description || "No description"} •{" "}
                      {formatDuration(entry.duration)} •{" "}
                      {formatRelativeTime(entry.start_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              No activity recorded yet. Start tracking time to see data here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
