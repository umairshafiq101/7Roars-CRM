import { jsonOk, jsonErr } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-auth";

// In-memory store for online users (since Socket.io isn't integrated into Next.js dev server)
const onlineUsers = new Map<string, { userId: string; name: string; lastSeen: number }>();

// Clean up users who haven't sent a heartbeat in 2 minutes
function cleanupStaleUsers() {
  const now = Date.now();
  const staleThreshold = 2 * 60 * 1000; // 2 minutes
  for (const [userId, data] of onlineUsers.entries()) {
    if (now - data.lastSeen > staleThreshold) {
      onlineUsers.delete(userId);
    }
  }
}

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

    onlineUsers.set(session!.user.id, {
      userId: session!.user.id,
      name: session!.user.name || "",
      lastSeen: Date.now(),
    });

    cleanupStaleUsers();

    return jsonOk({
      onlineUserIds: Array.from(onlineUsers.keys()),
      serverTime: new Date().toISOString(),
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
    cleanupStaleUsers();

    return jsonOk({
      onlineUserIds: Array.from(onlineUsers.keys()),
    });
  } catch (err) {
    console.error("[HEARTBEAT GET]", err);
    return jsonErr("Failed to fetch online status", 500);
  }
}
