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

async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await db.invoice.findFirst({
    where: {
      organization_id: organizationId,
      invoice_number: { startsWith: prefix },
    },
    orderBy: { invoice_number: "desc" },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

function serializeInvoice(invoice: Record<string, unknown>) {
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    tax_rate: Number(invoice.tax_rate),
    tax_amount: Number(invoice.tax_amount),
    total: Number(invoice.total),
    issue_date: invoice.issue_date instanceof Date ? invoice.issue_date.toISOString() : invoice.issue_date,
    due_date: invoice.due_date instanceof Date ? invoice.due_date.toISOString() : invoice.due_date,
    paid_at: invoice.paid_at instanceof Date ? (invoice.paid_at as Date).toISOString() : invoice.paid_at,
    created_at: invoice.created_at instanceof Date ? invoice.created_at.toISOString() : invoice.created_at,
    updated_at: invoice.updated_at instanceof Date ? invoice.updated_at.toISOString() : invoice.updated_at,
    line_items: Array.isArray(invoice.line_items)
      ? (invoice.line_items as Record<string, unknown>[]).map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
          amount: Number(li.amount),
        }))
      : undefined,
  };
}

export async function getInvoices(filters?: {
  status?: string;
  client_id?: string;
  search?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const where: Record<string, unknown> = {
      organization_id: ctx.member.organization_id,
      deleted_at: null,
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.client_id) where.client_id = filters.client_id;
    if (filters?.search?.trim()) {
      where.OR = [
        { invoice_number: { contains: filters.search.trim(), mode: "insensitive" } },
        { client: { company: { contains: filters.search.trim(), mode: "insensitive" } } },
        { client: { name: { contains: filters.search.trim(), mode: "insensitive" } } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        client: { select: { id: true, name: true, surname: true, company: true, email: true } },
        _count: { select: { line_items: true } },
      },
    });

    return ok(invoices.map((inv) => serializeInvoice(inv as unknown as Record<string, unknown>)));
  } catch (error) {
    console.error("[getInvoices]", error);
    return err("Failed to fetch invoices");
  }
}

export async function getInvoice(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true, name: true, surname: true, company: true,
            email: true, phone: true, address: true,
            tax_office: true, tax_number: true,
          },
        },
        line_items: { orderBy: { id: "asc" } },
        organization: {
          select: { id: true, name: true, settings: true },
        },
      },
    });

    if (!invoice) return err("Invoice not found");
    if (invoice.organization_id !== ctx.member.organization_id) return err("Forbidden");

    return ok(serializeInvoice(invoice as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[getInvoice]", error);
    return err("Failed to fetch invoice");
  }
}

export async function createInvoice(params: {
  client_id: string;
  invoice_number?: string;
  issue_date: string;
  due_date: string;
  currency?: string;
  notes?: string;
  tax_rate?: number;
  line_items: { description: string; quantity: number; unit_price: number }[];
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  if (!params.client_id) return err("Client is required");
  if (!params.line_items?.length) return err("At least one line item is required");
  if (!params.issue_date || !params.due_date) return err("Issue date and due date are required");

  try {
    const client = await db.client.findUnique({ where: { id: params.client_id } });
    if (!client || client.organization_id !== ctx.member.organization_id) return err("Client not found");

    const invoiceNumber = params.invoice_number?.trim() ||
      await generateInvoiceNumber(ctx.member.organization_id);

    const existing = await db.invoice.findUnique({ where: { invoice_number: invoiceNumber } });
    if (existing) return err(`Invoice number ${invoiceNumber} already exists`);

    const taxRate = params.tax_rate ?? 0;
    const subtotal = params.line_items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const invoice = await db.invoice.create({
      data: {
        organization_id: ctx.member.organization_id,
        client_id: params.client_id,
        invoice_number: invoiceNumber,
        issue_date: new Date(params.issue_date),
        due_date: new Date(params.due_date),
        currency: params.currency || "USD",
        notes: params.notes || null,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        total,
        line_items: {
          create: params.line_items.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            amount: li.quantity * li.unit_price,
          })),
        },
      },
      include: { line_items: true },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "CREATE",
      entityType: "invoice",
      entityId: invoice.id,
      newData: { invoice_number: invoiceNumber, total, client_id: params.client_id },
    });

    return ok(serializeInvoice(invoice as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[createInvoice]", error);
    return err("Failed to create invoice");
  }
}

export async function updateInvoice(params: {
  id: string;
  client_id?: string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  notes?: string;
  tax_rate?: number;
  line_items?: { description: string; quantity: number; unit_price: number }[];
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.invoice.findUnique({
      where: { id: params.id },
      include: { line_items: true },
    });
    if (!existing) return err("Invoice not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");
    if (existing.status === "PAID") return err("Cannot edit a paid invoice");
    if (existing.deleted_at) return err("Invoice has been deleted");

    const data: Record<string, unknown> = {};
    if (params.client_id !== undefined) data.client_id = params.client_id;
    if (params.issue_date !== undefined) data.issue_date = new Date(params.issue_date);
    if (params.due_date !== undefined) data.due_date = new Date(params.due_date);
    if (params.currency !== undefined) data.currency = params.currency;
    if (params.notes !== undefined) data.notes = params.notes || null;

    if (params.invoice_number !== undefined && params.invoice_number !== existing.invoice_number) {
      const dup = await db.invoice.findUnique({ where: { invoice_number: params.invoice_number } });
      if (dup) return err(`Invoice number ${params.invoice_number} already exists`);
      data.invoice_number = params.invoice_number;
    }

    if (params.line_items !== undefined) {
      const taxRate = params.tax_rate ?? Number(existing.tax_rate);
      const subtotal = params.line_items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
      const taxAmount = (subtotal * taxRate) / 100;
      data.tax_rate = taxRate;
      data.subtotal = subtotal;
      data.tax_amount = taxAmount;
      data.total = subtotal + taxAmount;

      await db.invoiceLineItem.deleteMany({ where: { invoice_id: params.id } });
      await db.invoiceLineItem.createMany({
        data: params.line_items.map((li) => ({
          invoice_id: params.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          amount: li.quantity * li.unit_price,
        })),
      });
    } else if (params.tax_rate !== undefined) {
      const taxRate = params.tax_rate;
      const subtotal = Number(existing.subtotal);
      const taxAmount = (subtotal * taxRate) / 100;
      data.tax_rate = taxRate;
      data.tax_amount = taxAmount;
      data.total = subtotal + taxAmount;
    }

    const updated = await db.invoice.update({
      where: { id: params.id },
      data,
      include: { line_items: true },
    });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "invoice",
      entityId: params.id,
      oldData: { invoice_number: existing.invoice_number, status: existing.status },
      newData: data,
    });

    return ok(serializeInvoice(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[updateInvoice]", error);
    return err("Failed to update invoice");
  }
}

export async function changeInvoiceStatus(id: string, status: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const validStatuses = ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"];
  if (!validStatuses.includes(status)) return err("Invalid status");

  try {
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) return err("Invoice not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");
    if (existing.deleted_at) return err("Invoice has been deleted");

    const data: Record<string, unknown> = { status };
    if (status === "PAID" && !existing.paid_at) data.paid_at = new Date();

    const updated = await db.invoice.update({ where: { id }, data });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "UPDATE",
      entityType: "invoice",
      entityId: id,
      oldData: { status: existing.status },
      newData: { status },
    });

    return ok(serializeInvoice(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[changeInvoiceStatus]", error);
    return err("Failed to update invoice status");
  }
}

export async function deleteInvoice(id: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) return err("Invoice not found");
    if (existing.organization_id !== ctx.member.organization_id) return err("Forbidden");

    await db.invoice.update({ where: { id }, data: { deleted_at: new Date() } });

    await auditLog({
      userId: ctx.session.user.id,
      organizationId: ctx.member.organization_id,
      action: "DELETE",
      entityType: "invoice",
      entityId: id,
      oldData: { invoice_number: existing.invoice_number, status: existing.status },
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[deleteInvoice]", error);
    return err("Failed to delete invoice");
  }
}

export async function getBillableHoursForClient(clientId: string): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.organization_id !== ctx.member.organization_id) return err("Client not found");

    const projects = await db.project.findMany({
      where: {
        client_id: clientId,
        organization_id: ctx.member.organization_id,
        deleted_at: null,
      },
      select: { id: true, name: true, hourly_rate: true },
    });

    if (!projects.length) return ok([]);

    const projectIds = projects.map((p) => p.id);
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const entries = await db.timeEntry.findMany({
      where: {
        project_id: { in: projectIds },
        is_billable: true,
        end_time: { not: null },
        duration: { not: null, gt: 0 },
      },
      select: { project_id: true, duration: true },
    });

    const grouped = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.project_id) continue;
      grouped.set(entry.project_id, (grouped.get(entry.project_id) ?? 0) + (entry.duration ?? 0));
    }

    const lineItems = [];
    for (const [projectId, totalSeconds] of grouped.entries()) {
      const project = projectMap.get(projectId);
      if (!project) continue;
      const hours = totalSeconds / 3600;
      const hourlyRate = project.hourly_rate ? Number(project.hourly_rate) : 0;
      const amount = Math.round(hours * hourlyRate * 100) / 100;

      lineItems.push({
        description: `${project.name} (${hours.toFixed(1)}h)`,
        quantity: 1,
        unit_price: amount,
        amount,
      });
    }

    return ok(lineItems);
  } catch (error) {
    console.error("[getBillableHoursForClient]", error);
    return err("Failed to fetch billable hours");
  }
}

export async function getNextInvoiceNumber(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const number = await generateInvoiceNumber(ctx.member.organization_id);
    return ok({ invoice_number: number });
  } catch (error) {
    console.error("[getNextInvoiceNumber]", error);
    return err("Failed to generate invoice number");
  }
}
