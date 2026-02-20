"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/actions/clients";
import {
  Building2,
  Search,
  RefreshCw,
  UserPlus,
  FileText,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ClientRow {
  id: string;
  company: string | null;
  name: string;
  surname: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: { text?: string } | null;
  tax_office: string | null;
  tax_number: string | null;
  notes: string | null;
  status: string;
  _count: { projects: number; invoices: number };
}

export default function CustomersPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);

  const [formCompany, setFormCompany] = useState("");
  const [formName, setFormName] = useState("");
  const [formSurname, setFormSurname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formTaxOffice, setFormTaxOffice] = useState("");
  const [formTaxNumber, setFormTaxNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClients(search || undefined);
      if (result.success && result.data) {
        setClients(result.data as ClientRow[]);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(timeout);
  }, [fetchClients]);

  function resetForm() {
    setFormCompany("");
    setFormName("");
    setFormSurname("");
    setFormEmail("");
    setFormPhone("");
    setFormWebsite("");
    setFormAddress("");
    setFormTaxOffice("");
    setFormTaxNumber("");
    setFormNotes("");
    setFormError("");
    setEditingClient(null);
    setShowModal(false);
  }

  function openAdd() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(client: ClientRow) {
    setEditingClient(client);
    setFormCompany(client.company || "");
    setFormName(client.name);
    setFormSurname(client.surname || "");
    setFormEmail(client.email || "");
    setFormPhone(client.phone || "");
    setFormWebsite(client.website || "");
    setFormAddress(
      client.address && typeof client.address === "object" && "text" in client.address
        ? (client.address as { text?: string }).text || ""
        : ""
    );
    setFormTaxOffice(client.tax_office || "");
    setFormTaxNumber(client.tax_number || "");
    setFormNotes(client.notes || "");
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCompany.trim() || !formName.trim()) {
      setFormError("Company and Name are required");
      return;
    }
    setFormError("");
    setFormLoading(true);

    try {
      const payload = {
        company: formCompany.trim(),
        name: formName.trim(),
        surname: formSurname.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        address: formAddress.trim() || undefined,
        tax_office: formTaxOffice.trim() || undefined,
        tax_number: formTaxNumber.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      const result = editingClient
        ? await updateClient({ id: editingClient.id, ...payload })
        : await createClient(payload);

      if (!result.success) {
        setFormError(result.error || "Something went wrong");
        return;
      }

      resetForm();
      fetchClients();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This action cannot be undone.")) return;
    const result = await deleteClient(id);
    if (result.success) fetchClients();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Customers
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          You can manage your customers here.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClients()}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Add new customer
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">
              {search
                ? "No customers match your search."
                : "No customers yet. Add your first customer to get started."}
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--border)] px-6 py-3">
              <p className="text-sm font-medium text-[var(--foreground)]">
                You have {clients.length} customer(s) here.
              </p>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_140px] gap-4 border-b border-[var(--border)] px-6 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Company</span>
              <span>Name</span>
              <span>Website</span>
              <span />
            </div>

            {/* Rows */}
            {clients.map((client) => (
              <div
                key={client.id}
                className="group grid grid-cols-[1fr_1fr_1fr_140px] items-center gap-4 border-b border-[var(--border)] px-6 py-4 last:border-b-0 hover:bg-[var(--muted)]/50"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {client.company || "—"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {client.name} {client.surname || ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span className="truncate">{client.email || "—"}</span>
                  {client.email && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
                  )}
                </div>

                <div>
                  {client.website ? (
                    <a
                      href={
                        client.website.startsWith("http")
                          ? client.website
                          : `https://${client.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                    >
                      {client.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--muted-foreground)]">—</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() =>
                      (window.location.href = `/invoices?client_id=${client.id}`)
                    }
                    title="Create invoice"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(client)}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForm();
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-[var(--background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {editingClient ? "Edit customer" : "Add new customer"}
              </h2>
              <button
                onClick={resetForm}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  * Company or Title
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="Worktivity Inc."
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    * Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="John"
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    * Surname
                  </label>
                  <input
                    type="text"
                    value={formSurname}
                    onChange={(e) => setFormSurname(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="someone@example.com"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 555-555"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Website
                </label>
                <input
                  type="text"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://someinc.com"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Address
                </label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="..."
                  rows={2}
                  className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Tax office
                  </label>
                  <input
                    type="text"
                    value={formTaxOffice}
                    onChange={(e) => setFormTaxOffice(e.target.value)}
                    placeholder="..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    Tax number
                  </label>
                  <input
                    type="text"
                    value={formTaxNumber}
                    onChange={(e) => setFormTaxNumber(e.target.value)}
                    placeholder="..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="..."
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {formLoading
                    ? "Saving..."
                    : editingClient
                      ? "Update customer"
                      : "Add customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
