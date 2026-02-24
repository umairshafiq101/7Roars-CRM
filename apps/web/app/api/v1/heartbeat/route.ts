import { jsonOk, jsonErr } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";

// Heartbeat threshold: users seen within this window are "online"
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// In-memory cache (fast path for GET requests within same process)
const onlineUsers = new Map<string, { userId: string; name: string; lastSeen: number }>();

function cleanupStaleUsers() {
  const now = Date.now();
  for (const [userId, data] of onlineUsers.entries()) {
    if (now - data.lastSeen > ONLINE_THRESHOLD_MS) {
      onlineUsers.delete(userId);
    }
  }
}

// DB-backed online users query — used by server actions (cross-process safe)
export async function getOnlineUserIdsFromDB(): Promise<string[]> {
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  const users = await db.user.findMany({
    where: { last_heartbeat_at: { gte: threshold } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Legacy in-memory getter (kept for backward compat, but prefer DB version)
export function getHeartbeatOnlineUsers(): string[] {
  cleanupStaleUsers();
  return Array.from(onlineUsers.keys());
}

// POST /api/v1/heartbeat — desktop agent pings this every 30s
export async function POST(request: Request) {
  const { error, session } = await authenticateApiRequest();
  if (error) return error;

  try {
    await request.json().catch(() => ({}));

    const userId = session!.user.id;
    const now = new Date();

    // Update in-memory cache
    onlineUsers.set(userId, {
      userId,
      name: session!.user.name || "",
      lastSeen: now.getTime(),
    });

    // Persist to DB (the authoritative source)
    await db.user.update({
      where: { id: userId },
      data: { last_heartbeat_at: now },
    });

    cleanupStaleUsers();

    return jsonOk({
      onlineUserIds: Array.from(onlineUsers.keys()),
      serverTime: now.toISOString(),
    });
  } catch (err) {
    console.error("[HEARTBEAT POST]", err);
    return jsonErr("Failed to process heartbeat", 500);
  }
}

// GET /api/v1/heartbeat — web dashboard polls this for online status
export async function GET() {
  const { error } = await authenticateApiRequest();
  if (error) return error;

  try {
    // Use DB as authoritative source for GET too (cross-process safe)
    const onlineUserIds = await getOnlineUserIdsFromDB();

    return jsonOk({
      onlineUserIds,
    });
  } catch (err) {
    console.error("[HEARTBEAT GET]", err);
    return jsonErr("Failed to fetch online status", 500);
  }
}
