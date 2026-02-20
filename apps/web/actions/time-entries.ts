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

export async function getTimeEntries(params: {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: Record<string, unknown> = {};

    if (ctx.member.role === "EMPLOYEE") {
      where.user_id = ctx.session.user.id;
    } else if (params.userId) {
      where.user_id = params.userId;
    }

    if (params.projectId) where.project_id = params.projectId;

    if (params.startDate || params.endDate) {
      where.start_time = {};
      if (params.startDate) (where.start_time as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate) (where.start_time as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      db.timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          user: { select: { id: true, name: true, email: true, avatar_url: true } },
          _count: { select: { screenshots: true } },
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
    console.error("[getTimeEntries]", error);
    return err("Failed to fetch time entries");
  }
}

export async function createManualTimeEntry(params: {
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

    const entry = await db.timeEntry.create({
      data: {
        user_id: ctx.session.user.id,
        project_id: params.projectId || null,
        description: params.description || null,
        start_time: start,
        end_time: end,
        duration,
        is_manual: true,
        is_billable: params.isBillable ?? true,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "time_entry",
      entityId: entry.id,
      newData: entry,
    });

    return ok(entry);
  } catch (error) {
    console.error("[createManualTimeEntry]", error);
    return err("Failed to create time entry");
  }
}

export async function updateTimeEntry(params: {
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
    if (!existing) return err("Time entry not found");

    if (ctx.member.role === "EMPLOYEE" && existing.user_id !== ctx.session.user.id) {
      return err("Forbidden");
    }

    const data: Record<string, unknown> = {};
    if (params.projectId !== undefined) data.project_id = params.projectId || null;
    if (params.description !== undefined) data.description = params.description || null;
    if (params.isBillable !== undefined) data.is_billable = params.isBillable;

    if (params.startTime) data.start_time = new Date(params.startTime);
    if (params.endTime) data.end_time = new Date(params.endTime);

    // Recalculate duration if start or end time changed
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
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "time_entry",
      entityId: params.id,
      oldData: existing,
      newData: updated,
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateTimeEntry]", error);
    return err("Failed to update time entry");
  }
}

export async function deleteTimeEntry(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) return err("Time entry not found");

    if (ctx.member.role === "EMPLOYEE" && existing.user_id !== ctx.session.user.id) {
      return err("Forbidden");
    }

    await db.timeEntry.delete({ where: { id } });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "time_entry",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteTimeEntry]", error);
    return err("Failed to delete time entry");
  }
}

export async function getProjects(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const projects = await db.project.findMany({
      where: {
        organization_id: ctx.member.organization_id,
        deleted_at: null,
        status: "ACTIVE",
      },
      orderBy: { name: "asc" },
    });

    // Convert Prisma Decimal objects to plain numbers for client serialization
    const serialized = projects.map((p) => ({
      ...p,
      hourly_rate: p.hourly_rate ? Number(p.hourly_rate) : null,
      budget_hours: p.budget_hours ? Number(p.budget_hours) : null,
    }));

    return ok(serialized);
  } catch (error) {
    console.error("[getProjects]", error);
    return err("Failed to fetch projects");
  }
}

export async function getTimesheetSummary(params: {
  userId?: string;
  startDate: string;
  endDate: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const where: Record<string, unknown> = {
      start_time: {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      },
    };

    if (ctx.member.role === "EMPLOYEE") {
      where.user_id = ctx.session.user.id;
    } else if (params.userId) {
      where.user_id = params.userId;
    }

    const [entries, activityLogs] = await Promise.all([
      db.timeEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          user: { select: { id: true, name: true, email: true, avatar_url: true } },
        },
        orderBy: { start_time: "asc" },
      }),
      db.activityLog.findMany({
        where: {
          ...(ctx.member.role === "EMPLOYEE" ? { user_id: ctx.session.user.id } : params.userId ? { user_id: params.userId } : {}),
          interval_start: {
            gte: new Date(params.startDate),
            lte: new Date(params.endDate),
          },
        },
      }),
    ]);

    const activityByUser: Record<string, number[]> = {};
    for (const log of activityLogs) {
      if (!activityByUser[log.user_id]) activityByUser[log.user_id] = [];
      activityByUser[log.user_id].push(log.activity_percent);
    }

    const grouped: Record<string, {
      user: { id: string; name: string; email: string; avatar_url: string | null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries: any[];
      checkIn: string | null;
      checkOut: string | null;
      avgActivity: number;
      workingSeconds: number;
      totalSeconds: number;
    }> = {};

    for (const entry of entries) {
      const uid = entry.user_id;
      if (!grouped[uid]) {
        grouped[uid] = {
          user: entry.user,
          entries: [],
          checkIn: null,
          checkOut: null,
          avgActivity: 0,
          workingSeconds: 0,
          totalSeconds: 0,
        };
      }
      grouped[uid].entries.push(entry);
      grouped[uid].totalSeconds += entry.duration || 0;
      if (entry.end_time) grouped[uid].workingSeconds += entry.duration || 0;

      const st = entry.start_time instanceof Date ? entry.start_time.toISOString() : String(entry.start_time);
      const et = entry.end_time instanceof Date ? entry.end_time.toISOString() : entry.end_time ? String(entry.end_time) : null;

      if (!grouped[uid].checkIn || st < grouped[uid].checkIn!) grouped[uid].checkIn = st;
      if (et && (!grouped[uid].checkOut || et > grouped[uid].checkOut!)) grouped[uid].checkOut = et;
    }

    for (const uid of Object.keys(grouped)) {
      const logs = activityByUser[uid] || [];
      grouped[uid].avgActivity = logs.length > 0
        ? Math.round(logs.reduce((s, v) => s + v, 0) / logs.length)
        : 0;

      grouped[uid].entries = grouped[uid].entries.map((e) => ({
        ...e,
        start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
        end_time: e.end_time instanceof Date ? e.end_time.toISOString() : e.end_time,
        created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
        updated_at: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
      }));
    }

    return ok(Object.values(grouped));
  } catch (error) {
    console.error("[getTimesheetSummary]", error);
    return err("Failed to fetch timesheet summary");
  }
}

export async function getTeamMembers(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const members = await db.member.findMany({
      where: {
        organization_id: ctx.member.organization_id,
        is_active: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return ok(members);
  } catch (error) {
    console.error("[getTeamMembers]", error);
    return err("Failed to fetch team members");
  }
}
