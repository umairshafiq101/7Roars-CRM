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

export async function getScreenshots(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: Record<string, unknown> = {};

    if (ctx.member.role === "EMPLOYEE") {
      where.user_id = ctx.session.user.id;
    } else if (params.userId) {
      where.user_id = params.userId;
    }

    if (params.startDate || params.endDate) {
      where.captured_at = {};
      if (params.startDate) (where.captured_at as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate) (where.captured_at as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const skip = (page - 1) * limit;

    const [screenshots, total] = await Promise.all([
      db.screenshot.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar_url: true } },
          time_entry: {
            select: {
              id: true,
              description: true,
              project: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { captured_at: "desc" },
        skip,
        take: limit,
      }),
      db.screenshot.count({ where }),
    ]);

    const serialized = screenshots.map((s) => ({
      ...s,
      captured_at: s.captured_at instanceof Date ? s.captured_at.toISOString() : s.captured_at,
      created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
    }));

    return ok(serialized, { page, limit, total });
  } catch (error) {
    console.error("[getScreenshots]", error);
    return err("Failed to fetch screenshots");
  }
}

export async function getTimelapseSessions(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const where: Record<string, unknown> = {
      time_entry_id: { not: null },
    };

    if (ctx.member.role === "EMPLOYEE") {
      where.user_id = ctx.session.user.id;
    } else if (params.userId) {
      where.user_id = params.userId;
    }

    if (params.startDate || params.endDate) {
      where.captured_at = {};
      if (params.startDate)
        (where.captured_at as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate)
        (where.captured_at as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const screenshots = await db.screenshot.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true } },
        time_entry: {
          select: {
            id: true,
            description: true,
            start_time: true,
            end_time: true,
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { captured_at: "asc" },
    });

    const sessionMap: Record<string, {
      time_entry_id: string;
      user: typeof screenshots[0]["user"];
      project: { id: string; name: string; color: string } | null;
      description: string | null;
      sessionStart: string;
      sessionEnd: string;
      thumbnail: string;
      screenshotCount: number;
      screenshots: { id: string; image_url: string; thumbnail_url: string; captured_at: string; activity_level: number }[];
    }> = {};

    for (const s of screenshots) {
      const tid = s.time_entry_id!;
      const capturedAt = s.captured_at instanceof Date ? s.captured_at.toISOString() : String(s.captured_at);

      if (!sessionMap[tid]) {
        sessionMap[tid] = {
          time_entry_id: tid,
          user: s.user,
          project: s.time_entry?.project ?? null,
          description: s.time_entry?.description ?? null,
          sessionStart: capturedAt,
          sessionEnd: capturedAt,
          thumbnail: s.thumbnail_url,
          screenshotCount: 0,
          screenshots: [],
        };
      }

      if (capturedAt < sessionMap[tid].sessionStart) sessionMap[tid].sessionStart = capturedAt;
      if (capturedAt > sessionMap[tid].sessionEnd) {
        sessionMap[tid].sessionEnd = capturedAt;
        sessionMap[tid].thumbnail = s.thumbnail_url;
      }

      sessionMap[tid].screenshotCount++;
      sessionMap[tid].screenshots.push({
        id: s.id,
        image_url: s.image_url,
        thumbnail_url: s.thumbnail_url,
        captured_at: capturedAt,
        activity_level: s.activity_level,
      });
    }

    const sessions = Object.values(sessionMap)
      .filter((s) => s.screenshotCount >= 1)
      .sort((a, b) => b.sessionEnd.localeCompare(a.sessionEnd));

    const total = sessions.length;
    const paginated = sessions.slice((page - 1) * limit, page * limit);

    return ok(paginated, { page, limit, total });
  } catch (error) {
    console.error("[getTimelapseSessions]", error);
    return err("Failed to fetch timelapse sessions");
  }
}

export async function deleteScreenshot(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (ctx.member.role === "EMPLOYEE") {
    return err("Forbidden");
  }

  try {
    const existing = await db.screenshot.findUnique({ where: { id } });
    if (!existing) return err("Screenshot not found");

    await db.screenshot.delete({ where: { id } });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "screenshot",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteScreenshot]", error);
    return err("Failed to delete screenshot");
  }
}
