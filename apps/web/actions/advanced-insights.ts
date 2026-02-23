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

// ─── Shared: get user IDs for org with optional filters ───
async function getFilteredUserIds(
  orgId: string,
  currentUserId: string,
  isManager: boolean,
  roleFilter?: string,
  employeeId?: string,
) {
  const members = await db.member.findMany({
    where: {
      organization_id: orgId,
      is_active: true,
      ...(isManager ? {} : { user_id: currentUserId }),
      ...(roleFilter ? { role: roleFilter as never } : {}),
      ...(employeeId ? { user_id: employeeId } : {}),
    },
    select: { user_id: true },
  });
  return members.map((m) => m.user_id);
}

// ═══════════════════════════════════════════════════════════
// TAB 1: Productivity Trends
// ═══════════════════════════════════════════════════════════

export type TrendDay = {
  date: string; // YYYY-MM-DD
  productivePct: number;
  neutralPct: number;
  unproductivePct: number;
  workingSeconds: number;
  avgActivity: number;
};

export type TrendsData = {
  days: TrendDay[];
  avgProductivity: number;
  peakDay: string | null; // date string of highest productivity
  peakDayPct: number;
  trend: "Increasing" | "Decreasing" | "Stable";
  previousPeriodAvg: number; // for comparison arrow
};

export async function getProductivityTrends(params: {
  startDate: string;
  endDate: string;
  roleFilter?: string;
  employeeId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  try {
    const userIds = await getFilteredUserIds(
      orgId, ctx.session.user.id, isManager,
      params.roleFilter, params.employeeId,
    );
    if (userIds.length === 0) return ok({ days: [], avgProductivity: 0, peakDay: null, peakDayPct: 0, trend: "Stable", previousPeriodAvg: 0 } as TrendsData);

    const [appLogs, activityLogs, timeEntries] = await Promise.all([
      db.appUsageLog.findMany({
        where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
        select: { interval_start: true, duration: true, is_productive: true },
      }),
      db.activityLog.findMany({
        where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
        select: { interval_start: true, activity_percent: true },
      }),
      db.timeEntry.findMany({
        where: { user_id: { in: userIds }, start_time: { gte: start, lte: end }, end_time: { not: null } },
        select: { start_time: true, duration: true },
      }),
    ]);

    // Group by date
    const dayMap = new Map<string, {
      productive: number; neutral: number; unproductive: number;
      workingSec: number; activitySum: number; activityCount: number;
    }>();

    for (const log of appLogs) {
      const dk = log.interval_start.toISOString().split("T")[0];
      const d = dayMap.get(dk) || { productive: 0, neutral: 0, unproductive: 0, workingSec: 0, activitySum: 0, activityCount: 0 };
      if (log.is_productive === true) d.productive += log.duration;
      else if (log.is_productive === false) d.unproductive += log.duration;
      else d.neutral += log.duration;
      dayMap.set(dk, d);
    }

    for (const log of activityLogs) {
      const dk = log.interval_start.toISOString().split("T")[0];
      const d = dayMap.get(dk) || { productive: 0, neutral: 0, unproductive: 0, workingSec: 0, activitySum: 0, activityCount: 0 };
      d.activitySum += log.activity_percent;
      d.activityCount += 1;
      dayMap.set(dk, d);
    }

    for (const entry of timeEntries) {
      const dk = entry.start_time.toISOString().split("T")[0];
      const d = dayMap.get(dk) || { productive: 0, neutral: 0, unproductive: 0, workingSec: 0, activitySum: 0, activityCount: 0 };
      d.workingSec += entry.duration || 0;
      dayMap.set(dk, d);
    }

    const days: TrendDay[] = [];
    for (const [date, d] of dayMap.entries()) {
      const total = d.productive + d.neutral + d.unproductive;
      days.push({
        date,
        productivePct: total > 0 ? Math.round((d.productive / total) * 100) : 0,
        neutralPct: total > 0 ? Math.round((d.neutral / total) * 100) : 0,
        unproductivePct: total > 0 ? Math.round((d.unproductive / total) * 100) : 0,
        workingSeconds: d.workingSec,
        avgActivity: d.activityCount > 0 ? Math.round(d.activitySum / d.activityCount) : 0,
      });
    }
    days.sort((a, b) => a.date.localeCompare(b.date));

    // Summary
    const avgProductivity = days.length > 0
      ? parseFloat((days.reduce((s, d) => s + d.productivePct, 0) / days.length).toFixed(2))
      : 0;

    let peakDay: string | null = null;
    let peakDayPct = 0;
    for (const d of days) {
      if (d.productivePct > peakDayPct) { peakDayPct = d.productivePct; peakDay = d.date; }
    }

    // Trend: compare first half vs second half
    let trend: "Increasing" | "Decreasing" | "Stable" = "Stable";
    if (days.length >= 2) {
      const mid = Math.floor(days.length / 2);
      const firstHalf = days.slice(0, mid).reduce((s, d) => s + d.productivePct, 0) / mid;
      const secondHalf = days.slice(mid).reduce((s, d) => s + d.productivePct, 0) / (days.length - mid);
      if (secondHalf > firstHalf + 2) trend = "Increasing";
      else if (secondHalf < firstHalf - 2) trend = "Decreasing";
    }

    // Previous period comparison
    const periodMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);
    const prevEnd = new Date(start.getTime() - 1);

    const prevAppLogs = await db.appUsageLog.findMany({
      where: { user_id: { in: userIds }, interval_start: { gte: prevStart, lte: prevEnd } },
      select: { duration: true, is_productive: true },
    });

    let prevProductive = 0, prevTotal = 0;
    for (const log of prevAppLogs) {
      if (log.is_productive === true) prevProductive += log.duration;
      prevTotal += log.duration;
    }
    const previousPeriodAvg = prevTotal > 0 ? Math.round((prevProductive / prevTotal) * 100) : 0;

    return ok({
      days,
      avgProductivity,
      peakDay,
      peakDayPct,
      trend,
      previousPeriodAvg,
    } as TrendsData);
  } catch (error) {
    console.error("[getProductivityTrends]", error);
    return err("Failed to fetch productivity trends");
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 2: Productivity Comparison
// ═══════════════════════════════════════════════════════════

export type PeriodMetrics = {
  productivePct: number;
  neutralPct: number;
  unproductivePct: number;
  workingSeconds: number;
  avgActivity: number;
};

export type ComparisonData = {
  period1: PeriodMetrics;
  period2: PeriodMetrics;
  productivityChange: number;
  workingTimeChange: number;
  activityChange: number;
};

async function computePeriodMetrics(
  userIds: string[],
  start: Date,
  end: Date,
): Promise<PeriodMetrics> {
  const [appLogs, activityLogs, timeEntries] = await Promise.all([
    db.appUsageLog.findMany({
      where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
      select: { duration: true, is_productive: true },
    }),
    db.activityLog.findMany({
      where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
      select: { activity_percent: true },
    }),
    db.timeEntry.findMany({
      where: { user_id: { in: userIds }, start_time: { gte: start, lte: end }, end_time: { not: null } },
      select: { duration: true },
    }),
  ]);

  let productive = 0, unproductive = 0, neutral = 0;
  for (const log of appLogs) {
    if (log.is_productive === true) productive += log.duration;
    else if (log.is_productive === false) unproductive += log.duration;
    else neutral += log.duration;
  }
  const total = productive + neutral + unproductive;

  const workingSeconds = timeEntries.reduce((s, e) => s + (e.duration || 0), 0);
  const avgActivity = activityLogs.length > 0
    ? Math.round(activityLogs.reduce((s, l) => s + l.activity_percent, 0) / activityLogs.length)
    : 0;

  return {
    productivePct: total > 0 ? Math.round((productive / total) * 100) : 0,
    neutralPct: total > 0 ? Math.round((neutral / total) * 100) : 0,
    unproductivePct: total > 0 ? Math.round((unproductive / total) * 100) : 0,
    workingSeconds,
    avgActivity,
  };
}

export async function getProductivityComparison(params: {
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
  roleFilter?: string;
  employeeId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;

  try {
    const userIds = await getFilteredUserIds(
      orgId, ctx.session.user.id, isManager,
      params.roleFilter, params.employeeId,
    );

    const emptyMetrics: PeriodMetrics = { productivePct: 0, neutralPct: 0, unproductivePct: 0, workingSeconds: 0, avgActivity: 0 };
    if (userIds.length === 0) {
      return ok({ period1: emptyMetrics, period2: emptyMetrics, productivityChange: 0, workingTimeChange: 0, activityChange: 0 } as ComparisonData);
    }

    const p1Start = new Date(params.period1Start);
    const p1End = new Date(params.period1End);
    const p2Start = new Date(params.period2Start);
    const p2End = new Date(params.period2End);

    const [period1, period2] = await Promise.all([
      computePeriodMetrics(userIds, p1Start, p1End),
      computePeriodMetrics(userIds, p2Start, p2End),
    ]);

    // Calculate % changes
    const pctChange = (p1: number, p2: number) => {
      if (p1 === 0 && p2 === 0) return 0;
      if (p1 === 0) return 100;
      return parseFloat((((p2 - p1) / p1) * 100).toFixed(2));
    };

    return ok({
      period1,
      period2,
      productivityChange: pctChange(period1.productivePct, period2.productivePct),
      workingTimeChange: pctChange(period1.workingSeconds, period2.workingSeconds),
      activityChange: pctChange(period1.avgActivity, period2.avgActivity),
    } as ComparisonData);
  } catch (error) {
    console.error("[getProductivityComparison]", error);
    return err("Failed to fetch comparison data");
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 3: Activity Heatmap
// ═══════════════════════════════════════════════════════════

export type HeatmapCell = {
  hour: number; // 0-23
  activityPct: number;
};

export type HeatmapRow = {
  date: string; // YYYY-MM-DD
  label: string; // "Sun, Feb 22"
  cells: HeatmapCell[];
};

export type HeatmapData = {
  rows: HeatmapRow[];
  avgProductivity: number;
  peakHour: string; // "15:00"
  totalWorkingSeconds: number;
};

export async function getActivityHeatmap(params: {
  startDate: string;
  endDate: string;
  roleFilter?: string;
  employeeId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  try {
    const userIds = await getFilteredUserIds(
      orgId, ctx.session.user.id, isManager,
      params.roleFilter, params.employeeId,
    );
    if (userIds.length === 0) {
      return ok({ rows: [], avgProductivity: 0, peakHour: "00:00", totalWorkingSeconds: 0 } as HeatmapData);
    }

    const [activityLogs, timeEntries, appLogs] = await Promise.all([
      db.activityLog.findMany({
        where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
        select: { interval_start: true, activity_percent: true },
      }),
      db.timeEntry.findMany({
        where: { user_id: { in: userIds }, start_time: { gte: start, lte: end }, end_time: { not: null } },
        select: { duration: true },
      }),
      db.appUsageLog.findMany({
        where: { user_id: { in: userIds }, interval_start: { gte: start, lte: end } },
        select: { duration: true, is_productive: true },
      }),
    ]);

    // Group activity by date+hour
    const dateHourMap = new Map<string, { sum: number; count: number }>();
    const hourTotals = new Map<number, { sum: number; count: number }>();

    for (const log of activityLogs) {
      const d = log.interval_start;
      const dk = d.toISOString().split("T")[0];
      const hour = d.getUTCHours();
      const key = `${dk}|${hour}`;

      const existing = dateHourMap.get(key) || { sum: 0, count: 0 };
      existing.sum += log.activity_percent;
      existing.count += 1;
      dateHourMap.set(key, existing);

      const ht = hourTotals.get(hour) || { sum: 0, count: 0 };
      ht.sum += log.activity_percent;
      ht.count += 1;
      hourTotals.set(hour, ht);
    }

    // Build rows for each date in range
    const rows: HeatmapRow[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dk = current.toISOString().split("T")[0];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${dayNames[current.getUTCDay()]}, ${monthNames[current.getUTCMonth()]} ${current.getUTCDate()}`;

      const cells: HeatmapCell[] = [];
      for (let h = 0; h < 24; h++) {
        const key = `${dk}|${h}`;
        const data = dateHourMap.get(key);
        cells.push({
          hour: h,
          activityPct: data ? Math.round(data.sum / data.count) : 0,
        });
      }

      rows.push({ date: dk, label, cells });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Peak hour
    let peakHour = 0;
    let peakAvg = 0;
    for (const [hour, data] of hourTotals.entries()) {
      const avg = data.count > 0 ? data.sum / data.count : 0;
      if (avg > peakAvg) { peakAvg = avg; peakHour = hour; }
    }

    // Total working seconds
    const totalWorkingSeconds = timeEntries.reduce((s, e) => s + (e.duration || 0), 0);

    // Average productivity from app logs
    let productive = 0, totalApp = 0;
    for (const log of appLogs) {
      if (log.is_productive === true) productive += log.duration;
      totalApp += log.duration;
    }
    const avgProductivity = totalApp > 0 ? parseFloat(((productive / totalApp) * 100).toFixed(1)) : 0;

    return ok({
      rows,
      avgProductivity,
      peakHour: `${String(peakHour).padStart(2, "0")}:00`,
      totalWorkingSeconds,
    } as HeatmapData);
  } catch (error) {
    console.error("[getActivityHeatmap]", error);
    return err("Failed to fetch activity heatmap");
  }
}

// ═══════════════════════════════════════════════════════════
// Shared: get employees for filter dropdown
// ═══════════════════════════════════════════════════════════

export async function getAdvancedInsightsEmployees(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;

  try {
    const members = await db.member.findMany({
      where: {
        organization_id: orgId,
        is_active: true,
        ...(isManager ? {} : { user_id: ctx.session.user.id }),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    });

    return ok(members.map((m) => ({ userId: m.user_id, name: m.user.name, role: m.role })));
  } catch (error) {
    console.error("[getAdvancedInsightsEmployees]", error);
    return err("Failed to fetch employees");
  }
}
