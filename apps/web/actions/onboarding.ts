"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import { ok, err, type ApiResponse } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";

export async function updateOrganizationName(orgName: string): Promise<ApiResponse> {
  const session = await getSession();
  if (!session?.user?.id) return err("Unauthorized");

  try {
    const member = await db.member.findFirst({
      where: { user_id: session.user.id, is_active: true, role: "OWNER" },
      include: { organization: true },
    });

    if (!member) return err("No organization found");

    const updated = await db.organization.update({
      where: { id: member.organization_id },
      data: { name: orgName },
    });

    await auditLog({
      userId: session.user.id,
      organizationId: member.organization_id,
      action: "UPDATE",
      entityType: "organization",
      entityId: member.organization_id,
      oldData: { name: member.organization.name },
      newData: { name: orgName },
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateOrganizationName]", error);
    return err("Failed to update organization name");
  }
}
