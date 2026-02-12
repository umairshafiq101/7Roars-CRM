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
