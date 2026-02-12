import type { MemberRole } from "@7roars/shared";
import { db } from "./db";
import { auth } from "./auth";
import { headers } from "next/headers";

export function canAccess(userRole: MemberRole, requiredRoles: MemberRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getMember(userId: string, organizationId: string) {
  const member = await db.member.findUnique({
    where: {
      user_id_organization_id: {
        user_id: userId,
        organization_id: organizationId,
      },
    },
  });
  return member;
}

export function requireRole(...roles: MemberRole[]) {
  return async (organizationId: string) => {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const member = await getMember(session.user.id, organizationId);
    if (!member) throw new Error("Not a member of this organization");
    if (!canAccess(member.role as MemberRole, roles)) throw new Error("Forbidden");

    return { session, member };
  };
}
