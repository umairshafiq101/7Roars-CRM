"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCoachReports,
  getCoachReportById,
  getCoachEmployees,
} from "@/actions/productivity-coach";
import CoachReportList from "@/components/modules/productivity-coach/CoachReportList";
import CreateReportModal from "@/components/modules/productivity-coach/CreateReportModal";
import CoachReportViewer from "@/components/modules/productivity-coach/CoachReportViewer";
import CoachReportMeta from "@/components/modules/productivity-coach/CoachReportMeta";

type Employee = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

type Report = {
  id: string;
  report_no: string;
  report_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  report_content: string;
  metrics_json: unknown;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  generator: { id: string; name: string };
};

type ViewState =
  | { type: "list" }
  | { type: "view"; reportId: string }
  | { type: "streaming"; reportId: string };

export default function ProductivityCoachPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ type: "list" });
  const [showModal, setShowModal] = useState(false);

  // Streaming state
  const [streamContent, setStreamContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reportsRes, employeesRes] = await Promise.all([
        getCoachReports(),
        getCoachEmployees(),
      ]);
      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data as Report[]);
      }
      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data as Employee[]);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleViewReport(id: string) {
    try {
      const res = await getCoachReportById(id);
      if (res.success && res.data) {
        const report = res.data as Report;
        setActiveReport(report);
        setStreamContent(report.report_content || "");
        setStreamError(null);
        setIsStreaming(false);
        setView({ type: "view", reportId: id });
      }
    } catch (e) {
      console.error("Failed to load report", e);
    }
  }

  async function handleGenerate(params: {
    userId?: string;
    reportType: string;
    startDate: string;
    endDate: string;
  }) {
    setShowModal(false);
    setStreamContent("");
    setStreamError(null);
    setIsStreaming(true);

    // Create a placeholder report for the meta sidebar
    const emp = employees.find((e) => e.userId === params.userId);
    const placeholderReport: Report = {
      id: "",
      report_no: "Generating...",
      report_type: params.reportType,
      start_date: params.startDate,
      end_date: params.endDate,
      status: "GENERATING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      report_content: "",
      metrics_json: {},
      user: emp
        ? { id: emp.userId, name: emp.name, email: emp.email, avatar_url: emp.avatarUrl }
        : { id: "", name: "Team", email: "", avatar_url: null },
      generator: { id: "", name: "You" },
    };
    setActiveReport(placeholderReport);
    setView({ type: "streaming", reportId: "" });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/v1/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: abort.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        setStreamError(errData.error || `HTTP ${res.status}`);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreamError("No response stream");
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let reportId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "meta") {
              reportId = event.reportId;
              setActiveReport((prev) =>
                prev ? { ...prev, id: reportId, report_no: reportId } : prev
              );
            } else if (event.type === "content") {
              setStreamContent((prev) => prev + event.content);
            } else if (event.type === "done") {
              reportId = event.reportId;
            } else if (event.type === "error") {
              setStreamError(event.message);
            }
          } catch {
            // skip malformed events
          }
        }
      }

      setIsStreaming(false);

      // Reload the report from DB to get full data
      if (reportId) {
        const fullRes = await getCoachReportById(reportId);
        if (fullRes.success && fullRes.data) {
          setActiveReport(fullRes.data as Report);
          setView({ type: "view", reportId });
        }
      }

      // Refresh the list
      await loadData();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Stream error", e);
        setStreamError("Connection lost. Please try again.");
      }
      setIsStreaming(false);
    }
  }

  function handleBack() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setView({ type: "list" });
    setActiveReport(null);
    setStreamContent("");
    setStreamError(null);
    setIsStreaming(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  // Report viewer layout
  if (view.type === "view" || view.type === "streaming") {
    return (
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-72 shrink-0">
          <CoachReportMeta
            report={activeReport}
            isStreaming={isStreaming}
            onBack={handleBack}
          />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <CoachReportViewer
            content={streamContent}
            isStreaming={isStreaming}
            error={streamError}
          />
        </div>
      </div>
    );
  }

  // Report list layout (default)
  return (
    <>
      <CoachReportList
        reports={reports}
        employees={employees}
        onViewReport={handleViewReport}
        onCreateReport={() => setShowModal(true)}
        onRefresh={loadData}
      />

      {showModal && (
        <CreateReportModal
          employees={employees}
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
        />
      )}
    </>
  );
}
