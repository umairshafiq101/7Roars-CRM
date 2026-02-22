import { CheckSquare, FolderOpen, Clock, DollarSign, TrendingUp, Percent } from "lucide-react";
import type { TaskInsightsSummary } from "@/actions/task-insights";

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TaskInsightsSummaryCardsProps {
  summary: TaskInsightsSummary;
}

export function TaskInsightsSummaryCards({ summary }: TaskInsightsSummaryCardsProps) {
  const cards = [
    {
      icon: CheckSquare,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      value: String(summary.totalTasks),
      label: "Tasks",
      valueColor: "text-blue-600",
    },
    {
      icon: FolderOpen,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-500",
      value: String(summary.totalProjects),
      label: "Projects",
      valueColor: "text-teal-600",
    },
    {
      icon: Clock,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      value: fmtHM(summary.totalWorkingSeconds),
      label: "Total working",
      valueColor: "text-[var(--foreground)]",
    },
    {
      icon: DollarSign,
      iconBg: "bg-red-50",
      iconColor: "text-red-400",
      value: fmtUSD(summary.totalSpentAmount),
      label: "Spent amount",
      valueColor: "text-red-500",
    },
    {
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-400",
      value: fmtUSD(summary.totalBillableAmount),
      label: "Billable amount",
      valueColor: "text-orange-500",
    },
    {
      icon: Percent,
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-500",
      value: `%${summary.avgProfitPct}`,
      label: "Avg. profit",
      valueColor: "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
            <div>
              <p className={`text-lg font-bold leading-tight ${card.valueColor}`}>
                {card.value}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
