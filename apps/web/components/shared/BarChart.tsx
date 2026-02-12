"use client";

import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export function BarChart({
  data,
  maxValue,
  height = 200,
  formatValue = (v) => String(v),
  className,
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height }}>
      {data.map((item, i) => {
        const barHeight = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              {formatValue(item.value)}
            </span>
            <div
              className="w-full min-w-[20px] rounded-t-md transition-all"
              style={{
                height: `${Math.max(barHeight, 2)}%`,
                backgroundColor: item.color || "var(--primary)",
              }}
            />
            <span className="text-[10px] text-[var(--muted-foreground)]">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
