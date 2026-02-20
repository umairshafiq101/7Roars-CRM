"use client";

import { DonutChart } from "./DonutChart";
import { formatDuration } from "@/lib/format";

const DOMAIN_COLORS = [
  "#5B4FE9", "#F5A623", "#22C55E", "#EF4444", "#06B6D4",
  "#8B5CF6", "#EC4899", "#94A3B8", "#14B8A6", "#F97316",
];

interface WebsiteEntry {
  domain: string;
  duration: number;
  percentage: number;
  category: string;
}

interface WebsiteCategoryChartProps {
  data: WebsiteEntry[];
  totalDuration: number;
}

export function WebsiteCategoryChart({ data, totalDuration }: WebsiteCategoryChartProps) {
  const chartData = data.map((d, i) => ({
    label: d.domain,
    value: d.duration,
    color: DOMAIN_COLORS[i % DOMAIN_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Websites by AI Categorization</h3>
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
            data.map((entry, i) => {
              const color = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
              return (
                <div key={entry.domain} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{entry.domain}</span>
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
