import { z } from "zod";

export const createTimeEntrySchema = z.object({
  project_id: z.string().max(100).nullable().optional(),
  task_id: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(),
  is_manual: z.boolean().default(false),
  is_billable: z.boolean().default(true),
});

export const updateTimeEntrySchema = z.object({
  project_id: z.string().max(100).nullable().optional(),
  task_id: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  end_time: z.string().datetime().nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(),
  is_billable: z.boolean().optional(),
});

export const stopTimeEntrySchema = z.object({
  end_time: z.string().datetime(),
});

export const listTimeEntriesSchema = z.object({
  user_id: z.string().optional(),
  project_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type StopTimeEntryInput = z.infer<typeof stopTimeEntrySchema>;
export type ListTimeEntriesInput = z.infer<typeof listTimeEntriesSchema>;
