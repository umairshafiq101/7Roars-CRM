"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyActivitySummary, getMyProjects } from "@/actions/my-activities";
import { ActivityBar } from "@/components/modules/activities/ActivityBar";
import { ActivitySummaryCards } from "@/components/modules/activities/ActivitySummaryCards";
import { DonutChart } from "@/components/modules/overview/DonutChart";
import { formatDuration, formatTime } from "@/lib/format";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertTriangle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Summary = any;

function formatDateLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === today.getTime() - 86400000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
}

function formatHM(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

export default function MyActivitiesPage() {
  const [date, setDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const result = await getMyActivitySummary({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        projectId: selectedProjectId || undefined,
      });

      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
    }
  }, [date, selectedProjectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    getMyProjects().then((res) => {
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(res.data as any[]);
      }
    });
  }, []);

  function navigateDate(dir: -1 | 1) {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(d);
  }

  const remainingSeconds = summary
    ? Math.max(0, summary.expectedWorkSeconds - summary.totalWorkingSeconds)
    : 0;

  const donutData = summary && (summary.productivePct + summary.unproductivePct + summary.neutralPct) > 0
    ? [
        { label: "Productive", value: summary.productivePct, color: "#5B4FE9" },
        { label: "Neutral", value: summary.neutralPct, color: "#F5A623" },
        { label: "Unproductive", value: summary.unproductivePct, color: "#EF4444" },
      ]
    : [];

  const dateStr = date.toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Activities</h1>
        <p className="text-sm text-[var(--muted-foreground)]">You can see your activities here.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button onClick={() => navigateDate(-1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {formatDateLabel(date)}
          </span>
          <button onClick={() => navigateDate(1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {projects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All projects</option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={fetchData}
          className="ml-auto rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Expected work time alert */}
          {summary && remainingSeconds > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Today: Expected work time {formatHM(summary.expectedWorkSeconds)}.</span>{" "}
                You need to work <span className="font-semibold text-orange-600">{formatHM(remainingSeconds)}</span> to complete your daily expected work time.
              </p>
            </div>
          )}

          {/* Activity Bar */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Activity bar</h2>
              <span className="text-xs text-[var(--muted-foreground)]">{formatFullDate(date)}</span>
            </div>
            <ActivityBar
              entries={summary?.timeEntries || []}
              date={dateStr}
            />
          </div>

          {/* Total calculated time */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Total calculated time:</h2>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                {formatHM(summary?.totalWorkingSeconds || 0)}
              </span>
            </div>
            <ActivitySummaryCards
              totalWorkingSeconds={summary?.totalWorkingSeconds || 0}
              avgActivityPercent={summary?.avgActivityPercent || 0}
              avgActivitySecsPerMin={summary?.avgActivitySecsPerMin || 0}
              totalKeyboardCount={summary?.totalKeyboardCount || 0}
              totalMouseCount={summary?.totalMouseCount || 0}
            />
          </div>

          {/* Total calculated work time */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Total calculated work time:</h2>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                {formatHM(summary?.totalWorkingSeconds || 0)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Productive */}
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={donutData.length > 0 ? [{ label: "Productive", value: summary?.productivePct || 0, color: "#5B4FE9" }, { label: "Rest", value: 100 - (summary?.productivePct || 0), color: "#E5E7EB" }] : []}
                  size={120}
                  strokeWidth={14}
                />
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                    <span className="text-sm font-semibold text-[var(--primary)]">Productive</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Total {formatHM(summary?.productiveSeconds || 0)}.
                  </p>
                </div>
              </div>

              {/* Neutral */}
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={donutData.length > 0 ? [{ label: "Neutral", value: summary?.neutralPct || 0, color: "#F5A623" }, { label: "Rest", value: 100 - (summary?.neutralPct || 0), color: "#E5E7EB" }] : []}
                  size={120}
                  strokeWidth={14}
                />
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#F5A623]" />
                    <span className="text-sm font-semibold text-[#F5A623]">Neutral</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Total {formatHM(summary?.neutralSeconds || 0)}.
                  </p>
                </div>
              </div>

              {/* Unproductive */}
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  data={donutData.length > 0 ? [{ label: "Unproductive", value: summary?.unproductivePct || 0, color: "#EF4444" }, { label: "Rest", value: 100 - (summary?.unproductivePct || 0), color: "#E5E7EB" }] : []}
                  size={120}
                  strokeWidth={14}
                />
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-semibold text-red-500">Unproductive</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Total {formatHM(summary?.unproductiveSeconds || 0)}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity history */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
            <h2 className="mb-4 text-sm font-semibold">Activity history</h2>
            {!summary?.timeEntries?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">No Data</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">There is nothing to show here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {summary.timeEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 rounded-lg border border-[var(--border)] px-4 py-3 hover:bg-gray-50/50 transition-colors"
                  >
                    {entry.project && (
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: entry.project.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.project?.name || "No project"}
                      </p>
                      {entry.description && (
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatTime(entry.start_time)}
                        {entry.end_time ? ` – ${formatTime(entry.end_time)}` : " – running"}
                      </p>
                      <p className="text-sm font-mono font-semibold text-[var(--primary)]">
                        {formatDuration(entry.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
