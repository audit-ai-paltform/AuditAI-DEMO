import { z } from 'zod';

export const updateParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required').optional(),
  weight: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
  ai_suggested: z.boolean().optional(),
});

export type UpdateParameterDto = z.infer<typeof updateParameterSchema>;
