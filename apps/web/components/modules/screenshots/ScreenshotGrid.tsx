"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { X, Trash2, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

interface ScreenshotItem {
  id: string;
  image_url: string;
  thumbnail_url: string;
  activity_level: number;
  captured_at: string;
  is_blurred: boolean;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  time_entry: {
    id: string;
    description: string | null;
    project: { id: string; name: string; color: string } | null;
  } | null;
}

interface ScreenshotGridProps {
  screenshots: ScreenshotItem[];
  onDelete?: (id: string) => void;
}

export function ScreenshotGrid({ screenshots, onDelete }: ScreenshotGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function navigateLightbox(direction: -1 | 1) {
    if (lightboxIndex === null) return;
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < screenshots.length) {
      setLightboxIndex(newIndex);
    }
  }

  function getActivityColor(level: number) {
    if (level >= 70) return "bg-green-500";
    if (level >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  if (screenshots.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-12 text-center">
        <p className="text-[var(--muted-foreground)]">
          No screenshots found. Screenshots will appear here once the desktop agent starts capturing.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {screenshots.map((ss, index) => (
          <div
            key={ss.id}
            className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] transition-shadow hover:shadow-md"
          >
            {/* Thumbnail */}
            <div
              className="relative aspect-video cursor-pointer overflow-hidden bg-[var(--muted)]"
              onClick={() => openLightbox(index)}
            >
              <img
                src={ss.thumbnail_url}
                alt={`Screenshot at ${formatDateTime(ss.captured_at)}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              {/* Activity Level Badge */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5">
                <div className={`h-2 w-2 rounded-full ${getActivityColor(ss.activity_level)}`} />
                <span className="text-[10px] font-medium text-white">{ss.activity_level}%</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-medium text-white">
                  {ss.user.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-xs font-medium">{ss.user.name}</span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                {formatDateTime(ss.captured_at)}
              </p>
              {ss.time_entry?.project && (
                <div className="mt-1 flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ss.time_entry.project.color }}
                  />
                  <span className="truncate text-[10px] text-[var(--muted-foreground)]">
                    {ss.time_entry.project.name}
                  </span>
                </div>
              )}
            </div>

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ss.id);
                }}
                className="absolute right-2 top-2 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                title="Delete screenshot"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && screenshots[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-md p-2 text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox(-1);
              }}
              className="absolute left-4 rounded-md p-2 text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {lightboxIndex < screenshots.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox(1);
              }}
              className="absolute right-4 rounded-md p-2 text-white hover:bg-white/10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshots[lightboxIndex].image_url}
              alt="Screenshot"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 text-center">
              <p className="text-sm text-white">
                {screenshots[lightboxIndex].user.name} —{" "}
                {formatDateTime(screenshots[lightboxIndex].captured_at)}
              </p>
              <p className="text-xs text-gray-400">
                Activity: {screenshots[lightboxIndex].activity_level}%
                {screenshots[lightboxIndex].time_entry?.project &&
                  ` • ${screenshots[lightboxIndex].time_entry.project.name}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
