"use client";

import { formatTime } from "@/lib/format";

interface TimeSegment {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  project: { id: string; name: string; color: string } | null;
  description: string | null;
}

interface ActivityBarProps {
  entries: TimeSegment[];
  date: string;
}

export function ActivityBar({ entries, date }: ActivityBarProps) {
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");
  const totalMs = dayEnd.getTime() - dayStart.getTime();

  const completedEntries = entries.filter((e) => e.end_time);

  if (completedEntries.length === 0) {
    return (
      <div className="h-10 w-full rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-400">No activity recorded</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative h-10 w-full rounded-lg bg-gray-100 overflow-hidden">
        {completedEntries.map((entry) => {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time!);
          const left = ((start.getTime() - dayStart.getTime()) / totalMs) * 100;
          const width = ((end.getTime() - start.getTime()) / totalMs) * 100;
          const color = entry.project?.color || "#5B4FE9";

          return (
            <div
              key={entry.id}
              className="absolute top-0 h-full rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer group"
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(0.3, width)}%`,
                backgroundColor: color,
              }}
              title={`${entry.project?.name || "No project"} — ${formatTime(entry.start_time)} to ${formatTime(entry.end_time!)}`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
                {entry.project?.name || "No project"}<br />
                {formatTime(entry.start_time)} – {formatTime(entry.end_time!)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
