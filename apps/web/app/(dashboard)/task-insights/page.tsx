"use client";

import { useState, useEffect, useCallback } from "react";
import { getTaskInsightsData, getTaskInsightsProjects } from "@/actions/task-insights";
import { TaskInsightsSummaryCards } from "@/components/modules/task-insights/TaskInsightsSummaryCards";
import { TaskInsightsClientGroup } from "@/components/modules/task-insights/TaskInsightsClientGroup";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Download,
  BarChart2,
} from "lucide-react";
import type { TaskInsightsData } from "@/actions/task-insights";

function formatDateLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === today.getTime() - 86400000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TaskInsightsPage() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<TaskInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const result = await getTaskInsightsData({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        projectId: projectId || undefined,
      });

      if (result.success && result.data) {
        setData(result.data as TaskInsightsData);
      }
    } catch (err) {
      console.error("Failed to fetch task insights:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    getTaskInsightsProjects().then((res) => {
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(res.data as any[]);
      }
    });
  }, []);

  function navigateDay(dir: -1 | 1) {
    const s = new Date(startDate);
    s.setDate(s.getDate() + dir);
    const e = new Date(endDate);
    e.setDate(e.getDate() + dir);
    setStartDate(s);
    setEndDate(e);
  }

  const isSingleDay = startDate.toDateString() === endDate.toDateString();

  function exportCSV() {
    if (!data) return;
    const rows: string[] = [
      "Client/Project,Task,Status,Total Working,Spent,Billable,Profit %",
    ];
    for (const group of data.groups) {
      for (const task of group.tasks) {
        rows.push(
          `"${group.clientName}","${task.taskTitle}","${task.taskStatus}","${fmtHM(task.workingSeconds)}","${fmtUSD(task.spentAmount)}","${fmtUSD(task.billableAmount)}","${task.profitPct}%"`
        );
      }
    }
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-insights-${startDate.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Task insights</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          You can reach your organization task insights here.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date navigation */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button
            onClick={() => navigateDay(-1)}
            className="rounded p-1 hover:bg-[var(--accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {isSingleDay
              ? formatDateLabel(startDate)
              : `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`}
          </span>
          <button
            onClick={() => navigateDay(1)}
            className="rounded p-1 hover:bg-[var(--accent)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Project filter */}
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All projects</option>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {data && <TaskInsightsSummaryCards summary={data.summary} />}

          {/* No data state */}
          {(!data || data.groups.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <BarChart2 className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">No Data</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                No task data found for the selected period.
              </p>
            </div>
          )}

          {/* Client/project groups */}
          {data && data.groups.length > 0 && (
            <div className="space-y-4">
              {data.groups.map((group) => (
                <TaskInsightsClientGroup key={group.projectId} group={group} />
              ))}
            </div>
          )}

          {/* Export */}
          {data && data.groups.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <Download className="h-4 w-4" />
                Export this report as xlsx
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
