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

// Detect black frames caused by GPU driver issues
// Samples pixels from the raw PNG buffer — if >95% of sampled pixels are near-black, it's a black frame
function isBlackFrame(pngBuffer: Buffer): boolean {
  try {
    // PNG header is 8 bytes, then chunks. Raw pixel data starts after IHDR.
    // Quick heuristic: sample bytes from the buffer (skip PNG header/metadata).
    // If the vast majority of non-zero bytes are very low, it's likely black.
    const dataStart = Math.min(100, pngBuffer.length); // skip PNG headers
    const sampleSize = Math.min(5000, pngBuffer.length - dataStart);
    if (sampleSize < 100) return false;

    let darkPixels = 0;
    let totalSampled = 0;
    const step = Math.max(1, Math.floor(sampleSize / 500));

    for (let i = dataStart; i < dataStart + sampleSize; i += step) {
      const val = pngBuffer[i];
      totalSampled++;
      if (val < 10) darkPixels++;
    }

    const darkRatio = darkPixels / totalSampled;
    return darkRatio > 0.95;
  } catch {
    return false;
  }
}

function getRandomInterval(): number {
  const config = getConfig();
  const min = config.screenshotInterval.min * 60 * 1000;
  const max = config.screenshotInterval.max * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function scheduleNextScreenshot() {
  cancelScreenshotSchedule();

  // C2: Check if screenshots are disabled
  const config = getConfig();
  if (config.screenshotMode === "disabled") {
    console.log("[SCREENSHOT] Screenshots disabled in config");
    return;
  }

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
    const config = getConfig();

    // C2: Double-check disabled
    if (config.screenshotMode === "disabled") return null;

    // C3: Multi-monitor — find the display where the cursor is
    const cursorPoint = screen.getCursorScreenPoint();
    const cursorDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = cursorDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });

    if (sources.length === 0) {
      console.error("[SCREENSHOT] No sources found");
      return null;
    }

    // C3: Match source to cursor display by display_id or fallback to index
    let source = sources[0];
    if (sources.length > 1) {
      const displayId = cursorDisplay.id.toString();
      const matched = sources.find((s) => s.display_id === displayId);
      if (matched) source = matched;
    }

    let thumbnail = source.thumbnail;

    if (thumbnail.isEmpty()) {
      console.error("[SCREENSHOT] Empty thumbnail");
      return null;
    }

    let pngBuffer = thumbnail.toPNG();

    // Detect black frames (GPU driver issue) — check if image is mostly black
    if (isBlackFrame(pngBuffer)) {
      console.warn("[SCREENSHOT] Black frame detected, retrying with smaller size...");
      // Retry with a smaller thumbnail size which sometimes bypasses GPU issues
      const retrySources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: Math.min(width, 1280), height: Math.min(height, 720) },
      });
      if (retrySources.length > 0) {
        let retrySource = retrySources[0];
        if (retrySources.length > 1) {
          const displayId = cursorDisplay.id.toString();
          const matched = retrySources.find((s) => s.display_id === displayId);
          if (matched) retrySource = matched;
        }
        thumbnail = retrySource.thumbnail;
        if (!thumbnail.isEmpty()) {
          const retryPng = thumbnail.toPNG();
          if (!isBlackFrame(retryPng)) {
            pngBuffer = retryPng;
            console.log("[SCREENSHOT] Retry succeeded — got valid frame");
          } else {
            console.warn("[SCREENSHOT] Retry still black — saving anyway");
          }
        }
      }
    }
    const isBlurred = config.screenshotMode === "blurred";

    let webpBuffer: Buffer;
    let thumbBuffer: Buffer | null = null;
    try {
      const sharp = (await import("sharp")).default;

      // C1: Apply blur if screenshotMode is "blurred"
      let pipeline = sharp(pngBuffer)
        .resize({ width: Math.min(width, 1920), withoutEnlargement: true });

      if (isBlurred) {
        pipeline = pipeline.blur(15);
      }

      webpBuffer = await pipeline.webp({ quality: 70 }).toBuffer();

      // C4: Generate separate thumbnail (320px wide)
      let thumbPipeline = sharp(pngBuffer)
        .resize({ width: 320, withoutEnlargement: true });

      if (isBlurred) {
        thumbPipeline = thumbPipeline.blur(15);
      }

      thumbBuffer = await thumbPipeline.webp({ quality: 50 }).toBuffer();
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

    const ts = Date.now();
    const filename = `screenshot_${ts}.webp`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, webpBuffer);

    // C4: Save thumbnail separately
    let thumbPath: string | null = null;
    if (thumbBuffer) {
      const thumbFilename = `thumb_${ts}.webp`;
      thumbPath = path.join(screenshotsDir, thumbFilename);
      fs.writeFileSync(thumbPath, thumbBuffer);
    }

    const activityLevel = getCurrentActivityLevel();
    const state = getTimerState();

    const db = getDb();
    db.run(
      "INSERT INTO offline_queue (type, payload, file_path) VALUES (?, ?, ?)",
      ["screenshot", JSON.stringify({
        time_entry_id: state.currentEntryId,
        activity_level: activityLevel,
        captured_at: new Date().toISOString(),
        is_blurred: isBlurred,
        thumb_path: thumbPath,
      }), filepath]
    );
    persistDb();

    console.log(
      `[SCREENSHOT] Captured: ${filename} (${(webpBuffer.length / 1024).toFixed(1)}KB, activity: ${activityLevel}%${isBlurred ? ", blurred" : ""})`
    );

    const win = getMainWindow();
    if (win) {
      win.webContents.send("screenshot:captured", { path: filepath, thumbPath });
    }

    return filepath;
  } catch (err) {
    console.error("[SCREENSHOT] Capture failed:", err);
    return null;
  }
}

// C5: Get recent screenshots for employee review panel
export function getRecentScreenshots(limit = 10): { path: string; capturedAt: string; activityLevel: number }[] {
  try {
    const db = getDb();
    const results = db.exec(
      `SELECT payload, file_path FROM offline_queue WHERE type = 'screenshot' ORDER BY created_at DESC LIMIT ${limit}`
    );

    if (results.length === 0) return [];

    const screenshots: { path: string; capturedAt: string; activityLevel: number }[] = [];
    for (const row of results[0].values) {
      const payload = JSON.parse(row[0] as string);
      const filePath = row[1] as string;
      if (filePath && fs.existsSync(filePath)) {
        screenshots.push({
          path: filePath,
          capturedAt: payload.captured_at || "",
          activityLevel: payload.activity_level || 0,
        });
      }
    }

    // Also check recent files in screenshots dir
    const screenshotsDir = path.join(app.getPath("userData"), "screenshots");
    if (screenshots.length < limit && fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir)
        .filter((f) => f.startsWith("screenshot_") && f.endsWith(".webp"))
        .sort()
        .reverse()
        .slice(0, limit);

      for (const file of files) {
        const fullPath = path.join(screenshotsDir, file);
        if (!screenshots.some((s) => s.path === fullPath)) {
          screenshots.push({
            path: fullPath,
            capturedAt: new Date(parseInt(file.replace("screenshot_", "").replace(".webp", ""))).toISOString(),
            activityLevel: 0,
          });
        }
        if (screenshots.length >= limit) break;
      }
    }

    return screenshots.slice(0, limit);
  } catch {
    return [];
  }
}
