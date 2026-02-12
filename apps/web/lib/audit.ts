import { db } from "./db";

export async function auditLog(params: {
  userId: string;
  organizationId?: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  ip?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        user_id: params.userId,
        organization_id: params.organizationId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        old_data: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        new_data: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
        ip_address: params.ip,
      },
    });
  } catch (error) {
    console.error("[AUDIT LOG ERROR]", error);
  }
}
