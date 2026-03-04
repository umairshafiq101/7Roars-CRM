"use client";

import { Download, Pencil, Trash2, ChevronDown, Receipt } from "lucide-react";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { changeInvoiceStatus, deleteInvoice } from "@/actions/invoices";
import { useState } from "react";

interface Client {
  id: string;
  name: string;
  surname: string | null;
  company: string | null;
  email: string | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  client_id: string;
  client: Client;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string | null;
  _count: { line_items: number };
}

interface InvoiceListProps {
  invoices: InvoiceRow[];
  onEdit: (invoice: InvoiceRow) => void;
  onRefresh: () => void;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["VIEWED", "PAID", "OVERDUE", "CANCELLED"],
  VIEWED: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: ["DRAFT"],
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function isOverdue(dueDateStr: string, status: string) {
  if (status === "PAID" || status === "CANCELLED") return false;
  return new Date(dueDateStr) < new Date();
}

export function InvoiceList({ invoices, onEdit, onRefresh }: InvoiceListProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  async function handleStatusChange(invoiceId: string, newStatus: string) {
    setChangingStatus(invoiceId);
    setStatusMenuOpen(null);
    try {
      await changeInvoiceStatus(invoiceId, newStatus);
      onRefresh();
    } finally {
      setChangingStatus(null);
    }
  }

  async function handleDelete(invoice: InvoiceRow) {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    await deleteInvoice(invoice.id);
    onRefresh();
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Receipt className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
        <p className="text-base font-medium text-[var(--foreground)]">No invoices yet</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Create your first invoice to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
      {/* Count */}
      <div className="border-b border-[var(--border)] px-6 py-3">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1.5fr_1fr_100px_100px_120px_140px] gap-4 border-b border-[var(--border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        <span>Invoice</span>
        <span>Client</span>
        <span>Issue Date</span>
        <span>Due Date</span>
        <span className="text-right">Total</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      {invoices.map((invoice) => {
        const overdue = isOverdue(invoice.due_date, invoice.status);
        const transitions = STATUS_TRANSITIONS[invoice.status] ?? [];
        const clientLabel = invoice.client.company ||
          `${invoice.client.name}${invoice.client.surname ? ` ${invoice.client.surname}` : ""}`;

        return (
          <div
            key={invoice.id}
            className="group grid grid-cols-[1.5fr_1fr_100px_100px_120px_140px] items-center gap-4 border-b border-[var(--border)] px-6 py-4 last:border-b-0 hover:bg-[var(--muted)]/40 transition-colors"
          >
            {/* Invoice # + Status */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)]">
                <Receipt className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                  {invoice.invoice_number}
                </p>
                <div className="mt-0.5">
                  <InvoiceStatusBadge status={invoice.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{clientLabel}</p>
              {invoice.client.email && (
                <p className="text-xs text-[var(--muted-foreground)] truncate">{invoice.client.email}</p>
              )}
            </div>

            {/* Issue Date */}
            <p className="text-sm text-[var(--muted-foreground)]">{formatDate(invoice.issue_date)}</p>

            {/* Due Date */}
            <p className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-[var(--muted-foreground)]"}`}>
              {formatDate(invoice.due_date)}
              {overdue && <span className="ml-1 text-xs">(overdue)</span>}
            </p>

            {/* Total */}
            <p className="text-sm font-semibold text-[var(--foreground)] text-right">
              {formatCurrency(invoice.total, invoice.currency)}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5">
              {/* Status change dropdown */}
              {transitions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setStatusMenuOpen(statusMenuOpen === invoice.id ? null : invoice.id)}
                    disabled={changingStatus === invoice.id}
                    title="Change status"
                    className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
                  >
                    Status <ChevronDown className="h-3 w-3" />
                  </button>
                  {statusMenuOpen === invoice.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setStatusMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg py-1">
                        {transitions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(invoice.id, s)}
                            className="flex w-full items-center px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
                          >
                            Mark as {s.charAt(0) + s.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Download PDF */}
              <button
                onClick={() => window.open(`/api/v1/invoices/${invoice.id}/pdf`, "_blank")}
                title="Download PDF"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
              >
                <Download className="h-3.5 w-3.5" />
              </button>

              {/* Edit */}
              {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                <button
                  onClick={() => onEdit(invoice)}
                  title="Edit invoice"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(invoice)}
                title="Delete invoice"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
