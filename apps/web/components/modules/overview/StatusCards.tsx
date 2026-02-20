"use client";

import { Users, Play, Coffee, Moon, Square, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatusCardsProps {
  data: {
    employees: number;
    working: number;
    onBreak: number;
    idle: number;
    stoppedWork: number;
    yetToStart: number;
  };
}

interface CardDef {
  label: string;
  key: keyof StatusCardsProps["data"];
  icon: LucideIcon;
  color: string;
  bg: string;
  iconBg: string;
}

const cards: CardDef[] = [
  { label: "Employees", key: "employees", icon: Users, color: "#5B4FE9", bg: "#EEF2FF", iconBg: "#5B4FE9" },
  { label: "Working", key: "working", icon: Play, color: "#22C55E", bg: "#F0FDF4", iconBg: "#22C55E" },
  { label: "On break", key: "onBreak", icon: Coffee, color: "#F5A623", bg: "#FFF7ED", iconBg: "#F5A623" },
  { label: "Idle", key: "idle", icon: Moon, color: "#06B6D4", bg: "#ECFEFF", iconBg: "#06B6D4" },
  { label: "Stopped work", key: "stoppedWork", icon: Square, color: "#EF4444", bg: "#FEF2F2", iconBg: "#EF4444" },
  { label: "Yet to start", key: "yetToStart", icon: Clock, color: "#94A3B8", bg: "#F8FAFC", iconBg: "#94A3B8" },
];

export function StatusCards({ data }: StatusCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: card.bg }}
          >
            <card.icon className="h-5 w-5" style={{ color: card.iconBg }} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold" style={{ color: card.color }}>
              {data[card.key]}
            </p>
            <p className="truncate text-xs text-gray-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
