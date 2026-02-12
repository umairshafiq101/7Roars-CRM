import { jsonOk, jsonErr } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getOnlineUsers } from "@/lib/socket";

export async function GET() {
  const { error } = await authenticateApiRequest();
  if (error) return error;

  try {
    const onlineUsers = getOnlineUsers();
    const onlineUserIds = Array.from(onlineUsers.keys());

    return jsonOk({ onlineUserIds });
  } catch (err) {
    console.error("[ONLINE STATUS GET]", err);
    return jsonErr("Failed to fetch online status", 500);
  }
}
