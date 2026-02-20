import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api-response";
import { getSession } from "@/lib/permissions";
import path from "path";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return jsonErr("Unauthorized", 401);

  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return jsonErr("Unauthorized", 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file || !taskId) {
      return jsonErr("file and taskId are required");
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { organization_id: true } } },
    });
    if (!task) return jsonErr("Task not found", 404);
    if (task.project.organization_id !== member.organization_id) {
      return jsonErr("Forbidden", 403);
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonErr("File too large (max 10MB)");
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "attachments");
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || "";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/attachments/${safeName}`;

    const attachment = await db.taskAttachment.create({
      data: {
        task_id: taskId,
        user_id: session.user.id,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        content_type: file.type || null,
      },
    });

    return jsonOk({
      ...attachment,
      created_at: attachment.created_at.toISOString(),
    });
  } catch (error) {
    console.error("[task-attachments POST]", error);
    return jsonErr("Failed to upload attachment", 500);
  }
}
