import { ipcMain } from "electron";
import { getDb, persistDb } from "./store";
import { getConfig, fetchServerSettings, startSettingsSync } from "./config";
import type { AuthCredentials, AuthSession } from "../shared/types";

export function getStoredSession(): AuthSession | null {
  const db = getDb();
  const results = db.exec("SELECT value FROM auth WHERE key = 'session'");

  if (results.length === 0 || results[0].values.length === 0) return null;

  try {
    return JSON.parse(results[0].values[0][0] as string) as AuthSession;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession): void {
  const db = getDb();
  db.run(
    "INSERT OR REPLACE INTO auth (key, value) VALUES (?, ?)",
    ["session", JSON.stringify(session)]
  );
  persistDb();
}

export function clearSession(): void {
  const db = getDb();
  db.run("DELETE FROM auth WHERE key = ?", ["session"]);
  persistDb();
}

export function getAuthHeaders(): Record<string, string> {
  const session = getStoredSession();
  const config = getConfig();
  if (!session) return { Origin: config.serverUrl };
  return {
    Cookie: `better-auth.session_token=${session.token}`,
    Origin: config.serverUrl,
  };
}

async function login(
  credentials: AuthCredentials
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  const url = `${config.serverUrl}/api/auth/sign-in/email`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: config.serverUrl,
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (data as Record<string, string>).message || `Login failed (${response.status})`,
      };
    }

    const data = await response.json() as { token?: string; user?: AuthSession["user"] };

    const setCookieHeader = response.headers.get("set-cookie");
    let token = data.token || "";

    if (setCookieHeader) {
      const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return { success: false, error: "No session token received" };
    }

    const sessionResponse = await fetch(`${config.serverUrl}/api/auth/get-session`, {
      headers: {
        Cookie: `better-auth.session_token=${token}`,
        Origin: config.serverUrl,
      },
    });

    if (!sessionResponse.ok) {
      return { success: false, error: "Failed to verify session" };
    }

    const sessionData = await sessionResponse.json() as { user: AuthSession["user"] };

    const memberResponse = await fetch(`${config.serverUrl}/api/v1/time-entries?limit=1`, {
      headers: {
        Cookie: `better-auth.session_token=${token}`,
        Origin: config.serverUrl,
      },
    });

    let member: AuthSession["member"] = {
      id: "",
      organization_id: "",
      role: "EMPLOYEE",
    };

    if (memberResponse.ok) {
      member = {
        id: sessionData.user?.id || "",
        organization_id: "",
        role: "EMPLOYEE",
      };
    }

    const session: AuthSession = {
      token,
      user: sessionData.user || data.user!,
      member,
    };

    storeSession(session);

    // Sync settings from server after login
    fetchServerSettings().catch(() => {});
    startSettingsSync();

    return { success: true };
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export function registerAuthHandlers() {
  ipcMain.handle("auth:login", async (_event, credentials: AuthCredentials) => {
    return login(credentials);
  });

  ipcMain.handle("auth:logout", async () => {
    const session = getStoredSession();
    if (session) {
      const config = getConfig();
      try {
        await fetch(`${config.serverUrl}/api/auth/sign-out`, {
          method: "POST",
          headers: {
            Cookie: `better-auth.session_token=${session.token}`,
            Origin: config.serverUrl,
          },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    clearSession();
  });

  ipcMain.handle("auth:get-session", () => {
    return getStoredSession();
  });
}
