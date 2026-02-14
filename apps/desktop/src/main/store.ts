import initSqlJs, { type Database } from "sql.js";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

let db: Database | null = null;
let dbPath: string = "";

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initStore(): Promise<void> {
  dbPath = path.join(app.getPath("userData"), "7roars-agent.db");

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON;");

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS auth (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      file_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timer_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_running INTEGER NOT NULL DEFAULT 0,
      current_entry_id TEXT,
      project_id TEXT,
      project_name TEXT,
      description TEXT,
      start_time TEXT,
      elapsed INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run("INSERT OR IGNORE INTO timer_state (id) VALUES (1);");

  saveDb();
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initStore() first.");
  return db;
}

export function persistDb(): void {
  saveDb();
}

export function closeStore(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

// D4: Cleanup old data — delete old screenshots and cap queue size
export function cleanupOldData(): void {
  if (!db) return;

  try {
    // Delete screenshot files older than 7 days from userData/screenshots/
    const { app } = require("electron");
    const path = require("node:path");
    const fs = require("node:fs");
    const screenshotsDir = path.join(app.getPath("userData"), "screenshots");

    if (fs.existsSync(screenshotsDir)) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(screenshotsDir) as string[];
      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(screenshotsDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < sevenDaysAgo) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch { /* ignore individual file errors */ }
      }

      if (deleted > 0) {
        console.log(`[STORE] Cleaned up ${deleted} old screenshot files`);
      }
    }

    // Cap offline_queue at 500 items — delete oldest excess
    const countResult = db.exec("SELECT COUNT(*) FROM offline_queue");
    const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    if (count > 500) {
      const excess = count - 500;
      db.run(
        `DELETE FROM offline_queue WHERE id IN (SELECT id FROM offline_queue ORDER BY created_at ASC LIMIT ${excess})`
      );
      console.log(`[STORE] Trimmed ${excess} excess queue items (was ${count}, now 500)`);
    }

    // Delete synced items older than 24 hours that have retries > 5
    db.run("DELETE FROM offline_queue WHERE retries > 5 AND created_at < datetime('now', '-1 day')");

    saveDb();
  } catch (err) {
    console.error("[STORE] Cleanup error:", err);
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanupLoop(): void {
  if (cleanupInterval) return;
  // Run on start
  cleanupOldData();
  // Then every hour
  cleanupInterval = setInterval(() => {
    cleanupOldData();
  }, 60 * 60 * 1000);
}

export function stopCleanupLoop(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
