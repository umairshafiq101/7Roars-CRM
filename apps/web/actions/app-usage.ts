"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { auditLog } from "@/lib/audit";

export async function getAppUsageData(params: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { apps: [], totalDuration: 0 };

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return { apps: [], totalDuration: 0 };

  const now = new Date();
  const startDate = params.startDate ? new Date(params.startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = params.endDate ? new Date(params.endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Build user filter — managers+ see all, employees see own
  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(member.role);
  const userFilter = params.userId
    ? { user_id: params.userId }
    : isManager
      ? {}
      : { user_id: session.user.id };

  const logs = await db.appUsageLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: {
        members: { some: { organization_id: member.organization_id } },
      },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { interval_start: "desc" },
    take: 2000,
  });

  // Aggregate by app_name
  const appMap = new Map<string, {
    app_name: string;
    total_duration: number;
    productive_duration: number;
    unproductive_duration: number;
    neutral_duration: number;
    unclassified_duration: number;
    is_productive: boolean | null;
    users: Set<string>;
  }>();

  let totalDuration = 0;

  for (const log of logs) {
    totalDuration += log.duration;
    const existing = appMap.get(log.app_name);
    if (existing) {
      existing.total_duration += log.duration;
      if (log.is_productive === true) existing.productive_duration += log.duration;
      else if (log.is_productive === false) existing.unproductive_duration += log.duration;
      else if (log.is_productive === null) existing.unclassified_duration += log.duration;
      existing.users.add(log.user_id);
    } else {
      appMap.set(log.app_name, {
        app_name: log.app_name,
        total_duration: log.duration,
        productive_duration: log.is_productive === true ? log.duration : 0,
        unproductive_duration: log.is_productive === false ? log.duration : 0,
        neutral_duration: 0,
        unclassified_duration: log.is_productive === null ? log.duration : 0,
        is_productive: log.is_productive,
        users: new Set([log.user_id]),
      });
    }
  }

  const apps = Array.from(appMap.values())
    .map((a) => ({
      ...a,
      users: a.users.size,
    }))
    .sort((a, b) => b.total_duration - a.total_duration);

  // Get classifications for this org
  const classifications = await db.appClassification.findMany({
    where: { organization_id: member.organization_id },
  });

  const classMap = Object.fromEntries(
    classifications.map((c) => [c.app_name, c.category])
  );

  return {
    apps: apps.map((a) => ({
      ...a,
      category: classMap[a.app_name] || "UNCLASSIFIED",
    })),
    totalDuration,
    classifications: classMap,
  };
}

export async function classifyApp(appName: string, category: "PRODUCTIVE" | "UNPRODUCTIVE" | "NEUTRAL" | "UNCLASSIFIED") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return { success: false, error: "No membership" };

  if (!["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const result = await db.appClassification.upsert({
    where: {
      organization_id_app_name: {
        organization_id: member.organization_id,
        app_name: appName,
      },
    },
    create: {
      organization_id: member.organization_id,
      app_name: appName,
      category,
    },
    update: { category },
  });

  // Update existing logs to reflect new classification
  const isProductive = category === "PRODUCTIVE" ? true : category === "UNPRODUCTIVE" ? false : null;
  await db.appUsageLog.updateMany({
    where: {
      app_name: appName,
      user: {
        members: { some: { organization_id: member.organization_id } },
      },
    },
    data: { is_productive: isProductive },
  });

  await auditLog({
    userId: session.user.id,
    organizationId: member.organization_id,
    action: "UPDATE",
    entityType: "AppClassification",
    entityId: result.id,
    newData: { app_name: appName, category },
  });

  return { success: true };
}

export async function getReviewAppsData(params: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  tab?: "unreviewed" | "reviewed";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { rows: [], total: 0, unreviewedCount: 0, reviewedCount: 0 };

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return { rows: [], total: 0, unreviewedCount: 0, reviewedCount: 0 };

  const now = new Date();
  const startDate = params.startDate ? new Date(params.startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = params.endDate ? new Date(params.endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(member.role);
  const userFilter = params.userId
    ? { user_id: params.userId }
    : isManager
      ? {}
      : { user_id: session.user.id };

  const logs = await db.appUsageLog.findMany({
    where: {
      ...userFilter,
      interval_start: { gte: startDate },
      interval_end: { lte: endDate },
      user: {
        members: { some: { organization_id: member.organization_id } },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          members: {
            where: { organization_id: member.organization_id },
            select: { role: true },
          },
        },
      },
    },
    orderBy: { interval_start: "desc" },
    take: 5000,
  });

  const classifications = await db.appClassification.findMany({
    where: { organization_id: member.organization_id },
  });
  const classMap = Object.fromEntries(classifications.map((c) => [c.app_name, c.category]));

  // Group by app_name + window_title (URL context) as unique key
  type AppRow = {
    key: string;
    app_name: string;
    window_title: string;
    team: string;
    ai_suggestion: string;
    category: string;
    first_interaction: Date;
    last_interaction: Date;
    total_duration: number;
    users: Set<string>;
  };

  const rowMap = new Map<string, AppRow>();

  for (const log of logs) {
    const windowTitle = log.window_title || "";
    const key = `${log.app_name}|||${windowTitle}`;
    const category = classMap[log.app_name] || "UNCLASSIFIED";
    const aiSuggestion = log.is_productive === true ? "Productive" : log.is_productive === false ? "Unproductive" : "Productive";

    const existing = rowMap.get(key);
    if (existing) {
      existing.total_duration += log.duration;
      existing.users.add(log.user_id);
      if (log.interval_start < existing.first_interaction) existing.first_interaction = log.interval_start;
      if (log.interval_end > existing.last_interaction) existing.last_interaction = log.interval_end;
    } else {
      rowMap.set(key, {
        key,
        app_name: log.app_name,
        window_title: windowTitle,
        team: "Developers",
        ai_suggestion: aiSuggestion,
        category,
        first_interaction: log.interval_start,
        last_interaction: log.interval_end,
        total_duration: log.duration,
        users: new Set([log.user_id]),
      });
    }
  }

  let allRows = Array.from(rowMap.values())
    .sort((a, b) => b.last_interaction.getTime() - a.last_interaction.getTime());

  const unreviewedCount = allRows.filter((r) => r.category === "UNCLASSIFIED").length;
  const reviewedCount = allRows.filter((r) => r.category !== "UNCLASSIFIED").length;

  // Filter by tab
  if (params.tab === "unreviewed") {
    allRows = allRows.filter((r) => r.category === "UNCLASSIFIED");
  } else if (params.tab === "reviewed") {
    allRows = allRows.filter((r) => r.category !== "UNCLASSIFIED");
  }

  // Search filter
  if (params.search) {
    const q = params.search.toLowerCase();
    allRows = allRows.filter(
      (r) =>
        r.app_name.toLowerCase().includes(q) ||
        r.window_title.toLowerCase().includes(q)
    );
  }

  const total = allRows.length;
  const page = params.page || 1;
  const limit = params.limit || 20;
  const paginated = allRows.slice((page - 1) * limit, page * limit);

  return {
    rows: paginated.map((r) => ({
      key: r.key,
      app_name: r.app_name,
      window_title: r.window_title,
      team: r.team,
      ai_suggestion: r.ai_suggestion,
      category: r.category,
      first_interaction: r.first_interaction.toISOString(),
      last_interaction: r.last_interaction.toISOString(),
      total_duration: r.total_duration,
      users: r.users.size,
    })),
    total,
    unreviewedCount,
    reviewedCount,
  };
}

export async function getTeamMembersForFilter() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return [];

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return [];

  const members = await db.member.findMany({
    where: { organization_id: member.organization_id, is_active: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));
}
