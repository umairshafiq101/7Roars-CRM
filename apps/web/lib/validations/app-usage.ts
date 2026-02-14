import { z } from "zod";

export const appUsageEntrySchema = z.object({
  app_name: z.string().min(1).max(500),
  window_title: z.string().max(1000).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  duration: z.number().int().min(0).max(86400),
  interval_start: z.string().datetime(),
  interval_end: z.string().datetime(),
});

export const createAppUsageSchema = z.object({
  time_entry_id: z.string().max(100).nullable().optional(),
  entries: z.array(appUsageEntrySchema).min(1).max(100),
});

export const classifyAppSchema = z.object({
  app_name: z.string().min(1).max(500),
  category: z.enum(["PRODUCTIVE", "UNPRODUCTIVE", "NEUTRAL", "UNCLASSIFIED"]),
});

export type CreateAppUsageInput = z.infer<typeof createAppUsageSchema>;
export type ClassifyAppInput = z.infer<typeof classifyAppSchema>;
