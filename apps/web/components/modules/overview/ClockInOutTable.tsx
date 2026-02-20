"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ClockInOutEntry {
  userId: string;
  name: string;
  avatar: string | null;
  clockIn: string;
  clockOut: string | null;
  isWorking: boolean;
  avgActivity: number;
}

interface ClockInOutTableProps {
  data: ClockInOutEntry[];
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getActivityColor(pct: number): string {
  if (pct >= 70) return "#22C55E";
  if (pct >= 40) return "#F5A623";
  return "#EF4444";
}

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover" />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5B4FE9] to-[#7C3AED] text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

export function ClockInOutTable({ data }: ClockInOutTableProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Clock-in / Clock-out</h3>
        <Link
          href="/team"
          className="flex items-center gap-1 text-xs font-medium text-[#5B4FE9] hover:underline"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No activity yet today
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.map((entry) => (
            <div key={entry.userId} className="flex items-center gap-3 px-5 py-3">
              <UserAvatar name={entry.name} avatar={entry.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{entry.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-green-600">{formatClockTime(entry.clockIn)}</span>
                  <span>→</span>
                  <span className={entry.isWorking ? "font-medium text-[#5B4FE9]" : "text-red-500"}>
                    {entry.isWorking ? "Working" : entry.clockOut ? formatClockTime(entry.clockOut) : "—"}
                  </span>
                </div>
              </div>
              <div className="w-20 shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Activity</span>
                  <span className="font-medium" style={{ color: getActivityColor(entry.avgActivity) }}>
                    {entry.avgActivity}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(entry.avgActivity, 100)}%`,
                      backgroundColor: getActivityColor(entry.avgActivity),
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
