"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivityHeatmap } from "@/actions/advanced-insights";
import type { HeatmapData, HeatmapRow } from "@/actions/advanced-insights";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react";

function fmtDateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
}

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h} hrs. ${String(m).padStart(2, "0")} mins.`;
}

function cellColor(pct: number): string {
  if (pct === 0) return "#F3F4F6";
  if (pct < 20) return "#D1FAE5";
  if (pct < 35) return "#6EE7B7";
  if (pct < 50) return "#34D399";
  if (pct < 65) return "#10B981";
  if (pct < 80) return "#059669";
  return "#047857";
}

function cellTextColor(pct: number): string {
  if (pct === 0) return "transparent";
  if (pct < 35) return "#065F46";
  return "#FFFFFF";
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  employees: { userId: string; name: string; role: string }[];
}

export function ActivityHeatmap({ employees }: Props) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [roleFilter, setRoleFilter] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      const res = await getActivityHeatmap({
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        roleFilter: roleFilter || undefined,
        employeeId: employeeId || undefined,
      });
      if (res.success && res.data) setData(res.data as HeatmapData);
    } catch (err) {
      console.error("Failed to fetch heatmap:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, roleFilter, employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function navigateWeek(dir: -1 | 1) {
    const days = 7 * dir;
    setStartDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
    setEndDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Activity Heatmap</h2>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium">Hourly View</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Date Range</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5">
            <button onClick={() => navigateWeek(-1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="flex items-center gap-1.5 px-2 text-xs font-medium">
              <Calendar className="h-3 w-3 text-[var(--muted-foreground)]" />
              {fmtDateLabel(startDate)} - {fmtDateLabel(endDate)}
            </span>
            <button onClick={() => navigateWeek(1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Team</p>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs outline-none">
            <option value="">All teams</option>
            <option value="OWNER">Owners</option>
            <option value="ADMIN">Admins</option>
            <option value="MANAGER">Managers</option>
            <option value="EMPLOYEE">Employees</option>
          </select>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Employee</p>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs outline-none">
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.userId} value={emp.userId}>{emp.name}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchData} className="ml-auto mt-4 rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Average Productivity</p>
              <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{data.avgProductivity}%</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Peak Hour</p>
              <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{data.peakHour}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Total Working Time</p>
              <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{fmtHM(data.totalWorkingSeconds)}</p>
            </div>
          </div>

          {/* Heatmap grid */}
          {data.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-[var(--background)] px-2 py-2 text-left text-[10px] font-semibold text-[var(--muted-foreground)]">Date</th>
                    {HOURS.map((h) => (
                      <th key={h} className="px-0.5 py-2 text-center text-[10px] font-medium text-[var(--muted-foreground)]">
                        {String(h).padStart(2, "0")}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.date}>
                      <td className="sticky left-0 z-10 bg-[var(--background)] whitespace-nowrap px-2 py-1.5 text-xs font-medium">{row.label}</td>
                      {row.cells.map((cell) => (
                        <td key={cell.hour} className="px-0.5 py-1">
                          <div
                            className="flex h-7 min-w-[38px] items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: cellColor(cell.activityPct),
                              color: cellTextColor(cell.activityPct),
                            }}
                            title={`${row.label} ${String(cell.hour).padStart(2, "0")}:00 — ${cell.activityPct}%`}
                          >
                            {cell.activityPct > 0 ? `${cell.activityPct}%` : ""}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>Less</span>
                {[0, 15, 30, 50, 70, 90].map((v) => (
                  <div key={v} className="h-4 w-6 rounded" style={{ backgroundColor: cellColor(v) }} />
                ))}
                <span>More</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">No activity data for the selected period.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">No data for the selected period.</p>
        </div>
      )}
    </div>
  );
}
