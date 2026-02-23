"use client";

import { ArrowLeft, Download, Copy, Check, Brain, User, Calendar, Clock } from "lucide-react";
import { useState } from "react";

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

type ReportMeta = {
  id: string;
  report_no: string;
  report_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  report_content: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  generator: { id: string; name: string };
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

export default function CoachReportMeta({
  report,
  isStreaming,
  onBack,
}: {
  report: ReportMeta | null;
  isStreaming: boolean;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!report?.report_content) return;
    try {
      await navigator.clipboard.writeText(report.report_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  function handleExportPDF() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </button>

      {report ? (
        <div className="space-y-5">
          {/* Report header card */}
          <div className="rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 p-5 text-white">
            <div className="flex items-start gap-3">
              {report.user.avatar_url ? (
                <img
                  src={report.user.avatar_url}
                  alt={report.user.name}
                  className="h-12 w-12 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-lg font-bold">
                  {report.user.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{report.user.name}</h3>
                <p className="text-xs text-white/70">{report.user.email}</p>
              </div>
            </div>
          </div>

          {/* Meta details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-[var(--muted-foreground)]">Report No:</span>
              <span className="font-mono font-medium">{report.report_no}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-[var(--muted-foreground)]">Type:</span>
              <span className="rounded-full bg-[var(--muted)]/50 px-2 py-0.5 text-xs font-medium">
                {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-[var(--muted-foreground)]">Period:</span>
              <span className="text-xs">
                {formatDate(report.start_date)} — {formatDate(report.end_date)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-[var(--muted-foreground)]">Generated:</span>
              <span className="text-xs">{formatDateTime(report.created_at)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted-foreground)]">Status:</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isStreaming
                    ? STATUS_STYLES["GENERATING"]
                    : STATUS_STYLES[report.status] || ""
                }`}
              >
                {isStreaming ? "Generating..." : report.status === "READY" ? "Ready" : report.status === "FAILED" ? "Failed" : "Generating..."}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted-foreground)]">By:</span>
              <span className="text-xs">{report.generator.name}</span>
            </div>
          </div>

          {/* Actions */}
          {report.status === "READY" && !isStreaming && (
            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportPDF}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]/50"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]/50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Brain className="mx-auto mb-2 h-8 w-8 text-[var(--muted-foreground)] opacity-40" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading report...</p>
          </div>
        </div>
      )}
    </div>
  );
}
