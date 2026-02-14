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
