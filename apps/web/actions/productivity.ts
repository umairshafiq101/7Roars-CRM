"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getProductivityAnalysis(params: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { daily: [], employees: [], peakHours: [] };

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return { daily: [], employees: [], peakHours: [] };

  const now = new Date();
  const startDate = params.startDate
    ? new Date(params.startDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const endDate = params.endDate
    ? new Date(params.endDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(member.role);
  const userFilter = params.userId
    ? { user_id: params.userId }
    : isManager
      ? {}
      : { user_id: session.user.id };

  // Get activity logs for the period
  const activityLogs = await db.activityLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: {
        members: { some: { organization_id: member.organization_id } },
      },
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { interval_start: "asc" },
  });

  // Get app usage logs for productive/unproductive breakdown
  const appLogs = await db.appUsageLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: {
        members: { some: { organization_id: member.organization_id } },
      },
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Daily activity trend
  const dailyMap = new Map<string, { date: string; totalPercent: number; count: number; productiveSec: number; unproductiveSec: number }>();

  for (const log of activityLogs) {
    const dateKey = log.interval_start.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.totalPercent += log.activity_percent;
      existing.count++;
    } else {
      dailyMap.set(dateKey, {
        date: dateKey,
        totalPercent: log.activity_percent,
        count: 1,
        productiveSec: 0,
        unproductiveSec: 0,
      });
    }
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
    .map((d) => ({
      date: d.date,
      avgActivity: d.count > 0 ? Math.round(d.totalPercent / d.count) : 0,
      productiveMinutes: Math.round(d.productiveSec / 60),
      unproductiveMinutes: Math.round(d.unproductiveSec / 60),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-employee breakdown
  const employeeMap = new Map<string, {
    userId: string;
    name: string;
    totalPercent: number;
    count: number;
    productiveSec: number;
    unproductiveSec: number;
    totalSec: number;
  }>();

  for (const log of activityLogs) {
    const existing = employeeMap.get(log.user_id);
    if (existing) {
      existing.totalPercent += log.activity_percent;
      existing.count++;
    } else {
      employeeMap.set(log.user_id, {
        userId: log.user_id,
        name: log.user.name,
        totalPercent: log.activity_percent,
        count: 1,
        productiveSec: 0,
        unproductiveSec: 0,
        totalSec: 0,
      });
    }
  }

  for (const log of appLogs) {
    const existing = employeeMap.get(log.user_id);
    if (existing) {
      existing.totalSec += log.duration;
      if (log.is_productive === true) existing.productiveSec += log.duration;
      else if (log.is_productive === false) existing.unproductiveSec += log.duration;
    }
  }

  const employees = Array.from(employeeMap.values())
    .map((e) => ({
      userId: e.userId,
      name: e.name,
      avgActivity: e.count > 0 ? Math.round(e.totalPercent / e.count) : 0,
      productiveHours: Math.round((e.productiveSec / 3600) * 10) / 10,
      unproductiveHours: Math.round((e.unproductiveSec / 3600) * 10) / 10,
      totalHours: Math.round((e.totalSec / 3600) * 10) / 10,
    }))
    .sort((a, b) => b.avgActivity - a.avgActivity);

  // Peak hours analysis (which hours have highest activity)
  const hourMap = new Map<number, { hour: number; totalPercent: number; count: number }>();

  for (const log of activityLogs) {
    const hour = log.interval_start.getHours();
    const existing = hourMap.get(hour);
    if (existing) {
      existing.totalPercent += log.activity_percent;
      existing.count++;
    } else {
      hourMap.set(hour, { hour, totalPercent: log.activity_percent, count: 1 });
    }
  }

  const peakHours = Array.from(hourMap.values())
    .map((h) => ({
      hour: h.hour,
      label: `${h.hour.toString().padStart(2, "0")}:00`,
      avgActivity: h.count > 0 ? Math.round(h.totalPercent / h.count) : 0,
    }))
    .sort((a, b) => a.hour - b.hour);

  return { daily, employees, peakHours };
}
