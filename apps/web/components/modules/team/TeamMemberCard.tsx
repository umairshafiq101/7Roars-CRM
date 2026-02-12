"use client";

import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Shield, Clock, MoreVertical } from "lucide-react";
import { useState } from "react";

interface TeamMemberCardProps {
  member: {
    id: string;
    role: string;
    hourly_rate: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
      timezone: string;
    };
    todayStats: {
      totalSeconds: number;
      entries: number;
    };
  };
  isOnline?: boolean;
  onRoleChange?: (memberId: string, role: string) => void;
  onDeactivate?: (memberId: string) => void;
}

const roleColors: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MANAGER: "bg-green-100 text-green-700",
  EMPLOYEE: "bg-gray-100 text-gray-700",
};

export function TeamMemberCard({
  member,
  isOnline = false,
  onRoleChange,
  onDeactivate,
}: TeamMemberCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar with online indicator */}
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-medium text-white">
              {member.user.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt={member.user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                member.user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)]",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />
          </div>

          <div>
            <h3 className="font-medium">{member.user.name}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">{member.user.email}</p>
          </div>
        </div>

        {/* Actions Menu */}
        {(onRoleChange || onDeactivate) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-48 rounded-md border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg">
                {onRoleChange && (
                  <>
                    {["ADMIN", "MANAGER", "EMPLOYEE"].map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          onRoleChange(member.id, role);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--accent)]"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Set as {role.charAt(0) + role.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </>
                )}
                {onDeactivate && (
                  <button
                    onClick={() => {
                      onDeactivate(member.id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--destructive)] hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex items-center gap-4">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", roleColors[member.role] || roleColors.EMPLOYEE)}>
          {member.role}
        </span>
        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Clock className="h-3 w-3" />
          <span>Today: {formatDuration(member.todayStats.totalSeconds)}</span>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {member.user.timezone}
        </span>
      </div>
    </div>
  );
}
