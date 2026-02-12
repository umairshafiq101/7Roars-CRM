import path from "node:path";
import fs from "node:fs";
import { defineConfig } from "prisma/config";

function loadEnv(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/DATABASE_URL="?([^"\n]+)"?/);
    if (match) return match[1];
  }
  return "";
}

export default defineConfig({
  schema: path.join(__dirname, "prisma"),
  datasource: {
    url: loadEnv(),
  },
});
