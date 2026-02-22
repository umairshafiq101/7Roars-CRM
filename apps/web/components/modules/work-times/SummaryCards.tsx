import { Clock, Coffee, Zap, Activity } from "lucide-react";
import type { WorkTimesSummary } from "@/actions/work-times";

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

interface SummaryCardsProps {
  summary: WorkTimesSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const { totalWorkingSeconds, totalBreakSeconds, totalIdleSeconds, avgActivityPercent, totalTrackedSeconds } = summary;

  const workingPct = totalTrackedSeconds > 0 ? Math.round((totalWorkingSeconds / totalTrackedSeconds) * 100) : 0;
  const breakPct = totalTrackedSeconds > 0 ? Math.round((totalBreakSeconds / totalTrackedSeconds) * 100) : 0;
  const idlePct = totalTrackedSeconds > 0 ? Math.round((totalIdleSeconds / totalTrackedSeconds) * 100) : 0;

  const avgSecsPerMin = Math.round((avgActivityPercent / 100) * 60);

  const cards = [
    {
      icon: Clock,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      label: "Working",
      sublabel: `Total ${fmtHM(totalWorkingSeconds)}.`,
      pct: workingPct,
      barColor: "#3B82F6",
    },
    {
      icon: Coffee,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      label: "On break",
      sublabel: `Total ${fmtHM(totalBreakSeconds)}.`,
      pct: breakPct,
      barColor: "#8B5CF6",
    },
    {
      icon: Zap,
      iconBg: "bg-red-50",
      iconColor: "text-red-400",
      label: "Idle",
      sublabel: `Total ${fmtHM(totalIdleSeconds)}.`,
      pct: idlePct,
      barColor: "#F87171",
    },
    {
      icon: Activity,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      label: "Activity level",
      sublabel: `avg. ${avgSecsPerMin} sec. per min.`,
      pct: avgActivityPercent,
      barColor: "#22C55E",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${card.iconColor}`} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">{card.label}</p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">{card.sublabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar value={card.pct} color={card.barColor} />
              <span className="flex-shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">
                {card.pct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
