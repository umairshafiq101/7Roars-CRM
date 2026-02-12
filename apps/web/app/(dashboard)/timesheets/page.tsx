"use client";

import { useState, useEffect, useCallback } from "react";
import { TimesheetTable } from "@/components/modules/time-tracking/TimesheetTable";
import { TimesheetFilters } from "@/components/modules/time-tracking/TimesheetFilters";
import { Pagination } from "@/components/shared/Pagination";
import { getTimeEntries, deleteTimeEntry, updateTimeEntry, getProjects, getTeamMembers } from "@/actions/time-entries";
import { formatDuration, getDayRange, getWeekDates } from "@/lib/format";
import { Clock, X } from "lucide-react";

export default function TimesheetsPage() {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [date, setDate] = useState(new Date());
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const range = view === "daily" ? getDayRange(date) : getWeekDates(date);

      const result = await getTimeEntries({
        userId: selectedUserId || undefined,
        projectId: selectedProjectId || undefined,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        page,
        limit: 20,
      });

      if (result.success && result.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.data as any[];
        setEntries(data);
        setTotal(result.meta?.total || 0);
        setTotalSeconds(data.reduce((sum: number, e: { duration?: number }) => sum + (e.duration || 0), 0));
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, [view, date, page, selectedUserId, selectedProjectId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    async function loadFilters() {
      const [usersRes, projectsRes] = await Promise.all([
        getTeamMembers(),
        getProjects(),
      ]);
      if (usersRes.success && usersRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers((usersRes.data as any[]).map((m: any) => ({ id: m.user.id, name: m.user.name })));
      }
      if (projectsRes.success && projectsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(projectsRes.data as any[]);
      }
    }
    loadFilters();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editEntry, setEditEntry] = useState<any>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBillable, setEditBillable] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEditOpen(entry: any) {
    setEditEntry(entry);
    setEditDesc(entry.description || "");
    // start_time/end_time may be Date objects or ISO strings
    const st = entry.start_time instanceof Date ? entry.start_time.toISOString() : String(entry.start_time || "");
    const et = entry.end_time instanceof Date ? entry.end_time.toISOString() : String(entry.end_time || "");
    setEditStart(st.slice(0, 16));
    setEditEnd(et.slice(0, 16));
    setEditBillable(entry.is_billable);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editEntry) return;
    setEditLoading(true);
    try {
      const result = await updateTimeEntry({
        id: editEntry.id,
        description: editDesc,
        startTime: editStart ? new Date(editStart).toISOString() : undefined,
        endTime: editEnd ? new Date(editEnd).toISOString() : undefined,
        isBillable: editBillable,
      });
      if (result.success) {
        setEditEntry(null);
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to update entry:", error);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this time entry?")) return;
    const result = await deleteTimeEntry(id);
    if (result.success) {
      fetchEntries();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Track and manage time entries
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <Clock className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">Total: {formatDuration(totalSeconds)}</span>
        </div>
      </div>

      <TimesheetFilters
        view={view}
        onViewChange={(v) => { setView(v); setPage(1); }}
        date={date}
        onDateChange={(d) => { setDate(d); setPage(1); }}
        users={users}
        selectedUserId={selectedUserId}
        onUserChange={(id) => { setSelectedUserId(id); setPage(1); }}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={(id) => { setSelectedProjectId(id); setPage(1); }}
      />

      {/* Edit Entry Modal */}
      {editEntry && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Edit Time Entry</h2>
            <button onClick={() => setEditEntry(null)} className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleEditSave} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Description"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Start Time</label>
              <input
                type="datetime-local"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Time</label>
              <input
                type="datetime-local"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editBillable} onChange={(e) => setEditBillable(e.target.checked)} className="rounded" />
                Billable
              </label>
            </div>
            <div className="flex items-end justify-end gap-3">
              <button type="button" onClick={() => setEditEntry(null)} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]">
                Cancel
              </button>
              <button type="submit" disabled={editLoading} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50">
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          <TimesheetTable
            entries={entries}
            showUser={!selectedUserId}
            onDelete={handleDelete}
            onEdit={handleEditOpen}
          />
          <Pagination
            page={page}
            limit={20}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
