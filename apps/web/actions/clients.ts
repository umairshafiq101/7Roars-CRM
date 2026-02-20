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

export async function getClients(search?: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const where: Record<string, unknown> = {
      organization_id: ctx.member.organization_id,
      deleted_at: null,
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { surname: { contains: term, mode: "insensitive" } },
      ];
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { projects: true, invoices: true } },
      },
    });

    return ok(clients);
  } catch (error) {
    console.error("[getClients]", error);
    return err("Failed to fetch clients");
  }
}

export async function createClient(params: {
  company: string;
  name: string;
  surname?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  tax_office?: string;
  tax_number?: string;
  notes?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const client = await db.client.create({
      data: {
        organization_id: ctx.member.organization_id,
        company: params.company,
        name: params.name,
        surname: params.surname || null,
        email: params.email || null,
        phone: params.phone || null,
        website: params.website || null,
        address: params.address ? { text: params.address } : undefined,
        tax_office: params.tax_office || null,
        tax_number: params.tax_number || null,
        notes: params.notes || null,
      },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "client",
      entityId: client.id,
      newData: client,
    });

    return ok(client);
  } catch (error) {
    console.error("[createClient]", error);
    return err("Failed to create client");
  }
}

export async function updateClient(params: {
  id: string;
  company?: string;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  tax_office?: string;
  tax_number?: string;
  notes?: string;
  status?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.client.findUnique({ where: { id: params.id } });
    if (!existing) return err("Client not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");

    const data: Record<string, unknown> = {};
    if (params.company !== undefined) data.company = params.company;
    if (params.name !== undefined) data.name = params.name;
    if (params.surname !== undefined) data.surname = params.surname;
    if (params.email !== undefined) data.email = params.email;
    if (params.phone !== undefined) data.phone = params.phone;
    if (params.website !== undefined) data.website = params.website;
    if (params.address !== undefined) data.address = params.address ? { text: params.address } : null;
    if (params.tax_office !== undefined) data.tax_office = params.tax_office;
    if (params.tax_number !== undefined) data.tax_number = params.tax_number;
    if (params.notes !== undefined) data.notes = params.notes;
    if (params.status !== undefined) data.status = params.status;

    const updated = await db.client.update({
      where: { id: params.id },
      data,
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "client",
      entityId: params.id,
      oldData: existing,
      newData: updated,
    });

    return ok(updated);
  } catch (error) {
    console.error("[updateClient]", error);
    return err("Failed to update client");
  }
}

export async function deleteClient(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return err("Client not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");

    await db.client.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "client",
      entityId: id,
      oldData: existing,
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteClient]", error);
    return err("Failed to delete client");
  }
}
