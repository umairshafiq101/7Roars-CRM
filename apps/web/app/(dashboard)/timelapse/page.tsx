"use client";

import { useState, useEffect, useCallback } from "react";
import { getTimelapseSessions } from "@/actions/screenshots";
import { getTeamMembers } from "@/actions/time-entries";
import { TimelapseGrid } from "@/components/modules/timelapse/TimelapseGrid";
import { TimelapsePlayer } from "@/components/modules/timelapse/TimelapsePlayer";
import { Pagination } from "@/components/shared/Pagination";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Session = any;

function getWeekRange(d: Date) {
  const start = new Date(d);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatWeekLabel(d: Date) {
  const { start, end } = getWeekRange(d);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function TimelapsePage() {
  const [date, setDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [playingSession, setPlayingSession] = useState<Session | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRange(date);
      const result = await getTimelapseSessions({
        userId: selectedUserId || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        page,
        limit: 20,
      });
      if (result.success && result.data) {
        setSessions(result.data as Session[]);
        setTotal(result.meta?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch timelapse sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [date, selectedUserId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    getTeamMembers().then((res) => {
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers((res.data as any[]).map((m: any) => ({ id: m.user.id, name: m.user.name })));
      }
    });
  }, []);

  function navigateWeek(dir: -1 | 1) {
    const d = new Date(date);
    d.setDate(d.getDate() + dir * 7);
    setDate(d);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timelapse videos</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {loading ? "Loading..." : `We found ${total} timelapse video${total !== 1 ? "s" : ""} in your account.`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week nav */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button onClick={() => navigateWeek(-1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {formatWeekLabel(date)}
          </span>
          <button onClick={() => navigateWeek(1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Employee filter */}
        <select
          value={selectedUserId}
          onChange={(e) => { setSelectedUserId(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={fetchData}
          className="ml-auto rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          <TimelapseGrid sessions={sessions} onPlay={(s) => setPlayingSession(s)} />
          {total > 20 && (
            <Pagination page={page} limit={20} total={total} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Player modal */}
      {playingSession && (
        <TimelapsePlayer
          session={playingSession}
          onClose={() => setPlayingSession(null)}
        />
      )}
    </div>
  );
}
