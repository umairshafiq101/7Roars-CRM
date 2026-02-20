"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
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

export async function getMyActivitySummary(params: {
  userId?: string;
  startDate: string;
  endDate: string;
  projectId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const targetUserId =
    ctx.member.role !== "EMPLOYEE" && params.userId
      ? params.userId
      : ctx.session.user.id;

  try {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    const [timeEntries, activityLogs, appUsageLogs, settings] = await Promise.all([
      db.timeEntry.findMany({
        where: {
          user_id: targetUserId,
          start_time: { gte: start, lte: end },
          end_time: { not: null },
          ...(params.projectId ? { project_id: params.projectId } : {}),
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { start_time: "asc" },
      }),
      db.activityLog.findMany({
        where: {
          user_id: targetUserId,
          interval_start: { gte: start, lte: end },
        },
        orderBy: { interval_start: "asc" },
      }),
      db.appUsageLog.findMany({
        where: {
          user_id: targetUserId,
          interval_start: { gte: start, lte: end },
        },
      }),
      db.setting.findMany({
        where: { organization_id: ctx.member.organization_id },
      }),
    ]);

    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = String(s.value ?? "");

    const workdayStart = settingsMap["workday_start"] || "09:00";
    const workdayEnd = settingsMap["workday_end"] || "18:00";
    const [startH, startM] = workdayStart.split(":").map(Number);
    const [endH, endM] = workdayEnd.split(":").map(Number);
    const expectedWorkSeconds = (endH * 60 + endM - (startH * 60 + startM)) * 60;

    const totalWorkingSeconds = timeEntries.reduce((sum, e) => {
      if (!e.end_time) return sum;
      return sum + (e.duration || 0);
    }, 0);

    const avgActivityPercent =
      activityLogs.length > 0
        ? Math.round(
            activityLogs.reduce((sum, a) => sum + a.activity_percent, 0) /
              activityLogs.length
          )
        : 0;

    const totalKeyboardCount = activityLogs.reduce((s, a) => s + a.keyboard_count, 0);
    const totalMouseCount = activityLogs.reduce((s, a) => s + a.mouse_count, 0);
    const totalActivityIntervalSeconds = activityLogs.length * 60;
    const avgActivitySecsPerMin =
      totalActivityIntervalSeconds > 0
        ? Math.round(
            (avgActivityPercent / 100) * 60
          )
        : 0;

    const productiveSeconds = appUsageLogs
      .filter((a) => a.is_productive === true)
      .reduce((s, a) => s + a.duration, 0);
    const unproductiveSeconds = appUsageLogs
      .filter((a) => a.is_productive === false)
      .reduce((s, a) => s + a.duration, 0);
    const totalAppSeconds = appUsageLogs.reduce((s, a) => s + a.duration, 0);
    const neutralSeconds = totalAppSeconds - productiveSeconds - unproductiveSeconds;

    const productivePct =
      totalAppSeconds > 0 ? Math.round((productiveSeconds / totalAppSeconds) * 100) : 0;
    const unproductivePct =
      totalAppSeconds > 0 ? Math.round((unproductiveSeconds / totalAppSeconds) * 100) : 0;
    const neutralPct =
      totalAppSeconds > 0 ? Math.round((neutralSeconds / totalAppSeconds) * 100) : 0;

    const serializedEntries = timeEntries.map((e) => ({
      ...e,
      start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      end_time: e.end_time instanceof Date ? e.end_time.toISOString() : e.end_time,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
      updated_at: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
    }));

    const serializedActivityLogs = activityLogs.map((a) => ({
      ...a,
      interval_start:
        a.interval_start instanceof Date ? a.interval_start.toISOString() : a.interval_start,
      interval_end:
        a.interval_end instanceof Date ? a.interval_end.toISOString() : a.interval_end,
      created_at: a.created_at instanceof Date ? a.created_at.toISOString() : a.created_at,
    }));

    return ok({
      expectedWorkSeconds,
      totalWorkingSeconds,
      avgActivityPercent,
      avgActivitySecsPerMin,
      totalKeyboardCount,
      totalMouseCount,
      productivePct,
      unproductivePct,
      neutralPct,
      productiveSeconds,
      unproductiveSeconds,
      neutralSeconds,
      timeEntries: serializedEntries,
      activityLogs: serializedActivityLogs,
    });
  } catch (error) {
    console.error("[getMyActivitySummary]", error);
    return err("Failed to fetch activity summary");
  }
}

export async function getMyProjects(): Promise<ApiResponse> {
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
      select: { id: true, name: true, color: true },
    });
    return ok(projects);
  } catch (error) {
    console.error("[getMyProjects]", error);
    return err("Failed to fetch projects");
  }
}
