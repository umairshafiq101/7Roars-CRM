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

export type WorkTimesEmployee = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  activityLevel: number;
  workingSeconds: number;
  breakSeconds: number;
  idleSeconds: number;
  lateSeconds: number;
  firstClockIn: string | null;
  lastClockOut: string | null;
};

export type WorkTimesSummary = {
  totalWorkingSeconds: number;
  totalBreakSeconds: number;
  totalIdleSeconds: number;
  avgActivityPercent: number;
  totalTrackedSeconds: number;
};

export type WorkTimesData = {
  summary: WorkTimesSummary;
  employees: WorkTimesEmployee[];
};

export async function getWorkTimesData(params: {
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
    // Fetch org settings for workday_start
    const settings = await db.setting.findMany({
      where: { organization_id: orgId, key: { in: ["workday_start"] } },
    });
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = String(s.value).replace(/"/g, "");
    }
    const workdayStart = settingsMap["workday_start"] || "09:00";
    const [wsH, wsM] = workdayStart.split(":").map(Number);

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
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    if (allMembers.length === 0) {
      return ok({
        summary: {
          totalWorkingSeconds: 0,
          totalBreakSeconds: 0,
          totalIdleSeconds: 0,
          avgActivityPercent: 0,
          totalTrackedSeconds: 0,
        },
        employees: [],
      } as WorkTimesData);
    }

    const userIds = allMembers.map((m) => m.user_id);

    // Fetch time entries
    const timeEntries = await db.timeEntry.findMany({
      where: {
        user_id: { in: userIds },
        start_time: { gte: start, lte: end },
        ...(params.projectId ? { project_id: params.projectId } : {}),
      },
      orderBy: { start_time: "asc" },
    });

    // Fetch activity logs
    const activityLogs = await db.activityLog.findMany({
      where: {
        user_id: { in: userIds },
        interval_start: { gte: start, lte: end },
      },
    });

    // Group by user
    const entriesByUser: Record<string, typeof timeEntries> = {};
    const activityByUser: Record<string, typeof activityLogs> = {};

    for (const uid of userIds) {
      entriesByUser[uid] = [];
      activityByUser[uid] = [];
    }
    for (const e of timeEntries) entriesByUser[e.user_id]?.push(e);
    for (const a of activityLogs) activityByUser[a.user_id]?.push(a);

    const employees: WorkTimesEmployee[] = [];

    for (const member of allMembers) {
      const uid = member.user_id;
      const entries = entriesByUser[uid] || [];
      const logs = activityByUser[uid] || [];

      // Working seconds = sum of completed entry durations
      const workingSeconds = entries.reduce((s, e) => {
        if (!e.end_time) return s;
        return s + (e.duration || 0);
      }, 0);

      // Idle seconds = count of 0% activity intervals × 60
      const idleSeconds = logs.filter((l) => l.activity_percent === 0).length * 60;

      // Activity level = avg of all activity_percent values
      const activityLevel =
        logs.length > 0
          ? Math.round(logs.reduce((s, l) => s + l.activity_percent, 0) / logs.length)
          : 0;

      // First clock-in and last clock-out
      const completedEntries = entries.filter((e) => e.end_time);
      const firstClockIn =
        entries.length > 0
          ? (entries[0].start_time instanceof Date
              ? entries[0].start_time.toISOString()
              : String(entries[0].start_time))
          : null;
      const lastClockOut =
        completedEntries.length > 0
          ? (() => {
              const last = completedEntries[completedEntries.length - 1];
              return last.end_time instanceof Date
                ? last.end_time.toISOString()
                : String(last.end_time);
            })()
          : null;

      // Break time = span between first clock-in and last clock-out minus working time
      let breakSeconds = 0;
      if (firstClockIn && lastClockOut) {
        const spanSeconds = Math.floor(
          (new Date(lastClockOut).getTime() - new Date(firstClockIn).getTime()) / 1000
        );
        breakSeconds = Math.max(0, spanSeconds - workingSeconds - idleSeconds);
      }

      // Late clock-in: compare first entry start_time to workday_start on that day
      let lateSeconds = 0;
      if (firstClockIn) {
        const clockInDate = new Date(firstClockIn);
        const expectedStart = new Date(clockInDate);
        expectedStart.setHours(wsH, wsM, 0, 0);
        const diffSeconds = Math.floor(
          (clockInDate.getTime() - expectedStart.getTime()) / 1000
        );
        lateSeconds = Math.max(0, diffSeconds);
      }

      employees.push({
        userId: uid,
        name: member.user.name,
        email: member.user.email,
        avatarUrl: member.user.avatar_url,
        role: member.role,
        activityLevel,
        workingSeconds,
        breakSeconds,
        idleSeconds,
        lateSeconds,
        firstClockIn,
        lastClockOut,
      });
    }

    // Org-wide summary
    const totalWorkingSeconds = employees.reduce((s, e) => s + e.workingSeconds, 0);
    const totalBreakSeconds = employees.reduce((s, e) => s + e.breakSeconds, 0);
    const totalIdleSeconds = employees.reduce((s, e) => s + e.idleSeconds, 0);
    const totalTrackedSeconds = totalWorkingSeconds + totalBreakSeconds + totalIdleSeconds;
    const avgActivityPercent =
      employees.length > 0
        ? Math.round(employees.reduce((s, e) => s + e.activityLevel, 0) / employees.length)
        : 0;

    return ok({
      summary: {
        totalWorkingSeconds,
        totalBreakSeconds,
        totalIdleSeconds,
        avgActivityPercent,
        totalTrackedSeconds,
      },
      employees,
    } as WorkTimesData);
  } catch (error) {
    console.error("[getWorkTimesData]", error);
    return err("Failed to fetch work times data");
  }
}

