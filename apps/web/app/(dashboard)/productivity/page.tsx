"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getProductivityAnalysis } from "@/actions/productivity";
import { getTeamMembersForFilter } from "@/actions/app-usage";

interface DailyData {
  date: string;
  avgActivity: number;
  productiveMinutes: number;
  unproductiveMinutes: number;
}

interface EmployeeData {
  userId: string;
  name: string;
  avgActivity: number;
  productiveHours: number;
  unproductiveHours: number;
  totalHours: number;
}

interface PeakHourData {
  hour: number;
  label: string;
  avgActivity: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

function getActivityColor(percent: number): string {
  if (percent >= 70) return "#22c55e";
  if (percent >= 40) return "#eab308";
  return "#ef4444";
}

export default function ProductivityPage() {
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return {
      start: weekAgo.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProductivityAnalysis({
        startDate: new Date(dateRange.start).toISOString(),
        endDate: new Date(dateRange.end + "T23:59:59").toISOString(),
        userId: selectedUser || undefined,
      });
      setDaily(result.daily || []);
      setEmployees(result.employees || []);
      setPeakHours(result.peakHours || []);
    } catch (err) {
      console.error("Failed to load productivity data:", err);
    }
    setLoading(false);
  }, [dateRange, selectedUser]);

  useEffect(() => {
    loadData();
    getTeamMembersForFilter().then(setMembers).catch(() => {});
  }, [loadData]);

  const avgActivity = daily.length > 0
    ? Math.round(daily.reduce((s, d) => s + d.avgActivity, 0) / daily.length)
    : 0;
  const totalProductiveMin = daily.reduce((s, d) => s + d.productiveMinutes, 0);
  const totalUnproductiveMin = daily.reduce((s, d) => s + d.unproductiveMinutes, 0);
  const maxBarActivity = Math.max(...daily.map((d) => d.avgActivity), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Productivity Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Activity trends, productive vs unproductive time, and peak hours
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {members.length > 1 && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Avg Activity</div>
              <div className="text-3xl font-bold mt-1" style={{ color: getActivityColor(avgActivity) }}>
                {avgActivity}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">{daily.length} days tracked</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Productive Time</div>
              <div className="text-3xl font-bold text-green-500 mt-1">
                {Math.floor(totalProductiveMin / 60)}h {totalProductiveMin % 60}m
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Unproductive Time</div>
              <div className="text-3xl font-bold text-red-500 mt-1">
                {Math.floor(totalUnproductiveMin / 60)}h {totalUnproductiveMin % 60}m
              </div>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Daily Activity Trend</h2>
            {daily.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No activity data for this period</div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {daily.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium" style={{ color: getActivityColor(d.avgActivity) }}>
                      {d.avgActivity}%
                    </span>
                    <div
                      className="w-full rounded-t-md min-h-[4px]"
                      style={{
                        height: `${(d.avgActivity / maxBarActivity) * 100}%`,
                        backgroundColor: getActivityColor(d.avgActivity),
                        opacity: 0.8,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peak Hours */}
          {peakHours.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Peak Hours</h2>
              <div className="flex items-end gap-1 h-32">
                {peakHours.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm min-h-[2px]"
                      style={{
                        height: `${h.avgActivity}%`,
                        backgroundColor: getActivityColor(h.avgActivity),
                        opacity: 0.7,
                      }}
                    />
                    <span className="text-[9px] text-muted-foreground">{h.label.split(":")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee Breakdown */}
          {employees.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              </div>
              <div className="divide-y divide-border">
                {employees.map((emp) => (
                  <div key={emp.userId} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.productiveHours}h productive · {emp.unproductiveHours}h unproductive
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${emp.avgActivity}%`,
                            backgroundColor: getActivityColor(emp.avgActivity),
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right" style={{ color: getActivityColor(emp.avgActivity) }}>
                        {emp.avgActivity}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
