"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import { ok, err, type ApiResponse } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";

async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return null;

  return { session, member };
}

export async function getTasks(filters?: {
  search?: string;
  project_id?: string;
  client_id?: string;
  assignee_id?: string;
  status?: string;
  priority?: string;
  assigned_to_me?: boolean;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 24;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deleted_at: null,
      project: {
        organization_id: ctx.member.organization_id,
        deleted_at: null,
      },
    };

    if (filters?.search?.trim()) {
      where.title = { contains: filters.search.trim(), mode: "insensitive" };
    }
    if (filters?.project_id) {
      where.project_id = filters.project_id;
    }
    if (filters?.client_id) {
      where.project = {
        ...(where.project as object),
        client_id: filters.client_id,
      };
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.assignee_id || filters?.assigned_to_me) {
      const userId = filters?.assigned_to_me
        ? ctx.session.user.id
        : filters?.assignee_id;
      where.assignees = { some: { user_id: userId } };
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
        include: {
          project: {
            select: { id: true, name: true, color: true, client_id: true },
          },
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      db.task.count({ where }),
    ]);

    const serialized = tasks.map((t) => ({
      ...t,
      estimated_hours: t.estimated_hours ? Number(t.estimated_hours) : null,
      due_date: t.due_date?.toISOString() ?? null,
      created_at: t.created_at.toISOString(),
      updated_at: t.updated_at.toISOString(),
    }));

    return ok(serialized, { page, limit, total });
  } catch (error) {
    console.error("[getTasks]", error);
    return err("Failed to fetch tasks");
  }
}

export async function getTask(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            organization_id: true,
          },
        },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { created_at: "desc" },
        },
        attachments: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!task) return err("Task not found");
    if (task.project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    return ok({
      ...task,
      estimated_hours: task.estimated_hours ? Number(task.estimated_hours) : null,
      due_date: task.due_date?.toISOString() ?? null,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      comments: task.comments.map((c) => ({
        ...c,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
      })),
      attachments: task.attachments.map((a) => ({
        ...a,
        created_at: a.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[getTask]", error);
    return err("Failed to fetch task");
  }
}

export async function createTask(params: {
  project_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  assignee_ids?: string[];
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const project = await db.project.findUnique({
      where: { id: params.project_id },
    });
    if (!project) return err("Project not found");
    if (project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    const task = await db.task.create({
      data: {
        project_id: params.project_id,
        title: params.title,
        description: params.description || null,
        status: (params.status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED") ?? "TODO",
        priority: (params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM",
        due_date: params.due_date ? new Date(params.due_date) : null,
        estimated_hours: params.estimated_hours ?? null,
        assignees: params.assignee_ids?.length
          ? {
              create: params.assignee_ids.map((uid) => ({ user_id: uid })),
            }
          : undefined,
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "task",
      entityId: task.id,
      newData: task,
    });

    return ok(task);
  } catch (error) {
    console.error("[createTask]", error);
    return err("Failed to create task");
  }
}

export async function updateTask(params: {
  id: string;
  project_id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  estimated_hours?: number | null;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.task.findUnique({
      where: { id: params.id },
      include: { project: { select: { organization_id: true } } },
    });
    if (!existing) return err("Task not found");
    if (existing.project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    const data: Record<string, unknown> = {};
    if (params.project_id !== undefined) data.project_id = params.project_id;
    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.status !== undefined) data.status = params.status;
    if (params.priority !== undefined) data.priority = params.priority;
    if (params.due_date !== undefined)
      data.due_date = params.due_date ? new Date(params.due_date) : null;
    if (params.estimated_hours !== undefined)
      data.estimated_hours = params.estimated_hours;

    const updated = await db.task.update({
      where: { id: params.id },
      data,
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "task",
      entityId: params.id,
      oldData: existing,
      newData: updated,
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateTask]", error);
    return err("Failed to update task");
  }
}

export async function deleteTask(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.task.findUnique({
      where: { id },
      include: { project: { select: { organization_id: true } } },
    });
    if (!existing) return err("Task not found");
    if (existing.project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    await db.task.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "task",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteTask]", error);
    return err("Failed to delete task");
  }
}

export async function markTaskComplete(id: string): Promise<ApiResponse> {
  return updateTask({ id, status: "DONE" });
}

// --- Assignees ---

export async function addTaskAssignee(
  taskId: string,
  userId: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { organization_id: true } } },
    });
    if (!task) return err("Task not found");
    if (task.project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    const assignee = await db.taskAssignee.create({
      data: { task_id: taskId, user_id: userId },
    });

    return ok(assignee);
  } catch (error) {
    console.error("[addTaskAssignee]", error);
    return err("Failed to add assignee");
  }
}

export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    await db.taskAssignee.deleteMany({
      where: { task_id: taskId, user_id: userId },
    });
    return ok({ removed: true });
  } catch (error) {
    console.error("[removeTaskAssignee]", error);
    return err("Failed to remove assignee");
  }
}

// --- Comments ---

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { organization_id: true } } },
    });
    if (!task) return err("Task not found");
    if (task.project.organization_id !== ctx.member.organization_id)
      return err("Forbidden");

    const comment = await db.taskComment.create({
      data: {
        task_id: taskId,
        user_id: ctx.session.user.id,
        content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return ok({
      ...comment,
      created_at: comment.created_at.toISOString(),
      updated_at: comment.updated_at.toISOString(),
    });
  } catch (error) {
    console.error("[addTaskComment]", error);
    return err("Failed to add comment");
  }
}

export async function deleteTaskComment(commentId: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) return err("Comment not found");
    if (comment.user_id !== ctx.session.user.id) return err("Can only delete your own comments");

    await db.taskComment.delete({ where: { id: commentId } });
    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteTaskComment]", error);
    return err("Failed to delete comment");
  }
}

// --- Attachments ---

export async function deleteTaskAttachment(
  attachmentId: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const attachment = await db.taskAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) return err("Attachment not found");

    await db.taskAttachment.delete({ where: { id: attachmentId } });
    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteTaskAttachment]", error);
    return err("Failed to delete attachment");
  }
}
