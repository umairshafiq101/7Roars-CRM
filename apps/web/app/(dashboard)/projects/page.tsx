"use client";

import { useState, useEffect } from "react";
import { getProjects, createProject, updateProject, deleteProject } from "@/actions/projects";
import { FolderKanban, Plus, Pencil, Trash2, X } from "lucide-react";

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  description: string | null;
  is_billable: boolean;
  hourly_rate: number | null;
  status: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formDescription, setFormDescription] = useState("");
  const [formBillable, setFormBillable] = useState(true);
  const [formRate, setFormRate] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchProjects() {
    setLoading(true);
    try {
      const result = await getProjects();
      if (result.success && result.data) {
        setProjects(result.data as ProjectRow[]);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  function resetForm() {
    setFormName("");
    setFormColor("#6366f1");
    setFormDescription("");
    setFormBillable(true);
    setFormRate("");
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(project: ProjectRow) {
    setEditingId(project.id);
    setFormName(project.name);
    setFormColor(project.color);
    setFormDescription(project.description || "");
    setFormBillable(project.is_billable);
    setFormRate(project.hourly_rate?.toString() || "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const rate = formRate ? parseFloat(formRate) : undefined;

      if (editingId) {
        const result = await updateProject({
          id: editingId,
          name: formName,
          color: formColor,
          description: formDescription || undefined,
          is_billable: formBillable,
          hourly_rate: rate,
        });
        if (!result.success) {
          setFormError(result.error || "Failed to update project");
          return;
        }
      } else {
        const result = await createProject({
          name: formName,
          color: formColor,
          description: formDescription || undefined,
          is_billable: formBillable,
          hourly_rate: rate,
        });
        if (!result.success) {
          setFormError(result.error || "Failed to create project");
          return;
        }
      }

      resetForm();
      fetchProjects();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? Time entries will be preserved.")) return;
    const result = await deleteProject(id);
    if (result.success) {
      fetchProjects();
    }
  }

  const colorOptions = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage projects for time tracking
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Project
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Project" : "New Project"}
            </h2>
            <button onClick={resetForm} className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{formError}</div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Project Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                maxLength={200}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Trade Supplies UK Website"
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hourly Rate ($)</label>
              <input
                type="number"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                min="0"
                step="0.01"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="50.00"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formBillable}
                  onChange={(e) => setFormBillable(e.target.checked)}
                  className="rounded"
                />
                Billable
              </label>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                {formLoading ? "Saving..." : editingId ? "Update Project" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-12 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-[var(--muted-foreground)]">
            No projects yet. Create your first project to start tracking time.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
                  <h3 className="font-medium">{project.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(project)}
                    className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="rounded p-1 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-[var(--destructive)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {project.description && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">{project.description}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                {project.is_billable && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    Billable
                  </span>
                )}
                {project.hourly_rate && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ${project.hourly_rate}/hr
                  </span>
                )}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  project.status === "ACTIVE" ? "bg-blue-100 text-blue-700" :
                  project.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
