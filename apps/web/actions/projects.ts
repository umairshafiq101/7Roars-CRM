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

export async function getProjects(search?: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const where: Record<string, unknown> = {
      organization_id: ctx.member.organization_id,
      deleted_at: null,
    };

    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    const projects = await db.project.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        client: { select: { id: true, name: true, company: true } },
        members: {
          include: {
            member: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    const projectIds = projects.map((p) => p.id);

    const timeAggs = await db.timeEntry.groupBy({
      by: ["project_id"],
      where: { project_id: { in: projectIds }, duration: { not: null } },
      _sum: { duration: true },
    });

    const timeMap = new Map(
      timeAggs.map((t) => [t.project_id, t._sum.duration ?? 0])
    );

    const serialized = projects.map((p) => {
      const totalSeconds = timeMap.get(p.id) || 0;
      const hourlyRate = p.hourly_rate ? Number(p.hourly_rate) : 0;
      const budgetHours = p.budget_hours ? Number(p.budget_hours) : 0;

      return {
        ...p,
        hourly_rate: hourlyRate || null,
        budget_hours: budgetHours || null,
        timeSpentSeconds: totalSeconds,
        currentCost: hourlyRate ? (totalSeconds / 3600) * hourlyRate : 0,
        billableAmount: p.is_billable && hourlyRate ? (totalSeconds / 3600) * hourlyRate : 0,
        budgetTotal: budgetHours && hourlyRate ? budgetHours * hourlyRate : 0,
        memberCount: p.members.length,
        taskCount: p._count.tasks,
      };
    });

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
  budget_hours?: number;
  client_id?: string;
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
        budget_hours: params.budget_hours ?? null,
        client_id: params.client_id || null,
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
  budget_hours?: number;
  client_id?: string | null;
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
    if (params.budget_hours !== undefined) data.budget_hours = params.budget_hours;
    if (params.client_id !== undefined) data.client_id = params.client_id;
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

export async function addProjectMember(
  projectId: string,
  memberId: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return err("Project not found");
    if (project.organization_id !== ctx.member.organization_id) return err("Forbidden");

    const pm = await db.projectMember.create({
      data: { project_id: projectId, member_id: memberId },
    });

    return ok(pm);
  } catch (error) {
    console.error("[addProjectMember]", error);
    return err("Failed to add member");
  }
}

export async function removeProjectMember(
  projectId: string,
  memberId: string
): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    await db.projectMember.deleteMany({
      where: { project_id: projectId, member_id: memberId },
    });
    return ok({ removed: true });
  } catch (error) {
    console.error("[removeProjectMember]", error);
    return err("Failed to remove member");
  }
}

export async function getOrgMembers(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const members = await db.member.findMany({
      where: { organization_id: ctx.member.organization_id, is_active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return ok(members);
  } catch (error) {
    console.error("[getOrgMembers]", error);
    return err("Failed to fetch members");
  }
}
