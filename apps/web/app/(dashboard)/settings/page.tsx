"use client";

import { useState, useEffect } from "react";
import { getSettings, updateSetting, updateOrganization } from "@/actions/settings";
import { Settings, Save, Building2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Org fields
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Settings fields
  const [screenshotInterval, setScreenshotInterval] = useState(5);
  const [screenshotBlur, setScreenshotBlur] = useState(false);
  const [activityInterval, setActivityInterval] = useState(60);
  const [workdayStart, setWorkdayStart] = useState("09:00");
  const [workdayEnd, setWorkdayEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    async function load() {
      try {
        const result = await getSettings();
        if (result.success && result.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = result.data as any;
          if (data.organization) {
            setOrgName(data.organization.name || "");
            setOrgSlug(data.organization.slug || "");
          }
          const s = data.settings || {};
          if (s.screenshot_interval) setScreenshotInterval(s.screenshot_interval as number);
          if (s.screenshot_blur !== undefined) setScreenshotBlur(s.screenshot_blur as boolean);
          if (s.activity_interval) setActivityInterval(s.activity_interval as number);
          if (s.workday_start) setWorkdayStart(s.workday_start as string);
          if (s.workday_end) setWorkdayEnd(s.workday_end as string);
          if (s.timezone) setTimezone(s.timezone as string);
          if (s.currency) setCurrency(s.currency as string);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await updateOrganization({ name: orgName, slug: orgSlug });

      await Promise.all([
        updateSetting("screenshot_interval", screenshotInterval),
        updateSetting("screenshot_blur", screenshotBlur),
        updateSetting("activity_interval", activityInterval),
        updateSetting("workday_start", workdayStart),
        updateSetting("workday_end", workdayEnd),
        updateSetting("timezone", timezone),
        updateSetting("currency", currency),
      ]);

      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Configure organization and tracking preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Organization Settings */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold">Organization</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              type="text"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tracking Settings */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold">Tracking Configuration</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Screenshot Interval (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={screenshotInterval}
              onChange={(e) => setScreenshotInterval(parseInt(e.target.value) || 5)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              How often the desktop agent captures screenshots (1–30 min)
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Activity Tracking Interval (seconds)
            </label>
            <input
              type="number"
              min={10}
              max={300}
              value={activityInterval}
              onChange={(e) => setActivityInterval(parseInt(e.target.value) || 60)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              How often keyboard/mouse activity is sampled (10–300 sec)
            </p>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={screenshotBlur}
                onChange={(e) => setScreenshotBlur(e.target.checked)}
                className="rounded"
              />
              Blur Screenshots by Default
            </label>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Apply blur filter to all captured screenshots for privacy
            </p>
          </div>
        </div>
      </div>

      {/* Work Schedule */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Work Schedule</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Workday Start</label>
            <input
              type="time"
              value={workdayStart}
              onChange={(e) => setWorkdayStart(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Workday End</label>
            <input
              type="time"
              value={workdayEnd}
              onChange={(e) => setWorkdayEnd(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (&euro;)</option>
              <option value="GBP">GBP (&pound;)</option>
              <option value="PKR">PKR (Rs)</option>
              <option value="AED">AED (AED)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
