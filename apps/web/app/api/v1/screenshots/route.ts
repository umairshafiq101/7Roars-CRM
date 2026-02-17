import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { authenticateApiRequest } from "@/lib/api-auth";
import { uploadFile, generateScreenshotKey, generateThumbnailKey } from "@/lib/storage";
import { uploadScreenshotSchema, listScreenshotsSchema } from "@/lib/validations/screenshots";

export async function GET(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const params = listScreenshotsSchema.parse({
      user_id: url.searchParams.get("user_id") || undefined,
      start_date: url.searchParams.get("start_date") || undefined,
      end_date: url.searchParams.get("end_date") || undefined,
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
    });

    const where: Record<string, unknown> = {};

    // Employees can only see their own screenshots
    if (member!.role === "EMPLOYEE") {
      where.user_id = session!.user.id;
    } else if (params.user_id) {
      where.user_id = params.user_id;
    }

    if (params.start_date || params.end_date) {
      where.captured_at = {};
      if (params.start_date) {
        (where.captured_at as Record<string, unknown>).gte = new Date(params.start_date);
      }
      if (params.end_date) {
        (where.captured_at as Record<string, unknown>).lte = new Date(params.end_date);
      }
    }

    const skip = (params.page - 1) * params.limit;

    const [screenshots, total] = await Promise.all([
      db.screenshot.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar_url: true } },
          time_entry: { select: { id: true, project_id: true, description: true } },
        },
        orderBy: { captured_at: "desc" },
        skip,
        take: params.limit,
      }),
      db.screenshot.count({ where }),
    ]);

    return jsonOk(screenshots, {
      page: params.page,
      limit: params.limit,
      total,
    });
  } catch (err) {
    console.error("[SCREENSHOTS GET]", err);
    return jsonErr("Failed to fetch screenshots", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!file) {
      return jsonErr("Screenshot file is required", 400);
    }

    const metadata = metadataStr
      ? uploadScreenshotSchema.parse(JSON.parse(metadataStr))
      : { activity_level: 0, is_blurred: false };

    const capturedAt = metadata.captured_at ? new Date(metadata.captured_at) : new Date();
    const buffer = Buffer.from(await file.arrayBuffer());
    const thumbnailFile = formData.get("thumbnail") as File | null;

    // Generate storage keys
    const imageKey = generateScreenshotKey(
      member!.organization_id,
      session!.user.id,
      capturedAt
    );
    const thumbnailKey = generateThumbnailKey(imageKey);

    // Upload full image
    const imageUrl = await uploadFile(imageKey, buffer, file.type || "image/webp");

    // Upload thumbnail — use desktop agent's thumbnail if provided, otherwise use full image
    const thumbBuffer = thumbnailFile
      ? Buffer.from(await thumbnailFile.arrayBuffer())
      : buffer;
    const thumbnailUrl = await uploadFile(thumbnailKey, thumbBuffer, thumbnailFile?.type || file.type || "image/webp");

    const screenshot = await db.screenshot.create({
      data: {
        user_id: session!.user.id,
        time_entry_id: metadata.time_entry_id || null,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        activity_level: metadata.activity_level,
        is_blurred: metadata.is_blurred ?? false,
        captured_at: capturedAt,
      },
    });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "CREATE",
      entityType: "screenshot",
      entityId: screenshot.id,
      newData: { id: screenshot.id, captured_at: capturedAt },
    });

    return jsonOk(screenshot);
  } catch (err) {
    console.error("[SCREENSHOTS POST]", err);
    if (err instanceof Error && err.name === "ZodError") {
      return jsonErr("Invalid metadata: " + err.message, 422);
    }
    return jsonErr("Failed to upload screenshot", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  try {
    // Only managers+ can delete screenshots
    if (member!.role === "EMPLOYEE") {
      return jsonErr("Forbidden", 403);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return jsonErr("Screenshot ID is required", 400);
    }

    const existing = await db.screenshot.findUnique({ where: { id } });
    if (!existing) {
      return jsonErr("Screenshot not found", 404);
    }

    await db.screenshot.delete({ where: { id } });

    await auditLog({
      userId: session!.user.id,
      organizationId: member!.organization_id,
      action: "DELETE",
      entityType: "screenshot",
      entityId: id,
      oldData: existing,
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("[SCREENSHOTS DELETE]", err);
    return jsonErr("Failed to delete screenshot", 500);
  }
}
