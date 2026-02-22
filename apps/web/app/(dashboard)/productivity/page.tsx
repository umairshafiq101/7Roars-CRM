"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductivityData } from "@/actions/productivity";
import { ProductivityDonuts } from "@/components/modules/productivity/ProductivityDonut";
import { ProductivityTeamGroup } from "@/components/modules/productivity/ProductivityTeamGroup";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react";
import type { ProductivityData, ProductivityEmployee } from "@/actions/productivity";

const ROLE_ORDER = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"];

function formatDateLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === today.getTime() - 86400000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

export default function ProductivityPage() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [roleFilter, setRoleFilter] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<ProductivityEmployee[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const result = await getProductivityData({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        roleFilter: roleFilter || undefined,
        employeeId: employeeId || undefined,
      });

      if (result.success && result.data) {
        const d = result.data as ProductivityData;
        setData(d);
        if (allEmployees.length === 0) {
          setAllEmployees(d.employees);
        }
      }
    } catch (err) {
      console.error("Failed to fetch productivity data:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, roleFilter, employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Populate employee list on first load without filters
  useEffect(() => {
    if (allEmployees.length === 0) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      getProductivityData({ startDate: start.toISOString(), endDate: end.toISOString() }).then((res) => {
        if (res.success && res.data) {
          setAllEmployees((res.data as ProductivityData).employees);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigateDay(dir: -1 | 1) {
    const s = new Date(startDate);
    s.setDate(s.getDate() + dir);
    const e = new Date(endDate);
    e.setDate(e.getDate() + dir);
    setStartDate(s);
    setEndDate(e);
  }

  // Group employees by role
  const grouped: Record<string, ProductivityEmployee[]> = {};
  for (const role of ROLE_ORDER) grouped[role] = [];
  for (const emp of data?.employees || []) {
    if (grouped[emp.role]) grouped[emp.role].push(emp);
    else grouped[emp.role] = [emp];
  }

  const isSingleDay = startDate.toDateString() === endDate.toDateString();

  function exportCSV() {
    if (!data) return;
    const header = "Employee,Role,Working Hours,Productive %,Neutral %,Unproductive %";
    const lines = data.employees.map((e) =>
      `"${e.name}","${e.role}","${fmtHM(e.workingSeconds)}","${e.productivePct}%","${e.neutralPct}%","${e.unproductivePct}%"`
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productivity-${startDate.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalHM = fmtHM(data?.summary.totalWorkingSeconds || 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productivity</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You can reach your organization productivity insights here.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date navigation */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
          <button
            onClick={() => navigateDay(-1)}
            className="rounded p-1 hover:bg-[var(--accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {isSingleDay
              ? formatDateLabel(startDate)
              : `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`}
          </span>
          <button
            onClick={() => navigateDay(1)}
            className="rounded p-1 hover:bg-[var(--accent)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Role / team filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All teams</option>
          <option value="OWNER">Owners</option>
          <option value="ADMIN">Admins</option>
          <option value="MANAGER">Managers</option>
          <option value="EMPLOYEE">Employees</option>
        </select>

        {/* Employee filter */}
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All employees</option>
          {allEmployees.map((emp) => (
            <option key={emp.userId} value={emp.userId}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={fetchData}
          className="ml-auto rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Donut charts section */}
          {data && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Total calculated work time:
                </h2>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                  {totalHM}
                </span>
              </div>
              <ProductivityDonuts summary={data.summary} />
            </div>
          )}

          {/* No data state */}
          {(!data || data.employees.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Calendar className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">No Data</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                No productivity data found for the selected period.
              </p>
            </div>
          )}

          {/* Team groups */}
          {data && data.employees.length > 0 && (
            <div className="space-y-4">
              {ROLE_ORDER.map((role) =>
                grouped[role]?.length > 0 ? (
                  <ProductivityTeamGroup key={role} role={role} employees={grouped[role]} />
                ) : null
              )}
            </div>
          )}

          {/* Export */}
          {data && data.employees.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <Download className="h-4 w-4" />
                Export this report as xlsx
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
