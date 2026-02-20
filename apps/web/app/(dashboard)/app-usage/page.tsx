"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getReviewAppsData, classifyApp, getTeamMembersForFilter } from "@/actions/app-usage";
import { Search, ArrowUpDown, Check, Minus, X, ExternalLink } from "lucide-react";

type AppCategory = "PRODUCTIVE" | "UNPRODUCTIVE" | "NEUTRAL" | "UNCLASSIFIED";

interface AppRow {
  key: string;
  app_name: string;
  window_title: string;
  team: string;
  ai_suggestion: string;
  category: string;
  first_interaction: string;
  last_interaction: string;
  total_duration: number;
  users: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} - ${time}`;
}

function getAppIcon(appName: string): string {
  const n = appName.toLowerCase();
  if (n.includes("chrome")) return "🌐";
  if (n.includes("firefox")) return "🦊";
  if (n.includes("edge")) return "🌀";
  if (n.includes("safari")) return "🧭";
  if (n.includes("slack")) return "💬";
  if (n.includes("zoom")) return "📹";
  if (n.includes("teams")) return "👥";
  if (n.includes("figma")) return "🎨";
  if (n.includes("code") || n.includes("vscode")) return "💻";
  if (n.includes("terminal") || n.includes("powershell") || n.includes("cmd")) return "⌨️";
  if (n.includes("excel") || n.includes("sheets")) return "📊";
  if (n.includes("word") || n.includes("docs")) return "📝";
  if (n.includes("outlook") || n.includes("mail")) return "📧";
  return appName.charAt(0).toUpperCase();
}

function extractDomain(windowTitle: string): string {
  if (!windowTitle) return "";
  try {
    if (windowTitle.startsWith("http")) return new URL(windowTitle).hostname;
    const match = windowTitle.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    if (match) return match[1];
  } catch { /* ignore */ }
  return windowTitle;
}

function SuggestionBadge({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l === "productive")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Productive
      </span>
    );
  if (l === "unproductive")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Unproductive
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />Neutral
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  if (category === "PRODUCTIVE")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Productive
      </span>
    );
  if (category === "UNPRODUCTIVE")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Unproductive
      </span>
    );
  if (category === "NEUTRAL")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />Neutral
      </span>
    );
  return null;
}

const LIMIT = 20;

export default function AppUsagePage() {
  const [tab, setTab] = useState<"unreviewed" | "reviewed">("unreviewed");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [total, setTotal] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReviewAppsData({
        userId: selectedUser || undefined,
        tab,
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
      });
      setRows(result.rows || []);
      setTotal(result.total || 0);
      setUnreviewedCount(result.unreviewedCount || 0);
      setReviewedCount(result.reviewedCount || 0);
    } catch (err) {
      console.error("Failed to load review apps:", err);
    }
    setLoading(false);
  }, [selectedUser, tab, debouncedSearch, page]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    getTeamMembersForFilter().then(setMembers).catch(() => {});
  }, []);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  }

  function handleTabChange(t: "unreviewed" | "reviewed") {
    setTab(t);
    setPage(1);
  }

  async function handleClassify(appName: string, category: AppCategory) {
    setClassifying(appName);
    try {
      await classifyApp(appName, category);
      await loadData();
    } finally {
      setClassifying(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review apps</h1>
        <p className="text-sm text-[var(--muted-foreground)]">You can review your teams app usage here.</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedUser}
          onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="">All teams</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <div className="relative min-w-[180px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <button
          className="ml-auto rounded-lg border border-[var(--border)] p-2 hover:bg-[var(--accent)]"
          title="Export"
        >
          <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => handleTabChange("unreviewed")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "unreviewed"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          Unreviewed apps
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            tab === "unreviewed" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-gray-100 text-gray-600"
          }`}>
            {unreviewedCount}
          </span>
        </button>
        <button
          onClick={() => handleTabChange("reviewed")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "reviewed"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          Reviewed apps
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            tab === "reviewed" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-gray-100 text-gray-600"
          }`}>
            {reviewedCount}
          </span>
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
        {/* Title + total */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Applications</h2>
          <span className="rounded-lg bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            Total {total}
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid items-center gap-4 px-5 py-2.5 border-b border-[var(--border)] bg-gray-50/70 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 96px" }}
        >
          <div className="flex items-center gap-1 cursor-pointer select-none">
            Application <ArrowUpDown className="h-3 w-3" />
          </div>
          <div>Team</div>
          <div>AI Suggestion</div>
          <div className="flex items-center gap-1 cursor-pointer select-none">
            First Interaction <ArrowUpDown className="h-3 w-3" />
          </div>
          <div />
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {tab === "unreviewed" ? "All apps have been reviewed!" : "No reviewed apps yet."}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {tab === "unreviewed"
                ? "Great job — your team's apps are fully classified."
                : "Use the ✓ / – / ✗ buttons to classify apps as productive, neutral, or unproductive."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const busy = classifying === row.app_name;
              const icon = getAppIcon(row.app_name);
              const isEmoji = icon.length > 1;
              const domain = extractDomain(row.window_title);
              const hasContext = row.window_title && row.window_title !== row.app_name;

              return (
                <div
                  key={row.key}
                  className="grid items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 96px" }}
                >
                  {/* Application */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-base shadow-sm">
                      {isEmoji
                        ? <span>{icon}</span>
                        : <span className="text-sm font-bold text-[var(--primary)]">{icon}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.app_name}</p>
                      {hasContext && (
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{domain}</p>
                      )}
                      {tab === "reviewed" && (
                        <div className="mt-0.5"><CategoryBadge category={row.category} /></div>
                      )}
                    </div>
                  </div>

                  {/* Team */}
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      {row.team}
                    </span>
                  </div>

                  {/* AI Suggestion */}
                  <div><SuggestionBadge label={row.ai_suggestion} /></div>

                  {/* First Interaction */}
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {formatDateTime(row.first_interaction)}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleClassify(row.app_name, "PRODUCTIVE")}
                      disabled={busy}
                      title="Mark as productive"
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all hover:scale-110 disabled:opacity-40 ${
                        row.category === "PRODUCTIVE"
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-green-400 bg-white text-green-500 hover:bg-green-50"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleClassify(row.app_name, "NEUTRAL")}
                      disabled={busy}
                      title="Mark as neutral"
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all hover:scale-110 disabled:opacity-40 ${
                        row.category === "NEUTRAL"
                          ? "border-yellow-500 bg-yellow-500 text-white"
                          : "border-yellow-400 bg-white text-yellow-500 hover:bg-yellow-50"
                      }`}
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleClassify(row.app_name, "UNPRODUCTIVE")}
                      disabled={busy}
                      title="Mark as unproductive"
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all hover:scale-110 disabled:opacity-40 ${
                        row.category === "UNPRODUCTIVE"
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-red-400 bg-white text-red-500 hover:bg-red-50"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--accent)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
