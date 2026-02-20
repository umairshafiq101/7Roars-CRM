"use client";

import { Users, Play, Coffee, Moon, Square, Clock, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatusFilterKey = "all" | "working" | "on_break" | "idle" | "stopped_work" | "yet_to_start";

interface FilterDef {
  key: StatusFilterKey;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const filters: FilterDef[] = [
  { key: "all", label: "All", icon: Users, color: "#5B4FE9", bg: "#EEF2FF" },
  { key: "working", label: "Working", icon: Play, color: "#22C55E", bg: "#F0FDF4" },
  { key: "on_break", label: "On break", icon: Coffee, color: "#F5A623", bg: "#FFF7ED" },
  { key: "idle", label: "Idle", icon: Moon, color: "#06B6D4", bg: "#ECFEFF" },
  { key: "stopped_work", label: "Stopped work", icon: Square, color: "#EF4444", bg: "#FEF2F2" },
  { key: "yet_to_start", label: "Yet to start", icon: Clock, color: "#94A3B8", bg: "#F8FAFC" },
];

interface TeamStatusFilterProps {
  active: StatusFilterKey;
  counts: Record<StatusFilterKey, number>;
  onChange: (key: StatusFilterKey) => void;
  onRefresh: () => void;
}

export function TeamStatusFilter({ active, counts, onChange, onRefresh }: TeamStatusFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {filters.map((f) => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: isActive ? f.bg : "white",
              borderColor: isActive ? f.color : "#E5E7EB",
              color: isActive ? f.color : "#6B7280",
            }}
          >
            <f.icon className="h-3.5 w-3.5" />
            <span>{f.label}</span>
            <span
              className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: isActive ? f.color : "#CBD5E1" }}
            >
              {counts[f.key]}
            </span>
          </button>
        );
      })}
      <button
        onClick={onRefresh}
        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
        title="Refresh"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
