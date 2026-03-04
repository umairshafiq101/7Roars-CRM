import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const PURPLE = "#5B4FE9";
const DARK = "#1E1B4B";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const BORDER = "#E5E7EB";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    backgroundColor: WHITE,
    padding: 48,
  },
  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
  },
  orgBlock: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  orgMeta: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
  invoiceBlock: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: PURPLE,
    letterSpacing: 2,
    marginBottom: 8,
  },
  invoiceMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  invoiceMetaLabel: {
    fontSize: 8,
    color: GRAY,
    width: 64,
    textAlign: "right",
    marginRight: 8,
  },
  invoiceMetaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    width: 80,
    textAlign: "right",
  },
  // ── Divider ──
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 24,
  },
  // ── Bill To ──
  billSection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: PURPLE,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  billCompany: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  billLine: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.6,
  },
  // ── Table ──
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: LIGHT_GRAY,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  colDescription: { flex: 3 },
  colQty: { flex: 0.7, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colAmount: { flex: 1.2, textAlign: "right" },
  cellText: {
    fontSize: 8.5,
    color: DARK,
  },
  cellTextMuted: {
    fontSize: 8.5,
    color: GRAY,
  },
  // ── Totals ──
  totalsSection: {
    alignItems: "flex-end",
    marginBottom: 32,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    backgroundColor: PURPLE,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 8,
    color: GRAY,
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  totalsFinalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  totalsFinalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  // ── Status Badge ──
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  // ── Notes / Footer ──
  notesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  notesText: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
  footerAccent: {
    fontSize: 7,
    color: PURPLE,
    fontFamily: "Helvetica-Bold",
  },
});

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string;
    currency: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes?: string | null;
    paid_at?: string | null;
    line_items: LineItem[];
  };
  client: {
    name: string;
    surname?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: { text?: string } | null;
    tax_office?: string | null;
    tax_number?: string | null;
  };
  organization: {
    name: string;
    settings?: Record<string, unknown>;
  };
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
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

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "PAID": return { bg: "#D1FAE5", text: "#065F46" };
    case "SENT": return { bg: "#DBEAFE", text: "#1E40AF" };
    case "VIEWED": return { bg: "#EDE9FE", text: "#5B21B6" };
    case "OVERDUE": return { bg: "#FEE2E2", text: "#991B1B" };
    case "CANCELLED": return { bg: "#F3F4F6", text: "#6B7280" };
    default: return { bg: "#F3F4F6", text: "#374151" };
  }
}

export function InvoicePDF({ invoice, client, organization }: InvoicePDFProps) {
  const settings = organization.settings as Record<string, unknown> | undefined;
  const orgAddress = (settings?.address as string) || "";
  const orgPhone = (settings?.phone as string) || "";
  const orgEmail = (settings?.email as string) || "";

  const statusColors = getStatusColor(invoice.status);
  const cur = invoice.currency || "USD";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.orgBlock}>
            <Text style={styles.orgName}>{organization.name}</Text>
            {orgAddress ? <Text style={styles.orgMeta}>{orgAddress}</Text> : null}
            {orgPhone ? <Text style={styles.orgMeta}>{orgPhone}</Text> : null}
            {orgEmail ? <Text style={styles.orgMeta}>{orgEmail}</Text> : null}
          </View>

          <View style={styles.invoiceBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {invoice.status}
              </Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Invoice #</Text>
              <Text style={styles.invoiceMetaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Issue date</Text>
              <Text style={styles.invoiceMetaValue}>{formatDate(invoice.issue_date)}</Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Due date</Text>
              <Text style={styles.invoiceMetaValue}>{formatDate(invoice.due_date)}</Text>
            </View>
            {invoice.paid_at ? (
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.invoiceMetaLabel}>Paid on</Text>
                <Text style={[styles.invoiceMetaValue, { color: "#065F46" }]}>
                  {formatDate(invoice.paid_at)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Bill To ── */}
        <View style={styles.billSection}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          {client.company ? (
            <Text style={styles.billCompany}>{client.company}</Text>
          ) : null}
          <Text style={client.company ? styles.billLine : styles.billCompany}>
            {client.name}{client.surname ? ` ${client.surname}` : ""}
          </Text>
          {client.email ? <Text style={styles.billLine}>{client.email}</Text> : null}
          {client.phone ? <Text style={styles.billLine}>{client.phone}</Text> : null}
          {client.address?.text ? (
            <Text style={styles.billLine}>{client.address.text}</Text>
          ) : null}
          {client.tax_office ? (
            <Text style={styles.billLine}>Tax Office: {client.tax_office}</Text>
          ) : null}
          {client.tax_number ? (
            <Text style={styles.billLine}>Tax No: {client.tax_number}</Text>
          ) : null}
        </View>

        {/* ── Line Items Table ── */}
        <View style={styles.table}>
          <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Services</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {invoice.line_items.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cellTextMuted, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellTextMuted, styles.colPrice]}>
                {formatCurrency(item.unit_price, cur)}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatCurrency(item.amount, cur)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal, cur)}</Text>
            </View>
            {invoice.tax_rate > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax ({invoice.tax_rate}%)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(invoice.tax_amount, cur)}</Text>
              </View>
            ) : null}
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>Total</Text>
              <Text style={styles.totalsFinalValue}>{formatCurrency(invoice.total, cur)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes ? (
          <View style={styles.notesSection}>
            <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by{" "}
            <Text style={styles.footerAccent}>{organization.name}</Text>
          </Text>
          <Text style={styles.footerText}>{invoice.invoice_number}</Text>
        </View>
      </Page>
    </Document>
  );
}
