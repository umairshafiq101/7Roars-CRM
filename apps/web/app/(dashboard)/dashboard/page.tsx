"use client";

import { useState, useEffect } from "react";
import { getOverviewData } from "@/actions/overview";
import { StatusCards } from "@/components/modules/overview/StatusCards";
import { ClockInOutTable } from "@/components/modules/overview/ClockInOutTable";
import { RecentApps } from "@/components/modules/overview/RecentApps";
import { AppCategoryChart } from "@/components/modules/overview/AppCategoryChart";
import { WebsiteCategoryChart } from "@/components/modules/overview/WebsiteCategoryChart";
import { RecentScreenshots } from "@/components/modules/overview/RecentScreenshots";
import { AlertConditions } from "@/components/modules/overview/AlertConditions";

const EMPTY_STATUS = { employees: 0, working: 0, onBreak: 0, idle: 0, stoppedWork: 0, yetToStart: 0 };
const EMPTY_ALERTS = {
  idle: { count: 0, members: [] },
  tooManyBreaks: { count: 0, members: [] },
  unproductive: { count: 0, members: [] },
};

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getOverviewData();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to load overview data:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500">
          Today&apos;s snapshot of your agency&apos;s activity
        </p>
      </div>

      {/* Status Cards */}
      <StatusCards data={data?.statusCards || EMPTY_STATUS} />

      {/* Clock-in/Clock-out + Recent Apps */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClockInOutTable data={data?.clockInOut || []} />
        <RecentApps data={data?.recentApps || []} />
      </div>

      {/* Apps by Category + Websites by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AppCategoryChart
          data={data?.appsByCategory || []}
          totalDuration={data?.totalAppDuration || 0}
        />
        <WebsiteCategoryChart
          data={data?.websitesByDomain || []}
          totalDuration={data?.totalWebDuration || 0}
        />
      </div>

      {/* Recent Screenshots */}
      <RecentScreenshots data={data?.screenshots || []} />

      {/* Alert Conditions */}
      <AlertConditions data={data?.alerts || EMPTY_ALERTS} />
    </div>
  );
}
