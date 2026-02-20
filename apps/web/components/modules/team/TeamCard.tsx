"use client";

import type { MemberStatus } from "@/actions/team";
import { MoreVertical, Shield } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG: Record<MemberStatus, { label: string; text: string; color: string; bg: string; border: string }> = {
  working: { label: "Working", text: "Currently working", color: "#22C55E", bg: "#F0FDF4", border: "#BBF7D0" },
  on_break: { label: "On break", text: "On break", color: "#F5A623", bg: "#FFF7ED", border: "#FED7AA" },
  idle: { label: "Idle", text: "Idle", color: "#06B6D4", bg: "#ECFEFF", border: "#A5F3FC" },
  stopped_work: { label: "Stopped work", text: "Stopped working", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  yet_to_start: { label: "Yet to start", text: "Not started yet.", color: "#F5A623", bg: "#FFF7ED", border: "#FED7AA" },
};

interface TeamCardProps {
  member: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
    };
    avgActivity: number;
    status: MemberStatus;
    todayStats: { totalSeconds: number; entries: number };
  };
  isOnline: boolean;
  onClick: () => void;
  onRoleChange?: (memberId: string, role: string) => void;
  onDeactivate?: (memberId: string) => void;
}

export function TeamCard({ member, isOnline, onClick, onRoleChange, onDeactivate }: TeamCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const cfg = STATUS_CONFIG[member.status];

  const initials = member.user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md"
      style={{ borderColor: cfg.border, borderLeftWidth: 3, borderLeftColor: cfg.color }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-menu]")) return;
        onClick();
      }}
    >
      {/* Activity % badge */}
      <div className="absolute right-4 top-4 text-xs font-semibold text-gray-400">
        {member.avgActivity > 0 ? `${member.avgActivity}%` : "N/A"}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          {member.user.avatar_url ? (
            <img
              src={member.user.avatar_url}
              alt={member.user.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#5B4FE9] to-[#7C3AED] text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <div
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
            style={{ backgroundColor: isOnline ? "#22C55E" : "#EF4444" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">{member.user.name}</h3>
          <p className="truncate text-xs text-gray-400">{member.role}</p>
        </div>
      </div>

      {/* Status section */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">{cfg.text}</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Actions menu */}
      {(onRoleChange || onDeactivate) && (
        <div className="absolute bottom-4 right-4" data-menu>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute bottom-8 right-0 z-20 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              {onRoleChange && ["ADMIN", "MANAGER", "EMPLOYEE"].map((role) => (
                <button
                  key={role}
                  onClick={(e) => { e.stopPropagation(); onRoleChange(member.id, role); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                >
                  <Shield className="h-3 w-3 text-gray-400" />
                  Set as {role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              ))}
              {onDeactivate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeactivate(member.id); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                >
                  Deactivate
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
