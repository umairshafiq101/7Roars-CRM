import { ipcMain } from "electron";
import { getConfig } from "./config";
import { getAuthHeaders, getStoredSession } from "./auth";
import type { Project } from "../shared/types";

let cachedProjects: Project[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchProjects(): Promise<Project[]> {
  const session = getStoredSession();
  if (!session) return [];

  const now = Date.now();
  if (cachedProjects.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedProjects;
  }

  const config = getConfig();

  try {
    const response = await fetch(
      `${config.serverUrl}/api/v1/projects`,
      {
        headers: {
          ...getAuthHeaders(),
        },
      }
    );

    if (response.ok) {
      const result = (await response.json()) as {
        data: Project[];
      };
      cachedProjects = result.data || [];
      lastFetch = now;
      console.log(`[PROJECTS] Fetched ${cachedProjects.length} projects`);
    } else {
      const text = await response.text().catch(() => "");
      console.error(`[PROJECTS] Fetch failed (${response.status}):`, text);
    }
  } catch (err) {
    console.error("[PROJECTS] Failed to fetch:", err);
  }

  return cachedProjects;
}

export function registerProjectHandlers() {
  ipcMain.handle("projects:list", async () => {
    return fetchProjects();
  });
}
