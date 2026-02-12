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
