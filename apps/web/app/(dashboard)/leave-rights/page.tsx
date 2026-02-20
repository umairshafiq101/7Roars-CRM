import { ComingSoon } from "@/components/shared/ComingSoon";
import { Shield } from "lucide-react";

export default function LeaveRightsPage() {
  return (
    <ComingSoon
      title="Leave Rights"
      description="Configure leave policies and entitlements for your organization. Set annual leave allowances, carry-over rules, and approval workflows for different team roles."
      icon={Shield}
    />
  );
}
