import { CheckCircle, MinusCircle, XCircle } from "lucide-react";
import type { ProductivitySummary } from "@/actions/productivity";

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

interface RingProps {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
}

function Ring({ pct, color, size = 160, stroke = 16 }: RingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ProductivityDonutsProps {
  summary: ProductivitySummary;
}

export function ProductivityDonuts({ summary }: ProductivityDonutsProps) {
  const cards = [
    {
      label: "Productive",
      pct: summary.productivePct,
      seconds: summary.totalProductiveSeconds,
      color: "#22C55E",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      textColor: "text-green-600",
      Icon: CheckCircle,
      iconColor: "text-green-500",
    },
    {
      label: "Neutral",
      pct: summary.neutralPct,
      seconds: summary.totalNeutralSeconds,
      color: "#3B82F6",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      textColor: "text-blue-600",
      Icon: MinusCircle,
      iconColor: "text-blue-500",
    },
    {
      label: "Unproductive",
      pct: summary.unproductivePct,
      seconds: summary.totalUnproductiveSeconds,
      color: "#EF4444",
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      textColor: "text-red-500",
      Icon: XCircle,
      iconColor: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.Icon;
        return (
          <div key={card.label} className="flex flex-col items-center gap-4">
            {/* Donut with % in center */}
            <div className="relative flex items-center justify-center">
              <Ring pct={card.pct} color={card.color} size={160} stroke={16} />
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-[var(--foreground)]">
                  {card.pct}%
                </span>
              </div>
            </div>

            {/* Label card */}
            <div
              className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 ${card.bgColor} ${card.borderColor}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${card.iconColor}`} />
              <div>
                <p className={`text-sm font-semibold ${card.textColor}`}>
                  {card.label}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Total {fmtHM(card.seconds)}.
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
