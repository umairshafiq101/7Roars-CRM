import { ComingSoon } from "@/components/shared/ComingSoon";
import { LayoutGrid } from "lucide-react";

export default function AppsSummaryPage() {
  return (
    <ComingSoon
      title="Apps Summary"
      description="Get a comprehensive overview of application usage across your team. See which tools are most used, identify unproductive app patterns, and optimize your software stack."
      icon={LayoutGrid}
    />
  );
}
