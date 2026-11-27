import { z } from 'zod';

export const scriptSectionSchema = z.object({
  title: z.string().min(1, 'Section title is required'),
  text: z.string().min(1, 'Section text is required'),
});

export const createScriptSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  process: z.string().min(1, 'Process is required'),
  language: z.string().default('en'),
  sections: z.array(scriptSectionSchema).default([]),
});

export type CreateScriptDto = z.infer<typeof createScriptSchema>;
