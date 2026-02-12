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

export async function getProjects(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const projects = await db.project.findMany({
      where: {
        organization_id: ctx.member.organization_id,
        deleted_at: null,
      },
      orderBy: { name: "asc" },
    });

    const serialized = projects.map((p) => ({
      ...p,
      hourly_rate: p.hourly_rate ? Number(p.hourly_rate) : null,
      budget_hours: p.budget_hours ? Number(p.budget_hours) : null,
    }));

    return ok(serialized);
  } catch (error) {
    console.error("[getProjects]", error);
    return err("Failed to fetch projects");
  }
}

export async function createProject(params: {
  name: string;
  color?: string;
  description?: string;
  is_billable?: boolean;
  hourly_rate?: number;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const project = await db.project.create({
      data: {
        organization_id: ctx.member.organization_id,
        name: params.name,
        color: params.color || "#6366f1",
        description: params.description || null,
        is_billable: params.is_billable ?? true,
        hourly_rate: params.hourly_rate ?? null,
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "project",
      entityId: project.id,
      newData: project,
    });

    return ok({
      ...project,
      hourly_rate: project.hourly_rate ? Number(project.hourly_rate) : null,
      budget_hours: project.budget_hours ? Number(project.budget_hours) : null,
    });
  } catch (error) {
    console.error("[createProject]", error);
    return err("Failed to create project");
  }
}

export async function updateProject(params: {
  id: string;
  name?: string;
  color?: string;
  description?: string;
  is_billable?: boolean;
  hourly_rate?: number;
  status?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.project.findUnique({ where: { id: params.id } });
    if (!existing) return err("Project not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");

    const data: Record<string, unknown> = {};
    if (params.name !== undefined) data.name = params.name;
    if (params.color !== undefined) data.color = params.color;
    if (params.description !== undefined) data.description = params.description;
    if (params.is_billable !== undefined) data.is_billable = params.is_billable;
    if (params.hourly_rate !== undefined) data.hourly_rate = params.hourly_rate;
    if (params.status !== undefined) data.status = params.status;

    const updated = await db.project.update({
      where: { id: params.id },
      data,
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "project",
      entityId: params.id,
      oldData: existing,
      newData: updated,
    });

    return ok({
      ...updated,
      hourly_rate: updated.hourly_rate ? Number(updated.hourly_rate) : null,
      budget_hours: updated.budget_hours ? Number(updated.budget_hours) : null,
    });
  } catch (error) {
    console.error("[updateProject]", error);
    return err("Failed to update project");
  }
}

export async function deleteProject(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return err("Project not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");

    await db.project.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "project",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteProject]", error);
    return err("Failed to delete project");
  }
}
