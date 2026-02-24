"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/permissions";
import { ok, err, type ApiResponse } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { getOnlineUserIdsFromDB } from "@/app/api/v1/heartbeat/route";

async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return null;

  return { session, member };
}

export type MemberStatus = "working" | "on_break" | "idle" | "stopped_work" | "yet_to_start";

function deriveMemberStatus(
  userId: string,
  hasEntriesToday: boolean,
  hasActiveTimer: boolean,
  isOnline: boolean,
): MemberStatus {
  if (hasActiveTimer && isOnline) return "working";
  if (isOnline && hasEntriesToday && !hasActiveTimer) return "on_break";
  if (hasActiveTimer && !isOnline) return "idle";
  if (hasEntriesToday && !hasActiveTimer && !isOnline) return "stopped_work";
  return "yet_to_start";
}

export async function getTeamMembers(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [members, todayEntriesRaw, activityLogs] = await Promise.all([
      db.member.findMany({
        where: {
          organization_id: ctx.member.organization_id,
          is_active: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
              timezone: true,
              is_active: true,
              createdAt: true,
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      }),
      db.timeEntry.findMany({
        where: {
          start_time: { gte: today, lt: tomorrow },
          user: { members: { some: { organization_id: ctx.member.organization_id } } },
        },
        select: { user_id: true, end_time: true, duration: true },
      }),
      db.activityLog.findMany({
        where: {
          interval_start: { gte: today },
          user: { members: { some: { organization_id: ctx.member.organization_id } } },
        },
        select: { user_id: true, activity_percent: true },
      }),
    ]);

    let onlineUserIds: string[] = [];
    try {
      onlineUserIds = await getOnlineUserIdsFromDB();
    } catch { /* heartbeat unavailable */ }
    const onlineSet = new Set(onlineUserIds);

    const usersWithEntries = new Set(todayEntriesRaw.map((e) => e.user_id));
    const usersWithActiveTimer = new Set(
      todayEntriesRaw.filter((e) => e.end_time === null).map((e) => e.user_id)
    );

    // Sum durations per user
    const durationMap = new Map<string, { totalSeconds: number; entries: number }>();
    for (const e of todayEntriesRaw) {
      const existing = durationMap.get(e.user_id);
      if (existing) {
        existing.totalSeconds += e.duration || 0;
        existing.entries += 1;
      } else {
        durationMap.set(e.user_id, { totalSeconds: e.duration || 0, entries: 1 });
      }
    }

    // Avg activity per user
    const activityMap = new Map<string, number[]>();
    for (const log of activityLogs) {
      const arr = activityMap.get(log.user_id) || [];
      arr.push(log.activity_percent);
      activityMap.set(log.user_id, arr);
    }

    const enriched = members.map((m) => {
      const uid = m.user.id;
      const stats = durationMap.get(uid) || { totalSeconds: 0, entries: 0 };
      const activities = activityMap.get(uid) || [];
      const avgActivity = activities.length > 0
        ? Math.round(activities.reduce((s, v) => s + v, 0) / activities.length)
        : 0;
      const status = deriveMemberStatus(
        uid,
        usersWithEntries.has(uid),
        usersWithActiveTimer.has(uid),
        onlineSet.has(uid),
      );

      return {
        ...m,
        joined_at: m.joined_at instanceof Date ? m.joined_at.toISOString() : String(m.joined_at),
        todayStats: stats,
        avgActivity,
        status,
      };
    });

    return ok(enriched);
  } catch (error) {
    console.error("[getTeamMembers]", error);
    return err("Failed to fetch team members");
  }
}

export async function getTeamMemberDetail(params: {
  userId: string;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  if (!isManager && params.userId !== ctx.session.user.id) {
    return err("Forbidden");
  }

  const orgId = ctx.member.organization_id;
  const now = new Date();
  const startDate = params.startDate ? new Date(params.startDate) : (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const endDate = params.endDate ? new Date(params.endDate) : (() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  try {
    const [member, timeEntries, activityLogs, appUsageLogs, screenshots] = await Promise.all([
      db.member.findFirst({
        where: {
          user_id: params.userId,
          organization_id: orgId,
          is_active: true,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar_url: true, createdAt: true },
          },
        },
      }),
      db.timeEntry.findMany({
        where: {
          user_id: params.userId,
          start_time: { gte: startDate, lte: endDate },
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { start_time: "desc" },
      }),
      db.activityLog.findMany({
        where: {
          user_id: params.userId,
          interval_start: { gte: startDate, lte: endDate },
        },
        select: { activity_percent: true, interval_start: true, interval_end: true },
      }),
      db.appUsageLog.findMany({
        where: {
          user_id: params.userId,
          interval_start: { gte: startDate, lte: endDate },
        },
        select: { duration: true, is_productive: true },
      }),
      db.screenshot.findMany({
        where: {
          user_id: params.userId,
          captured_at: { gte: startDate, lte: endDate },
        },
        orderBy: { captured_at: "desc" },
        take: 20,
      }),
    ]);

    if (!member) return err("Member not found");

    // Working time
    let workingSeconds = 0;
    let breakCount = 0;
    for (const e of timeEntries) {
      workingSeconds += e.duration || 0;
    }
    // Count break segments (completed entries = potential breaks between them)
    const completedEntries = timeEntries.filter((e) => e.end_time !== null);
    if (completedEntries.length > 1) breakCount = completedEntries.length - 1;

    // Activity
    const avgActivity = activityLogs.length > 0
      ? Math.round(activityLogs.reduce((s, l) => s + l.activity_percent, 0) / activityLogs.length)
      : 0;

    // Idle time (intervals with 0% activity)
    let idleSeconds = 0;
    for (const log of activityLogs) {
      if (log.activity_percent === 0) {
        const start = log.interval_start instanceof Date ? log.interval_start.getTime() : new Date(log.interval_start).getTime();
        const end = log.interval_end instanceof Date ? log.interval_end.getTime() : new Date(log.interval_end).getTime();
        idleSeconds += Math.round((end - start) / 1000);
      }
    }

    // On break estimate: total elapsed - working - idle
    const firstEntry = timeEntries.length > 0 ? timeEntries[timeEntries.length - 1] : null;
    const lastEntry = timeEntries.length > 0 ? timeEntries[0] : null;
    let breakSeconds = 0;
    if (firstEntry && lastEntry) {
      const firstStart = firstEntry.start_time instanceof Date ? firstEntry.start_time.getTime() : new Date(firstEntry.start_time).getTime();
      const lastEnd = lastEntry.end_time
        ? (lastEntry.end_time instanceof Date ? lastEntry.end_time.getTime() : new Date(lastEntry.end_time).getTime())
        : Date.now();
      const totalElapsed = Math.round((lastEnd - firstStart) / 1000);
      breakSeconds = Math.max(0, totalElapsed - workingSeconds);
    }

    // Productive / Neutral / Unproductive
    let productiveSeconds = 0;
    let unproductiveSeconds = 0;
    let neutralSeconds = 0;
    for (const log of appUsageLogs) {
      if (log.is_productive === true) productiveSeconds += log.duration;
      else if (log.is_productive === false) unproductiveSeconds += log.duration;
      else neutralSeconds += log.duration;
    }
    const totalAppSeconds = productiveSeconds + unproductiveSeconds + neutralSeconds;

    const serializedEntries = timeEntries.map((e) => ({
      id: e.id,
      description: e.description,
      start_time: e.start_time instanceof Date ? e.start_time.toISOString() : String(e.start_time),
      end_time: e.end_time ? (e.end_time instanceof Date ? e.end_time.toISOString() : String(e.end_time)) : null,
      duration: e.duration,
      is_manual: e.is_manual,
      project: e.project,
    }));

    const serializedScreenshots = screenshots.map((s) => ({
      id: s.id,
      thumbnail_url: s.thumbnail_url,
      image_url: s.image_url,
      activity_level: s.activity_level,
      captured_at: s.captured_at instanceof Date ? s.captured_at.toISOString() : String(s.captured_at),
    }));

    return ok({
      member: {
        id: member.id,
        role: member.role,
        joined_at: member.joined_at instanceof Date ? member.joined_at.toISOString() : String(member.joined_at),
        user: {
          ...member.user,
          createdAt: member.user.createdAt instanceof Date ? member.user.createdAt.toISOString() : String(member.user.createdAt),
        },
      },
      stats: {
        workingSeconds,
        avgActivity,
        idleSeconds,
        breakSeconds,
        breakCount,
        productiveSeconds,
        unproductiveSeconds,
        neutralSeconds,
        totalAppSeconds,
      },
      timeEntries: serializedEntries,
      screenshots: serializedScreenshots,
    });
  } catch (error) {
    console.error("[getTeamMemberDetail]", error);
    return err("Failed to fetch member detail");
  }
}

export async function updateMemberRole(params: {
  memberId: string;
  role: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const existing = await db.member.findUnique({ where: { id: params.memberId } });
    if (!existing) return err("Member not found");

    const updated = await db.member.update({
      where: { id: params.memberId },
      data: { role: params.role as "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "member",
      entityId: params.memberId,
      oldData: { role: existing.role },
      newData: { role: updated.role },
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateMemberRole]", error);
    return err("Failed to update member role");
  }
}

export async function deactivateMember(memberId: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const existing = await db.member.findUnique({ where: { id: memberId } });
    if (!existing) return err("Member not found");

    if (existing.id === ctx.member.id) {
      return err("Cannot deactivate yourself");
    }

    const updated = await db.member.update({
      where: { id: memberId },
      data: { is_active: false },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "member",
      entityId: memberId,
      oldData: { is_active: true },
      newData: { is_active: false },
    });

    return ok(updated);
  } catch (error) {
    console.error("[deactivateMember]", error);
    return err("Failed to deactivate member");
  }
}

export async function addMember(params: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email: params.email } });

    let userId: string;

    if (existingUser) {
      // Check if already a member of this org
      const existingMember = await db.member.findUnique({
        where: {
          user_id_organization_id: {
            user_id: existingUser.id,
            organization_id: ctx.member.organization_id,
          },
        },
      });
      if (existingMember) {
        return err("User is already a member of this organization");
      }
      userId = existingUser.id;
    } else {
      // Create user via Better Auth
      const result = await auth.api.signUpEmail({
        body: {
          name: params.name,
          email: params.email,
          password: params.password,
        },
      });

      if (!result?.user?.id) {
        return err("Failed to create user account");
      }
      userId = result.user.id;

      // The databaseHook will have created a default org for this user.
      // We need to remove that default membership since they're joining an existing org.
      const defaultMember = await db.member.findFirst({
        where: { user_id: userId },
      });
      if (defaultMember && defaultMember.organization_id !== ctx.member.organization_id) {
        // Delete the auto-created org and member
        await db.member.delete({ where: { id: defaultMember.id } });
        await db.organization.delete({ where: { id: defaultMember.organization_id } });
      }
    }

    // Create member in this organization
    const member = await db.member.create({
      data: {
        user_id: userId,
        organization_id: ctx.member.organization_id,
        role: params.role as "ADMIN" | "MANAGER" | "EMPLOYEE",
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "member",
      entityId: member.id,
      newData: { email: params.email, role: params.role },
    });

    return ok(member);
  } catch (error) {
    console.error("[addMember]", error);
    return err("Failed to add member");
  }
}
