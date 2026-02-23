"use client";

import { useState } from "react";
import { Eye, Trash2, Brain, Plus, Filter } from "lucide-react";
import { deleteCoachReport } from "@/actions/productivity-coach";

type Report = {
  id: string;
  report_no: string;
  report_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  generator: { id: string; name: string };
};

type Employee = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  ALL_ANALYSIS: "All Analysis",
  WORK_PATTERN: "Work Pattern",
  PRODUCTIVITY: "Productivity",
  WELLNESS_BURNOUT: "Wellness & Burnout",
  TEAM_OVERVIEW: "Team Overview",
};

const STATUS_STYLES: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-700",
  GENERATING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CoachReportList({
  reports,
  employees,
  onViewReport,
  onCreateReport,
  onRefresh,
}: {
  reports: Report[];
  employees: Employee[];
  onViewReport: (id: string) => void;
  onCreateReport: () => void;
  onRefresh: () => void;
}) {
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterType, setFilterType] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = reports.filter((r) => {
    if (filterEmployee && r.user.id !== filterEmployee) return false;
    if (filterType && r.report_type !== filterType) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteCoachReport(id);
      onRefresh();
    } catch (e) {
      console.error("Failed to delete report", e);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productivity Coach</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            AI-powered productivity analysis and coaching for employees.
          </p>
        </div>
        <button
          onClick={onCreateReport}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Productivity Coach Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        >
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp.userId} value={emp.userId}>
              {emp.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {(filterEmployee || filterType) && (
          <button
            onClick={() => {
              setFilterEmployee("");
              setFilterType("");
            }}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16">
          <Brain className="mb-3 h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {reports.length === 0
              ? "No reports generated yet"
              : "No reports match your filters"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {reports.length === 0
              ? "Click \"Create Productivity Coach Report\" to generate your first AI coaching report."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Report No
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Employee
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Report Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Period
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    {report.report_no}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {report.user.avatar_url ? (
                        <img
                          src={report.user.avatar_url}
                          alt={report.user.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-medium text-[var(--primary)]">
                          {report.user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{report.user.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {report.user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--muted)]/50 px-2.5 py-1 text-xs font-medium">
                      {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {formatDate(report.start_date)} — {formatDate(report.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[report.status] || ""}`}
                    >
                      {report.status === "READY"
                        ? "Ready"
                        : report.status === "GENERATING"
                          ? "Generating..."
                          : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {formatDateTime(report.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewReport(report.id)}
                        disabled={report.status !== "READY"}
                        className="rounded-md p-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="View report"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deleting === report.id}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                        title="Delete report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)]">
        Total: {filtered.length} report{filtered.length !== 1 ? "s" : ""}
        {reports.length !== filtered.length && ` (${reports.length} total)`}
      </p>
    </div>
  );
}
