import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const R2_CONFIGURED = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY);

const s3 = R2_CONFIGURED
  ? new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    })
  : null;

const BUCKET = process.env.R2_BUCKET || "";
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function uploadLocal(key: string, body: Buffer | Uint8Array): Promise<string> {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  return `${APP_URL}/uploads/${key}`;
}

async function deleteLocal(key: string): Promise<void> {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  try {
    await unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (!R2_CONFIGURED || !s3) {
    return uploadLocal(key, body);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_ENDPOINT}/${BUCKET}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  if (!R2_CONFIGURED || !s3) {
    return deleteLocal(key);
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  if (!R2_CONFIGURED || !s3) {
    return `${APP_URL}/uploads/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export function generateScreenshotKey(
  organizationId: string,
  userId: string,
  timestamp: Date
): string {
  const date = timestamp.toISOString().split("T")[0];
  const ts = timestamp.getTime();
  return `screenshots/${organizationId}/${userId}/${date}/${ts}.webp`;
}

export function generateThumbnailKey(screenshotKey: string): string {
  return screenshotKey.replace("/screenshots/", "/thumbnails/");
}
