import { desktopCapturer, screen } from "electron";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { getConfig } from "./config";
import { getTimerState } from "./timer";
import { getMainWindow } from "./index";
import { getDb, persistDb } from "./store";
import { getCurrentActivityLevel } from "./activity";

let screenshotTimeout: ReturnType<typeof setTimeout> | null = null;

function getRandomInterval(): number {
  const config = getConfig();
  const min = config.screenshotInterval.min * 60 * 1000;
  const max = config.screenshotInterval.max * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function scheduleNextScreenshot() {
  cancelScreenshotSchedule();

  const interval = getRandomInterval();
  console.log(
    `[SCREENSHOT] Next capture in ${Math.round(interval / 60000)} minutes`
  );

  screenshotTimeout = setTimeout(async () => {
    const state = getTimerState();
    if (state.isRunning) {
      await captureScreenshot();
      scheduleNextScreenshot();
    }
  }, interval);
}

export function cancelScreenshotSchedule() {
  if (screenshotTimeout) {
    clearTimeout(screenshotTimeout);
    screenshotTimeout = null;
  }
}

export async function captureScreenshot(): Promise<string | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });

    if (sources.length === 0) {
      console.error("[SCREENSHOT] No sources found");
      return null;
    }

    const source = sources[0];
    const thumbnail = source.thumbnail;

    if (thumbnail.isEmpty()) {
      console.error("[SCREENSHOT] Empty thumbnail");
      return null;
    }

    const pngBuffer = thumbnail.toPNG();

    let webpBuffer: Buffer;
    try {
      const sharp = (await import("sharp")).default;
      webpBuffer = await sharp(pngBuffer)
        .webp({ quality: 70 })
        .resize({ width: Math.min(width, 1920), withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.error("[SCREENSHOT] Sharp compression failed, using PNG:", err);
      webpBuffer = pngBuffer;
    }

    const screenshotsDir = path.join(
      app.getPath("userData"),
      "screenshots"
    );
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `screenshot_${Date.now()}.webp`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, webpBuffer);

    const activityLevel = getCurrentActivityLevel();
    const state = getTimerState();

    const db = getDb();
    db.run(
      "INSERT INTO offline_queue (type, payload, file_path) VALUES (?, ?, ?)",
      ["screenshot", JSON.stringify({ time_entry_id: state.currentEntryId, activity_level: activityLevel, captured_at: new Date().toISOString() }), filepath]
    );
    persistDb();

    console.log(
      `[SCREENSHOT] Captured: ${filename} (${(webpBuffer.length / 1024).toFixed(1)}KB, activity: ${activityLevel}%)`
    );

    const win = getMainWindow();
    if (win) {
      win.webContents.send("screenshot:captured", { path: filepath });
    }

    return filepath;
  } catch (err) {
    console.error("[SCREENSHOT] Capture failed:", err);
    return null;
  }
}
