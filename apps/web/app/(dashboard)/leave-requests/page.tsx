import { ComingSoon } from "@/components/shared/ComingSoon";
import { CalendarCheck } from "lucide-react";

export default function LeaveRequestsPage() {
  return (
    <ComingSoon
      title="Leave Requests"
      description="Submit and manage leave requests for your team. View pending approvals, track leave balances, and manage vacation, sick days, and personal time off."
      icon={CalendarCheck}
    />
  );
}
