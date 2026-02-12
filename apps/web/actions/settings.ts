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

export async function getSettings(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const settings = await db.setting.findMany({
      where: { organization_id: ctx.member.organization_id },
    });

    const settingsMap: Record<string, unknown> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const org = await db.organization.findUnique({
      where: { id: ctx.member.organization_id },
    });

    const serializedOrg = org ? {
      ...org,
      createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
      updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : org.updatedAt,
    } : null;

    return ok({ organization: serializedOrg, settings: settingsMap });
  } catch (error) {
    console.error("[getSettings]", error);
    return err("Failed to fetch settings");
  }
}

export async function updateSetting(key: string, value: unknown): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const setting = await db.setting.upsert({
      where: {
        organization_id_key: {
          organization_id: ctx.member.organization_id,
          key,
        },
      },
      update: { value: value as object },
      create: {
        organization_id: ctx.member.organization_id,
        key,
        value: value as object,
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "setting",
      entityId: setting.id,
      newData: { key, value },
    });

    return ok(setting);
  } catch (error) {
    console.error("[updateSetting]", error);
    return err("Failed to update setting");
  }
}

export async function updateOrganization(params: {
  name?: string;
  slug?: string;
  logoUrl?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!["OWNER", "ADMIN"].includes(ctx.member.role)) {
    return err("Forbidden");
  }

  try {
    const existing = await db.organization.findUnique({
      where: { id: ctx.member.organization_id },
    });

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.slug !== undefined) updateData.slug = params.slug;
    if (params.logoUrl !== undefined) updateData.logo_url = params.logoUrl;

    const updated = await db.organization.update({
      where: { id: ctx.member.organization_id },
      data: updateData,
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "organization",
      entityId: ctx.member.organization_id,
      oldData: existing,
      newData: updated,
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateOrganization]", error);
    return err("Failed to update organization");
  }
}
