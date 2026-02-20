"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getTasks, createTask, deleteTask } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { getClients } from "@/actions/clients";
import { getOrgMembers } from "@/actions/projects";
import { TaskDetailDrawer } from "@/components/modules/tasks/TaskDetailDrawer";
import {
  CheckSquare,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Assignee {
  id: string;
  user: { id: string; name: string; email: string };
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  project: { id: string; name: string; color: string; client_id: string | null };
  assignees: Assignee[];
  _count: { comments: number; attachments: number };
}

interface ProjectOption {
  id: string;
  name: string;
  color: string;
  client_id: string | null;
  client: { id: string; name: string; company: string | null } | null;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface OrgMember {
  id: string;
  user_id: string;
  user: { id: string; name: string; email: string };
}

const STATUS_OPTIONS = [
  { value: "TODO", label: "Todo", color: "bg-green-100 text-green-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "IN_REVIEW", label: "In Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "DONE", label: "Done", color: "bg-gray-100 text-gray-600" },
  { value: "BLOCKED", label: "Blocked", color: "bg-red-100 text-red-700" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "text-gray-400" },
  { value: "MEDIUM", label: "Normal", color: "text-blue-500" },
  { value: "HIGH", label: "High", color: "text-orange-500" },
  { value: "URGENT", label: "Urgent", color: "text-red-600" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function getPriorityStyle(priority: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority) ?? PRIORITY_OPTIONS[1];
}

function formatDueDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isOverdue = d < now && d.toDateString() !== now.toDateString();
  const formatted = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return { formatted, isOverdue };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formProjectId, setFormProjectId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formStatus, setFormStatus] = useState("TODO");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formDueDate, setFormDueDate] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTasks({
        search: search || undefined,
        project_id: filterProject || undefined,
        client_id: filterClient || undefined,
        assignee_id: filterEmployee || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        assigned_to_me: assignedToMe || undefined,
        page,
        limit,
      });
      if (result.success && result.data) {
        setTasks(result.data as TaskRow[]);
        setTotal(result.meta?.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [search, filterProject, filterClient, filterEmployee, filterStatus, filterPriority, assignedToMe, page, limit]);

  const fetchOptions = useCallback(async () => {
    const [pRes, cRes, mRes] = await Promise.all([
      getProjects(),
      getClients(),
      getOrgMembers(),
    ]);
    if (pRes.success && pRes.data) setProjects(pRes.data as ProjectOption[]);
    if (cRes.success && cRes.data) setClients(cRes.data as ClientOption[]);
    if (mRes.success && mRes.data) setOrgMembers(mRes.data as OrgMember[]);
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchTasks(), 300);
    return () => clearTimeout(timeout);
  }, [fetchTasks]);

  function resetCreate() {
    setFormProjectId("");
    setFormTitle("");
    setFormStatus("TODO");
    setFormPriority("MEDIUM");
    setFormDueDate("");
    setFormError("");
    setShowCreateModal(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formProjectId || !formTitle.trim()) {
      setFormError("Project and Task name are required");
      return;
    }
    setFormError("");
    setFormLoading(true);

    try {
      const result = await createTask({
        project_id: formProjectId,
        title: formTitle.trim(),
        status: formStatus,
        priority: formPriority,
        due_date: formDueDate || undefined,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to create task");
        return;
      }

      resetCreate();
      fetchTasks();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    const result = await deleteTask(id);
    if (result.success) fetchTasks();
  }

  const selectClass =
    "rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Tasks</h1>
        <p className="text-sm text-[var(--muted-foreground)]">You can manage your tasks here.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-40">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <select value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All customers</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.company || c.name}</option>
          ))}
        </select>

        <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select value={filterEmployee} onChange={(e) => { setFilterEmployee(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All employees</option>
          {orgMembers.map((m) => (
            <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Task status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Priority</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
          <input
            type="checkbox"
            checked={assignedToMe}
            onChange={(e) => { setAssignedToMe(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Assigned to me
        </label>

        <button onClick={() => fetchTasks()} className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          <p className="text-sm font-medium text-[var(--foreground)]">
            You have {total} task(s) here.
          </p>
          <button
            onClick={() => { resetCreate(); setShowCreateModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add new task
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">No tasks found.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_80px_130px_80px] gap-4 border-b border-[var(--border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due date</span>
              <span />
            </div>

            {/* Rows */}
            {tasks.map((task) => {
              const statusStyle = getStatusStyle(task.status);
              const priorityStyle = getPriorityStyle(task.priority);
              const due = formatDueDate(task.due_date);

              return (
                <div
                  key={task.id}
                  className="group grid cursor-pointer grid-cols-[1fr_100px_80px_130px_80px] items-center gap-4 border-b border-[var(--border)] px-6 py-4 last:border-b-0 hover:bg-[var(--muted)]/50"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {task.title}
                      {task._count.attachments > 0 && (
                        <span className="ml-1.5 text-[var(--muted-foreground)]">📎</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: task.project.color }}
                      />
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {task.project.name}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>

                  <Flag className={`h-4 w-4 ${priorityStyle.color}`} />

                  {due ? (
                    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${due.isOverdue ? "bg-red-100 text-red-700" : "bg-[var(--primary-light)] text-[var(--primary)]"}`}>
                      {due.formatted}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}

                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedTaskId(task.id)}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3">
            <span className="text-xs text-[var(--muted-foreground)]">{limit}/page</span>
            <div className="flex items-center gap-1">
              <span className="mr-2 text-xs text-[var(--muted-foreground)]">Total {total}</span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-[var(--border)] p-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded text-xs font-medium ${page === p ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] hover:bg-[var(--accent)]"}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-[var(--border)] p-1 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              Go to
              <input
                type="number"
                min={1}
                max={totalPages}
                className="w-12 rounded border border-[var(--border)] px-1.5 py-0.5 text-center text-xs outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseInt((e.target as HTMLInputElement).value);
                    if (v >= 1 && v <= totalPages) setPage(v);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) resetCreate(); }}>
          <div className="w-full max-w-md rounded-xl bg-[var(--background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold">Add new task</h2>
              <button onClick={resetCreate} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium">Project *</label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Task *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Priority</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Due date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetCreate} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {formLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          projects={projects}
          orgMembers={orgMembers}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={fetchTasks}
        />
      )}
    </div>
  );
}
