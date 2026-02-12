"use client";

import { useEffect, useState, useCallback } from "react";

export function useOnlineUsers(currentUserId?: string, currentUserName?: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const fetchOnlineStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/heartbeat", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.onlineUserIds) {
          setOnlineUserIds(new Set(result.data.onlineUserIds));
        }
      }
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    fetchOnlineStatus();

    const interval = setInterval(fetchOnlineStatus, 30_000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchOnlineStatus]);

  return onlineUserIds;
}
