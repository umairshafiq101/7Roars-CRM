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

// ── Types ──

export type EmployeeMetrics = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  // Work Pattern
  avgDailyWorkHours: number;
  avgClockInTime: string;
  avgClockOutTime: string;
  lateClockInCount: number;
  earlyClockOutCount: number;
  consistencyScore: number;
  consistencyLabel: string;
  weekdayDistribution: Record<string, number>;
  dailyWorkPatterns: {
    date: string;
    dayName: string;
    workSeconds: number;
    breakSeconds: number;
    idleSeconds: number;
    activityLevel: number;
    clockIn: string | null;
    clockOut: string | null;
  }[];
  // Productivity
  avgActivityPercent: number;
  avgKeyboardCount: number;
  avgMouseCount: number;
  idleMinutesPerDay: number;
  peakProductivityHour: number;
  mostProductiveDay: string;
  productiveAppPct: number;
  topProductiveApps: { name: string; minutes: number }[];
  topUnproductiveApps: { name: string; minutes: number }[];
  topProductiveWebsites: { url: string; minutes: number }[];
  // Wellness
  avgBreakMinutesPerDay: number;
  overtimeDays: number;
  lateNightWorkDays: number;
  weekendWorkDays: number;
  idlePercentage: number;
  burnoutRiskScore: number;
  // Task Performance
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  overdueTasks: number;
  avgTaskTurnaroundDays: number;
  // Trend
  trendDirection: string;
  trendPercent: number;
  productivityTrend: string;
};

export type TeamMetrics = {
  teamSize: number;
  avgDailyHours: number;
  avgActivityPercent: number;
  avgProductiveAppPct: number;
  avgBreakMinutes: number;
  avgIdleMinutes: number;
};

// ── CRUD ──

export async function getCoachReports(params?: {
  employeeId?: string;
  reportType?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const where: Record<string, unknown> = {
      organization_id: ctx.member.organization_id,
    };
    if (params?.employeeId) where.user_id = params.employeeId;
    if (params?.reportType) where.report_type = params.reportType;

    const reports = await db.coachReport.findMany({
      where,
      include: {
        about_user: { select: { id: true, name: true, email: true, avatar_url: true } },
        generator: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    const serialized = reports.map((r) => ({
      ...r,
      start_date: r.start_date.toISOString(),
      end_date: r.end_date.toISOString(),
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
      report_content: r.status === "READY" ? (r.report_content ?? "") : "",
    }));

    return ok(serialized);
  } catch (error) {
    console.error("[getCoachReports]", error);
    return err("Failed to fetch reports");
  }
}

export async function getCoachReportById(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const report = await db.coachReport.findFirst({
      where: { id, organization_id: ctx.member.organization_id },
      include: {
        about_user: { select: { id: true, name: true, email: true, avatar_url: true } },
        generator: { select: { id: true, name: true } },
      },
    });

    if (!report) return err("Report not found");

    return ok({
      ...report,
      start_date: report.start_date.toISOString(),
      end_date: report.end_date.toISOString(),
      created_at: report.created_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
    });
  } catch (error) {
    console.error("[getCoachReportById]", error);
    return err("Failed to fetch report");
  }
}

export async function deleteCoachReport(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    await db.coachReport.delete({
      where: { id },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "coach_report",
      entityId: id,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteCoachReport]", error);
    return err("Failed to delete report");
  }
}

export async function getCoachEmployees(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

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

    return ok(
      members.map((m) => ({
        userId: m.user_id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatar_url,
        role: m.role,
      }))
    );
  } catch (error) {
    console.error("[getCoachEmployees]", error);
    return err("Failed to fetch employees");
  }
}

export async function generateReportNumber(orgId: string): Promise<string> {
  const count = await db.coachReport.count({
    where: { organization_id: orgId },
  });
  const num = (count + 1).toString().padStart(3, "0");
  return `#7RC${num}`;
}

// ── Metric Gathering ──

export async function gatherEmployeeMetrics(
  userId: string,
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<EmployeeMetrics | null> {
  // Fetch user info
  const member = await db.member.findFirst({
    where: { user_id: userId, organization_id: orgId, is_active: true },
    include: {
      user: { select: { id: true, name: true, email: true, avatar_url: true } },
    },
  });
  if (!member) return null;

  // Fetch org settings
  const settings = await db.setting.findMany({
    where: { organization_id: orgId, key: { in: ["workday_start", "workday_end"] } },
  });
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = String(s.value).replace(/"/g, "");
  }
  const workdayStart = settingsMap["workday_start"] || "09:00";
  const workdayEnd = settingsMap["workday_end"] || "18:00";
  const [wsH, wsM] = workdayStart.split(":").map(Number);
  const [weH, weM] = workdayEnd.split(":").map(Number);
  const expectedWorkSeconds = (weH * 60 + weM - (wsH * 60 + wsM)) * 60;

  // Fetch all data in parallel
  const [timeEntries, activityLogs, appUsageLogs, tasks] = await Promise.all([
    db.timeEntry.findMany({
      where: { user_id: userId, start_time: { gte: startDate, lte: endDate } },
      orderBy: { start_time: "asc" },
    }),
    db.activityLog.findMany({
      where: { user_id: userId, interval_start: { gte: startDate, lte: endDate } },
      orderBy: { interval_start: "asc" },
    }),
    db.appUsageLog.findMany({
      where: { user_id: userId, interval_start: { gte: startDate, lte: endDate } },
    }),
    db.task.findMany({
      where: {
        assignees: { some: { user_id: userId } },
        created_at: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Also fetch previous period for trend comparison
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(startDate.getTime() - 1);

  const [prevActivityLogs, prevAppLogs] = await Promise.all([
    db.activityLog.findMany({
      where: { user_id: userId, interval_start: { gte: prevStart, lte: prevEnd } },
    }),
    db.appUsageLog.findMany({
      where: { user_id: userId, interval_start: { gte: prevStart, lte: prevEnd } },
    }),
  ]);

  // ── Compute Work Pattern Metrics ──

  // Group entries by date
  const entriesByDate: Record<string, typeof timeEntries> = {};
  for (const e of timeEntries) {
    const dateKey = e.start_time.toISOString().split("T")[0];
    if (!entriesByDate[dateKey]) entriesByDate[dateKey] = [];
    entriesByDate[dateKey].push(e);
  }

  const workDates = Object.keys(entriesByDate).sort();
  const totalWorkDays = workDates.length || 1;

  // Avg daily work hours
  const totalWorkSeconds = timeEntries.reduce((s, e) => s + (e.duration || 0), 0);
  const avgDailyWorkHours = Math.round((totalWorkSeconds / totalWorkDays / 3600) * 10) / 10;

  // Clock-in/out times
  const clockInTimes: number[] = [];
  const clockOutTimes: number[] = [];
  let lateClockInCount = 0;
  let earlyClockOutCount = 0;

  for (const date of workDates) {
    const entries = entriesByDate[date];
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];

    const clockInMinutes = firstEntry.start_time.getHours() * 60 + firstEntry.start_time.getMinutes();
    clockInTimes.push(clockInMinutes);

    const expectedStartMinutes = wsH * 60 + wsM;
    if (clockInMinutes > expectedStartMinutes + 5) lateClockInCount++;

    if (lastEntry.end_time) {
      const clockOutMinutes = lastEntry.end_time.getHours() * 60 + lastEntry.end_time.getMinutes();
      clockOutTimes.push(clockOutMinutes);

      const expectedEndMinutes = weH * 60 + weM;
      if (clockOutMinutes < expectedEndMinutes - 5) earlyClockOutCount++;
    }
  }

  const avgClockInMinutes = clockInTimes.length > 0
    ? Math.round(clockInTimes.reduce((s, v) => s + v, 0) / clockInTimes.length)
    : wsH * 60 + wsM;
  const avgClockOutMinutes = clockOutTimes.length > 0
    ? Math.round(clockOutTimes.reduce((s, v) => s + v, 0) / clockOutTimes.length)
    : weH * 60 + weM;

  const avgClockInTime = `${String(Math.floor(avgClockInMinutes / 60)).padStart(2, "0")}:${String(avgClockInMinutes % 60).padStart(2, "0")}`;
  const avgClockOutTime = `${String(Math.floor(avgClockOutMinutes / 60)).padStart(2, "0")}:${String(avgClockOutMinutes % 60).padStart(2, "0")}`;

  // Consistency score (based on std dev of daily hours)
  const dailyHours = workDates.map((d) => {
    const entries = entriesByDate[d];
    return entries.reduce((s, e) => s + (e.duration || 0), 0) / 3600;
  });
  const meanHours = dailyHours.reduce((s, v) => s + v, 0) / (dailyHours.length || 1);
  const variance = dailyHours.reduce((s, v) => s + Math.pow(v - meanHours, 2), 0) / (dailyHours.length || 1);
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 20)));
  const consistencyLabel = consistencyScore >= 80 ? "High" : consistencyScore >= 50 ? "Medium" : "Low";

  // Weekday distribution
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdayDistribution: Record<string, number> = {};
  for (const d of dayNames) weekdayDistribution[d] = 0;
  for (const date of workDates) {
    const dayOfWeek = new Date(date).getDay();
    const dayEntries = entriesByDate[date];
    const daySeconds = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
    weekdayDistribution[dayNames[dayOfWeek]] += Math.round(daySeconds / 3600 * 10) / 10;
  }

  // Daily work patterns
  const activityByDate: Record<string, number[]> = {};
  for (const log of activityLogs) {
    const dateKey = log.interval_start.toISOString().split("T")[0];
    if (!activityByDate[dateKey]) activityByDate[dateKey] = [];
    activityByDate[dateKey].push(log.activity_percent);
  }

  const dailyWorkPatterns = workDates.map((date) => {
    const entries = entriesByDate[date];
    const workSec = entries.reduce((s, e) => s + (e.duration || 0), 0);
    const actLogs = activityByDate[date] || [];
    const idleSec = actLogs.filter((a) => a === 0).length * 60;
    const actLevel = actLogs.length > 0
      ? Math.round(actLogs.reduce((s, v) => s + v, 0) / actLogs.length)
      : 0;

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const clockIn = firstEntry.start_time.toISOString();
    const clockOut = lastEntry.end_time ? lastEntry.end_time.toISOString() : null;

    let breakSec = 0;
    if (clockIn && clockOut) {
      const span = Math.floor((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 1000);
      breakSec = Math.max(0, span - workSec - idleSec);
    }

    return {
      date,
      dayName: dayNames[new Date(date).getDay()],
      workSeconds: workSec,
      breakSeconds: breakSec,
      idleSeconds: idleSec,
      activityLevel: actLevel,
      clockIn,
      clockOut,
    };
  });

  // ── Compute Productivity Metrics ──

  const avgActivityPercent = activityLogs.length > 0
    ? Math.round(activityLogs.reduce((s, a) => s + a.activity_percent, 0) / activityLogs.length)
    : 0;

  const avgKeyboardCount = activityLogs.length > 0
    ? Math.round(activityLogs.reduce((s, a) => s + a.keyboard_count, 0) / activityLogs.length)
    : 0;

  const avgMouseCount = activityLogs.length > 0
    ? Math.round(activityLogs.reduce((s, a) => s + a.mouse_count, 0) / activityLogs.length)
    : 0;

  const idleIntervals = activityLogs.filter((a) => a.activity_percent === 0).length;
  const idleMinutesPerDay = Math.round(idleIntervals / totalWorkDays);

  // Peak productivity hour
  const hourlyActivity: Record<number, { total: number; count: number }> = {};
  for (const log of activityLogs) {
    const hour = log.interval_start.getHours();
    if (!hourlyActivity[hour]) hourlyActivity[hour] = { total: 0, count: 0 };
    hourlyActivity[hour].total += log.activity_percent;
    hourlyActivity[hour].count++;
  }
  let peakProductivityHour = 10;
  let peakAvg = 0;
  for (const [hour, data] of Object.entries(hourlyActivity)) {
    const avg = data.total / data.count;
    if (avg > peakAvg) {
      peakAvg = avg;
      peakProductivityHour = parseInt(hour);
    }
  }

  // Most productive day of week
  const dayActivity: Record<string, { total: number; count: number }> = {};
  for (const log of activityLogs) {
    const day = dayNames[log.interval_start.getDay()];
    if (!dayActivity[day]) dayActivity[day] = { total: 0, count: 0 };
    dayActivity[day].total += log.activity_percent;
    dayActivity[day].count++;
  }
  let mostProductiveDay = "Monday";
  let bestDayAvg = 0;
  for (const [day, data] of Object.entries(dayActivity)) {
    const avg = data.total / data.count;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      mostProductiveDay = day;
    }
  }

  // App usage breakdown
  const productiveAppSeconds = appUsageLogs
    .filter((l) => l.is_productive === true)
    .reduce((s, l) => s + l.duration, 0);
  const totalAppSeconds = appUsageLogs.reduce((s, l) => s + l.duration, 0);
  const productiveAppPct = totalAppSeconds > 0
    ? Math.round((productiveAppSeconds / totalAppSeconds) * 100)
    : 0;

  // Top apps
  const appDurations: Record<string, { duration: number; productive: boolean | null }> = {};
  for (const log of appUsageLogs) {
    if (!appDurations[log.app_name]) {
      appDurations[log.app_name] = { duration: 0, productive: log.is_productive };
    }
    appDurations[log.app_name].duration += log.duration;
  }

  const topProductiveApps = Object.entries(appDurations)
    .filter(([, v]) => v.productive === true)
    .sort((a, b) => b[1].duration - a[1].duration)
    .slice(0, 5)
    .map(([name, v]) => ({ name, minutes: Math.round(v.duration / 60) }));

  const topUnproductiveApps = Object.entries(appDurations)
    .filter(([, v]) => v.productive === false)
    .sort((a, b) => b[1].duration - a[1].duration)
    .slice(0, 5)
    .map(([name, v]) => ({ name, minutes: Math.round(v.duration / 60) }));

  // Top productive websites
  const websiteDurations: Record<string, number> = {};
  for (const log of appUsageLogs) {
    if (log.url && log.is_productive === true) {
      try {
        const hostname = new URL(log.url).hostname;
        websiteDurations[hostname] = (websiteDurations[hostname] || 0) + log.duration;
      } catch {
        // skip invalid URLs
      }
    }
  }
  const topProductiveWebsites = Object.entries(websiteDurations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([url, dur]) => ({ url, minutes: Math.round(dur / 60) }));

  // ── Compute Wellness Metrics ──

  // Break time
  let totalBreakSeconds = 0;
  for (const pattern of dailyWorkPatterns) {
    totalBreakSeconds += pattern.breakSeconds;
  }
  const avgBreakMinutesPerDay = Math.round(totalBreakSeconds / totalWorkDays / 60);

  // Overtime days
  let overtimeDays = 0;
  for (const date of workDates) {
    const daySeconds = entriesByDate[date].reduce((s, e) => s + (e.duration || 0), 0);
    if (daySeconds > expectedWorkSeconds) overtimeDays++;
  }

  // Late night work days (entries after 20:00)
  let lateNightWorkDays = 0;
  const lateNightDates = new Set<string>();
  for (const e of timeEntries) {
    if (e.start_time.getHours() >= 20 || (e.end_time && e.end_time.getHours() >= 20)) {
      lateNightDates.add(e.start_time.toISOString().split("T")[0]);
    }
  }
  lateNightWorkDays = lateNightDates.size;

  // Weekend work days
  let weekendWorkDays = 0;
  for (const date of workDates) {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendWorkDays++;
  }

  // Idle percentage
  const totalTrackedSeconds = totalWorkSeconds + totalBreakSeconds + (idleIntervals * 60);
  const idlePercentage = totalTrackedSeconds > 0
    ? Math.round((idleIntervals * 60 / totalTrackedSeconds) * 100 * 10) / 10
    : 0;

  // Burnout risk score
  const burnoutRiskScore = Math.max(0, Math.min(100, Math.round(
    (overtimeDays / Math.max(totalWorkDays, 1)) * 30 +
    (lateNightWorkDays / Math.max(totalWorkDays, 1)) * 20 +
    (weekendWorkDays > 0 ? 15 : 0) +
    (avgBreakMinutesPerDay < 30 ? 15 : 0) +
    (idlePercentage > 20 ? 10 : 0)
    // trend component added below
  )));

  // ── Compute Task Metrics ──

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && t.status !== "DONE" && new Date(t.due_date) < new Date()
  ).length;

  const completedWithDates = tasks.filter((t) => t.status === "DONE");
  const avgTaskTurnaroundDays = completedWithDates.length > 0
    ? Math.round(
        completedWithDates.reduce((s, t) => {
          const created = new Date(t.created_at).getTime();
          const updated = new Date(t.updated_at).getTime();
          return s + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0) / completedWithDates.length * 10
      ) / 10
    : 0;

  // ── Compute Trend Metrics ──

  const prevAvgActivity = prevActivityLogs.length > 0
    ? prevActivityLogs.reduce((s, a) => s + a.activity_percent, 0) / prevActivityLogs.length
    : 0;
  const currentAvgActivity = avgActivityPercent;
  const trendPercent = prevAvgActivity > 0
    ? Math.round(((currentAvgActivity - prevAvgActivity) / prevAvgActivity) * 100 * 10) / 10
    : 0;
  const trendDirection = trendPercent > 2 ? "improving" : trendPercent < -2 ? "declining" : "stable";

  const prevProductiveSeconds = prevAppLogs
    .filter((l) => l.is_productive === true)
    .reduce((s, l) => s + l.duration, 0);
  const prevTotalAppSeconds = prevAppLogs.reduce((s, l) => s + l.duration, 0);
  const prevProductivePct = prevTotalAppSeconds > 0
    ? Math.round((prevProductiveSeconds / prevTotalAppSeconds) * 100)
    : 0;
  const prodTrendDiff = productiveAppPct - prevProductivePct;
  const productivityTrend = prodTrendDiff > 2
    ? `+${prodTrendDiff}% (improving)`
    : prodTrendDiff < -2
      ? `${prodTrendDiff}% (declining)`
      : `${prodTrendDiff >= 0 ? "+" : ""}${prodTrendDiff}% (stable)`;

  // Adjust burnout risk for declining trend
  const finalBurnoutScore = trendDirection === "declining"
    ? Math.min(100, burnoutRiskScore + 10)
    : burnoutRiskScore;

  return {
    userId: member.user_id,
    name: member.user.name,
    email: member.user.email,
    avatarUrl: member.user.avatar_url,
    role: member.role,
    avgDailyWorkHours,
    avgClockInTime,
    avgClockOutTime,
    lateClockInCount,
    earlyClockOutCount,
    consistencyScore,
    consistencyLabel,
    weekdayDistribution,
    dailyWorkPatterns,
    avgActivityPercent,
    avgKeyboardCount,
    avgMouseCount,
    idleMinutesPerDay,
    peakProductivityHour,
    mostProductiveDay,
    productiveAppPct,
    topProductiveApps,
    topUnproductiveApps,
    topProductiveWebsites,
    avgBreakMinutesPerDay,
    overtimeDays,
    lateNightWorkDays,
    weekendWorkDays,
    idlePercentage,
    burnoutRiskScore: finalBurnoutScore,
    totalTasks,
    completedTasks,
    taskCompletionRate,
    overdueTasks,
    avgTaskTurnaroundDays,
    trendDirection,
    trendPercent,
    productivityTrend,
  };
}

export async function gatherTeamMetrics(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<TeamMetrics> {
  const members = await db.member.findMany({
    where: { organization_id: orgId, is_active: true },
  });
  const userIds = members.map((m) => m.user_id);

  if (userIds.length === 0) {
    return {
      teamSize: 0,
      avgDailyHours: 0,
      avgActivityPercent: 0,
      avgProductiveAppPct: 0,
      avgBreakMinutes: 0,
      avgIdleMinutes: 0,
    };
  }

  const [timeEntries, activityLogs, appUsageLogs] = await Promise.all([
    db.timeEntry.findMany({
      where: { user_id: { in: userIds }, start_time: { gte: startDate, lte: endDate } },
    }),
    db.activityLog.findMany({
      where: { user_id: { in: userIds }, interval_start: { gte: startDate, lte: endDate } },
    }),
    db.appUsageLog.findMany({
      where: { user_id: { in: userIds }, interval_start: { gte: startDate, lte: endDate } },
    }),
  ]);

  // Per-user daily hours
  const userWorkDays: Record<string, Set<string>> = {};
  const userWorkSeconds: Record<string, number> = {};
  for (const e of timeEntries) {
    if (!userWorkDays[e.user_id]) userWorkDays[e.user_id] = new Set();
    userWorkDays[e.user_id].add(e.start_time.toISOString().split("T")[0]);
    userWorkSeconds[e.user_id] = (userWorkSeconds[e.user_id] || 0) + (e.duration || 0);
  }

  const userDailyHours = Object.entries(userWorkSeconds).map(([uid, sec]) => {
    const days = userWorkDays[uid]?.size || 1;
    return sec / days / 3600;
  });
  const avgDailyHours = userDailyHours.length > 0
    ? Math.round(userDailyHours.reduce((s, v) => s + v, 0) / userDailyHours.length * 10) / 10
    : 0;

  // Avg activity
  const avgActivityPercent = activityLogs.length > 0
    ? Math.round(activityLogs.reduce((s, a) => s + a.activity_percent, 0) / activityLogs.length)
    : 0;

  // Avg productive app %
  const productiveSec = appUsageLogs.filter((l) => l.is_productive === true).reduce((s, l) => s + l.duration, 0);
  const totalAppSec = appUsageLogs.reduce((s, l) => s + l.duration, 0);
  const avgProductiveAppPct = totalAppSec > 0 ? Math.round((productiveSec / totalAppSec) * 100) : 0;

  // Avg idle minutes
  const idleIntervals = activityLogs.filter((a) => a.activity_percent === 0).length;
  const totalDaysAll = new Set(timeEntries.map((e) => e.start_time.toISOString().split("T")[0])).size || 1;
  const avgIdleMinutes = Math.round(idleIntervals / totalDaysAll);

  // Avg break (rough estimate)
  const avgBreakMinutes = Math.round(
    (userDailyHours.length > 0 ? 60 : 0) // placeholder — computed per user in individual metrics
  );

  return {
    teamSize: members.length,
    avgDailyHours,
    avgActivityPercent,
    avgProductiveAppPct,
    avgBreakMinutes,
    avgIdleMinutes,
  };
}

// ── Prompt Building ──

const SYSTEM_PROMPT = `You are an expert workforce productivity coach for 7Roars Digital Agency, a 13-person team in Lahore, Pakistan. You analyze employee work tracking data and generate insightful, empathetic, and actionable coaching reports.

RULES:
- Be data-driven: cite specific numbers from the metrics provided
- Be empathetic: these are real people, not resources to optimize
- Be actionable: every recommendation must be something doable THIS WEEK
- Compare to team averages when relevant (provided in the data)
- Always include positives — never write a report that's entirely negative
- Use markdown formatting: headers (##), bold, bullet points, tables where helpful
- For burnout risk, use a 0-100 score with label: Low (0-30), Medium (31-60), High (61-100)
- Keep individual reports under 1500 words, team reports under 2500 words
- Include a "Manager Action Items" section with 2-3 things the manager should do
- Suggest learning/growth opportunities based on the employee's app usage and role`;

export async function buildPrompt(
  reportType: string,
  metrics: EmployeeMetrics,
  teamMetrics: TeamMetrics,
  startDate: string,
  endDate: string,
): Promise<{ system: string; user: string }> {
  const totalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Fetch org settings for expected hours
  const settingsStr = "09:00-18:00"; // will be passed from caller
  const expectedHours = 9;

  const baseMetrics = `
**Employee:** ${metrics.name} (${metrics.role})
**Period:** ${startDate} to ${endDate} (${totalDays} days)
**Organization:** 7Roars Digital Agency

## Work Pattern Metrics
- Avg daily work hours: ${metrics.avgDailyWorkHours}h (team avg: ${teamMetrics.avgDailyHours}h, expected: ${expectedHours}h)
- Avg clock-in: ${metrics.avgClockInTime} (expected: 09:00)
- Avg clock-out: ${metrics.avgClockOutTime} (expected: 18:00)
- Late clock-ins: ${metrics.lateClockInCount}/${totalDays} days
- Early clock-outs: ${metrics.earlyClockOutCount}/${totalDays} days
- Consistency score: ${metrics.consistencyScore}/100 (${metrics.consistencyLabel})
- Weekday distribution: ${Object.entries(metrics.weekdayDistribution).map(([d, h]) => `${d}: ${h}h`).join(", ")}

## Productivity Metrics
- Avg activity level: ${metrics.avgActivityPercent}% (team avg: ${teamMetrics.avgActivityPercent}%)
- Idle time per day: ${metrics.idleMinutesPerDay} mins (team avg: ${teamMetrics.avgIdleMinutes} mins)
- Peak productivity hour: ${metrics.peakProductivityHour}:00
- Most productive day: ${metrics.mostProductiveDay}
- Productive app usage: ${metrics.productiveAppPct}% (team avg: ${teamMetrics.avgProductiveAppPct}%)
- Productivity trend: ${metrics.productivityTrend} vs previous period
- Top productive apps: ${metrics.topProductiveApps.map((a) => `${a.name} (${a.minutes}m)`).join(", ") || "None tracked"}
- Top unproductive apps: ${metrics.topUnproductiveApps.map((a) => `${a.name} (${a.minutes}m)`).join(", ") || "None tracked"}
- Top productive websites: ${metrics.topProductiveWebsites.map((w) => `${w.url} (${w.minutes}m)`).join(", ") || "None tracked"}

## Wellness Metrics
- Avg break time/day: ${metrics.avgBreakMinutesPerDay} mins
- Overtime days: ${metrics.overtimeDays}/${totalDays}
- Late night work days (after 8pm): ${metrics.lateNightWorkDays}/${totalDays}
- Weekend work days: ${metrics.weekendWorkDays}
- Idle percentage: ${metrics.idlePercentage}%
- Burnout risk score: ${metrics.burnoutRiskScore}/100

## Task Performance
- Tasks assigned: ${metrics.totalTasks}
- Tasks completed: ${metrics.completedTasks} (${metrics.taskCompletionRate}%)
- Overdue tasks: ${metrics.overdueTasks}
- Avg task turnaround: ${metrics.avgTaskTurnaroundDays} days

## Trend
- Activity trend: ${metrics.trendDirection} (${metrics.trendPercent}% change)
- Productivity trend: ${metrics.productivityTrend}

## Team Context
- Team size: ${teamMetrics.teamSize} active members
- Team avg daily hours: ${teamMetrics.avgDailyHours}h
- Team avg activity: ${teamMetrics.avgActivityPercent}%
- Team avg productive app %: ${teamMetrics.avgProductiveAppPct}%`;

  let userPrompt = "";

  switch (reportType) {
    case "ALL_ANALYSIS":
      userPrompt = `Generate a comprehensive productivity coaching report with ALL sections: Executive Summary, Work Pattern Analysis, Productivity Assessment, Wellness & Burnout Risk, Task Performance, Strengths, Areas for Improvement, Recommendations (5+), and Manager Action Items.\n\n${baseMetrics}`;
      break;
    case "WORK_PATTERN":
      userPrompt = `Generate a Work Pattern coaching report focused on clock-in/out habits, consistency, daily patterns, and punctuality. Include: Executive Summary, Work Pattern Analysis (detailed), Clock-In/Out Pattern Analysis, Daily Work Patterns breakdown, Recommendations, and Manager Action Items.\n\n${baseMetrics}`;
      break;
    case "PRODUCTIVITY":
      userPrompt = `Generate a Productivity coaching report focused on activity levels, app usage, peak hours, and efficiency. Include: Executive Summary, Productivity Assessment (detailed), App Usage Analysis, Peak Hours Analysis, Recommendations, and Manager Action Items.\n\n${baseMetrics}`;
      break;
    case "WELLNESS_BURNOUT":
      userPrompt = `Generate a Wellness & Burnout coaching report focused on overtime, breaks, late nights, weekends, and burnout risk. Include: Executive Summary, Wellness & Burnout Analysis (detailed with 0-100 score), Working Hours Assessment, Break Time Assessment, Wellness Indicators, Recommendations, and Manager Action Items.\n\n${baseMetrics}`;
      break;
    default:
      userPrompt = `Generate a comprehensive productivity coaching report.\n\n${baseMetrics}`;
  }

  return { system: SYSTEM_PROMPT, user: userPrompt };
}

export async function buildTeamPrompt(
  allMetrics: EmployeeMetrics[],
  teamMetrics: TeamMetrics,
  startDate: string,
  endDate: string,
): Promise<{ system: string; user: string }> {
  const totalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const employeeSummaries = allMetrics.map((m) => `
### ${m.name} (${m.role})
- Work: ${m.avgDailyWorkHours}h/day, Activity: ${m.avgActivityPercent}%, Productive apps: ${m.productiveAppPct}%
- Clock-in: ${m.avgClockInTime}, Late: ${m.lateClockInCount}/${totalDays}d
- Burnout risk: ${m.burnoutRiskScore}/100, Overtime: ${m.overtimeDays}d, Weekend: ${m.weekendWorkDays}d
- Tasks: ${m.completedTasks}/${m.totalTasks} completed (${m.taskCompletionRate}%), Overdue: ${m.overdueTasks}
- Trend: ${m.trendDirection} (${m.trendPercent}%)`).join("\n");

  const userPrompt = `Generate a Team Overview coaching report for the entire 7Roars team.

**Period:** ${startDate} to ${endDate} (${totalDays} days)
**Team Size:** ${teamMetrics.teamSize} active members

## Team Averages
- Avg daily hours: ${teamMetrics.avgDailyHours}h
- Avg activity: ${teamMetrics.avgActivityPercent}%
- Avg productive app usage: ${teamMetrics.avgProductiveAppPct}%

## Individual Employee Summaries
${employeeSummaries}

Include these sections:
1. **Team Executive Summary** — overall team health
2. **Top Performers** — who's excelling and why
3. **Needs Attention** — who needs support and why
4. **Team Patterns** — common trends across the team
5. **Burnout Watch** — anyone at risk
6. **Team Recommendations** — 5+ actionable items for the whole team
7. **Manager Action Items** — specific actions for management`;

  return { system: SYSTEM_PROMPT, user: userPrompt };
}
