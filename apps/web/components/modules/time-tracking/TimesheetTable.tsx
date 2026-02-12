"use client";

import { DataTable, type Column } from "@/components/shared/DataTable";
import { formatDuration, formatTime, formatDate } from "@/lib/format";
import { Trash2, Camera, Pencil } from "lucide-react";

interface TimeEntryRow {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  is_manual: boolean;
  is_billable: boolean;
  project: { id: string; name: string; color: string } | null;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  _count: { screenshots: number };
}

interface TimesheetTableProps {
  entries: TimeEntryRow[];
  showUser?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (entry: TimeEntryRow) => void;
}

export function TimesheetTable({ entries, showUser = false, onDelete, onEdit }: TimesheetTableProps) {
  const columns: Column<TimeEntryRow>[] = [
    ...(showUser
      ? [
          {
            key: "user",
            header: "Employee",
            render: (row: TimeEntryRow) => (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-medium text-white">
                  {row.user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{row.user.name}</span>
              </div>
            ),
          } as Column<TimeEntryRow>,
        ]
      : []),
    {
      key: "project",
      header: "Project",
      render: (row: TimeEntryRow) =>
        row.project ? (
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: row.project.color }}
            />
            <span>{row.project.name}</span>
          </div>
        ) : (
          <span className="text-[var(--muted-foreground)]">No project</span>
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (row: TimeEntryRow) => (
        <span className={row.description ? "" : "text-[var(--muted-foreground)]"}>
          {row.description || "No description"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row: TimeEntryRow) => formatDate(row.start_time),
    },
    {
      key: "time",
      header: "Time",
      render: (row: TimeEntryRow) => (
        <span>
          {formatTime(row.start_time)}
          {row.end_time ? ` – ${formatTime(row.end_time)}` : " – running"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row: TimeEntryRow) => (
        <span className="font-mono font-medium">
          {row.end_time ? formatDuration(row.duration) : "⏱ Running"}
        </span>
      ),
    },
    {
      key: "screenshots",
      header: "",
      className: "w-10",
      render: (row: TimeEntryRow) =>
        row._count.screenshots > 0 ? (
          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
            <Camera className="h-3.5 w-3.5" />
            <span className="text-xs">{row._count.screenshots}</span>
          </div>
        ) : null,
    },
    {
      key: "flags",
      header: "",
      className: "w-20",
      render: (row: TimeEntryRow) => (
        <div className="flex items-center gap-1.5">
          {row.is_manual && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
              Manual
            </span>
          )}
          {row.is_billable && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              $
            </span>
          )}
        </div>
      ),
    },
    ...((onEdit || onDelete)
      ? [
          {
            key: "actions",
            header: "",
            className: "w-20",
            render: (row: TimeEntryRow) => (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                    }}
                    className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--primary)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row.id);
                    }}
                    className="rounded p-1 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-[var(--destructive)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ),
          } as Column<TimeEntryRow>,
        ]
      : []),
  ];

  return (
    <DataTable<TimeEntryRow>
      columns={columns}
      data={entries}
      emptyMessage="No time entries found. Start tracking time to see data here."
    />
  );
}
