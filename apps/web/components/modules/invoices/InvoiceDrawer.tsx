"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Download,
  Save,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createInvoice,
  updateInvoice,
  changeInvoiceStatus,
  getNextInvoiceNumber,
  getBillableHoursForClient,
} from "@/actions/invoices";

interface Client {
  id: string;
  name: string;
  surname: string | null;
  company: string | null;
  email: string | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string | null;
  line_items?: LineItem[];
}

interface InvoiceDrawerProps {
  invoice: InvoiceRow | null;
  clients: Client[];
  preselectedClientId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "PKR", "AED", "CAD", "AUD"];

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

export function InvoiceDrawer({
  invoice,
  clients,
  preselectedClientId,
  onClose,
  onSaved,
}: InvoiceDrawerProps) {
  const isEdit = !!invoice;

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [clientId, setClientId] = useState(
    invoice?.client_id ?? preselectedClientId ?? ""
  );
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? "");
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ? invoice.issue_date.split("T")[0] : today
  );
  const [dueDate, setDueDate] = useState(
    invoice?.due_date ? invoice.due_date.split("T")[0] : thirtyDaysLater
  );
  const [currency, setCurrency] = useState(invoice?.currency ?? "USD");
  const [taxRate, setTaxRate] = useState(invoice?.tax_rate ?? 0);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.line_items?.length
      ? invoice.line_items
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importingHours, setImportingHours] = useState(false);

  useEffect(() => {
    if (!isEdit && !invoiceNumber) {
      getNextInvoiceNumber().then((res) => {
        const data = res.data as { invoice_number?: string } | null;
        if (res.success && data?.invoice_number) {
          setInvoiceNumber(data.invoice_number);
        }
      });
    }
  }, [isEdit, invoiceNumber]);

  const subtotal = lineItems.reduce(
    (sum, li) => sum + (li.quantity || 0) * (li.unit_price || 0),
    0
  );
  const taxAmount = (subtotal * (taxRate || 0)) / 100;
  const total = subtotal + taxAmount;

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index ? { ...li, [field]: value } : li
      )
    );
  }

  const handleImportBillableHours = useCallback(async () => {
    if (!clientId) {
      setError("Select a client first to import billable hours");
      return;
    }
    setImportingHours(true);
    try {
      const res = await getBillableHoursForClient(clientId);
      if (!res.success) {
        setError(res.error || "Failed to import billable hours");
        return;
      }
      const imported = res.data as LineItem[];
      if (!imported?.length) {
        setError("No unbilled billable hours found for this client");
        return;
      }
      setLineItems((prev) => {
        const hasEmpty =
          prev.length === 1 &&
          !prev[0].description &&
          prev[0].unit_price === 0;
        return hasEmpty ? imported : [...prev, ...imported];
      });
    } catch {
      setError("Failed to import billable hours");
    } finally {
      setImportingHours(false);
    }
  }, [clientId]);

  async function handleSave(markSent = false) {
    if (!clientId) { setError("Client is required"); return; }
    if (!invoiceNumber.trim()) { setError("Invoice number is required"); return; }
    if (!issueDate || !dueDate) { setError("Issue date and due date are required"); return; }
    const validItems = lineItems.filter((li) => li.description.trim());
    if (!validItems.length) { setError("At least one line item with a description is required"); return; }

    setError("");
    setSaving(true);

    try {
      let result;
      if (isEdit) {
        result = await updateInvoice({
          id: invoice.id,
          client_id: clientId,
          invoice_number: invoiceNumber.trim(),
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          notes: notes.trim() || undefined,
          tax_rate: taxRate,
          line_items: validItems,
        });
      } else {
        result = await createInvoice({
          client_id: clientId,
          invoice_number: invoiceNumber.trim(),
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          notes: notes.trim() || undefined,
          tax_rate: taxRate,
          line_items: validItems,
        });
      }

      if (!result.success) {
        setError(result.error || "Something went wrong");
        return;
      }

      if (markSent) {
        const saved = result.data as { id?: string } | null;
        if (saved?.id) {
          await changeInvoiceStatus(saved.id, "SENT");
        }
      }

      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const handleDownloadPdf = () => {
    if (!invoice?.id) return;
    window.open(`/api/v1/invoices/${invoice.id}/pdf`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="flex h-full w-full max-w-2xl flex-col bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {isEdit ? `Edit Invoice ${invoice.invoice_number}` : "New Invoice"}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isEdit ? "Update invoice details and line items" : "Create a new invoice for a client"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                onClick={handleDownloadPdf}
                title="Download PDF"
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Client + Invoice Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                * Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || `${c.name}${c.surname ? ` ${c.surname}` : ""}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                * Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-0001"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {/* Dates + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                * Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                * Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Line Items
              </label>
              <button
                type="button"
                onClick={handleImportBillableHours}
                disabled={importingHours}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
              >
                {importingHours ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-[var(--primary)]" />
                )}
                Import Billable Hours
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_80px_100px_40px] gap-2 rounded-t-lg bg-[var(--muted)] px-3 py-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span />
            </div>

            {/* Rows */}
            <div className="rounded-b-lg border border-[var(--border)] divide-y divide-[var(--border)]">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_100px_40px] gap-2 px-3 py-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Service description..."
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--ring)]"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-right outline-none focus:ring-1 focus:ring-[var(--ring)]"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-right outline-none focus:ring-1 focus:ring-[var(--ring)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="flex items-center justify-center rounded p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="mt-2 flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-[var(--muted-foreground)] w-24">Tax Rate %</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="text-right space-y-1.5 min-w-[180px]">
                <div className="flex justify-between gap-6 text-sm text-[var(--muted-foreground)]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between gap-6 text-sm text-[var(--muted-foreground)]">
                    <span>Tax ({taxRate}%)</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(taxAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-6 border-t border-[var(--border)] pt-1.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Total</span>
                  <span className="text-base font-bold text-[var(--primary)]">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Notes <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, thank you message..."
              rows={3}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--border)] px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save as Draft
            </button>
            {!isEdit && (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Save & Send
              </button>
            )}
            {isEdit && (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Update Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
