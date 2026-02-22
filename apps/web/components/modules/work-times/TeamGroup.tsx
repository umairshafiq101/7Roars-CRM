import { LateClockInBadge } from "./LateClockInBadge";
import type { WorkTimesEmployee } from "@/actions/work-times";

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function ActivityBadge({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-green-500 text-white" :
    value >= 40 ? "bg-yellow-400 text-white" :
    value > 0   ? "bg-red-400 text-white" :
                  "bg-gray-200 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${color}`}>
      {value > 0 ? `%${value}` : "—"}
    </span>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-500 text-xs font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#EF4444",
  ADMIN: "#F59E0B",
  MANAGER: "#8B5CF6",
  EMPLOYEE: "#22C55E",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owners",
  ADMIN: "Admins",
  MANAGER: "Managers",
  EMPLOYEE: "Employees",
};

interface TeamGroupProps {
  role: string;
  employees: WorkTimesEmployee[];
}

export function TeamGroup({ role, employees }: TeamGroupProps) {
  if (employees.length === 0) return null;

  const color = ROLE_COLORS[role] || "#6366F1";
  const label = ROLE_LABELS[role] || role;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-semibold text-sm text-[var(--foreground)]">{label}</span>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-600">
          {employees.length} Employee{employees.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Employee</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Activity level</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Working hours</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Break time</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Idle times</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Late clock-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {employees.map((emp) => (
              <tr key={emp.userId} className="hover:bg-gray-50/40 transition-colors">
                {/* Employee */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={emp.name} avatarUrl={emp.avatarUrl} />
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{emp.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Activity level */}
                <td className="px-4 py-3 text-center">
                  <ActivityBadge value={emp.activityLevel} />
                </td>

                {/* Working hours */}
                <td className="px-4 py-3 text-center text-sm font-mono text-blue-600 font-medium">
                  {fmtHM(emp.workingSeconds)}
                </td>

                {/* Break time */}
                <td className="px-4 py-3 text-center text-sm font-mono text-[var(--muted-foreground)]">
                  {fmtHM(emp.breakSeconds)}
                </td>

                {/* Idle times */}
                <td className="px-4 py-3 text-center text-sm font-mono text-[var(--muted-foreground)]">
                  {fmtHM(emp.idleSeconds)}
                </td>

                {/* Late clock-in */}
                <td className="px-4 py-3 text-center">
                  <LateClockInBadge lateSeconds={emp.lateSeconds} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
