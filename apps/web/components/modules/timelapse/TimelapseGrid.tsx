"use client";

import { Play, Camera } from "lucide-react";

interface TimelapsSession {
  time_entry_id: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  project: { id: string; name: string; color: string } | null;
  description: string | null;
  sessionStart: string;
  sessionEnd: string;
  thumbnail: string;
  screenshotCount: number;
  screenshots: { id: string; image_url: string; thumbnail_url: string; captured_at: string; activity_level: number }[];
}

interface TimelapseGridProps {
  sessions: TimelapsSession[];
  onPlay: (session: TimelapsSession) => void;
}

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " @ " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function TimelapseGrid({ sessions, onPlay }: TimelapseGridProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Camera className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No timelapse videos found</p>
        <p className="mt-1 text-xs text-gray-400">
          Timelapse videos are generated from screenshots captured during work sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {sessions.map((session) => (
        <div
          key={session.time_entry_id}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onPlay(session)}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
            {session.thumbnail ? (
              <img
                src={session.thumbnail}
                alt="Session thumbnail"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Camera className="h-8 w-8 text-gray-300" />
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Play className="h-5 w-5 text-[var(--primary)] fill-[var(--primary)]" />
              </div>
            </div>
            {/* Screenshot count badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              <Camera className="h-3 w-3" />
              {session.screenshotCount}
            </div>
          </div>

          {/* Info */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-500 text-[10px] font-bold text-white">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-xs font-medium text-[var(--foreground)]">
                {session.user.name}
              </span>
            </div>
            {session.project && (
              <div className="flex items-center gap-1 mb-1">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: session.project.color }}
                />
                <span className="truncate text-xs text-[var(--muted-foreground)]">
                  {session.project.name}
                </span>
              </div>
            )}
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {formatSessionDate(session.sessionEnd)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
