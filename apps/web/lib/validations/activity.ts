import { z } from "zod";

export const createActivitySchema = z.object({
  time_entry_id: z.string().optional(),
  interval_start: z.string().datetime(),
  interval_end: z.string().datetime(),
  keyboard_count: z.number().int().min(0).default(0),
  mouse_count: z.number().int().min(0).default(0),
  activity_percent: z.number().int().min(0).max(100).default(0),
});

export const batchActivitySchema = z.object({
  activities: z.array(createActivitySchema).min(1).max(100),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type BatchActivityInput = z.infer<typeof batchActivitySchema>;
