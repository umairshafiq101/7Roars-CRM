import { ComingSoon } from "@/components/shared/ComingSoon";
import { Activity } from "lucide-react";

export default function MyActivitiesPage() {
  return (
    <ComingSoon
      title="My Activities"
      description="View a detailed timeline of your daily work activities, including keyboard and mouse activity levels, active applications, and productivity trends throughout the day."
      icon={Activity}
    />
  );
}
