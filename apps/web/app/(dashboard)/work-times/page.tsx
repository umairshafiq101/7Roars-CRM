import { ComingSoon } from "@/components/shared/ComingSoon";
import { Timer } from "lucide-react";

export default function WorkTimesPage() {
  return (
    <ComingSoon
      title="Work Times"
      description="Analyze work time patterns across your team. View daily start and end times, overtime tracking, break durations, and adherence to scheduled work hours."
      icon={Timer}
    />
  );
}
