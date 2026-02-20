"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { ok, err, type ApiResponse } from "@/lib/api-response";

async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return null;

  return { session, member };
}

export async function getManualEntries(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 12, 100);
    const where: Record<string, unknown> = { is_manual: true };

    if (ctx.member.role === "EMPLOYEE") {
      where.user_id = ctx.session.user.id;
    } else if (params.userId) {
      where.user_id = params.userId;
    }

    if (params.status && params.status !== "all") {
      where.manual_status = params.status;
    }

    if (params.startDate || params.endDate) {
      where.start_time = {};
      if (params.startDate)
        (where.start_time as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate)
        (where.start_time as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      db.timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          user: { select: { id: true, name: true, email: true, avatar_url: true } },
        },
        orderBy: { start_time: "desc" },
        skip,
        take: limit,
      }),
      db.timeEntry.count({ where }),
    ]);

    const serialized = entries.map((e) => ({
      ...e,
      start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      end_time: e.end_time instanceof Date ? e.end_time.toISOString() : e.end_time,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
      updated_at: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
    }));

    return ok(serialized, { page, limit, total });
  } catch (error) {
    console.error("[getManualEntries]", error);
    return err("Failed to fetch manual entries");
  }
}

export async function createManualEntry(params: {
  userId?: string;
  projectId?: string;
  description?: string;
  startTime: string;
  endTime: string;
  isBillable?: boolean;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const start = new Date(params.startTime);
    const end = new Date(params.endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration <= 0) return err("End time must be after start time");

    const targetUserId =
      ctx.member.role !== "EMPLOYEE" && params.userId
        ? params.userId
        : ctx.session.user.id;

    const entry = await db.timeEntry.create({
      data: {
        user_id: targetUserId,
        project_id: params.projectId || null,
        description: params.description || null,
        start_time: start,
        end_time: end,
        duration,
        is_manual: true,
        manual_status: "PENDING",
        is_billable: params.isBillable ?? true,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "manual_time_entry",
      entityId: entry.id,
      newData: entry,
    });

    return ok(entry);
  } catch (error) {
    console.error("[createManualEntry]", error);
    return err("Failed to create manual entry");
  }
}

export async function updateManualEntry(params: {
  id: string;
  projectId?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  isBillable?: boolean;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.timeEntry.findUnique({ where: { id: params.id } });
    if (!existing) return err("Entry not found");
    if (!existing.is_manual) return err("Not a manual entry");

    if (ctx.member.role === "EMPLOYEE" && existing.user_id !== ctx.session.user.id) {
      return err("Forbidden");
    }

    const data: Record<string, unknown> = { manual_status: "PENDING" };
    if (params.projectId !== undefined) data.project_id = params.projectId || null;
    if (params.description !== undefined) data.description = params.description || null;
    if (params.isBillable !== undefined) data.is_billable = params.isBillable;
    if (params.startTime) data.start_time = new Date(params.startTime);
    if (params.endTime) data.end_time = new Date(params.endTime);

    const startTime = params.startTime ? new Date(params.startTime) : existing.start_time;
    const endTime = params.endTime ? new Date(params.endTime) : existing.end_time;
    if (endTime) {
      data.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }

    const updated = await db.timeEntry.update({
      where: { id: params.id },
      data,
      include: {
        project: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "manual_time_entry",
      entityId: params.id,
      oldData: existing,
      newData: updated,
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateManualEntry]", error);
    return err("Failed to update manual entry");
  }
}

export async function approveManualEntry(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");
  if (ctx.member.role === "EMPLOYEE") return err("Forbidden");

  try {
    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) return err("Entry not found");

    const updated = await db.timeEntry.update({
      where: { id },
      data: { manual_status: "APPROVED" },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "manual_time_entry",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return ok({ approved: true });
  } catch (error) {
    console.error("[approveManualEntry]", error);
    return err("Failed to approve entry");
  }
}

export async function rejectManualEntry(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");
  if (ctx.member.role === "EMPLOYEE") return err("Forbidden");

  try {
    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) return err("Entry not found");

    const updated = await db.timeEntry.update({
      where: { id },
      data: { manual_status: "REJECTED" },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "manual_time_entry",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return ok({ rejected: true });
  } catch (error) {
    console.error("[rejectManualEntry]", error);
    return err("Failed to reject entry");
  }
}

export async function deleteManualEntry(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) return err("Entry not found");
    if (!existing.is_manual) return err("Not a manual entry");

    if (ctx.member.role === "EMPLOYEE" && existing.user_id !== ctx.session.user.id) {
      return err("Forbidden");
    }

    await db.timeEntry.delete({ where: { id } });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "manual_time_entry",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteManualEntry]", error);
    return err("Failed to delete manual entry");
  }
}
