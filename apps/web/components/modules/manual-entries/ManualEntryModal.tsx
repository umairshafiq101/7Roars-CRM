"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ManualEntry {
  id: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  project: { id: string; name: string; color: string } | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  manual_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  is_billable: boolean;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  user_id: string;
}

interface ManualEntryModalProps {
  entry?: ManualEntry | null;
  projects: Project[];
  teamMembers: TeamMember[];
  isManager: boolean;
  onSave: (data: {
    userId?: string;
    projectId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    isBillable: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalValue() {
  return toLocalDatetimeValue(new Date().toISOString());
}

export function ManualEntryModal({
  entry,
  projects,
  teamMembers,
  isManager,
  onSave,
  onClose,
}: ManualEntryModalProps) {
  const [userId, setUserId] = useState(entry?.user?.id || "");
  const [projectId, setProjectId] = useState(entry?.project?.id || "");
  const [description, setDescription] = useState(entry?.description || "");
  const [startTime, setStartTime] = useState(
    entry?.start_time ? toLocalDatetimeValue(entry.start_time) : nowLocalValue()
  );
  const [endTime, setEndTime] = useState(
    entry?.end_time ? toLocalDatetimeValue(entry.end_time) : nowLocalValue()
  );
  const [isBillable, setIsBillable] = useState(entry?.is_billable ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entry) {
      setUserId(entry.user?.id || "");
      setProjectId(entry.project?.id || "");
      setDescription(entry.description || "");
      setStartTime(entry.start_time ? toLocalDatetimeValue(entry.start_time) : nowLocalValue());
      setEndTime(entry.end_time ? toLocalDatetimeValue(entry.end_time) : nowLocalValue());
      setIsBillable(entry.is_billable ?? true);
    }
  }, [entry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        userId: isManager ? userId || undefined : undefined,
        projectId: projectId || undefined,
        description: description || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isBillable,
      });
      onClose();
    } catch {
      setError("Failed to save entry. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--background)] shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold">
            {entry ? "Edit Manual Entry" : "Add Manual Time Entry"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--accent)] text-[var(--muted-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee (manager only) */}
          {isManager && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Employee</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Select employee</option>
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Project (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">End time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {/* Billable */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
            />
            Billable hours
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving..." : entry ? "Save Changes" : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
