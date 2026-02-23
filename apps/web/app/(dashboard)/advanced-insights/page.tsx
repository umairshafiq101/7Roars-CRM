"use client";

import { useState, useEffect } from "react";
import { getAdvancedInsightsEmployees } from "@/actions/advanced-insights";
import { ProductivityTrends } from "@/components/modules/advanced-insights/ProductivityTrends";
import { ProductivityComparison } from "@/components/modules/advanced-insights/ProductivityComparison";
import { ActivityHeatmap } from "@/components/modules/advanced-insights/ActivityHeatmap";
import { TrendingUp, GitCompareArrows, LayoutGrid, Sparkles } from "lucide-react";

type TabKey = "trends" | "comparison" | "heatmap";

const TABS: { key: TabKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "trends", label: "Productivity Trends", icon: TrendingUp },
  { key: "comparison", label: "Comparison", icon: GitCompareArrows },
  { key: "heatmap", label: "Activity Heatmap", icon: LayoutGrid },
];

export default function AdvancedInsightsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("trends");
  const [employees, setEmployees] = useState<{ userId: string; name: string; role: string }[]>([]);

  useEffect(() => {
    getAdvancedInsightsEmployees().then((res) => {
      if (res.success && res.data) {
        setEmployees(res.data as { userId: string; name: string; role: string }[]);
      }
    });
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Insights</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Advanced analytics and detailed insights for your organization.
          </p>
        </div>
        <a
          href="/productivity-coach"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Sparkles className="h-4 w-4" />
          Generate Productivity Coach Report
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1 w-fit">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        {activeTab === "trends" && <ProductivityTrends employees={employees} />}
        {activeTab === "comparison" && <ProductivityComparison />}
        {activeTab === "heatmap" && <ActivityHeatmap employees={employees} />}
      </div>
    </div>
  );
}
