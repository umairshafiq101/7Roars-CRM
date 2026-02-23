"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductivityTrends } from "@/actions/advanced-insights";
import type { TrendsData, TrendDay } from "@/actions/advanced-insights";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react";

function fmtDateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtPeakDay(dateStr: string | null) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  employees: { userId: string; name: string; role: string }[];
}

export function ProductivityTrends({ employees }: Props) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [roleFilter, setRoleFilter] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      const res = await getProductivityTrends({
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        roleFilter: roleFilter || undefined,
        employeeId: employeeId || undefined,
      });
      if (res.success && res.data) setData(res.data as TrendsData);
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, roleFilter, employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function navigateWeek(dir: -1 | 1) {
    const days = 7 * dir;
    setStartDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
    setEndDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
  }

  const changeVsPrev = data
    ? parseFloat((data.avgProductivity - data.previousPeriodAvg).toFixed(2))
    : 0;

  function exportChart() {
    if (!data) return;
    const header = "Date,Productive %,Neutral %,Unproductive %";
    const lines = data.days.map((d) => `${d.date},${d.productivePct},${d.neutralPct},${d.unproductivePct}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `productivity-trends-${startDate.toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Productivity Trend Analysis</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium">Daily</span>
          <button onClick={exportChart} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent)]">
            <Download className="h-3.5 w-3.5" /> Export Chart
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Date Range</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5">
            <button onClick={() => navigateWeek(-1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="flex items-center gap-1.5 px-2 text-xs font-medium">
              <Calendar className="h-3 w-3 text-[var(--muted-foreground)]" />
              {fmtDateLabel(startDate)} - {fmtDateLabel(endDate)}
            </span>
            <button onClick={() => navigateWeek(1)} className="rounded p-0.5 hover:bg-[var(--accent)]"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Team</p>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs outline-none">
            <option value="">All teams</option>
            <option value="OWNER">Owners</option>
            <option value="ADMIN">Admins</option>
            <option value="MANAGER">Managers</option>
            <option value="EMPLOYEE">Employees</option>
          </select>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Employee</p>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs outline-none">
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.userId} value={emp.userId}>{emp.name}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchData} className="ml-auto mt-4 rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Average Productivity</p>
              <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{data.avgProductivity}%</p>
              {changeVsPrev !== 0 && (
                <p className={`mt-1 flex items-center justify-center gap-1 text-xs font-medium ${changeVsPrev > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {changeVsPrev > 0 ? "↑" : "↓"} {Math.abs(changeVsPrev)}% vs previous period
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Peak Productivity Day</p>
              <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{fmtPeakDay(data.peakDay)}</p>
              {data.peakDayPct > 0 && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{data.peakDayPct}% productivity</p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Trend</p>
              <p className={`mt-1 text-3xl font-bold ${data.trend === "Increasing" ? "text-emerald-600" : data.trend === "Decreasing" ? "text-red-500" : "text-amber-500"}`}>
                {data.trend}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Based on period comparison</p>
            </div>
          </div>

          {/* Line chart */}
          {data.days.length > 0 && <TrendLineChart days={data.days} />}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">No data for the selected period.</p>
        </div>
      )}
    </div>
  );
}

// ── SVG Line Chart ──
function TrendLineChart({ days }: { days: TrendDay[] }) {
  const W = 900, H = 300, PAD_L = 40, PAD_R = 20, PAD_T = 30, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxY = 100;
  const xStep = days.length > 1 ? chartW / (days.length - 1) : chartW;

  function toX(i: number) { return PAD_L + (days.length > 1 ? i * xStep : chartW / 2); }
  function toY(v: number) { return PAD_T + chartH - (v / maxY) * chartH; }

  function polyline(values: number[], color: string) {
    if (values.length === 0) return null;
    const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    return (
      <g>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={4} fill="white" stroke={color} strokeWidth={2} />
        ))}
      </g>
    );
  }

  // Y-axis gridlines
  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-center gap-6">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "#22C55E" }} /> Productive
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "#06B6D4" }} /> Neutral
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: "#EF4444" }} /> Unproductive
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

        {/* Lines */}
        {polyline(days.map((d) => d.productivePct), "#22C55E")}
        {polyline(days.map((d) => d.neutralPct), "#06B6D4")}
        {polyline(days.map((d) => d.unproductivePct), "#EF4444")}

        {/* X labels */}
        {days.map((d, i) => (
          <text key={d.date} x={toX(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#9CA3AF">
            {fmtDateShort(new Date(d.date + "T00:00:00"))}
          </text>
        ))}
      </svg>
    </div>
  );
}
