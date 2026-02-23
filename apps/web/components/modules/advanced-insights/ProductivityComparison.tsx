"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductivityComparison } from "@/actions/advanced-insights";
import type { ComparisonData, PeriodMetrics } from "@/actions/advanced-insights";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

function fmtDateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
}

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

export function ProductivityComparison() {
  const [p1Start, setP1Start] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 13); d.setHours(0, 0, 0, 0); return d;
  });
  const [p1End, setP1End] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(23, 59, 59, 999); return d;
  });
  const [p2Start, setP2Start] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const [p2End, setP2End] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductivityComparison({
        period1Start: new Date(p1Start.getFullYear(), p1Start.getMonth(), p1Start.getDate()).toISOString(),
        period1End: new Date(p1End.getFullYear(), p1End.getMonth(), p1End.getDate(), 23, 59, 59, 999).toISOString(),
        period2Start: new Date(p2Start.getFullYear(), p2Start.getMonth(), p2Start.getDate()).toISOString(),
        period2End: new Date(p2End.getFullYear(), p2End.getMonth(), p2End.getDate(), 23, 59, 59, 999).toISOString(),
      });
      if (res.success && res.data) setData(res.data as ComparisonData);
    } catch (err) {
      console.error("Failed to fetch comparison:", err);
    } finally {
      setLoading(false);
    }
  }, [p1Start, p1End, p2Start, p2End]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function navigatePeriod(period: 1 | 2, dir: -1 | 1) {
    const days = 7 * dir;
    if (period === 1) {
      setP1Start((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
      setP1End((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
    } else {
      setP2Start((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
      setP2End((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
    }
  }

  const better = data
    ? data.period2.productivePct >= data.period1.productivePct ? "Period 2 is better" : "Period 1 is better"
    : "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Productivity Comparison</h2>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium">Period</span>
      </div>

      {/* Period pickers */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        {/* Period 1 */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Period 1</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5">
            <button onClick={() => navigatePeriod(1, -1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="flex items-center gap-1.5 px-2 text-xs font-medium">
              <Calendar className="h-3 w-3 text-[var(--muted-foreground)]" />
              {fmtDateLabel(p1Start)} - {fmtDateLabel(p1End)}
            </span>
            <button onClick={() => navigatePeriod(1, 1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        {/* Period 2 */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Period 2</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5">
            <button onClick={() => navigatePeriod(2, -1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="flex items-center gap-1.5 px-2 text-xs font-medium">
              <Calendar className="h-3 w-3 text-[var(--muted-foreground)]" />
              {fmtDateLabel(p2Start)} - {fmtDateLabel(p2End)}
            </span>
            <button onClick={() => navigatePeriod(2, 1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Change cards */}
          <div className="grid grid-cols-3 gap-4">
            <ChangeCard label="Productivity Change" value={data.productivityChange} subtitle={better} />
            <ChangeCard label="Working Time Change" value={data.workingTimeChange} subtitle={better} />
            <ChangeCard label="Activity Level Change" value={data.activityChange} subtitle={better} />
          </div>

          {/* Bar chart */}
          <ComparisonBarChart period1={data.period1} period2={data.period2} />

          {/* Comparison table */}
          <ComparisonTable period1={data.period1} period2={data.period2} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">No data for the selected periods.</p>
        </div>
      )}
    </div>
  );
}

function ChangeCard({ label, value, subtitle }: { label: string; value: number; subtitle: string }) {
  const isPositive = value >= 0;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
        {value >= 0 ? "+" : ""}{value}%
      </p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{subtitle}</p>
    </div>
  );
}

function ComparisonBarChart({ period1, period2 }: { period1: PeriodMetrics; period2: PeriodMetrics }) {
  const W = 800, H = 280, PAD_L = 40, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const chartH = H - PAD_T - PAD_B;
  const maxY = 100;

  const groups = [
    { label: "Productive", p1: period1.productivePct, p2: period2.productivePct },
    { label: "Neutral", p1: period1.neutralPct, p2: period2.neutralPct },
    { label: "Unproductive", p1: period1.unproductivePct, p2: period2.unproductivePct },
  ];

  const groupW = (W - PAD_L - PAD_R) / groups.length;
  const barW = 50;
  const gap = 10;

  function toY(v: number) { return PAD_T + chartH - (v / maxY) * chartH; }

  const yTicks = [0, 10, 20, 30, 40, 50, 60];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-center gap-6">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "#22C55E" }} /> Period 1
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "#6366F1" }} /> Period 2
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} y1={toY(t)} x2={W - PAD_R} y2={toY(t)} stroke="#E5E7EB" strokeWidth={0.5} />
            <text x={PAD_L - 6} y={toY(t) + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">{t}%</text>
          </g>
        ))}

        {/* Bars */}
        {groups.map((g, i) => {
          const cx = PAD_L + groupW * i + groupW / 2;
          const x1 = cx - barW - gap / 2;
          const x2 = cx + gap / 2;
          const h1 = (g.p1 / maxY) * chartH;
          const h2 = (g.p2 / maxY) * chartH;
          return (
            <g key={g.label}>
              <rect x={x1} y={toY(g.p1)} width={barW} height={h1} rx={4} fill="#22C55E" opacity={0.85} />
              <rect x={x2} y={toY(g.p2)} width={barW} height={h2} rx={4} fill="#6366F1" opacity={0.85} />
              <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} fill="#6B7280">{g.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ComparisonTable({ period1, period2 }: { period1: PeriodMetrics; period2: PeriodMetrics }) {
  const rows = [
    { icon: "🟢", metric: "Productive %", p1: `${period1.productivePct}%`, p2: period2.productivePct, diff: period2.productivePct - period1.productivePct, unit: "%" },
    { icon: "🔵", metric: "Neutral %", p1: `${period1.neutralPct}%`, p2: period2.neutralPct, diff: period2.neutralPct - period1.neutralPct, unit: "%" },
    { icon: "🟡", metric: "Unproductive %", p1: `${period1.unproductivePct}%`, p2: period2.unproductivePct, diff: period2.unproductivePct - period1.unproductivePct, unit: "%" },
    { icon: "🟣", metric: "Working Time", p1: fmtHM(period1.workingSeconds), p2Val: fmtHM(period2.workingSeconds), diff: period1.workingSeconds > 0 ? ((period2.workingSeconds - period1.workingSeconds) / period1.workingSeconds) * 100 : (period2.workingSeconds > 0 ? 100 : 0), unit: "%" },
    { icon: "📊", metric: "Avg Activity Level", p1: `${period1.avgActivity}%`, p2: period2.avgActivity, diff: period1.avgActivity > 0 ? ((period2.avgActivity - period1.avgActivity) / period1.avgActivity) * 100 : (period2.avgActivity > 0 ? 100 : 0), unit: "%" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-gray-50/50">
            <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">Metric</th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)]">Period 1</th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)]">Period 2</th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)]">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p2Display = r.p2Val ?? `${r.p2}%`;
            const diffVal = r.diff;
            const isPositive = diffVal >= 0;
            return (
              <tr key={r.metric} className="border-b border-[var(--border)] last:border-0">
                <td className="px-5 py-3 font-medium">
                  <span className="mr-2">{r.icon}</span>{r.metric}
                </td>
                <td className="px-5 py-3 text-center text-[var(--muted-foreground)]">{r.p1}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-block rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-semibold text-white">
                    {p2Display}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-white ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}>
                    {isPositive ? "+" : ""}{diffVal.toFixed(2)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
