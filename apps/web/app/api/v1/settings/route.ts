import { jsonOk, jsonErr } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const { error, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const settings = await db.setting.findMany({
      where: { organization_id: member!.organization_id },
    });

    const settingsMap: Record<string, unknown> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return jsonOk({ settings: settingsMap });
  } catch (err) {
    console.error("[SETTINGS API GET]", err);
    return jsonErr("Failed to fetch settings", 500);
  }
}
