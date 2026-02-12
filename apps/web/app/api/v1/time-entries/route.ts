import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { authenticateApiRequest } from "@/lib/api-auth";
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  stopTimeEntrySchema,
  listTimeEntriesSchema,
} from "@/lib/validations/time-entries";

export async function GET(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const params = listTimeEntriesSchema.parse({
      user_id: url.searchParams.get("user_id") || undefined,
      project_id: url.searchParams.get("project_id") || undefined,
      start_date: url.searchParams.get("start_date") || undefined,
      end_date: url.searchParams.get("end_date") || undefined,
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
    });

    const where: Record<string, unknown> = {};

    // Employees can only see their own entries
    if (member!.role === "EMPLOYEE") {
      where.user_id = session!.user.id;
    } else if (params.user_id) {
      where.user_id = params.user_id;
    }

    if (params.project_id) {
      where.project_id = params.project_id;
    }

    if (params.start_date || params.end_date) {
      where.start_time = {};
      if (params.start_date) {
        (where.start_time as Record<string, unknown>).gte = new Date(params.start_date);
      }
      if (params.end_date) {
        (where.start_time as Record<string, unknown>).lte = new Date(params.end_date);
      }
    }

    const skip = (params.page - 1) * params.limit;

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
        take: params.limit,
      }),
      db.timeEntry.count({ where }),
    ]);

    return jsonOk(entries, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (err) {
    console.error("[TIME ENTRIES GET]", err);
    return jsonErr("Failed to fetch time entries", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const body = await request.json();
    const data = createTimeEntrySchema.parse(body);

    // Calculate duration if both start and end provided
    let duration = data.duration;
    if (data.end_time && !duration) {
      duration = Math.floor(
        (new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / 1000
      );
    }

    const entry = await db.timeEntry.create({
      data: {
        user_id: session!.user.id,
        project_id: data.project_id || null,
        task_id: data.task_id || null,
        description: data.description || null,
        start_time: new Date(data.start_time),
        end_time: data.end_time ? new Date(data.end_time) : null,
        duration: duration || null,
        is_manual: data.is_manual,
        is_billable: data.is_billable,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "CREATE",
      entityType: "time_entry",
      entityId: entry.id,
      newData: entry,
    });

    return jsonOk(entry);
  } catch (err) {
    console.error("[TIME ENTRIES POST]", err);
    if (err instanceof Error && err.name === "ZodError") {
      return jsonErr("Invalid input: " + err.message, 422);
    }
    return jsonErr("Failed to create time entry", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, action, ...rest } = body;

    if (!id) {
      return jsonErr("Time entry ID is required", 400);
    }

    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      return jsonErr("Time entry not found", 404);
    }

    // Employees can only update their own entries
    if (member!.role === "EMPLOYEE" && existing.user_id !== session!.user.id) {
      return jsonErr("Forbidden", 403);
    }

    let updateData: Record<string, unknown> = {};

    if (action === "stop") {
      const stopData = stopTimeEntrySchema.parse(rest);
      const endTime = new Date(stopData.end_time);
      const duration = Math.floor(
        (endTime.getTime() - existing.start_time.getTime()) / 1000
      );
      updateData = { end_time: endTime, duration };
    } else {
      const data = updateTimeEntrySchema.parse(rest);
      if (data.end_time) {
        updateData.end_time = new Date(data.end_time);
        updateData.duration = Math.floor(
          (new Date(data.end_time).getTime() - existing.start_time.getTime()) / 1000
        );
      }
      if (data.project_id !== undefined) updateData.project_id = data.project_id;
      if (data.task_id !== undefined) updateData.task_id = data.task_id;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.is_billable !== undefined) updateData.is_billable = data.is_billable;
    }

    const updated = await db.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "UPDATE",
      entityType: "time_entry",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return jsonOk(updated);
  } catch (err) {
    console.error("[TIME ENTRIES PATCH]", err);
    if (err instanceof Error && err.name === "ZodError") {
      return jsonErr("Invalid input: " + err.message, 422);
    }
    return jsonErr("Failed to update time entry", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return jsonErr("Time entry ID is required", 400);
    }

    const existing = await db.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      return jsonErr("Time entry not found", 404);
    }

    // Employees can only delete their own entries
    if (member!.role === "EMPLOYEE" && existing.user_id !== session!.user.id) {
      return jsonErr("Forbidden", 403);
    }

    await db.timeEntry.delete({ where: { id } });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "DELETE",
      entityType: "time_entry",
      entityId: id,
      oldData: existing,
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("[TIME ENTRIES DELETE]", err);
    return jsonErr("Failed to delete time entry", 500);
  }
}
