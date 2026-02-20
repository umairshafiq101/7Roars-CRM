"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTask,
  updateTask,
  markTaskComplete,
  deleteTask,
  addTaskAssignee,
  removeTaskAssignee,
  addTaskComment,
  deleteTaskComment,
  deleteTaskAttachment,
} from "@/actions/tasks";
import {
  X,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Send,
  Paperclip,
  Download,
  UserMinus,
  Flag,
} from "lucide-react";

interface TaskDetail {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  project: { id: string; name: string; color: string; organization_id: string };
  assignees: { id: string; user: { id: string; name: string; email: string } }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    user: { id: string; name: string; email: string };
  }[];
  attachments: {
    id: string;
    file_name: string;
    file_url: string;
    file_size: number | null;
    content_type: string | null;
    created_at: string;
    user: { id: string; name: string };
  }[];
}

interface ProjectOption {
  id: string;
  name: string;
  color: string;
}

interface OrgMember {
  id: string;
  user: { id: string; name: string; email: string };
}

interface TaskDetailDrawerProps {
  taskId: string;
  projects: ProjectOption[];
  orgMembers: OrgMember[];
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
  { value: "TODO", label: "Todo" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "BLOCKED", label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function TaskDetailDrawer({
  taskId,
  projects,
  orgMembers,
  onClose,
  onRefresh,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [commentText, setCommentText] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTask(taskId);
      if (result.success && result.data) {
        const t = result.data as TaskDetail;
        setTask(t);
        setTitle(t.title);
        setProjectId(t.project_id);
        setStatus(t.status);
        setPriority(t.priority);
        setDueDate(t.due_date ? t.due_date.split("T")[0] : "");
        setDescription(t.description || "");
      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  async function handleSave() {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    try {
      await updateTask({
        id: taskId,
        title: title.trim(),
        project_id: projectId,
        status,
        priority,
        due_date: dueDate || null,
        description: description.trim() || undefined,
      });
      fetchTask();
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkComplete() {
    await markTaskComplete(taskId);
    fetchTask();
    onRefresh();
  }

  async function handleDeleteTask() {
    if (!confirm("Delete this task?")) return;
    await deleteTask(taskId);
    onRefresh();
    onClose();
  }

  async function handleAddAssignee(userId: string) {
    await addTaskAssignee(taskId, userId);
    setShowAssigneePicker(false);
    fetchTask();
  }

  async function handleRemoveAssignee(userId: string) {
    await removeTaskAssignee(taskId, userId);
    fetchTask();
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    await addTaskComment(taskId, commentText.trim());
    setCommentText("");
    fetchTask();
  }

  async function handleDeleteComment(commentId: string) {
    await deleteTaskComment(commentId);
    fetchTask();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);
      const res = await fetch("/api/v1/task-attachments", {
        method: "POST",
        body: formData,
      });
      if (res.ok) fetchTask();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(id: string) {
    await deleteTaskAttachment(id);
    fetchTask();
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const assignedUserIds = new Set(task?.assignees.map((a) => a.user.id) ?? []);
  const availableMembers = orgMembers.filter(
    (m) => !assignedUserIds.has(m.user.id)
  );

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="flex h-full w-full max-w-[560px] flex-col bg-[var(--background)] shadow-2xl">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : !task ? (
          <div className="flex flex-1 items-center justify-center text-[var(--muted-foreground)]">
            Task not found
          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
              <button
                onClick={handleMarkComplete}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                <Check className="h-3.5 w-3.5" />
                Mark as complete
              </button>
              <div className="flex-1" />
              <button
                onClick={fetchTask}
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleDeleteTask}
                className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">
                {/* Project */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Project *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={inputClass}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Title */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Task *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Due date */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={inputClass}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assignees */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Assignee(s)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.assignees.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
                      >
                        {a.user.name}
                        <button
                          onClick={() => handleRemoveAssignee(a.user.id)}
                          className="hover:text-red-500"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {showAssigneePicker && availableMembers.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
                      {availableMembers.map((m) => (
                        <button
                          key={m.user.id}
                          onClick={() => handleAddAssignee(m.user.id)}
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

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-y`}
                    placeholder="Add a description..."
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-lg bg-[var(--primary)] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                {/* Attachments */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Attachment(s)</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {uploading ? "Uploading..." : "Add Attachment"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                  {task.attachments.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      No attachments found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {task.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            <div>
                              <p className="text-xs font-medium text-[var(--foreground)]">
                                {att.file_name}
                              </p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">
                                {formatFileSize(att.file_size)} &middot;{" "}
                                {att.user.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={att.file_url}
                              download
                              className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="rounded p-1 text-[var(--muted-foreground)] hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Comment(s)
                  </label>
                  {task.comments.length === 0 ? (
                    <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                      No comments found
                    </p>
                  ) : (
                    <div className="mb-3 space-y-3">
                      {task.comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-[var(--border)] p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] text-[9px] font-bold text-white">
                                {c.user.name
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-[var(--foreground)]">
                                {c.user.name}
                              </span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {new Date(c.created_at).toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="rounded p-0.5 text-[var(--muted-foreground)] hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-[var(--foreground)]">
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className={`flex-1 ${inputClass}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment();
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
