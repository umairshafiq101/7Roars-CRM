"use client";

import { useState, useEffect, useCallback } from "react";
import { ScreenshotGrid } from "@/components/modules/screenshots/ScreenshotGrid";
import { ScreenshotFilters } from "@/components/modules/screenshots/ScreenshotFilters";
import { Pagination } from "@/components/shared/Pagination";
import { getScreenshots, deleteScreenshot } from "@/actions/screenshots";
import { getTeamMembers } from "@/actions/time-entries";
import { Camera } from "lucide-react";

export default function ScreenshotsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [page, setPage] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScreenshots = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getScreenshots({
        userId: selectedUserId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
        page,
        limit: 20,
      });

      if (result.success && result.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setScreenshots(result.data as any[]);
        setTotal(result.meta?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch screenshots:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUserId, page]);

  useEffect(() => {
    fetchScreenshots();
  }, [fetchScreenshots]);

  useEffect(() => {
    async function loadUsers() {
      const res = await getTeamMembers();
      if (res.success && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUsers((res.data as any[]).map((m: any) => ({ id: m.user.id, name: m.user.name })));
      }
    }
    loadUsers();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this screenshot?")) return;
    const result = await deleteScreenshot(id);
    if (result.success) {
      fetchScreenshots();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Screenshots</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            View captured screenshots from the desktop agent
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <Camera className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">{total} screenshots</span>
        </div>
      </div>

      <ScreenshotFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(d) => { setStartDate(d); setPage(1); }}
        onEndDateChange={(d) => { setEndDate(d); setPage(1); }}
        users={users}
        selectedUserId={selectedUserId}
        onUserChange={(id) => { setSelectedUserId(id); setPage(1); }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          <ScreenshotGrid
            screenshots={screenshots}
            onDelete={handleDelete}
          />
          <Pagination
            page={page}
            limit={20}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
