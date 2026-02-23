"use client";

import { useState } from "react";
import { X, Brain, Loader2, Info } from "lucide-react";

type Employee = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

const REPORT_TYPES = [
  { value: "ALL_ANALYSIS", label: "All Analysis", desc: "Comprehensive 8-section report covering everything" },
  { value: "WORK_PATTERN", label: "Work Pattern", desc: "Clock-in/out habits, consistency, daily patterns" },
  { value: "PRODUCTIVITY", label: "Productivity", desc: "Activity levels, app usage, peak hours" },
  { value: "WELLNESS_BURNOUT", label: "Wellness & Burnout", desc: "Overtime, breaks, burnout risk assessment" },
  { value: "TEAM_OVERVIEW", label: "Team Overview", desc: "All employees summarized in one report" },
];

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 13);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default function CreateReportModal({
  employees,
  onClose,
  onGenerate,
}: {
  employees: Employee[];
  onClose: () => void;
  onGenerate: (params: {
    userId?: string;
    reportType: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  const defaults = getDefaultDates();
  const [generateFor, setGenerateFor] = useState<"individual" | "organization">("individual");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [reportType, setReportType] = useState("ALL_ANALYSIS");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [generating, setGenerating] = useState(false);

  const isTeamOverview = reportType === "TEAM_OVERVIEW";
  const reportsToGenerate = isTeamOverview || generateFor === "organization"
    ? (isTeamOverview ? 1 : employees.length)
    : 1;

  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isValidRange = daysDiff >= 7 && daysDiff <= 30;
  const canGenerate =
    isValidRange &&
    (isTeamOverview || generateFor === "organization" || selectedEmployee) &&
    !generating;

  function handleSubmit() {
    if (!canGenerate) return;
    setGenerating(true);

    if (isTeamOverview) {
      onGenerate({ reportType: "TEAM_OVERVIEW", startDate, endDate });
    } else if (generateFor === "organization") {
      // Generate for all employees — caller handles batch
      for (const emp of employees) {
        onGenerate({ userId: emp.userId, reportType, startDate, endDate });
      }
    } else {
      onGenerate({ userId: selectedEmployee, reportType, startDate, endDate });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Create Productivity Coach Report</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-[var(--muted)]/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Generate For */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Generate Report For *</label>
            <select
              value={isTeamOverview ? "organization" : generateFor}
              onChange={(e) => {
                const val = e.target.value as "individual" | "organization";
                setGenerateFor(val);
                if (val === "organization" && reportType !== "TEAM_OVERVIEW") {
                  // keep current type
                }
              }}
              disabled={isTeamOverview}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="individual">Individual Employee</option>
              <option value="organization">Entire Organization</option>
            </select>
          </div>

          {/* Employee Selector (only for individual) */}
          {!isTeamOverview && generateFor === "individual" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Select Employee *</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.userId} value={emp.userId}>
                    {emp.name} — {emp.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Report Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Report Type *</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                if (e.target.value === "TEAM_OVERVIEW") {
                  setGenerateFor("organization");
                }
              }}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {REPORT_TYPES.find((t) => t.value === reportType)?.desc}
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {!isValidRange && (
            <p className="text-xs text-red-500">
              Date range must be between 7 and 30 days. Current: {daysDiff} days.
            </p>
          )}

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
              <div className="text-xs text-blue-700 space-y-1">
                <p>
                  <strong>{reportsToGenerate}</strong> report{reportsToGenerate !== 1 ? "s" : ""} will be generated
                </p>
                <p>
                  Date range: {daysDiff} days (min: 7, max: 30)
                </p>
                <p>
                  Reports are generated in real-time using AI and typically take 10-30 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canGenerate}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate {reportsToGenerate > 1 ? `${reportsToGenerate} Reports` : "Report"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
