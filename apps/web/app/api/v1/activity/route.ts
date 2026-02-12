import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createActivitySchema, batchActivitySchema } from "@/lib/validations/activity";

export async function GET(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const timeEntryId = url.searchParams.get("time_entry_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);

    const where: Record<string, unknown> = {};

    if (member!.role === "EMPLOYEE") {
      where.user_id = session!.user.id;
    } else if (userId) {
      where.user_id = userId;
    }

    if (timeEntryId) {
      where.time_entry_id = timeEntryId;
    }

    if (startDate || endDate) {
      where.interval_start = {};
      if (startDate) {
        (where.interval_start as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.interval_start as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { interval_start: "desc" },
        skip,
        take: limit,
      }),
      db.activityLog.count({ where }),
    ]);

    return jsonOk(activities, { page, limit, total });
  } catch (err) {
    console.error("[ACTIVITY GET]", err);
    return jsonErr("Failed to fetch activity logs", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const body = await request.json();

    // Support both single and batch activity logs
    if (body.activities && Array.isArray(body.activities)) {
      const data = batchActivitySchema.parse(body);

      const created = await db.activityLog.createMany({
        data: data.activities.map((a) => ({
          user_id: session!.user.id,
          time_entry_id: a.time_entry_id || null,
          interval_start: new Date(a.interval_start),
          interval_end: new Date(a.interval_end),
          keyboard_count: a.keyboard_count,
          mouse_count: a.mouse_count,
          activity_percent: a.activity_percent,
        })),
      });

      await auditLog({
        userId: session!.user.id,
        organizationId: member!.organization_id,
        action: "CREATE",
        entityType: "activity_log",
        entityId: "batch",
        newData: { count: created.count },
      });

      return jsonOk({ created: created.count });
    } else {
      const data = createActivitySchema.parse(body);

      const activity = await db.activityLog.create({
        data: {
          user_id: session!.user.id,
          time_entry_id: data.time_entry_id || null,
          interval_start: new Date(data.interval_start),
          interval_end: new Date(data.interval_end),
          keyboard_count: data.keyboard_count,
          mouse_count: data.mouse_count,
          activity_percent: data.activity_percent,
        },
      });

      await auditLog({
        userId: session!.user.id,
        organizationId: member!.organization_id,
        action: "CREATE",
        entityType: "activity_log",
        entityId: activity.id,
        newData: activity,
      });

      return jsonOk(activity);
    }
  } catch (err) {
    console.error("[ACTIVITY POST]", err);
    if (err instanceof Error && err.name === "ZodError") {
      return jsonErr("Invalid input: " + err.message, 422);
    }
    return jsonErr("Failed to log activity", 500);
  }
}
