"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sparkles, Clock, Activity, Moon, Coffee } from "lucide-react";
import { getTeamMemberDetail } from "@/actions/team";
import { DonutChart } from "@/components/modules/overview/DonutChart";
import { formatDuration, formatDate, formatTime } from "@/lib/format";

interface TeamMemberDrawerProps {
  userId: string;
  onClose: () => void;
}

function formatDateInput(d: Date): string {
  return d.toISOString().split("T")[0];
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function TeamMemberDrawer({ userId, onClose }: TeamMemberDrawerProps) {
  const [tab, setTab] = useState<"stats" | "activities" | "screenshots">("stats");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 6);
  defaultStart.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState(formatDateInput(defaultStart));
  const [endDate, setEndDate] = useState(formatDateInput(now));

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTeamMemberDetail({ userId, startDate, endDate });
      if (result.success && result.data) setData(result.data);
    } catch (error) {
      console.error("Failed to load member detail:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const member = data?.member;
  const stats = data?.stats;

  const totalWork = stats?.workingSeconds || 0;
  const totalElapsed = totalWork + (stats?.breakSeconds || 0) + (stats?.idleSeconds || 0);

  const productivePct = stats?.totalAppSeconds > 0 ? Math.round((stats.productiveSeconds / stats.totalAppSeconds) * 100) : 0;
  const neutralPct = stats?.totalAppSeconds > 0 ? Math.round((stats.neutralSeconds / stats.totalAppSeconds) * 100) : 0;
  const unproductivePct = stats?.totalAppSeconds > 0 ? Math.round((stats.unproductiveSeconds / stats.totalAppSeconds) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        {loading && !data ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5B4FE9] border-t-transparent" />
          </div>
        ) : !member ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">Member not found</div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {member.user.avatar_url ? (
                    <img src={member.user.avatar_url} alt={member.user.name} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5B4FE9] to-[#7C3AED] text-lg font-bold text-white">
                      {member.user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{member.user.name}</h2>
                    <p className="text-sm text-gray-400">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/productivity-coach"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Productivity Coach Report
                  </a>
                  <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Info row */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="truncate font-medium text-gray-700">{member.user.email}</p>
                </div>
                <div>
                  <p className="text-gray-400">Role</p>
                  <p className="font-medium text-gray-700">{member.role}</p>
                </div>
                <div>
                  <p className="text-gray-400">Created</p>
                  <p className="font-medium text-gray-700">{formatDate(member.user.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(["stats", "activities", "screenshots"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                    tab === t
                      ? "border-b-2 border-[#5B4FE9] text-[#5B4FE9]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === "stats" && <StatsTab
                stats={stats}
                totalWork={totalWork}
                totalElapsed={totalElapsed}
                productivePct={productivePct}
                neutralPct={neutralPct}
                unproductivePct={unproductivePct}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />}
              {tab === "activities" && <ActivitiesTab entries={data?.timeEntries || []} />}
              {tab === "screenshots" && <ScreenshotsTab screenshots={data?.screenshots || []} />}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Stats Tab ──

interface StatsTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  totalWork: number;
  totalElapsed: number;
  productivePct: number;
  neutralPct: number;
  unproductivePct: number;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
}

function StatsTab({ stats, totalWork, totalElapsed, productivePct, neutralPct, unproductivePct, startDate, endDate, onStartDateChange, onEndDateChange }: StatsTabProps) {
  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-[#5B4FE9]" />
        <span className="text-xs text-gray-400">-</span>
        <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-[#5B4FE9]" />
      </div>

      {/* Total calculated time */}
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Total calculated time:</h4>
          <span className="rounded-lg bg-[#5B4FE9] px-3 py-1 text-xs font-medium text-white">
            {formatDuration(totalWork)}
          </span>
        </div>
      </div>

      {/* Working / Activity / Idle row */}
      <div className="grid grid-cols-3 gap-3">
        <StatMiniCard
          icon={Clock}
          iconColor="#22C55E"
          iconBg="#F0FDF4"
          label="Working"
          value={formatDuration(stats?.workingSeconds || 0)}
          progress={totalElapsed > 0 ? (stats?.workingSeconds || 0) / totalElapsed : 0}
          barColor="#22C55E"
        />
        <StatMiniCard
          icon={Activity}
          iconColor="#5B4FE9"
          iconBg="#EEF2FF"
          label="Activity level"
          value={`avg. ${stats?.avgActivity || 0}%`}
          progress={(stats?.avgActivity || 0) / 100}
          barColor="#5B4FE9"
        />
        <StatMiniCard
          icon={Moon}
          iconColor="#94A3B8"
          iconBg="#F8FAFC"
          label="Idle"
          value={formatDuration(stats?.idleSeconds || 0)}
          progress={totalElapsed > 0 ? (stats?.idleSeconds || 0) / totalElapsed : 0}
          barColor="#94A3B8"
        />
      </div>

      {/* On break */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF7ED]">
            <Coffee className="h-4 w-4 text-[#F5A623]" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">On break</p>
            <p className="text-sm font-semibold text-gray-700">{formatDuration(stats?.breakSeconds || 0)}</p>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {totalElapsed > 0 ? Math.round(((stats?.breakSeconds || 0) / totalElapsed) * 100) : 0}%
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={stats?.breakSeconds || 0} max={totalElapsed} color="#F5A623" />
        </div>
      </div>

      {/* Total calculated work time */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Total calculated work time:</h4>
        <span className="rounded-lg bg-[#F5A623] px-3 py-1 text-xs font-medium text-white">
          {formatDuration(totalWork)}
        </span>
      </div>

      {/* Productivity donuts */}
      <div className="grid grid-cols-3 gap-4">
        <ProductivityDonut label="Productive" pct={productivePct} seconds={stats?.productiveSeconds || 0} color="#22C55E" />
        <ProductivityDonut label="Neutral" pct={neutralPct} seconds={stats?.neutralSeconds || 0} color="#5B4FE9" />
        <ProductivityDonut label="Unproductive" pct={unproductivePct} seconds={stats?.unproductiveSeconds || 0} color="#EF4444" />
      </div>
    </div>
  );
}

function StatMiniCard({ icon: Icon, iconColor, iconBg, label, value, progress, barColor }: {
  icon: typeof Clock; iconColor: string; iconBg: string;
  label: string; value: string; progress: number; barColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        </div>
        <p className="text-[10px] text-gray-400">{label}</p>
      </div>
      <p className="mt-2 text-xs font-semibold text-gray-700">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: barColor }} />
        </div>
        <span className="text-[10px] font-medium text-gray-400">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}

function ProductivityDonut({ label, pct, seconds, color }: { label: string; pct: number; seconds: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <DonutChart
          data={[
            { label, value: pct, color },
            { label: "rest", value: Math.max(100 - pct, 0), color: "#E2E8F0" },
          ]}
          size={80}
          strokeWidth={10}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{pct}%</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium" style={{ color }}>{label}</p>
      <p className="text-[10px] text-gray-400">Total {formatDuration(seconds)}</p>
    </div>
  );
}

// ── Activities Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActivitiesTab({ entries }: { entries: any[] }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No time entries for this period</p>;
  }
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
          {entry.project && (
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.project.color || "#5B4FE9" }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-700">
              {entry.description || (entry.project?.name || "No description")}
            </p>
            <p className="text-xs text-gray-400">
              {formatTime(entry.start_time)} — {entry.end_time ? formatTime(entry.end_time) : "Running"}
              {entry.project && <span className="ml-2 text-[#5B4FE9]">{entry.project.name}</span>}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-500">
            {formatDuration(entry.duration)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Screenshots Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScreenshotsTab({ screenshots }: { screenshots: any[] }) {
  if (screenshots.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No screenshots for this period</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {screenshots.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-xl border border-gray-100">
          <div className="relative">
            <img src={s.thumbnail_url || s.image_url} alt="Screenshot" className="h-28 w-full object-cover" loading="lazy" />
            <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {s.activity_level}%
            </span>
          </div>
          <div className="p-2">
            <p className="text-[10px] text-gray-400">{formatDate(s.captured_at)} {formatTime(s.captured_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
