import { ComingSoon } from "@/components/shared/ComingSoon";
import { Video } from "lucide-react";

export default function TimelapsePage() {
  return (
    <ComingSoon
      title="Timelapse Videos"
      description="Watch time-lapse recordings of your team's screen activity. Quickly review work progress with compressed video playback of captured screenshots throughout the day."
      icon={Video}
    />
  );
}
