"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, getWeekDates } from "@/lib/format";

interface TimesheetFiltersProps {
  view: "daily" | "weekly";
  onViewChange: (view: "daily" | "weekly") => void;
  date: Date;
  onDateChange: (date: Date) => void;
  users?: { id: string; name: string }[];
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
  projects?: { id: string; name: string; color: string }[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export function TimesheetFilters({
  view,
  onViewChange,
  date,
  onDateChange,
  users,
  selectedUserId,
  onUserChange,
  projects,
  selectedProjectId,
  onProjectChange,
}: TimesheetFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  function navigateDate(direction: -1 | 1) {
    const newDate = new Date(date);
    if (view === "daily") {
      newDate.setDate(newDate.getDate() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction * 7);
    }
    onDateChange(newDate);
  }

  function getDateLabel() {
    if (view === "daily") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) return "Today";
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.getTime() === yesterday.getTime()) return "Yesterday";
      return formatDate(date);
    } else {
      const { start, end } = getWeekDates(date);
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View Toggle */}
      <div className="flex rounded-lg border border-[var(--border)] bg-[var(--muted)]">
        <button
          onClick={() => onViewChange("daily")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            view === "daily"
              ? "rounded-lg bg-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)]"
          )}
        >
          Daily
        </button>
        <button
          onClick={() => onViewChange("weekly")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            view === "weekly"
              ? "rounded-lg bg-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)]"
          )}
        >
          Weekly
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigateDate(-1)}
          className="rounded-md p-1.5 hover:bg-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent)]"
        >
          <Calendar className="h-4 w-4" />
          {getDateLabel()}
        </button>
        <button
          onClick={() => navigateDate(1)}
          className="rounded-md p-1.5 hover:bg-[var(--accent)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {showDatePicker && (
          <input
            type="date"
            value={date.toISOString().split("T")[0]}
            onChange={(e) => {
              onDateChange(new Date(e.target.value));
              setShowDatePicker(false);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
          />
        )}
      </div>

      {/* User Filter */}
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

      {/* Project Filter */}
      {projects && projects.length > 0 && onProjectChange && (
        <select
          value={selectedProjectId || ""}
          onChange={(e) => onProjectChange(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
