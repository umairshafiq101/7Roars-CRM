"use client";

import { Calendar } from "lucide-react";

interface ScreenshotFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  users?: { id: string; name: string }[];
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
}

export function ScreenshotFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  users,
  selectedUserId,
  onUserChange,
}: ScreenshotFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-[var(--muted-foreground)]">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        />
      </div>

      {users && users.length > 0 && onUserChange && (
        <select
          value={selectedUserId || ""}
          onChange={(e) => onUserChange(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        >
          <option value="">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
