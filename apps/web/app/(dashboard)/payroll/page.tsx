import { ComingSoon } from "@/components/shared/ComingSoon";
import { Calculator } from "lucide-react";

export default function PayrollPage() {
  return (
    <ComingSoon
      title="Payroll Calculator"
      description="Calculate payroll based on tracked hours, hourly rates, and overtime. Generate pay stubs, export payroll reports, and manage compensation for your entire team."
      icon={Calculator}
    />
  );
}
