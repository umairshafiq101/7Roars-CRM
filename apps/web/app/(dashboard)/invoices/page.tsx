import { ComingSoon } from "@/components/shared/ComingSoon";
import { Receipt } from "lucide-react";

export default function InvoicesPage() {
  return (
    <ComingSoon
      title="Invoices"
      description="Create, send, and manage invoices for your clients. Auto-generate invoices from tracked time, set payment terms, and track payment status from draft to paid."
      icon={Receipt}
    />
  );
}
