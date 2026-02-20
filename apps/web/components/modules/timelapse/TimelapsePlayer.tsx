"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, ChevronLeft, ChevronRight, Camera } from "lucide-react";

interface Screenshot {
  id: string;
  image_url: string;
  thumbnail_url: string;
  captured_at: string;
  activity_level: number;
}

interface TimelapsSession {
  time_entry_id: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  project: { id: string; name: string; color: string } | null;
  description: string | null;
  sessionStart: string;
  sessionEnd: string;
  screenshotCount: number;
  screenshots: Screenshot[];
}

interface TimelapsePlayerProps {
  session: TimelapsSession;
  onClose: () => void;
}

function getActivityColor(level: number) {
  if (level >= 70) return "bg-green-500";
  if (level >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export function TimelapsePlayer({ session, onClose }: TimelapsePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const screenshots = session.screenshots.sort((a, b) =>
    a.captured_at.localeCompare(b.captured_at)
  );
  const current = screenshots[currentIndex];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= screenshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, screenshots.length]);

  function handlePrev() {
    setIsPlaying(false);
    setCurrentIndex((p) => Math.max(0, p - 1));
  }

  function handleNext() {
    setIsPlaying(false);
    setCurrentIndex((p) => Math.min(screenshots.length - 1, p + 1));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === " ") { e.preventDefault(); setIsPlaying((p) => !p); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative flex w-full max-w-5xl flex-col rounded-2xl bg-[var(--background)] shadow-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-violet-500 text-sm font-bold text-white">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{session.user.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {session.project?.name || "No project"} · {screenshots.length} screenshots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--accent)] text-[var(--muted-foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 400 }}>
          {current ? (
            <img
              src={current.image_url}
              alt={`Screenshot ${currentIndex + 1}`}
              className="max-h-[60vh] w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-20 text-gray-400">
              <Camera className="h-12 w-12" />
              <p className="text-sm">No screenshots available</p>
            </div>
          )}

          {/* Activity badge */}
          {current && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1">
              <div className={`h-2 w-2 rounded-full ${getActivityColor(current.activity_level)}`} />
              <span className="text-xs font-medium text-white">{current.activity_level}%</span>
            </div>
          )}

          {/* Nav arrows */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === screenshots.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            {current
              ? new Date(current.captured_at).toLocaleString("en-GB", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })
              : ""}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded-lg border border-[var(--border)] p-1.5 hover:bg-[var(--accent)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              disabled={screenshots.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === screenshots.length - 1}
              className="rounded-lg border border-[var(--border)] p-1.5 hover:bg-[var(--accent)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            {currentIndex + 1} / {screenshots.length}
          </p>
        </div>

        {/* Filmstrip */}
        {screenshots.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-[var(--border)] bg-gray-50 px-4 py-2">
            {screenshots.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setIsPlaying(false); setCurrentIndex(i); }}
                className={`flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                  i === currentIndex
                    ? "border-[var(--primary)] opacity-100"
                    : "border-transparent opacity-60 hover:opacity-90"
                }`}
              >
                <img
                  src={s.thumbnail_url}
                  alt={`Frame ${i + 1}`}
                  className="h-12 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
