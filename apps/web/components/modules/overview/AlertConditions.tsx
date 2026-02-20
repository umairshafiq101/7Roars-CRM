"use client";

import { useState } from "react";
import { ChevronDown, Moon, Coffee, ThumbsDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AlertGroup {
  count: number;
  members: string[];
}

interface AlertConditionsProps {
  data: {
    idle: AlertGroup;
    tooManyBreaks: AlertGroup;
    unproductive: AlertGroup;
  };
}

interface AlertRowProps {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  group: AlertGroup;
}

function AlertRow({ icon: Icon, label, color, bgColor, group }: AlertRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
        <span
          className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: group.count > 0 ? color : "#CBD5E1" }}
        >
          {group.count}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-50 px-5 py-3">
          {group.members.length === 0 ? (
            <p className="text-xs text-gray-400">No alerts</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.members.map((name) => (
                <span
                  key={name}
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: bgColor, color }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AlertConditions({ data }: AlertConditionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Alert Conditions</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <AlertRow
          icon={Moon}
          label="Idle than usual"
          color="#06B6D4"
          bgColor="#ECFEFF"
          group={data.idle}
        />
        <AlertRow
          icon={Coffee}
          label="Too many breaks"
          color="#F5A623"
          bgColor="#FFF7ED"
          group={data.tooManyBreaks}
        />
        <AlertRow
          icon={ThumbsDown}
          label="Unproductive hours"
          color="#EF4444"
          bgColor="#FEF2F2"
          group={data.unproductive}
        />
      </div>
    </div>
  );
}
