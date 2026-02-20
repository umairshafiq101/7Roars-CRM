"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getManualEntries,
  createManualEntry,
  updateManualEntry,
  approveManualEntry,
  rejectManualEntry,
  deleteManualEntry,
} from "@/actions/manual-entries";
import { getProjects, getTeamMembers } from "@/actions/time-entries";
import { ManualEntriesTable } from "@/components/modules/manual-entries/ManualEntriesTable";
import { ManualEntryModal } from "@/components/modules/manual-entries/ManualEntryModal";
import { Pagination } from "@/components/shared/Pagination";
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = any;

function getMonthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatMonthLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function ManualEntriesPage() {
  const [date, setDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(date);
      const result = await getManualEntries({
        userId: selectedUserId || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        page,
        limit: 12,
      });
      if (result.success && result.data) {
        setEntries(result.data as Entry[]);
        setTotal(result.meta?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch manual entries:", err);
    } finally {
      setLoading(false);
    }
  }, [date, selectedUserId, selectedStatus, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    async function loadFilters() {
      const [membersRes, projectsRes] = await Promise.all([
        getTeamMembers(),
        getProjects(),
      ]);
      if (membersRes.success && membersRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const members = membersRes.data as any[];
        setUsers(members.map((m: any) => ({ id: m.user.id, name: m.user.name })));
        setTeamMembers(members.map((m: any) => ({ user_id: m.user.id, name: m.user.name, id: m.id })));
        setIsManager(members.some((m: any) => m.role !== "EMPLOYEE"));
      }
      if (projectsRes.success && projectsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(projectsRes.data as any[]);
      }
    }
    loadFilters();
  }, []);

  function navigateMonth(dir: -1 | 1) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + dir);
    setDate(d);
    setPage(1);
  }

  async function handleSave(data: {
    userId?: string;
    projectId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    isBillable: boolean;
  }) {
    if (editEntry) {
      await updateManualEntry({ id: editEntry.id, ...data });
    } else {
      await createManualEntry(data);
    }
    setEditEntry(null);
    setShowModal(false);
    fetchData();
  }

  async function handleApprove(id: string) {
    await approveManualEntry(id);
    fetchData();
  }

  async function handleReject(id: string) {
    await rejectManualEntry(id);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this manual time entry?")) return;
    await deleteManualEntry(id);
    fetchData();
  }

  function handleEdit(entry: Entry) {
    setEditEntry(entry);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manual time entries</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Requests for working hours that cannot be spent in front of the computer.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button onClick={() => navigateMonth(-1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {formatMonthLabel(date)}
          </span>
          <button onClick={() => navigateMonth(1)} className="rounded p-1 hover:bg-[var(--accent)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Employee filter (managers only) */}
        {isManager && (
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
        )}

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={fetchData}
          className="rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>

        {/* Add button */}
        <button
          onClick={() => { setEditEntry(null); setShowModal(true); }}
          className="ml-auto flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          <ManualEntriesTable
            entries={entries}
            isManager={isManager}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {total > 12 && (
            <Pagination page={page} limit={12} total={total} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ManualEntryModal
          entry={editEntry}
          projects={projects}
          teamMembers={teamMembers}
          isManager={isManager}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
        />
      )}
    </div>
  );
}
