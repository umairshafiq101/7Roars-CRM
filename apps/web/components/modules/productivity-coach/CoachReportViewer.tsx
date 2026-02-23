"use client";

import { Brain, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function CoachReportViewer({
  content,
  isStreaming,
  error,
}: {
  content: string;
  isStreaming: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-16">
        <p className="text-sm font-medium text-red-700">Report generation failed</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (!content && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-24">
        <Brain className="mb-3 h-12 w-12 text-[var(--muted-foreground)] opacity-30" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Select a report to view or generate a new one.
        </p>
      </div>
    );
  }

  if (!content && isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 py-24">
        <div className="relative mb-4">
          <Brain className="h-10 w-10 text-[var(--primary)] animate-pulse" />
          <Loader2 className="absolute -right-1 -top-1 h-5 w-5 text-[var(--primary)] animate-spin" />
        </div>
        <p className="text-sm font-medium">Analyzing work patterns...</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Gathering metrics and generating AI coaching report. This takes 10-30 seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-amber-50 px-4 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            AI is generating the report...
          </span>
        </div>
      )}

      {/* Report content */}
      <div className="prose prose-sm max-w-none p-6 dark:prose-invert prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-th:text-[var(--foreground)] prose-td:text-[var(--foreground)]">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 mt-6 border-b border-[var(--border)] pb-2 text-xl font-bold first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => {
              const text = String(children);
              // Detect burnout risk headers and add color coding
              const isBurnoutLow = text.toLowerCase().includes("low");
              const isBurnoutMedium = text.toLowerCase().includes("medium");
              const isBurnoutHigh = text.toLowerCase().includes("high");
              const isBurnout = text.toLowerCase().includes("burnout") || text.toLowerCase().includes("wellness");

              let badgeColor = "";
              if (isBurnout && isBurnoutLow) badgeColor = "text-emerald-600";
              else if (isBurnout && isBurnoutMedium) badgeColor = "text-amber-600";
              else if (isBurnout && isBurnoutHigh) badgeColor = "text-red-600";

              return (
                <h2 className={`mb-3 mt-6 text-lg font-semibold ${badgeColor}`}>
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => (
              <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>
            ),
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-[var(--muted)]/30">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-medium">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-[var(--border)] px-3 py-2 text-xs last:border-0">
                {children}
              </td>
            ),
            ul: ({ children }) => (
              <ul className="my-2 space-y-1.5 pl-4">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 space-y-1.5 pl-4">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-sm leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => {
              const text = String(children);
              // Highlight risk levels
              if (text === "Low" || text === "Good" || text === "Improving")
                return <strong className="text-emerald-600">{children}</strong>;
              if (text === "Medium" || text === "Moderate" || text === "Stable")
                return <strong className="text-amber-600">{children}</strong>;
              if (text === "High" || text === "Critical" || text === "Declining")
                return <strong className="text-red-600">{children}</strong>;
              return <strong>{children}</strong>;
            },
            blockquote: ({ children }) => (
              <blockquote className="my-3 border-l-4 border-[var(--primary)] bg-[var(--primary)]/5 py-2 pl-4 pr-3 text-sm italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-6 border-[var(--border)]" />,
          }}
        >
          {content}
        </Markdown>

        {/* Streaming cursor */}
        {isStreaming && (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-[var(--primary)] align-middle" />
        )}
      </div>

      {/* Footer */}
      {!isStreaming && content && (
        <div className="border-t border-[var(--border)] px-6 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            This report was generated by 7Roars AI-powered Productivity Coach using GLM-4.7.
          </p>
        </div>
      )}
    </div>
  );
}
