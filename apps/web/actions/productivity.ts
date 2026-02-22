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

export type ProductivityEmployee = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  workingSeconds: number;
  productiveSeconds: number;
  neutralSeconds: number;
  unproductiveSeconds: number;
  productivePct: number;
  neutralPct: number;
  unproductivePct: number;
};

export type ProductivitySummary = {
  totalWorkingSeconds: number;
  totalProductiveSeconds: number;
  totalNeutralSeconds: number;
  totalUnproductiveSeconds: number;
  productivePct: number;
  neutralPct: number;
  unproductivePct: number;
};

export type ProductivityData = {
  summary: ProductivitySummary;
  employees: ProductivityEmployee[];
};

export async function getProductivityData(params: {
  startDate: string;
  endDate: string;
  roleFilter?: string;
  employeeId?: string;
  projectId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;

  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  try {
    // Fetch all active members in org
    const allMembers = await db.member.findMany({
      where: {
        organization_id: orgId,
        is_active: true,
        ...(isManager ? {} : { user_id: ctx.session.user.id }),
        ...(params.roleFilter ? { role: params.roleFilter as never } : {}),
        ...(params.employeeId ? { user_id: params.employeeId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    if (allMembers.length === 0) {
      return ok({
        summary: {
          totalWorkingSeconds: 0,
          totalProductiveSeconds: 0,
          totalNeutralSeconds: 0,
          totalUnproductiveSeconds: 0,
          productivePct: 0,
          neutralPct: 0,
          unproductivePct: 0,
        },
        employees: [],
      } as ProductivityData);
    }

    const userIds = allMembers.map((m) => m.user_id);

    // Fetch time entries for working hours
    const timeEntries = await db.timeEntry.findMany({
      where: {
        user_id: { in: userIds },
        start_time: { gte: start, lte: end },
        end_time: { not: null },
        ...(params.projectId ? { project_id: params.projectId } : {}),
      },
    });

    // Fetch app usage logs for productive/neutral/unproductive breakdown
    const appLogs = await db.appUsageLog.findMany({
      where: {
        user_id: { in: userIds },
        interval_start: { gte: start, lte: end },
      },
    });

    // Group by user
    const entriesByUser: Record<string, typeof timeEntries> = {};
    const appLogsByUser: Record<string, typeof appLogs> = {};
    for (const uid of userIds) {
      entriesByUser[uid] = [];
      appLogsByUser[uid] = [];
    }
    for (const e of timeEntries) entriesByUser[e.user_id]?.push(e);
    for (const a of appLogs) appLogsByUser[a.user_id]?.push(a);

    const employees: ProductivityEmployee[] = [];

    for (const member of allMembers) {
      const uid = member.user_id;
      const entries = entriesByUser[uid] || [];
      const logs = appLogsByUser[uid] || [];

      // Working seconds from completed time entries
      const workingSeconds = entries.reduce((s, e) => s + (e.duration || 0), 0);

      // App usage breakdown
      const productiveSeconds = logs
        .filter((l) => l.is_productive === true)
        .reduce((s, l) => s + l.duration, 0);
      const unproductiveSeconds = logs
        .filter((l) => l.is_productive === false)
        .reduce((s, l) => s + l.duration, 0);
      const totalAppSeconds = logs.reduce((s, l) => s + l.duration, 0);
      const neutralSeconds = Math.max(0, totalAppSeconds - productiveSeconds - unproductiveSeconds);

      // Percentages based on app usage total (same as Worktivity)
      const appTotal = productiveSeconds + neutralSeconds + unproductiveSeconds;
      const productivePct = appTotal > 0 ? Math.round((productiveSeconds / appTotal) * 100) : 0;
      const unproductivePct = appTotal > 0 ? Math.round((unproductiveSeconds / appTotal) * 100) : 0;
      const neutralPct = Math.max(0, 100 - productivePct - unproductivePct);

      employees.push({
        userId: uid,
        name: member.user.name,
        avatarUrl: member.user.avatar_url,
        role: member.role,
        workingSeconds,
        productiveSeconds,
        neutralSeconds,
        unproductiveSeconds,
        productivePct,
        neutralPct,
        unproductivePct,
      });
    }

    // Org-wide summary
    const totalProductiveSeconds = employees.reduce((s, e) => s + e.productiveSeconds, 0);
    const totalNeutralSeconds = employees.reduce((s, e) => s + e.neutralSeconds, 0);
    const totalUnproductiveSeconds = employees.reduce((s, e) => s + e.unproductiveSeconds, 0);
    const totalWorkingSeconds = employees.reduce((s, e) => s + e.workingSeconds, 0);
    const grandTotal = totalProductiveSeconds + totalNeutralSeconds + totalUnproductiveSeconds;

    const productivePct = grandTotal > 0 ? Math.round((totalProductiveSeconds / grandTotal) * 100) : 0;
    const unproductivePct = grandTotal > 0 ? Math.round((totalUnproductiveSeconds / grandTotal) * 100) : 0;
    const neutralPct = Math.max(0, 100 - productivePct - unproductivePct);

    return ok({
      summary: {
        totalWorkingSeconds,
        totalProductiveSeconds,
        totalNeutralSeconds,
        totalUnproductiveSeconds,
        productivePct,
        neutralPct,
        unproductivePct,
      },
      employees,
    } as ProductivityData);
  } catch (error) {
    console.error("[getProductivityData]", error);
    return err("Failed to fetch productivity data");
  }
}

// Keep old action for backward compatibility (used by old page)
export async function getProductivityAnalysis(params: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { daily: [], employees: [], peakHours: [] };

  const now = new Date();
  const startDate = params.startDate
    ? new Date(params.startDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const endDate = params.endDate
    ? new Date(params.endDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const userFilter = params.userId
    ? { user_id: params.userId }
    : isManager
      ? {}
      : { user_id: ctx.session.user.id };

  const activityLogs = await db.activityLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: { members: { some: { organization_id: ctx.member.organization_id } } },
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { interval_start: "asc" },
  });

  const appLogs = await db.appUsageLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: { members: { some: { organization_id: ctx.member.organization_id } } },
    },
    include: { user: { select: { id: true, name: true } } },
  });

  const dailyMap = new Map<string, { date: string; totalPercent: number; count: number; productiveSec: number; unproductiveSec: number }>();
  for (const log of activityLogs) {
    const dateKey = log.interval_start.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey);
    if (existing) { existing.totalPercent += log.activity_percent; existing.count++; }
    else dailyMap.set(dateKey, { date: dateKey, totalPercent: log.activity_percent, count: 1, productiveSec: 0, unproductiveSec: 0 });
  }
  for (const log of appLogs) {
    const dateKey = log.interval_start.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey);
    if (existing) {
      if (log.is_productive === true) existing.productiveSec += log.duration;
      else if (log.is_productive === false) existing.unproductiveSec += log.duration;
    }
  }
  const daily = Array.from(dailyMap.values())
    .map((d) => ({ date: d.date, avgActivity: d.count > 0 ? Math.round(d.totalPercent / d.count) : 0, productiveMinutes: Math.round(d.productiveSec / 60), unproductiveMinutes: Math.round(d.unproductiveSec / 60) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { daily, employees: [], peakHours: [] };
}
