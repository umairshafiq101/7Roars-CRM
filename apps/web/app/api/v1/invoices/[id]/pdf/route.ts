import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";
import { InvoicePDF } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await authenticateApiRequest();
    if (auth.error) return auth.error;
    const { member } = auth;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await (db.invoice.findUnique as any)({
      where: { id, deleted_at: null },
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
    }) as {
      id: string;
      organization_id: string;
      invoice_number: string;
      status: string;
      issue_date: Date;
      due_date: Date;
      currency: string;
      subtotal: unknown;
      tax_rate: unknown;
      tax_amount: unknown;
      total: unknown;
      notes: string | null;
      paid_at: Date | null;
      client: {
        name: string; surname: string | null; company: string | null;
        email: string | null; phone: string | null;
        address: unknown; tax_office: string | null; tax_number: string | null;
      };
      line_items: { id: string; description: string; quantity: unknown; unit_price: unknown; amount: unknown }[];
      organization: { name: string; settings: unknown };
    } | null;

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.organization_id !== member.organization_id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const invoiceData = {
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date.toISOString(),
      due_date: invoice.due_date.toISOString(),
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.tax_rate),
      tax_amount: Number(invoice.tax_amount),
      total: Number(invoice.total),
      notes: invoice.notes,
      paid_at: invoice.paid_at?.toISOString() ?? null,
      line_items: invoice.line_items.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
        amount: Number(li.amount),
      })),
    };

    const clientData = {
      name: invoice.client.name,
      surname: invoice.client.surname,
      company: invoice.client.company,
      email: invoice.client.email,
      phone: invoice.client.phone,
      address: invoice.client.address as { text?: string } | null,
      tax_office: invoice.client.tax_office,
      tax_number: invoice.client.tax_number,
    };

    const orgData = {
      name: invoice.organization.name,
      settings: invoice.organization.settings as Record<string, unknown>,
    };

    const element = React.createElement(InvoicePDF, {
      invoice: invoiceData,
      client: clientData,
      organization: orgData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfInstance = pdf(element as any);
    const pdfBlob = await pdfInstance.toBlob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfArrayBuffer);

    const filename = `${invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/v1/invoices/[id]/pdf]", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
