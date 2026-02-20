"use client";

import { DonutChart } from "./DonutChart";
import { formatDuration } from "@/lib/format";

const CATEGORY_COLORS: Record<string, string> = {
  PRODUCTIVE: "#5B4FE9",
  UNPRODUCTIVE: "#EF4444",
  NEUTRAL: "#F5A623",
  UNCLASSIFIED: "#94A3B8",
};

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCTIVE: "Productive",
  UNPRODUCTIVE: "Unproductive",
  NEUTRAL: "Neutral",
  UNCLASSIFIED: "Unclassified",
};

interface CategoryEntry {
  category: string;
  duration: number;
  percentage: number;
}

interface AppCategoryChartProps {
  data: CategoryEntry[];
  totalDuration: number;
}

export function AppCategoryChart({ data, totalDuration }: AppCategoryChartProps) {
  const chartData = data.map((d) => ({
    label: CATEGORY_LABELS[d.category] || d.category,
    value: d.duration,
    color: CATEGORY_COLORS[d.category] || "#94A3B8",
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Apps Usage by AI Categorization</h3>
        <span className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
          Today
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 p-5 sm:flex-row">
        <div className="relative shrink-0">
          <DonutChart data={chartData} size={160} strokeWidth={28} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{formatDuration(totalDuration)}</span>
            <span className="text-[10px] text-gray-400">Total</span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1 space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-sm text-gray-400">No data</p>
          ) : (
            data.map((entry) => {
              const color = CATEGORY_COLORS[entry.category] || "#94A3B8";
              const label = CATEGORY_LABELS[entry.category] || entry.category;
              return (
                <div key={entry.category} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{label}</span>
                  <div className="w-24 shrink-0">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${entry.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium text-gray-700">
                    {entry.percentage}%
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-gray-400">
                    {formatDuration(entry.duration)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
