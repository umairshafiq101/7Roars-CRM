"use client";

import { useState, useEffect } from "react";
import { getReportData } from "@/actions/reports";
import { getTeamMembers, getProjects } from "@/actions/time-entries";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { BarChart } from "@/components/shared/BarChart";
import { formatDuration } from "@/lib/format";
import { BarChart3, Download, FileText } from "lucide-react";

export default function ReportsPage() {
  const today = new Date();
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diff);

  const [startDate, setStartDate] = useState(weekStart.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [groupBy, setGroupBy] = useState<"user" | "project" | "day">("user");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFilters() {
      const [usersRes, projectsRes] = await Promise.all([
        getTeamMembers(),
        getProjects(),
      ]);
      if (usersRes.success && usersRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers((usersRes.data as any[]).map((m: any) => ({ id: m.user.id, name: m.user.name })));
      }
      if (projectsRes.success && projectsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(projectsRes.data as any[]);
      }
    }
    loadFilters();
  }, []);

  async function generateReport() {
    setLoading(true);
    try {
      const result = await getReportData({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + "T23:59:59").toISOString(),
        userId: selectedUserId || undefined,
        projectId: selectedProjectId || undefined,
        groupBy,
      });
      if (result.success && result.data) {
        setReport(result.data);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!report) return;

    let csv = "";
    if (groupBy === "user") {
      csv = "Employee,Total Hours,Billable Hours,Entries\n";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of report.byUser) {
        csv += `"${row.name}",${(row.totalSeconds / 3600).toFixed(2)},${(row.billableSeconds / 3600).toFixed(2)},${row.entries}\n`;
      }
    } else if (groupBy === "project") {
      csv = "Project,Total Hours,Billable Hours,Entries\n";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of report.byProject) {
        csv += `"${row.name}",${(row.totalSeconds / 3600).toFixed(2)},${(row.billableSeconds / 3600).toFixed(2)},${row.entries}\n`;
      }
    } else {
      csv = "Date,Total Hours,Billable Hours,Entries\n";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of report.byDay) {
        csv += `${row.date},${(row.totalSeconds / 3600).toFixed(2)},${(row.billableSeconds / 3600).toFixed(2)},${row.entries}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${groupBy}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!report) return;

    // Generate a printable HTML report and open in new window for PDF printing
    const title = `Time Report — ${startDate} to ${endDate}`;
    let tableRows = "";

    if (groupBy === "user") {
      tableRows = report.byUser
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) =>
          `<tr><td>${row.name}</td><td>${(row.totalSeconds / 3600).toFixed(2)}h</td><td>${(row.billableSeconds / 3600).toFixed(2)}h</td><td>${row.entries}</td></tr>`
        )
        .join("");
    } else if (groupBy === "project") {
      tableRows = report.byProject
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) =>
          `<tr><td>${row.name}</td><td>${(row.totalSeconds / 3600).toFixed(2)}h</td><td>${(row.billableSeconds / 3600).toFixed(2)}h</td><td>${row.entries}</td></tr>`
        )
        .join("");
    } else {
      tableRows = report.byDay
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) =>
          `<tr><td>${row.date}</td><td>${(row.totalSeconds / 3600).toFixed(2)}h</td><td>${(row.billableSeconds / 3600).toFixed(2)}h</td><td>${row.entries}</td></tr>`
        )
        .join("");
    }

    const headerLabel = groupBy === "user" ? "Employee" : groupBy === "project" ? "Project" : "Date";

    const html = `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f3f4f6; font-weight: 600; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; }
  .summary-card { padding: 12px 16px; background: #f3f4f6; border-radius: 8px; }
  .summary-card .label { font-size: 11px; color: #666; }
  .summary-card .value { font-size: 20px; font-weight: 700; }
</style></head><body>
<h1>7Roars Agency OS — Time Report</h1>
<p>${startDate} to ${endDate}</p>
<div class="summary">
  <div class="summary-card"><div class="label">Total Hours</div><div class="value">${(report.summary.totalSeconds / 3600).toFixed(1)}h</div></div>
  <div class="summary-card"><div class="label">Billable Hours</div><div class="value">${(report.summary.billableSeconds / 3600).toFixed(1)}h</div></div>
  <div class="summary-card"><div class="label">Entries</div><div class="value">${report.summary.totalEntries}</div></div>
</div>
<table><thead><tr><th>${headerLabel}</th><th>Total Hours</th><th>Billable Hours</th><th>Entries</th></tr></thead><tbody>${tableRows}</tbody></table>
<script>window.print();</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userColumns: Column<any>[] = [
    { key: "name", header: "Employee", render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "totalHours", header: "Total Hours", render: (row) => formatDuration(row.totalSeconds) },
    { key: "billableHours", header: "Billable Hours", render: (row) => formatDuration(row.billableSeconds) },
    { key: "entries", header: "Entries" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectColumns: Column<any>[] = [
    {
      key: "name",
      header: "Project",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "totalHours", header: "Total Hours", render: (row) => formatDuration(row.totalSeconds) },
    { key: "billableHours", header: "Billable Hours", render: (row) => formatDuration(row.billableSeconds) },
    { key: "entries", header: "Entries" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dayColumns: Column<any>[] = [
    { key: "date", header: "Date" },
    { key: "totalHours", header: "Total Hours", render: (row) => formatDuration(row.totalSeconds) },
    { key: "billableHours", header: "Billable Hours", render: (row) => formatDuration(row.billableSeconds) },
    { key: "entries", header: "Entries" },
  ];

  const currentColumns = groupBy === "user" ? userColumns : groupBy === "project" ? projectColumns : dayColumns;
  const currentData = report ? (groupBy === "user" ? report.byUser : groupBy === "project" ? report.byProject : report.byDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate and export time tracking reports
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Employee</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          >
            <option value="">All Employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "user" | "project" | "day")}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          >
            <option value="user">Employee</option>
            <option value="project">Project</option>
            <option value="day">Day</option>
          </select>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <BarChart3 className="h-4 w-4" />
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {/* Report Results */}
      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm text-[var(--muted-foreground)]">Total Hours</p>
              <p className="mt-1 text-2xl font-bold">{formatDuration(report.summary.totalSeconds)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm text-[var(--muted-foreground)]">Billable Hours</p>
              <p className="mt-1 text-2xl font-bold">{formatDuration(report.summary.billableSeconds)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm text-[var(--muted-foreground)]">Total Entries</p>
              <p className="mt-1 text-2xl font-bold">{report.summary.totalEntries}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Hours by {groupBy === "user" ? "Employee" : groupBy === "project" ? "Project" : "Day"}
            </h2>
            <BarChart
              data={currentData.map((row: { name?: string; date?: string; totalSeconds: number; color?: string }) => ({
                label: row.name || row.date || "",
                value: row.totalSeconds / 3600,
                color: row.color || "var(--primary)",
              }))}
              height={200}
              formatValue={(v) => (v > 0 ? `${v.toFixed(1)}h` : "")}
            />
          </div>

          {/* Data Table */}
          <DataTable
            columns={currentColumns}
            data={currentData}
            emptyMessage="No data for the selected period"
          />
        </>
      )}

      {!report && !loading && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="mt-4 text-[var(--muted-foreground)]">
            Select a date range and click &quot;Generate Report&quot; to view data
          </p>
        </div>
      )}
    </div>
  );
}
