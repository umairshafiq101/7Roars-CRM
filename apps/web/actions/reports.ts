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

export async function getReportData(params: {
  startDate: string;
  endDate: string;
  userId?: string;
  projectId?: string;
  groupBy?: "user" | "project" | "day";
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const where: Record<string, unknown> = {
      start_time: {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      },
    };

    if (params.userId) where.user_id = params.userId;
    if (params.projectId) where.project_id = params.projectId;

    const entries = await db.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true, is_billable: true, hourly_rate: true } },
      },
      orderBy: { start_time: "asc" },
    });

    // Compute summary stats
    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableSeconds = entries
      .filter((e) => e.is_billable)
      .reduce((sum, e) => sum + (e.duration || 0), 0);

    // Group by user
    const byUser = new Map<string, { name: string; totalSeconds: number; billableSeconds: number; entries: number }>();
    for (const e of entries) {
      const key = e.user_id;
      const existing = byUser.get(key) || { name: e.user?.name || "Unknown", totalSeconds: 0, billableSeconds: 0, entries: 0 };
      existing.totalSeconds += e.duration || 0;
      if (e.is_billable) existing.billableSeconds += e.duration || 0;
      existing.entries += 1;
      byUser.set(key, existing);
    }

    // Group by project
    const byProject = new Map<string, { name: string; color: string; totalSeconds: number; billableSeconds: number; entries: number }>();
    for (const e of entries) {
      const key = e.project_id || "no-project";
      const existing = byProject.get(key) || { name: e.project?.name || "No Project", color: e.project?.color || "#6b7280", totalSeconds: 0, billableSeconds: 0, entries: 0 };
      existing.totalSeconds += e.duration || 0;
      if (e.is_billable) existing.billableSeconds += e.duration || 0;
      existing.entries += 1;
      byProject.set(key, existing);
    }

    // Group by day
    const byDay = new Map<string, { totalSeconds: number; billableSeconds: number; entries: number }>();
    for (const e of entries) {
      const day = e.start_time.toISOString().split("T")[0];
      const existing = byDay.get(day) || { totalSeconds: 0, billableSeconds: 0, entries: 0 };
      existing.totalSeconds += e.duration || 0;
      if (e.is_billable) existing.billableSeconds += e.duration || 0;
      existing.entries += 1;
      byDay.set(day, existing);
    }

    const serializedEntries = entries.map((e) => ({
      ...e,
      start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      end_time: e.end_time instanceof Date ? e.end_time.toISOString() : e.end_time,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
      updated_at: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
      project: e.project ? { ...e.project, hourly_rate: e.project.hourly_rate ? Number(e.project.hourly_rate) : null } : null,
    }));

    return ok({
      summary: {
        totalSeconds,
        billableSeconds,
        totalEntries: entries.length,
      },
      byUser: Array.from(byUser.entries()).map(([id, data]) => ({ id, ...data })),
      byProject: Array.from(byProject.entries()).map(([id, data]) => ({ id, ...data })),
      byDay: Array.from(byDay.entries()).map(([date, data]) => ({ date, ...data })),
      entries: serializedEntries,
    });
  } catch (error) {
    console.error("[getReportData]", error);
    return err("Failed to generate report");
  }
}

export async function getDashboardStats(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Week start (Monday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const userFilter = ctx.member.role === "EMPLOYEE"
      ? { user_id: ctx.session.user.id }
      : {};

    const [todayEntries, weekEntries, activeMembers, todayScreenshots, recentEntries] = await Promise.all([
      // Hours today
      db.timeEntry.aggregate({
        where: {
          ...userFilter,
          start_time: { gte: todayStart, lte: todayEnd },
        },
        _sum: { duration: true },
        _count: true,
      }),
      // Hours this week
      db.timeEntry.aggregate({
        where: {
          ...userFilter,
          start_time: { gte: weekStart, lte: todayEnd },
        },
        _sum: { duration: true },
      }),
      // Active members (tracked today)
      db.timeEntry.findMany({
        where: {
          start_time: { gte: todayStart, lte: todayEnd },
        },
        select: { user_id: true },
        distinct: ["user_id"],
      }),
      // Screenshots today
      db.screenshot.count({
        where: {
          ...userFilter,
          captured_at: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Recent time entries
      db.timeEntry.findMany({
        where: userFilter,
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { start_time: "desc" },
        take: 10,
      }),
    ]);

    // Weekly breakdown by day
    const weeklyBreakdown = await db.timeEntry.findMany({
      where: {
        ...userFilter,
        start_time: { gte: weekStart, lte: todayEnd },
      },
      select: { start_time: true, duration: true },
    });

    const dailyTotals: Record<string, number> = {};
    for (const entry of weeklyBreakdown) {
      const day = entry.start_time.toISOString().split("T")[0];
      dailyTotals[day] = (dailyTotals[day] || 0) + (entry.duration || 0);
    }

    const serializedRecent = recentEntries.map((e) => ({
      ...e,
      start_time: e.start_time instanceof Date ? e.start_time.toISOString() : e.start_time,
      end_time: e.end_time instanceof Date ? e.end_time.toISOString() : e.end_time,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
      updated_at: e.updated_at instanceof Date ? e.updated_at.toISOString() : e.updated_at,
    }));

    return ok({
      todaySeconds: todayEntries._sum.duration || 0,
      todayEntries: todayEntries._count,
      weekSeconds: weekEntries._sum.duration || 0,
      activeMembers: activeMembers.length,
      todayScreenshots,
      recentEntries: serializedRecent,
      dailyTotals,
    });
  } catch (error) {
    console.error("[getDashboardStats]", error);
    return err("Failed to fetch dashboard stats");
  }
}
