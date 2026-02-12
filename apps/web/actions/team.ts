"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
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

export async function getTeamMembers(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const members = await db.member.findMany({
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
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    // Get today's time entries for each member
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntries = await db.timeEntry.groupBy({
      by: ["user_id"],
      where: {
        start_time: { gte: today, lt: tomorrow },
        user_id: { in: members.map((m) => m.user_id) },
      },
      _sum: { duration: true },
      _count: true,
    });

    const entryMap = new Map(
      todayEntries.map((e) => [e.user_id, { totalSeconds: e._sum.duration || 0, entries: e._count }])
    );

    const enriched = members.map((m) => ({
      ...m,
      todayStats: entryMap.get(m.user_id) || { totalSeconds: 0, entries: 0 },
    }));

    return ok(enriched);
  } catch (error) {
    console.error("[getTeamMembers]", error);
    return err("Failed to fetch team members");
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
