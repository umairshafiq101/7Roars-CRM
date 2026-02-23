"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import { ok, err, type ApiResponse } from "@/lib/api-response";
import { getHeartbeatOnlineUsers } from "@/app/api/v1/heartbeat/route";

async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return null;

  return { session, member };
}

export async function getOverviewData(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);
  const orgId = ctx.member.organization_id;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const [
      allMembers,
      todayEntries,
      todayScreenshots,
      appUsageLogs,
      activityLogs,
      classifications,
    ] = await Promise.all([
      db.member.findMany({
        where: { organization_id: orgId, is_active: true },
        include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
      }),
      db.timeEntry.findMany({
        where: {
          ...(isManager ? {} : { user_id: ctx.session.user.id }),
          start_time: { gte: todayStart, lte: todayEnd },
          user: { members: { some: { organization_id: orgId } } },
        },
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { start_time: "asc" },
      }),
      db.screenshot.findMany({
        where: {
          ...(isManager ? {} : { user_id: ctx.session.user.id }),
          captured_at: { gte: todayStart, lte: todayEnd },
          user: { members: { some: { organization_id: orgId } } },
        },
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
        orderBy: { captured_at: "desc" },
        take: 10,
      }),
      db.appUsageLog.findMany({
        where: {
          ...(isManager ? {} : { user_id: ctx.session.user.id }),
          interval_start: { gte: todayStart },
          interval_end: { lte: todayEnd },
          user: { members: { some: { organization_id: orgId } } },
        },
        include: { user: { select: { id: true, name: true } } },
        take: 3000,
      }),
      db.activityLog.findMany({
        where: {
          ...(isManager ? {} : { user_id: ctx.session.user.id }),
          interval_start: { gte: todayStart },
          user: { members: { some: { organization_id: orgId } } },
        },
        select: { user_id: true, activity_percent: true },
      }),
      db.appClassification.findMany({
        where: { organization_id: orgId },
      }),
    ]);

    let onlineUserIds: string[] = [];
    try {
      onlineUserIds = getHeartbeatOnlineUsers();
    } catch {
      // Heartbeat not available, leave empty
    }

    const onlineSet = new Set(onlineUserIds);
    const classMap = new Map(classifications.map((c) => [c.app_name, c.category]));

    // ── Status Cards ──
    const totalMembers = allMembers.length;
    const memberUserIds = new Set(allMembers.map((m) => m.user.id));
    const usersWithEntriesToday = new Set(todayEntries.map((e) => e.user_id));
    const usersWithActiveTimer = new Set(
      todayEntries.filter((e) => e.end_time === null).map((e) => e.user_id)
    );

    // Use same deriveMemberStatus logic as Team page:
    // working = active timer + online
    // idle = active timer + NOT online (stale timer, agent offline)
    // on_break = online + has entries today + no active timer
    // stopped_work = has entries + no active timer + not online
    // yet_to_start = no entries today
    const working = [...usersWithActiveTimer].filter(
      (id) => memberUserIds.has(id) && onlineSet.has(id)
    ).length;
    const onBreak = [...onlineSet].filter(
      (id) => memberUserIds.has(id) && usersWithEntriesToday.has(id) && !usersWithActiveTimer.has(id)
    ).length;
    const idle = [...usersWithActiveTimer].filter(
      (id) => memberUserIds.has(id) && !onlineSet.has(id)
    ).length;
    const stoppedWork = [...usersWithEntriesToday].filter(
      (id) => !usersWithActiveTimer.has(id) && !onlineSet.has(id) && memberUserIds.has(id)
    ).length;
    const yetToStart = [...memberUserIds].filter(
      (id) => !usersWithEntriesToday.has(id)
    ).length;

    const statusCards = {
      employees: totalMembers,
      working,
      onBreak,
      idle,
      stoppedWork,
      yetToStart,
    };

    // ── Clock-in / Clock-out ──
    const userEntryMap = new Map<string, { name: string; avatar: string | null; clockIn: string; clockOut: string | null; isWorking: boolean }>();
    for (const entry of todayEntries) {
      const uid = entry.user_id;
      const existing = userEntryMap.get(uid);
      // isWorking requires BOTH active timer AND online heartbeat (matches Team page logic)
      const entryIsActive = entry.end_time === null && onlineSet.has(uid);
      if (!existing) {
        userEntryMap.set(uid, {
          name: entry.user?.name || "Unknown",
          avatar: entry.user?.avatar_url || null,
          clockIn: entry.start_time instanceof Date ? entry.start_time.toISOString() : String(entry.start_time),
          clockOut: entry.end_time ? (entry.end_time instanceof Date ? entry.end_time.toISOString() : String(entry.end_time)) : null,
          isWorking: entryIsActive,
        });
      } else {
        const entryEnd = entry.end_time;
        if (entryEnd === null && onlineSet.has(uid)) {
          existing.isWorking = true;
          existing.clockOut = null;
        } else if (entryEnd !== null && existing.clockOut !== null) {
          const existingEnd = new Date(existing.clockOut).getTime();
          const newEnd = entryEnd instanceof Date ? entryEnd.getTime() : new Date(entryEnd).getTime();
          if (newEnd > existingEnd) {
            existing.clockOut = entryEnd instanceof Date ? entryEnd.toISOString() : String(entryEnd);
          }
        }
      }
    }

    // Activity averages per user
    const userActivityMap = new Map<string, number[]>();
    for (const log of activityLogs) {
      const existing = userActivityMap.get(log.user_id) || [];
      existing.push(log.activity_percent);
      userActivityMap.set(log.user_id, existing);
    }

    const clockInOut = Array.from(userEntryMap.entries()).map(([userId, data]) => {
      const activities = userActivityMap.get(userId) || [];
      const avgActivity = activities.length > 0
        ? Math.round(activities.reduce((s, v) => s + v, 0) / activities.length)
        : 0;
      return { userId, ...data, avgActivity };
    });

    // ── Recently Used Apps ──
    const appAggMap = new Map<string, { app_name: string; users: Set<string>; total_duration: number; last_url: string | null; last_title: string | null }>();
    for (const log of appUsageLogs) {
      const existing = appAggMap.get(log.app_name);
      if (existing) {
        existing.users.add(log.user_id);
        existing.total_duration += log.duration;
        if (log.url) existing.last_url = log.url;
        if (log.window_title) existing.last_title = log.window_title;
      } else {
        appAggMap.set(log.app_name, {
          app_name: log.app_name,
          users: new Set([log.user_id]),
          total_duration: log.duration,
          last_url: log.url,
          last_title: log.window_title,
        });
      }
    }

    const recentApps = Array.from(appAggMap.values())
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 8)
      .map((a) => ({
        app_name: a.app_name,
        users: a.users.size,
        total_duration: a.total_duration,
        last_url: a.last_url,
        last_title: a.last_title,
        category: classMap.get(a.app_name) || "UNCLASSIFIED",
      }));

    // ── Apps by Category ──
    const categoryMap = new Map<string, number>();
    let totalAppDuration = 0;
    for (const log of appUsageLogs) {
      const cat = classMap.get(log.app_name) || "UNCLASSIFIED";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + log.duration);
      totalAppDuration += log.duration;
    }

    const appsByCategory = Array.from(categoryMap.entries())
      .map(([category, duration]) => ({
        category,
        duration,
        percentage: totalAppDuration > 0 ? Math.round((duration / totalAppDuration) * 100) : 0,
      }))
      .sort((a, b) => b.duration - a.duration);

    // ── Websites by Domain ──
    const domainMap = new Map<string, { domain: string; duration: number; category: string }>();
    for (const log of appUsageLogs) {
      if (!log.url) continue;
      let domain: string;
      try {
        domain = new URL(log.url.startsWith("http") ? log.url : `https://${log.url}`).hostname;
      } catch {
        domain = log.url;
      }
      const existing = domainMap.get(domain);
      const cat = classMap.get(log.app_name) || "UNCLASSIFIED";
      if (existing) {
        existing.duration += log.duration;
      } else {
        domainMap.set(domain, { domain, duration: log.duration, category: cat });
      }
    }

    let totalWebDuration = 0;
    for (const d of domainMap.values()) totalWebDuration += d.duration;

    const websitesByDomain = Array.from(domainMap.values())
      .map((w) => ({
        ...w,
        percentage: totalWebDuration > 0 ? Math.round((w.duration / totalWebDuration) * 100) : 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // ── Recent Screenshots ──
    const screenshots = todayScreenshots.slice(0, 8).map((s) => ({
      id: s.id,
      thumbnail_url: s.thumbnail_url,
      image_url: s.image_url,
      activity_level: s.activity_level,
      captured_at: s.captured_at instanceof Date ? s.captured_at.toISOString() : String(s.captured_at),
      user_name: s.user?.name || "Unknown",
      user_avatar: s.user?.avatar_url || null,
    }));

    // ── Alert Conditions ──
    const idleMembers: string[] = [];
    const tooManyBreaksMembers: string[] = [];
    const unproductiveMembers: string[] = [];

    // Idle: avg activity < 30% today
    for (const [userId, activities] of userActivityMap.entries()) {
      const avg = activities.reduce((s, v) => s + v, 0) / activities.length;
      if (avg < 30 && activities.length > 0) {
        const m = allMembers.find((mem) => mem.user.id === userId);
        if (m) idleMembers.push(m.user.name);
      }
    }

    // Too many breaks: 3+ separate time entries today
    const entryCountByUser = new Map<string, number>();
    for (const entry of todayEntries) {
      entryCountByUser.set(entry.user_id, (entryCountByUser.get(entry.user_id) || 0) + 1);
    }
    for (const [userId, count] of entryCountByUser.entries()) {
      if (count >= 3) {
        const m = allMembers.find((mem) => mem.user.id === userId);
        if (m) tooManyBreaksMembers.push(m.user.name);
      }
    }

    // Unproductive: >50% unproductive app time
    const userProductivity = new Map<string, { productive: number; unproductive: number }>();
    for (const log of appUsageLogs) {
      const existing = userProductivity.get(log.user_id) || { productive: 0, unproductive: 0 };
      if (log.is_productive === true) existing.productive += log.duration;
      else if (log.is_productive === false) existing.unproductive += log.duration;
      userProductivity.set(log.user_id, existing);
    }
    for (const [userId, data] of userProductivity.entries()) {
      const total = data.productive + data.unproductive;
      if (total > 0 && data.unproductive / total > 0.5) {
        const m = allMembers.find((mem) => mem.user.id === userId);
        if (m) unproductiveMembers.push(m.user.name);
      }
    }

    const alerts = {
      idle: { count: idleMembers.length, members: idleMembers },
      tooManyBreaks: { count: tooManyBreaksMembers.length, members: tooManyBreaksMembers },
      unproductive: { count: unproductiveMembers.length, members: unproductiveMembers },
    };

    return ok({
      statusCards,
      clockInOut,
      recentApps,
      appsByCategory,
      totalAppDuration,
      websitesByDomain,
      totalWebDuration,
      screenshots,
      alerts,
    });
  } catch (error) {
    console.error("[getOverviewData]", error);
    return err("Failed to fetch overview data");
  }
}
