"use client";

import { Zap, Activity, Coffee, Moon } from "lucide-react";

interface ActivitySummaryCardsProps {
  totalWorkingSeconds: number;
  avgActivityPercent: number;
  avgActivitySecsPerMin: number;
  totalKeyboardCount: number;
  totalMouseCount: number;
}

function formatHM(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function ActivitySummaryCards({
  totalWorkingSeconds,
  avgActivityPercent,
  avgActivitySecsPerMin,
  totalKeyboardCount,
  totalMouseCount,
}: ActivitySummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Working */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
            <Zap className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Working</p>
            <p className="text-sm font-semibold text-green-600">{formatHM(totalWorkingSeconds)}</p>
          </div>
        </div>
        <ProgressBar value={Math.min(100, (totalWorkingSeconds / (8 * 3600)) * 100)} color="#16a34a" />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {Math.round((totalWorkingSeconds / (8 * 3600)) * 100)}% of 8h workday
        </p>
      </div>

      {/* Activity Level */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <Activity className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Activity level</p>
            <p className="text-sm font-semibold text-purple-600">
              avg. {avgActivitySecsPerMin} sec. per min.
            </p>
          </div>
        </div>
        <ProgressBar value={avgActivityPercent} color="#7c3aed" />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {avgActivityPercent}% — {totalKeyboardCount} keys · {totalMouseCount} clicks/moves
        </p>
      </div>

      {/* On Break */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
            <Coffee className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">On break</p>
            <p className="text-sm font-semibold text-orange-500">00 hrs, 00 mins.</p>
          </div>
        </div>
        <ProgressBar value={0} color="#f97316" />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">0% of tracked time</p>
      </div>

      {/* Idle */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            <Moon className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Idle</p>
            <p className="text-sm font-semibold text-red-500">00 hrs, 00 mins.</p>
          </div>
        </div>
        <ProgressBar value={0} color="#ef4444" />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">0% of tracked time</p>
      </div>
    </div>
  );
}
