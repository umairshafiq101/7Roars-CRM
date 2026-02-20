"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { formatDuration } from "@/lib/format";

interface ManualEntry {
  id: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  project: { id: string; name: string; color: string } | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  manual_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  is_billable: boolean;
}

interface ManualEntriesTableProps {
  entries: ManualEntry[];
  isManager: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (entry: ManualEntry) => void;
  onDelete: (id: string) => void;
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Approved
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
      Pending
    </span>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " - " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function ManualEntriesTable({
  entries,
  isManager,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: ManualEntriesTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">No manual time entries found</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Use the + Add button to create a manual time entry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Start time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">End time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-500 text-xs font-bold text-white">
                      {entry.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{entry.user.name}</p>
                      {entry.project && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.project.color }}
                          />
                          <span className="text-xs text-[var(--muted-foreground)]">{entry.project.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                  {formatDateTime(entry.start_time)}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                  {entry.end_time ? formatDateTime(entry.end_time) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {formatDuration(entry.duration)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.manual_status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {isManager && entry.manual_status === "PENDING" && (
                      <>
                        <button
                          onClick={() => onApprove(entry.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onReject(entry.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onEdit(entry)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
