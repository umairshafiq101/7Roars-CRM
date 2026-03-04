import { ComingSoon } from "@/components/shared/ComingSoon";
import { BarChart2 } from "lucide-react";

export default function TaskInsightsPage() {
  return (
    <ComingSoon
      title="Task Insights"
      description="Get deep analytics on task completion rates, average time per task, bottleneck identification, and team velocity trends across sprints and projects."
      icon={BarChart2}
    />
  );
}
