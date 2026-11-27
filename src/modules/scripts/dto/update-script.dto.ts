import { z } from 'zod';
import { scriptSectionSchema } from './create-script.dto.js';

export const updateScriptSchema = z.object({
  process: z.string().min(1, 'Process is required').optional(),
  language: z.string().optional(),
  sections: z.array(scriptSectionSchema).optional(),
});

export type UpdateScriptDto = z.infer<typeof updateScriptSchema>;
