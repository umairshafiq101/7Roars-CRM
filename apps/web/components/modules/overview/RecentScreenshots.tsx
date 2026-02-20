"use client";

import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

interface ScreenshotEntry {
  id: string;
  thumbnail_url: string;
  image_url: string;
  activity_level: number;
  captured_at: string;
  user_name: string;
  user_avatar: string | null;
}

interface RecentScreenshotsProps {
  data: ScreenshotEntry[];
}

export function RecentScreenshots({ data }: RecentScreenshotsProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Screenshots</h3>
        <Link
          href="/screenshots"
          className="flex items-center gap-1 text-xs font-medium text-[#5B4FE9] hover:underline"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-gray-400">
          <ImageOff className="h-8 w-8" />
          <p className="text-sm">No screenshots captured today</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto p-5">
          {data.map((s) => (
            <div key={s.id} className="w-48 shrink-0">
              <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                <img
                  src={s.thumbnail_url || s.image_url}
                  alt={`Screenshot by ${s.user_name}`}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {s.activity_level}%
                </div>
              </div>
              <div className="mt-2">
                <p className="truncate text-xs font-medium text-gray-700">{s.user_name}</p>
                <p className="text-[10px] text-gray-400">{formatRelativeTime(s.captured_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
