import { Notification } from "electron";
import { getConfig } from "./config";
import { getDb } from "./store";

let dailySummaryTimeout: ReturnType<typeof setTimeout> | null = null;

function getTodayStats(): { totalSeconds: number; projectCount: number; avgActivity: number } {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Count elapsed time from timer_state entries logged today
  const results = db.exec(
    `SELECT payload FROM offline_queue WHERE type = 'activity' AND created_at >= '${todayStart.toISOString()}'`
  );

  let totalActivity = 0;
  let activityCount = 0;

  if (results.length > 0) {
    for (const row of results[0].values) {
      try {
        const data = JSON.parse(row[0] as string);
        totalActivity += data.activity_percent || 0;
        activityCount++;
      } catch { /* ignore */ }
    }
  }

  // Get unique projects from app usage
  const appResults = db.exec(
    `SELECT payload FROM offline_queue WHERE type = 'app_usage' AND created_at >= '${todayStart.toISOString()}'`
  );

  const projects = new Set<string>();
  if (appResults.length > 0) {
    for (const row of appResults[0].values) {
      try {
        const data = JSON.parse(row[0] as string);
        if (data.time_entry_id) projects.add(data.time_entry_id);
      } catch { /* ignore */ }
    }
  }

  // Get timer state for elapsed today
  const timerResults = db.exec("SELECT elapsed, start_time FROM timer_state WHERE id = 1");
  let totalSeconds = 0;
  if (timerResults.length > 0 && timerResults[0].values.length > 0) {
    totalSeconds = (timerResults[0].values[0][0] as number) || 0;
  }

  return {
    totalSeconds,
    projectCount: Math.max(projects.size, 1),
    avgActivity: activityCount > 0 ? Math.round(totalActivity / activityCount) : 0,
  };
}

function scheduleDailySummary() {
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
    dailySummaryTimeout = null;
  }

  const config = getConfig();
  const [hours, minutes] = config.workdayEnd.split(":").map(Number);

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If target time has passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  dailySummaryTimeout = setTimeout(() => {
    showDailySummary();
    // Reschedule for next day
    scheduleDailySummary();
  }, delay);

  console.log(`[NOTIFICATIONS] Daily summary scheduled for ${target.toLocaleTimeString()} (in ${Math.round(delay / 60000)}min)`);
}

function showDailySummary() {
  try {
    const stats = getTodayStats();
    const hours = Math.floor(stats.totalSeconds / 3600);
    const minutes = Math.floor((stats.totalSeconds % 3600) / 60);

    const notification = new Notification({
      title: "7Roars — Daily Summary",
      body: `Today: ${hours}h ${minutes}m tracked across ${stats.projectCount} project${stats.projectCount !== 1 ? "s" : ""}. Activity: ${stats.avgActivity}%`,
      silent: false,
    });

    notification.show();
    console.log(`[NOTIFICATIONS] Daily summary shown: ${hours}h ${minutes}m, ${stats.avgActivity}% activity`);
  } catch (err) {
    console.error("[NOTIFICATIONS] Failed to show daily summary:", err);
  }
}

export function startDailySummarySchedule() {
  scheduleDailySummary();
}

export function stopDailySummarySchedule() {
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
    dailySummaryTimeout = null;
  }
}
