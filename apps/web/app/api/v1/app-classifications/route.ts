import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { db } from "@/lib/db";
import { classifyAppSchema } from "@/lib/validations/app-usage";

export async function GET() {
  const { error, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const classifications = await db.appClassification.findMany({
      where: { organization_id: member!.organization_id },
      orderBy: { app_name: "asc" },
    });

    return jsonOk(classifications.map((c: { id: string; app_name: string; category: string; created_at: Date; updated_at: Date }) => ({
      id: c.id,
      app_name: c.app_name,
      category: c.category,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString(),
    })));
  } catch (err) {
    console.error("[API] GET /api/v1/app-classifications error:", err);
    return jsonErr("Failed to fetch classifications", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  if (!["OWNER", "ADMIN", "MANAGER"].includes(member!.role)) {
    return jsonErr("Insufficient permissions", 403);
  }

  try {
    const body = await request.json();
    const parsed = classifyAppSchema.safeParse(body);

    if (!parsed.success) {
      return jsonErr(
        `Validation error: ${parsed.error.issues.map((e) => `${(e.path as PropertyKey[]).join(".")}: ${e.message}`).join(", ")}`,
        422
      );
    }

    const { app_name, category } = parsed.data;

    const result = await db.appClassification.upsert({
      where: {
        organization_id_app_name: {
          organization_id: member!.organization_id,
          app_name,
        },
      },
      create: {
        organization_id: member!.organization_id,
        app_name,
        category,
      },
      update: { category },
    });

    // Update existing logs
    const isProductive = category === "PRODUCTIVE" ? true : category === "UNPRODUCTIVE" ? false : null;
    await db.appUsageLog.updateMany({
      where: {
        app_name,
        user: {
          members: { some: { organization_id: member!.organization_id } },
        },
      },
      data: { is_productive: isProductive },
    });

    return jsonOk({
      id: result.id,
      app_name: result.app_name,
      category: result.category,
    });
  } catch (err) {
    console.error("[API] PUT /api/v1/app-classifications error:", err);
    return jsonErr("Failed to update classification", 500);
  }
}
