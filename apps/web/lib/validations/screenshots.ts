import { z } from "zod";

export const uploadScreenshotSchema = z.object({
  time_entry_id: z.string().optional(),
  activity_level: z.number().int().min(0).max(100).default(0),
  captured_at: z.string().datetime().optional(),
  is_blurred: z.boolean().optional().default(false),
});

export const listScreenshotsSchema = z.object({
  user_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UploadScreenshotInput = z.infer<typeof uploadScreenshotSchema>;
export type ListScreenshotsInput = z.infer<typeof listScreenshotsSchema>;
