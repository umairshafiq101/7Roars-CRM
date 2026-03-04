import { ComingSoon } from "@/components/shared/ComingSoon";
import { PenLine } from "lucide-react";

export default function ManualEntriesPage() {
  return (
    <ComingSoon
      title="Manual Time Entries"
      description="Log time entries manually for offline work, meetings, or activities that weren't automatically tracked. Add descriptions, assign projects, and set billable hours."
      icon={PenLine}
    />
  );
}
