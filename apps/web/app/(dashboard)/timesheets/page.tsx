"use client";

import { useState, useEffect, useCallback } from "react";
import { getTimesheetSummary, getTeamMembers } from "@/actions/time-entries";
import { formatDuration, formatTime, getDayRange } from "@/lib/format";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw, Calendar, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmployeeRow = any;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ActivityBadge({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-green-100 text-green-700" :
    value >= 40 ? "bg-yellow-100 text-yellow-700" :
    value > 0   ? "bg-red-100 text-red-600" :
                  "bg-gray-100 text-gray-400";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", color)}>
      {value > 0 ? `% ${value}` : "No data"}
    </span>
  );
}

function formatHHMM(seconds: number) {
  if (!seconds) return "00h 00m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function formatTimeShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TimesheetsPage() {
  const [date, setDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDayRange(date);
      const result = await getTimesheetSummary({
        userId: selectedUserId || undefined,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      });
      if (result.success && result.data) {
        setRows(result.data as EmployeeRow[]);
      }
    } catch (err) {
      console.error("Failed to fetch timesheet:", err);
    } finally {
      setLoading(false);
    }
  }, [date, selectedUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    getTeamMembers().then((res) => {
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers((res.data as any[]).map((m: any) => ({ id: m.user.id, name: m.user.name })));
      }
    });
  }, []);

  function navigateDate(dir: -1 | 1) {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(d);
  }

  function toggleExpand(userId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function exportCSV() {
    const header = "Employee,Check-in,Check-out,Activity %,Working,Total";
    const lines = rows.map((r: EmployeeRow) =>
      `"${r.user.name}","${formatTimeShort(r.checkIn)}","${formatTimeShort(r.checkOut)}","${r.avgActivity}%","${formatHHMM(r.workingSeconds)}","${formatHHMM(r.totalSeconds)}"`
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${date.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dateLabel =
    d.getTime() === today.getTime()
      ? "Today"
      : d.getTime() === today.getTime() - 86400000
      ? "Yesterday"
      : formatDate(date);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          You can reach your timesheet insights here.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date nav */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button onClick={() => navigateDate(-1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {dateLabel}
          </span>
          <button onClick={() => navigateDate(1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Employee filter */}
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={fetchData}
          className="ml-auto rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Employee</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Check-in avg.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Check-out avg.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Activity level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Working</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Break</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Idle</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Total</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
                      No time entries found for this date.
                    </td>
                  </tr>
                ) : (
                  rows.map((row: EmployeeRow) => (
                    <>
                      <tr
                        key={row.user.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(row.user.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-500 text-xs font-bold text-white">
                              {row.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{row.user.name}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{row.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono">
                          {row.checkIn ? formatTimeShort(row.checkIn) : <span className="text-[var(--muted-foreground)]">No data</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono">
                          {row.checkOut ? formatTimeShort(row.checkOut) : <span className="text-[var(--muted-foreground)]">No data</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ActivityBadge value={row.avgActivity} />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono text-blue-600 font-medium">
                          {formatHHMM(row.workingSeconds)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono text-[var(--muted-foreground)]">
                          00h 00m
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono text-[var(--muted-foreground)]">
                          00h 00m
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-mono font-semibold text-blue-600">
                          {formatHHMM(row.totalSeconds)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {expandedRows.has(row.user.id)
                            ? <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                            : <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />}
                        </td>
                      </tr>

                      {/* Expanded entries */}
                      {expandedRows.has(row.user.id) && row.entries.length > 0 && (
                        <tr key={`${row.user.id}-expanded`}>
                          <td colSpan={9} className="bg-gray-50/70 px-6 pb-3 pt-1">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-[var(--border)] bg-gray-50">
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Project</th>
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Description</th>
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Start</th>
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">End</th>
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Duration</th>
                                    <th className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">Type</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {row.entries.map((e: any) => (
                                    <tr key={e.id} className="hover:bg-gray-50/50">
                                      <td className="px-3 py-2">
                                        {e.project ? (
                                          <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.project.color }} />
                                            <span>{e.project.name}</span>
                                          </div>
                                        ) : (
                                          <span className="text-[var(--muted-foreground)]">No project</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-[var(--muted-foreground)]">
                                        {e.description || "—"}
                                      </td>
                                      <td className="px-3 py-2 font-mono">{formatTime(e.start_time)}</td>
                                      <td className="px-3 py-2 font-mono">
                                        {e.end_time ? formatTime(e.end_time) : <span className="text-green-600">Running</span>}
                                      </td>
                                      <td className="px-3 py-2 font-mono font-medium">{formatDuration(e.duration)}</td>
                                      <td className="px-3 py-2">
                                        {e.is_manual ? (
                                          <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">Manual</span>
                                        ) : (
                                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Tracked</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export */}
      {rows.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
          >
            <Download className="h-4 w-4" />
            Export this report as xlsx
          </button>
        </div>
      )}
    </div>
  );
}
