"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Search, Receipt, Filter } from "lucide-react";
import { getInvoices, getInvoice } from "@/actions/invoices";
import { getClients } from "@/actions/clients";
import { InvoiceList } from "@/components/modules/invoices/InvoiceList";
import { InvoiceDrawer } from "@/components/modules/invoices/InvoiceDrawer";
import { InvoiceStatusBadge } from "@/components/modules/invoices/InvoiceStatusBadge";

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

interface InvoiceWithItems extends InvoiceRow {
  line_items: { description: string; quantity: number; unit_price: number }[];
}

const STATUS_FILTERS = ["ALL", "DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithItems | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setInvoices(res.data as InvoiceRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchInvoices(), 300);
    return () => clearTimeout(t);
  }, [fetchInvoices]);

  useEffect(() => {
    getClients().then((res) => {
      if (res.success && res.data) setClients(res.data as Client[]);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client_id");
    if (clientId) {
      setPreselectedClientId(clientId);
      setShowDrawer(true);
    }
  }, []);

  async function handleEdit(invoice: InvoiceRow) {
    const res = await getInvoice(invoice.id);
    if (res.success && res.data) {
      setEditingInvoice(res.data as InvoiceWithItems);
      setShowDrawer(true);
    }
  }

  function handleNewInvoice() {
    setEditingInvoice(null);
    setPreselectedClientId(null);
    setShowDrawer(true);
  }

  function handleDrawerClose() {
    setShowDrawer(false);
    setEditingInvoice(null);
    setPreselectedClientId(null);
    window.history.replaceState({}, "", "/invoices");
  }

  function handleDrawerSaved() {
    handleDrawerClose();
    fetchInvoices();
  }

  // Summary stats
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.total, 0);
  const draftCount = invoices.filter((i) => i.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Invoices</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Create, send, and track invoices for your clients.
          </p>
        </div>
        <button
          onClick={handleNewInvoice}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total Invoiced</p>
          <p className="text-xl font-bold text-[var(--foreground)]">
            {invoices.length > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: invoices[0]?.currency || "USD", maximumFractionDigits: 0 }).format(totalInvoiced)
              : "$0"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Collected</p>
          <p className="text-xl font-bold text-green-600">
            {invoices.length > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: invoices[0]?.currency || "USD", maximumFractionDigits: 0 }).format(totalPaid)
              : "$0"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {invoices.filter((i) => i.status === "PAID").length} paid
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Overdue</p>
          <p className="text-xl font-bold text-red-600">
            {invoices.length > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: invoices[0]?.currency || "USD", maximumFractionDigits: 0 }).format(totalOverdue)
              : "$0"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {invoices.filter((i) => i.status === "OVERDUE").length} overdue
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Drafts</p>
          <p className="text-xl font-bold text-[var(--foreground)]">{draftCount}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">awaiting send</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {s === "ALL" ? "All" : <InvoiceStatusBadge status={s} size="sm" />}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchInvoices}
          className="ml-auto rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : invoices.length === 0 && !search && statusFilter === "ALL" ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-light)]">
            <Receipt className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <p className="text-base font-medium text-[var(--foreground)]">No invoices yet</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create your first invoice to start billing your clients.
          </p>
          <button
            onClick={handleNewInvoice}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      ) : (
        <InvoiceList
          invoices={invoices}
          onEdit={handleEdit}
          onRefresh={fetchInvoices}
        />
      )}

      {/* Drawer */}
      {showDrawer && (
        <InvoiceDrawer
          invoice={editingInvoice}
          clients={clients}
          preselectedClientId={preselectedClientId}
          onClose={handleDrawerClose}
          onSaved={handleDrawerSaved}
        />
      )}
    </div>
  );
}
