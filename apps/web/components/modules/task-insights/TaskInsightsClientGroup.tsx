import type { TaskInsightsClientGroup as ClientGroupType } from "@/actions/task-insights";

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProfitBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-green-500 text-white" :
    value >= 50 ? "bg-yellow-400 text-white" :
    value >= 0  ? "bg-orange-400 text-white" :
                  "bg-red-500 text-white";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${color}`}>
      %{value}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
  BLOCKED: "bg-red-100 text-red-600",
};

interface TaskInsightsClientGroupProps {
  group: ClientGroupType;
}

export function TaskInsightsClientGroup({ group }: TaskInsightsClientGroupProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.projectColor }}
          />
          <span className="font-semibold text-sm text-[var(--foreground)]">
            {group.clientName}
          </span>
          {group.clientName !== group.projectName && (
            <span className="text-xs text-[var(--muted-foreground)]">
              — {group.projectName}
            </span>
          )}
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-600">
          {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Task</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Total working</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Spent</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Billable</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-foreground)]">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {group.tasks.map((task) => (
              <tr key={task.taskId} className="hover:bg-gray-50/40 transition-colors">
                {/* Task name + status */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <p className="font-medium text-[var(--foreground)] leading-tight">
                        {task.taskTitle}
                      </p>
                      <span
                        className={`mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[task.taskStatus] || "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABELS[task.taskStatus] || task.taskStatus}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Total working */}
                <td className="px-4 py-3 text-center text-sm font-mono text-blue-600 font-medium">
                  {task.workingSeconds > 0 ? fmtHM(task.workingSeconds) : (
                    <span className="text-[var(--muted-foreground)]">—</span>
                  )}
                </td>

                {/* Spent */}
                <td className="px-4 py-3 text-center text-sm font-mono text-red-500 font-medium">
                  {task.spentAmount > 0 ? fmtUSD(task.spentAmount) : (
                    <span className="text-[var(--muted-foreground)]">$0.00</span>
                  )}
                </td>

                {/* Billable */}
                <td className="px-4 py-3 text-center text-sm font-mono text-orange-500 font-medium">
                  {task.billableAmount > 0 ? fmtUSD(task.billableAmount) : (
                    <span className="text-[var(--muted-foreground)]">$0.00</span>
                  )}
                </td>

                {/* Profit % */}
                <td className="px-4 py-3 text-center">
                  <ProfitBadge value={task.profitPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
