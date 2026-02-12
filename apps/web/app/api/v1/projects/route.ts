import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "ACTIVE";

    const projects = await db.project.findMany({
      where: {
        organization_id: member!.organization_id,
        status: status as "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED",
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        is_billable: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    return jsonOk(projects);
  } catch (err) {
    console.error("[PROJECTS GET]", err);
    return jsonErr("Failed to fetch projects", 500);
  }
}
