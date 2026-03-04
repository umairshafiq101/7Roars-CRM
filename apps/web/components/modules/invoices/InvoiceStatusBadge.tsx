interface InvoiceStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Viewed", className: "bg-purple-100 text-purple-700" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-400 line-through" },
};

export function InvoiceStatusBadge({ status, size = "md" }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
