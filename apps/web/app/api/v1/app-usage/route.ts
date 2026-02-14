import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { createAppUsageSchema } from "@/lib/validations/app-usage";

export async function POST(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createAppUsageSchema.safeParse(body);

    if (!parsed.success) {
      return jsonErr(
        `Validation error: ${parsed.error.issues.map((e) => `${(e.path as PropertyKey[]).join(".")}: ${e.message}`).join(", ")}`,
        422
      );
    }

    const { time_entry_id, entries } = parsed.data;

    // Validate time_entry_id belongs to this user if provided
    let validEntryId: string | null = null;
    if (time_entry_id && !time_entry_id.startsWith("local_")) {
      const entry = await db.timeEntry.findFirst({
        where: { id: time_entry_id, user_id: session!.user.id },
      });
      if (entry) {
        validEntryId = entry.id;
      }
    }

    // Look up app classifications for this org to set is_productive
    const classifications = await db.appClassification.findMany({
      where: { organization_id: member!.organization_id },
    });
    const classMap = new Map(
      classifications.map((c: { app_name: string; category: string }) => [c.app_name.toLowerCase(), c.category])
    );

    const records = entries.map((e) => {
      const category = classMap.get(e.app_name.toLowerCase());
      let isProductive: boolean | null = null;
      if (category === "PRODUCTIVE") isProductive = true;
      else if (category === "UNPRODUCTIVE") isProductive = false;
      else if (category === "NEUTRAL") isProductive = null;

      return {
        user_id: session!.user.id,
        time_entry_id: validEntryId,
        app_name: e.app_name,
        window_title: e.window_title || null,
        url: e.url || null,
        duration: e.duration,
        interval_start: new Date(e.interval_start),
        interval_end: new Date(e.interval_end),
        is_productive: isProductive,
      };
    });

    const result = await db.appUsageLog.createMany({ data: records });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "CREATE",
      entityType: "AppUsageLog",
      entityId: "batch",
      newData: { count: result.count },
    });

    return jsonOk({ created: result.count });
  } catch (err) {
    console.error("[API] POST /api/v1/app-usage error:", err);
    return jsonErr("Failed to create app usage logs", 500);
  }
}

export async function GET() {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    // Return last 24 hours of app usage for this user
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const logs = await db.appUsageLog.findMany({
      where: {
        user_id: session!.user.id,
        interval_start: { gte: since },
      },
      orderBy: { interval_start: "desc" },
      take: 500,
    });

    const serialized = logs.map((l: { interval_start: Date; interval_end: Date; created_at: Date; [key: string]: unknown }) => ({
      ...l,
      interval_start: l.interval_start.toISOString(),
      interval_end: l.interval_end.toISOString(),
      created_at: l.created_at.toISOString(),
    }));

    return jsonOk(serialized);
  } catch (err) {
    console.error("[API] GET /api/v1/app-usage error:", err);
    return jsonErr("Failed to fetch app usage logs", 500);
  }
}
