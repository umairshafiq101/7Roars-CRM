"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getOrgMembers,
} from "@/actions/projects";
import { getClients } from "@/actions/clients";
import {
  FolderKanban,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Target,
  Receipt,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";

interface MemberInfo {
  id: string;
  member: {
    id: string;
    user: { id: string; name: string; email: string };
  };
}

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  description: string | null;
  is_billable: boolean;
  hourly_rate: number | null;
  budget_hours: number | null;
  status: string;
  client_id: string | null;
  client: { id: string; name: string; company: string | null } | null;
  members: MemberInfo[];
  memberCount: number;
  taskCount: number;
  timeSpentSeconds: number;
  currentCost: number;
  billableAmount: number;
  budgetTotal: number;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface OrgMember {
  id: string;
  user: { id: string; name: string; email: string };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs. ${String(m).padStart(2, "0")} mins.`;
}

function formatCurrency(amount: number): string {
  return `PKR ${amount.toFixed(2)}`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formDescription, setFormDescription] = useState("");
  const [formBillable, setFormBillable] = useState(true);
  const [formRate, setFormRate] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, mRes] = await Promise.all([
        getProjects(search || undefined),
        getClients(),
        getOrgMembers(),
      ]);
      if (pRes.success && pRes.data) setProjects(pRes.data as ProjectRow[]);
      if (cRes.success && cRes.data) setClients(cRes.data as ClientOption[]);
      if (mRes.success && mRes.data) setOrgMembers(mRes.data as OrgMember[]);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchAll(), 300);
    return () => clearTimeout(timeout);
  }, [fetchAll]);

  function resetForm() {
    setFormName("");
    setFormColor("#6366f1");
    setFormDescription("");
    setFormBillable(true);
    setFormRate("");
    setFormBudget("");
    setFormClientId("");
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  }

  function openEdit(p: ProjectRow) {
    setEditingId(p.id);
    setFormName(p.name);
    setFormColor(p.color);
    setFormDescription(p.description || "");
    setFormBillable(p.is_billable);
    setFormRate(p.hourly_rate?.toString() || "");
    setFormBudget(p.budget_hours?.toString() || "");
    setFormClientId(p.client_id || "");
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Project name is required");
      return;
    }
    setFormError("");
    setFormLoading(true);

    try {
      const rate = formRate ? parseFloat(formRate) : undefined;
      const budget = formBudget ? parseFloat(formBudget) : undefined;

      const result = editingId
        ? await updateProject({
            id: editingId,
            name: formName.trim(),
            color: formColor,
            description: formDescription.trim() || undefined,
            is_billable: formBillable,
            hourly_rate: rate,
            budget_hours: budget,
            client_id: formClientId || null,
          })
        : await createProject({
            name: formName.trim(),
            color: formColor,
            description: formDescription.trim() || undefined,
            is_billable: formBillable,
            hourly_rate: rate,
            budget_hours: budget,
            client_id: formClientId || undefined,
          });

      if (!result.success) {
        setFormError(result.error || "Failed to save project");
        return;
      }

      resetForm();
      fetchAll();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? Time entries will be preserved.")) return;
    const result = await deleteProject(id);
    if (result.success) fetchAll();
  }

  async function handleAddMember(projectId: string, memberId: string) {
    const result = await addProjectMember(projectId, memberId);
    if (result.success) fetchAll();
  }

  async function handleRemoveMember(projectId: string, memberId: string) {
    const result = await removeProjectMember(projectId, memberId);
    if (result.success) fetchAll();
  }

  const colorOptions = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Projects
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          You can manage your projects here.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAll()}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add new project
          </button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="w-full max-w-lg rounded-xl bg-[var(--background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold">
                {editingId ? "Edit Project" : "Add new project"}
              </h2>
              <button onClick={resetForm} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium">Project Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`h-7 w-7 rounded-full border-2 ${formColor === c ? "border-[var(--foreground)]" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Customer</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">No customer</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description / Notes</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Hourly Rate</label>
                  <input
                    type="number"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Budget Hours</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    min="0"
                    step="0.5"
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formBillable}
                  onChange={(e) => setFormBillable(e.target.checked)}
                  className="rounded"
                />
                Billable
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : editingId ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <FolderKanban className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">
              {search ? "No projects match your search." : "No projects yet. Create your first project."}
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--border)] px-6 py-3">
              <p className="text-sm font-medium text-[var(--foreground)]">
                You have {projects.length} projects(s) here.
              </p>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_120px_120px_100px] gap-4 border-b border-[var(--border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Project name</span>
              <span>Customer</span>
              <span>Employees</span>
              <span>Tasks</span>
              <span />
            </div>

            {/* Rows */}
            {projects.map((project) => {
              const isExpanded = expandedId === project.id;
              const assignedMemberIds = new Set(
                project.members.map((pm) => pm.member.id)
              );
              const availableMembers = orgMembers.filter(
                (m) => !assignedMemberIds.has(m.id)
              );

              return (
                <div
                  key={project.id}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  {/* Main Row */}
                  <div
                    className="grid cursor-pointer grid-cols-[1fr_1fr_120px_120px_100px] items-center gap-4 px-6 py-4 hover:bg-[var(--muted)]/50"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : project.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      )}
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {project.name}
                      </span>
                    </div>

                    <span className="text-sm text-[var(--muted-foreground)]">
                      {project.client
                        ? project.client.company || project.client.name
                        : "—"}
                    </span>

                    <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--foreground)]">
                      {project.memberCount} employee(s)
                    </span>

                    <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--foreground)]">
                      {project.taskCount} task(s)
                    </span>

                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(project)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] bg-[var(--muted)]/30 px-6 py-5">
                      {/* Stats pills */}
                      <div className="mb-4 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2">
                          <Clock className="h-4 w-4 text-[var(--primary)]" />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                              {formatDuration(project.timeSpentSeconds)}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              Time spent
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2">
                          <Target className="h-4 w-4 text-[var(--primary)]" />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                              {project.budget_hours || "∞"}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              Project budget
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2">
                          <DollarSign className="h-4 w-4 text-[var(--primary)]" />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                              {formatCurrency(project.currentCost)}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              Current cost
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2">
                          <Receipt className="h-4 w-4 text-[var(--primary)]" />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                              {formatCurrency(project.billableAmount)}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              Billable amount
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Members */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                          <span className="text-xs font-medium text-[var(--foreground)]">
                            Assigned Employees
                          </span>
                          <button
                            onClick={() =>
                              setShowMemberPicker(
                                showMemberPicker === project.id
                                  ? null
                                  : project.id
                              )
                            }
                            className="ml-auto flex items-center gap-1 rounded-md bg-[var(--primary-light)] px-2 py-1 text-xs text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                          >
                            <UserPlus className="h-3 w-3" />
                            Add
                          </button>
                        </div>

                        {project.members.length === 0 ? (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            No employees assigned yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {project.members.map((pm) => (
                              <span
                                key={pm.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
                              >
                                {pm.member.user.name}
                                <button
                                  onClick={() =>
                                    handleRemoveMember(
                                      project.id,
                                      pm.member.id
                                    )
                                  }
                                  className="ml-0.5 hover:text-red-500"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {showMemberPicker === project.id &&
                          availableMembers.length > 0 && (
                            <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
                              {availableMembers.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => handleAddMember(project.id, m.id)}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs hover:bg-[var(--accent)]"
                                >
                                  <Plus className="h-3 w-3 text-[var(--primary)]" />
                                  {m.user.name}
                                  <span className="text-[var(--muted-foreground)]">
                                    ({m.user.email})
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Notes */}
                      {project.description && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Notes: {project.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
